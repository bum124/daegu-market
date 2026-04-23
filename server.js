const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const sgMail = require('@sendgrid/mail');
require('dotenv').config();

const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors()); // HTML 파일과 통신 허용
app.use(express.json());


// 1. MySQL 설정 (금고에서 꺼내 쓰기)
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
});

// 이메일 설정 (금고에서 꺼내 쓰기)
sgMail.setApiKey(process.env.SENDGRID_API_KEY);


//회원가입 및 이메일 발송 API
app.post('/api/register', (req, res) => {
    // 🚩 로그 추가 (이제 Render 로그에 이 글씨가 바로 뜰 겁니다!)
    console.log("--- 회원가입 요청 들어옴! 학번:", req.body.student_id); 
    
    const { student_id, email, name, nickname , department, password } = req.body;

    // 1. 대구대 메일인지 확인
    if (!email.endsWith('@daegu.ac.kr')) {
        return res.status(400).json({ message: '대구대학교 이메일만 가입 가능합니다.' });
    }

    // 2. 6자리 랜덤 인증번호 생성
    const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 3. DB에 정보 저장
    const sql = `INSERT INTO Users (student_id, password, name, nickname, department, email, is_verified, verification_code) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    const values = [student_id, password, name, nickname, department, email, false, verifyCode];
    
    db.query(sql, values, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: '회원가입 실패 (이미 가입된 학번일 수 있습니다.)' });
        }

        const msg = {
    to: email, 
    from: {
        name: '대구대 마켓',
        email: 'hye70301@gmail.com' // SendGrid에서 인증받은 메일
    },
    subject: "[대구대 마켓] 회원가입 인증번호입니다.",
    // text 대신 html을 사용해 보세요
    html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #ddd; padding: 20px;">
            <h2 style="color: #007bff;">대구대 마켓 가입을 환영합니다!</h2>
            <p>안녕하세요, <strong>${name}</strong>님!</p>
            <p>요청하신 회원가입 인증번호는 아래와 같습니다.</p>
            <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px;">
                ${verifyCode}
            </div>
            <p>이 번호를 가입 화면에 입력해 주세요.</p>
            <hr>
            <p style="font-size: 12px; color: #888;">본 메일은 발신 전용입니다. 문의사항은 관리자에게 연락 바랍니다.</p>
        </div>
    `};
        sgMail.send(msg)
            .then(() => {
                res.json({ message: '인증 메일이 성공적으로 발송되었습니다!' });
            })
            .catch((mailErr) => {
                console.error('메일 전송 에러:', mailErr);
                res.status(500).json({ message: '메일 전송에 실패했습니다.' });
            });
    });
});

app.post('/api/verify', (req, res) => {
    // 1. 화면(verify.html)에서 이메일과 사용자가 입력한 6자리 숫자를 받습니다.
    const email = req.body.email ? req.body.email.trim() : "";
    const code = req.body.code;

    // 2. DB에서 그 이메일을 가진 사람의 진짜 인증번호를 꺼내옵니다.
    const sql = 'SELECT * FROM Users WHERE email = ? AND verification_code = ?';
    
    db.query(sql, [email, code], (err, results) => {
        if (err) return res.status(500).json({ message: 'DB 에러가 발생했습니다.' });

        // 3. 만약 결과가 없다면? (이메일이 틀렸거나, 인증번호가 틀린 경우)
        if (results.length === 0) {
            return res.status(400).json({ message: '인증번호가 틀렸습니다. 다시 확인해주세요.' });
        }

        // 4. 인증번호가 맞다면! is_verified 값을 TRUE(1)로 바꿔서 정식 회원으로 승격시킵니다.
        const updateSql = 'UPDATE Users SET is_verified = TRUE WHERE email = ?';
        
        db.query(updateSql, [email], (updateErr) => {
            if (updateErr) return res.status(500).json({ message: '회원 상태 업데이트 실패' });
            
            res.json({ message: '이메일 인증이 완벽하게 처리되었습니다! 이제 로그인할 수 있습니다.' });
        });
    });
});

// 로그인 API
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    // 1. DB에서 이메일과 비밀번호가 일치하는 사람을 찾습니다.
    const sql = 'SELECT * FROM Users WHERE email = ? AND password = ?';
    
    db.query(sql, [email, password], (err, results) => {
        if (err) return res.status(500).json({ message: 'DB 에러' });
        
        // 2. 일치하는 정보가 없다면 쫓아냅니다.
        if (results.length === 0) {
            return res.status(401).json({ message: '이메일이나 비밀번호가 틀렸습니다.' });
        }

        const user = results[0];

        // 3. 이메일 인증을 안 한 상태면 로그인 거부!
        if (user.is_verified === 0) { // MySQL에서 FALSE는 0입니다.
            return res.status(403).json({ message: '이메일 인증을 먼저 완료해주세요!' });
        }

        // 4. 로그인 성공! 프론트엔드에 필요한 유저 정보(이름, 학과 등)만 쏙 빼서 줍니다. (비밀번호는 주면 안 됨)
        res.json({ 
            message: '로그인 성공!', 
            user: { 
                name: user.name, 
                department: user.department,
                email: user.email
            } 
        });
    });
});

// server.js에 추가
app.post('/api/resend', (req, res) => {
    const { email } = req.body;
    const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();

    // DB에 새로운 인증번호로 업데이트
    const sql = 'UPDATE Users SET verification_code = ? WHERE email = ?';
    db.query(sql, [verifyCode, email], (err, result) => {
        if (err) return res.status(500).json({ message: 'DB 에러' });

        // 메일 다시 쏘기 (기존 nodemailer 로직 활용)
        const msg = {
            from: '"대구대 마켓" <hye70301@gmail.com>',
            to: email,
            subject: "[대구대 마켓] 인증번호가 재발송되었습니다.",
            text: `새로운 인증번호: [ ${verifyCode} ]`
        };

        sgMail.send(msg)
            .then(() => res.json({ message: '인증번호가 메일로 재발송되었습니다!' }))
            .catch((mailErr) => res.status(500).json({ message: '메일 발송 실패' }));
    });
});
// 1단계: 학번/이메일 확인 후 인증번호 메일 발송
app.post('/api/forgot-password', (req, res) => {
    const { student_id, email } = req.body;
    
    const sql = 'SELECT * FROM Users WHERE student_id = ? AND email = ?';
    db.query(sql, [student_id, email], (err, results) => {
        if (err) return res.status(500).json({ message: 'DB 에러' });
        if (results.length === 0) return res.status(404).json({ message: '일치하는 회원 정보가 없습니다.' });

        const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
        const updateSql = 'UPDATE Users SET verification_code = ? WHERE email = ?';

        db.query(updateSql, [verifyCode, email], (updateErr) => {
            if (updateErr) return res.status(500).json({ message: '인증번호 저장 실패' });

            const msg = {
    to: email, 
    from: {
        name: '대구대 마켓',
        email: 'hye70301@gmail.com' // SendGrid에서 인증받은 메일
    },
    subject: "[대구대 마켓] 비밀번호 재설정 인증번호입니다.",
    // text 대신 html을 사용해 보세요
    html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #ddd; padding: 20px;">
            <h2 style="color: #007bff;">대구대 마켓 가입을 환영합니다!</h2>
            <p>안녕하세요, <strong>${user.name}</strong>님!</p>
            <p>요청하신 비밀번호 재설정을 위한 인증번호는 아래와 같습니다.</p>
            <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px;">
                ${verifyCode}
            </div>
            <p>이 번호를 가입 화면에 입력해 주세요.</p>
            <hr>
            <p style="font-size: 12px; color: #888;">본 메일은 발신 전용입니다. 문의사항은 관리자에게 연락 바랍니다.</p>
        </div>
    `
};

            sgMail.send(msg)
                .then(() => res.json({ message: '인증번호가 메일로 발송되었습니다.' }))
                .catch((mailErr) => res.status(500).json({ message: '메일 발송 실패' }));
        });
    });
});

// 2단계: 인증번호가 맞는지 채점만 하기
app.post('/api/verify-reset', (req, res) => {
    const email = req.body.email ? req.body.email.trim() : "";
    const code = req.body.code;

    const sql = 'SELECT * FROM Users WHERE email = ? AND verification_code = ?';
    db.query(sql, [email, code], (err, results) => {
        if (err) return res.status(500).json({ message: 'DB 에러' });
        if (results.length === 0) return res.status(400).json({ message: '인증번호가 틀렸습니다.' });

        res.json({ message: '인증 성공! 새 비밀번호를 설정해주세요.' });
    });
});

// 3단계: 진짜 새 비밀번호로 DB 업데이트하기
app.post('/api/change-password', (req, res) => {
    const { email, newPassword } = req.body;
    
    const sql = 'UPDATE Users SET password = ? WHERE email = ?';
    db.query(sql, [newPassword, email], (err) => {
        if (err) return res.status(500).json({ message: 'DB 에러' });
        res.json({ message: '비밀번호가 성공적으로 변경되었습니다! 새 비밀번호로 로그인해주세요.' });
    });
});

app.post('/api/products', (req, res) => {
  const { seller_id, title, category, condition, price, description, location, images } = req.body;

  const sql = `
    INSERT INTO products (seller_id, title, category, \`condition\`, price, description, location, images)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql, 
    [seller_id, title, category, condition, price, description, location, JSON.stringify(images)], 
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).send('DB 오류');
      }
      res.json({ message: '등록 완료' });
    }
  );
});

app.get('/api/products', (req, res) => {
  db.query('SELECT * FROM products ORDER BY id DESC', (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});

app.get('/api/products/:id', (req, res) => {
  const id = req.params.id;

  db.query(
    'SELECT * FROM products WHERE id = ?',
    [id],
    (err, result) => {
      if (err) return res.status(500).send(err);
      res.json(result[0]);
    }
  );
});


function getTimeAgo(dateString) {
  const now = new Date();
  const past = new Date(dateString);
  const diff = Math.floor((now - past) / 1000); // 초 단위

  if (diff < 60) return '방금 전';

  const minutes = Math.floor(diff / 60);
  if (minutes < 60) return minutes + '분 전';

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + '시간 전';

  const days = Math.floor(hours / 24);
  return days + '일 전';
}

app.put('/api/products/:id/views', (req, res) => {
  const id = req.params.id;

  const sql = `
    UPDATE products 
    SET views = views + 1 
    WHERE id = ?
  `;

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send('조회수 증가 실패');
    }

    res.json({ message: '조회수 증가 완료' });
  });
});

app.put('/api/products/:id/like', (req, res) => {
  const id = req.params.id;

  const sql = `
    UPDATE products 
    SET likes = likes + 1 
    WHERE id = ?
  `;

  db.query(sql, [id], (err) => {
    if (err) return res.status(500).send(err);
    res.json({ message: '좋아요 증가' });
  });
});

app.put('/api/products/:id/unlike', (req, res) => {
  const id = req.params.id;

  const sql = `
    UPDATE products 
    SET likes = likes - 1 
    WHERE id = ? AND likes > 0
  `;

  db.query(sql, [id], (err) => {
    if (err) return res.status(500).send(err);
    res.json({ message: '좋아요 감소' });
  });
});

// DB 연결 테스트
db.connect((err) => {
    if (err) {
        console.log('DB 연결 실패 ㅠㅠ 원인:', err);
    } else {
        console.log('MySQL 데이터베이스 연결 성공!');
    }
});

// 2. 길(API) 터주기: 이 주소로 접속하면 DB에서 데이터를 꺼내줌
app.get('/api/users', (req, res) => {
    const sql = 'SELECT user_id, student_id, email, name, nickname, department FROM Users';

    db.query(sql, (err, results) => {
        if (err) {
            res.status(500).send('데이터 가져오기 에러');
        } else {
            res.json(results); 
        }
    });
});

// 3. 서버 켜기 (3000번 포트 사용)
app.listen(PORT, () => {
    console.log(`서버가 ${PORT}번 포트에서 돌아가고 있습니다.`);
});