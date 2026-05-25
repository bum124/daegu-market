const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const sgMail = require('@sendgrid/mail');
require('dotenv').config();
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

const admin = require('firebase-admin');
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const PORT = process.env.PORT || 3000;
const ADMIN_EMAILS = ['qkrrjs0131@daegu.ac.kr', 'hye70301@daegu.ac.kr', 'bears0144@daegu.ac.kr'];

const app = express();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + '-' + Math.round(Math.random() * 1E9);

    cb(
      null,
      uniqueName + path.extname(file.originalname)
    );
  }
});

const upload = multer({ storage });

// 업로드 폴더 공개
app.use('/uploads', express.static('uploads'));

app.use(cors()); // HTML 파일과 통신 허용
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get('/api/health', (req, res) => {
    res.json({ ok: true, service: 'daegu-market-api' });
});

app.get('/upload/test', (req, res) => {
  res.json({ ok: true, message: 'upload route connected' });
});

app.post('/upload/chat-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: '이미지가 없습니다.'
      });
    }

    const result = await cloudinary.uploader.upload(
      req.file.path,
      {
        folder: "chat-images"
      }
    );

    res.json({
      imageUrl: result.secure_url
    });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: '이미지 업로드 실패'
    });
  }
});

app.use(express.static(path.join(__dirname)));

app.post('/club/chat/start', (req, res) => {
  const { club_id, user_id, leader_id } = req.body;

  if (!club_id || !user_id || !leader_id) {
    return res.status(400).json({
      message: 'club_id, user_id, leader_id가 필요합니다.'
    });
  }

  if (Number(user_id) === Number(leader_id)) {
    return res.status(400).json({
      message: '본인이 만든 동아리에는 문의할 수 없습니다.'
    });
  }

  const checkRoomSql = `
    SELECT r.id
    FROM rooms r
    JOIN room_users ru1 ON r.id = ru1.room_id
    JOIN room_users ru2 ON r.id = ru2.room_id
    WHERE r.club_id = ?
      AND r.type = 'club'
      AND ru1.user_id = ?
      AND ru2.user_id = ?
    LIMIT 1
  `;

  db.query(checkRoomSql, [club_id, user_id, leader_id], (err, results) => {
    if (err) return res.status(500).send(err);

    if (results.length > 0) {
      return res.json({ room_id: results[0].id });
    }

    const createRoomSql = `
      INSERT INTO rooms (club_id, type)
      VALUES (?, 'club')
    `;

    db.query(createRoomSql, [club_id], (err, result) => {
      if (err) return res.status(500).send(err);

      const room_id = result.insertId;

      const insertUsersSql = `
        INSERT INTO room_users (room_id, user_id, is_active)
        VALUES (?, ?, 1), (?, ?, 1)
      `;

      db.query(insertUsersSql, [room_id, user_id, room_id, leader_id], (err) => {
        if (err) return res.status(500).send(err);

        res.json({ room_id });
      });
    });
  });
});

app.post('/chat/start', (req, res) => {
  const { product_id, buyer_id, seller_id } = req.body;

  if (buyer_id === seller_id) {
  return res.status(400).json({
    message: "본인과는 채팅할 수 없습니다."
  });
}

  const checkRoomSql = `
    SELECT r.id 
    FROM rooms r
    JOIN room_users ru1 ON r.id = ru1.room_id
    JOIN room_users ru2 ON r.id = ru2.room_id
    WHERE r.product_id = ?
      AND ru1.user_id = ?
      AND ru2.user_id = ?
    LIMIT 1
  `;

  db.query(checkRoomSql, [product_id, buyer_id, seller_id], (err, results) => {
    if (err) return res.status(500).send(err);

    if (results.length > 0) {
      return res.json({ room_id: results[0].id });
    }

    const createRoomSql = `INSERT INTO rooms (product_id) VALUES (?)`;

    db.query(createRoomSql, [product_id], (err, result) => {
      if (err) return res.status(500).send(err);

      const room_id = result.insertId;

      const insertUsersSql = `
        INSERT INTO room_users (room_id, user_id) VALUES (?, ?), (?, ?)
      `;

      db.query(insertUsersSql, [room_id, buyer_id, room_id, seller_id], (err) => {
        if (err) return res.status(500).send(err);

        res.json({ room_id });
      });
    });
  });
});

app.get('/chat/rooms/:roomId/product', (req, res) => {
  const roomId = req.params.roomId;

  const sql = `
    SELECT 
      p.id,
      p.title,
      p.price,
      p.images,
      p.status
    FROM rooms r
    JOIN products p
      ON r.product_id = p.id
    WHERE r.id = ?
    LIMIT 1
  `;

  db.query(sql, [roomId], (err, results) => {
    if (err) return res.status(500).send(err);

    if (results.length === 0) {
      return res.status(404).json({ message: '상품 정보를 찾을 수 없습니다.' });
    }

    res.json(results[0]);
  });
});

function resolveUserId(payload, callback) {
  const { user_id, id, seller_id, email, user_email, seller_email } = payload || {};
  const directUserId = user_id || id || seller_id;

  if (directUserId) {
    callback(null, directUserId);
    return;
  }

  const lookupEmail = email || user_email || seller_email;

  if (!lookupEmail) {
    callback(null, null);
    return;
  }

  db.query('SELECT user_id FROM Users WHERE email = ?', [lookupEmail], (err, results) => {
    if (err) {
      callback(err);
      return;
    }

    callback(null, results[0] && results[0].user_id);
  });
}

function ensureProductLikesTable(callback) {
  db.query(
    `CREATE TABLE IF NOT EXISTS product_likes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      product_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_user_product (user_id, product_id)
    )`,
    callback
  );
}

function ensureTradeReviewsTable(callback) {
  db.query(
    `CREATE TABLE IF NOT EXISTS trade_reviews (
      id INT AUTO_INCREMENT PRIMARY KEY,
      reviewer_id INT NOT NULL,
      target_user_id INT NOT NULL,
      rating TINYINT NOT NULL,
      tags TEXT NULL,
      comment VARCHAR(300) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_reviewer_target (reviewer_id, target_user_id)
    )`,
    callback
  );
}

function ensureInquiriesTable(callback) {
  db.query(
    `CREATE TABLE IF NOT EXISTS inquiries (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      category VARCHAR(40) NOT NULL,
      message TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      admin_memo TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    callback
  );
}

function refreshProductLikeCount(productId, callback) {
  db.query(
    `UPDATE products
     SET likes = (SELECT COUNT(*) FROM product_likes WHERE product_id = ?)
     WHERE id = ?`,
    [productId, productId],
    callback
  );
}

function getReportReasonWeight(reason) {
  const weights = {
    scam: 5,
    abuse: 2,
    no_show: 3,
    prohibited: 4,
    spam: 2,
    other: 1
  };

  return weights[reason] || 1;
}

function getRiskLevel(score) {
  if (score >= 20) return '관리자 확인 필요';
  if (score >= 10) return '위험';
  if (score >= 5) return '주의';
  return '정상';
}

function calculateRiskScore(reports) {
  return reports.reduce((score, report) => {
    if (report.status === 'rejected') {
      return score;
    }

    const baseScore = getReportReasonWeight(report.reason);
    const reviewBonus = report.status === 'resolved' ? 8 : 0;
    return score + baseScore + reviewBonus;
  }, 0);
}

function normalizeProductStatus(product) {
  const rawStatus = String(product.status || product.condition || '판매중').trim();

  if (rawStatus.includes('판매완료')) {
    return '판매완료';
  }

  if (rawStatus.includes('예약')) {
    return '예약중';
  }

  return '판매중';
}

function isAdminEmail(email) {
  return ADMIN_EMAILS.includes(String(email || '').trim().toLowerCase());
}

function getRequestAdminEmail(req) {
  return req.headers['x-admin-email'] || req.query.admin_email;
}

function ensureReportsTable(callback) {
  db.query(
    `CREATE TABLE IF NOT EXISTS reports (
      id INT AUTO_INCREMENT PRIMARY KEY,
      reporter_id INT NOT NULL,
      target_type VARCHAR(20) NOT NULL,
      target_id INT NOT NULL,
      reason VARCHAR(40) NOT NULL,
      detail TEXT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      admin_action VARCHAR(40) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_report_target (reporter_id, target_type, target_id)
    )`,
    callback
  );
}

function ensureUserModerationColumn(callback) {
  db.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'Users'
       AND COLUMN_NAME = 'account_status'`,
    (selectErr, rows) => {
      if (selectErr) {
        callback(selectErr);
        return;
      }

      if (rows.length > 0) {
        callback(null);
        return;
      }

      db.query(
        "ALTER TABLE Users ADD COLUMN account_status VARCHAR(20) NOT NULL DEFAULT 'active'",
        callback
      );
    }
  );
}

function ensureProductModerationColumn(callback) {
  db.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'products'
       AND COLUMN_NAME = 'moderation_status'`,
    (selectErr, rows) => {
      if (selectErr) {
        callback(selectErr);
        return;
      }

      if (rows.length > 0) {
        callback(null);
        return;
      }

      db.query(
        "ALTER TABLE products ADD COLUMN moderation_status VARCHAR(20) NOT NULL DEFAULT 'visible'",
        callback
      );
    }
  );
}

function ensureModerationSchema(callback) {
  ensureReportsTable((reportErr) => {
    if (reportErr) {
      callback(reportErr);
      return;
    }

    ensureUserModerationColumn((userErr) => {
      if (userErr) {
        callback(userErr);
        return;
      }

      ensureProductModerationColumn(callback);
    });
  });
}

function ensureProductStatusColumn(callback) {
  db.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'products'
       AND COLUMN_NAME = 'status'`,
    (selectErr, rows) => {
      if (selectErr) {
        callback(selectErr);
        return;
      }

      if (rows.length > 0) {
        callback(null);
        return;
      }

      db.query(
        "ALTER TABLE products ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT '판매중'",
        callback
      );
    }
  );
}

function ensureProductSoldAtColumn(callback) {
  db.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'products'
       AND COLUMN_NAME = 'sold_at'`,
    (selectErr, rows) => {
      if (selectErr) {
        callback(selectErr);
        return;
      }

      if (rows.length > 0) {
        callback(null);
        return;
      }

      db.query(
        'ALTER TABLE products ADD COLUMN sold_at DATETIME NULL AFTER status',
        callback
      );
    }
  );
}

function ensureProductLifecycleColumns(callback) {
  ensureProductStatusColumn((statusErr) => {
    if (statusErr) {
      callback(statusErr);
      return;
    }

    ensureProductSoldAtColumn(callback);
  });
}

function ensureUserCollegeColumn(callback) {
  db.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'Users'
       AND COLUMN_NAME = 'college'`,
    (selectErr, rows) => {
      if (selectErr) {
        callback(selectErr);
        return;
      }

      if (rows.length > 0) {
        callback(null);
        return;
      }

      db.query(
        'ALTER TABLE Users ADD COLUMN college VARCHAR(100) NULL AFTER department',
        callback
      );
    }
  );
}

function ensureProductTargetColumns(callback) {
  db.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'products'
       AND COLUMN_NAME IN ('target_college', 'target_department')`,
    (selectErr, rows) => {
      if (selectErr) {
        callback(selectErr);
        return;
      }

      const existingColumns = new Set(rows.map(row => row.COLUMN_NAME));
      const alterStatements = [];

      if (!existingColumns.has('target_college')) {
        alterStatements.push('ALTER TABLE products ADD COLUMN target_college VARCHAR(100) NULL AFTER category');
      }

      if (!existingColumns.has('target_department')) {
        alterStatements.push('ALTER TABLE products ADD COLUMN target_department VARCHAR(150) NULL AFTER target_college');
      }

      if (alterStatements.length === 0) {
        callback(null);
        return;
      }

      let index = 0;
      const runNextAlter = () => {
        if (index >= alterStatements.length) {
          callback(null);
          return;
        }

        db.query(alterStatements[index], (alterErr) => {
          if (alterErr) {
            callback(alterErr);
            return;
          }

          index += 1;
          runNextAlter();
        });
      };

      runNextAlter();
    }
  );
}

function ensureProductLocationColumns(callback) {
  db.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'products'
       AND COLUMN_NAME IN ('location_lat', 'location_lng')`,
    (selectErr, rows) => {
      if (selectErr) {
        callback(selectErr);
        return;
      }

      const existingColumns = new Set(rows.map(row => row.COLUMN_NAME));
      const alterStatements = [];

      if (!existingColumns.has('location_lat')) {
        alterStatements.push('ALTER TABLE products ADD COLUMN location_lat DECIMAL(10, 7) NULL AFTER location');
      }

      if (!existingColumns.has('location_lng')) {
        alterStatements.push('ALTER TABLE products ADD COLUMN location_lng DECIMAL(10, 7) NULL AFTER location_lat');
      }

      if (alterStatements.length === 0) {
        callback(null);
        return;
      }

      let index = 0;
      const runNextAlter = () => {
        if (index >= alterStatements.length) {
          callback(null);
          return;
        }

        db.query(alterStatements[index], (alterErr) => {
          if (alterErr) {
            callback(alterErr);
            return;
          }

          index += 1;
          runNextAlter();
        });
      };

      runNextAlter();
    }
  );
}

function queryWithTimeout(sql, values, callback, timeout = 10000) {
  if (typeof values === 'function') {
    callback = values;
    values = [];
  }

  db.query({ sql, timeout }, values, callback);
}


// 1. MySQL 설정 (금고에서 꺼내 쓰기)
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    connectTimeout: 10000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// 이메일 설정 (금고에서 꺼내 쓰기)
sgMail.setApiKey(process.env.SENDGRID_API_KEY);


//회원가입 및 이메일 발송 API
app.post('/api/register', (req, res) => {
    // 🚩 로그 추가 (이제 Render 로그에 이 글씨가 바로 뜰 겁니다!)
    console.log("--- 회원가입 요청 들어옴! 학번:", req.body.student_id); 
    
    const { student_id, email, name, nickname, college, department, password } = req.body;

    // 1. 대구대 메일인지 확인
    if (!email.endsWith('@daegu.ac.kr')) {
        return res.status(400).json({ message: '대구대학교 이메일만 가입 가능합니다.' });
    }

    // 2. 6자리 랜덤 인증번호 생성
    const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();

    ensureUserCollegeColumn((columnErr) => {
      if (columnErr) {
        console.error(columnErr);
        return res.status(500).json({ message: '회원가입 준비 중 오류가 발생했습니다.' });
      }

      // 3. DB에 정보 저장
      const sql = `INSERT INTO Users (student_id, password, name, nickname, department, college, email, is_verified, verification_code)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const values = [student_id, password, name, nickname, department, college || null, email, false, verifyCode];

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

        if (user.account_status === 'deleted') {
            return res.status(403).json({ message: '탈퇴 처리된 계정입니다.' });
        }

        if (user.account_status === 'restricted') {
            return res.status(403).json({ message: '관리자 검토로 이용이 제한된 계정입니다.' });
        }

        // 4. 로그인 성공! 프론트엔드에 필요한 유저 정보(이름, 학과 등)만 쏙 빼서 줍니다. (비밀번호는 주면 안 됨)
        res.json({ 
            message: '로그인 성공!', 
            user: { 
                user_id: user.user_id,
                id: user.user_id,
                name: user.name, 
                nickname: user.nickname,
                college: user.college,
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

        const user = results[0];

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

// 상품 등록: 판매자와 입력값을 확인한 뒤 products 테이블에 저장합니다.
app.post('/api/products', (req, res) => {
  const { seller_id, seller_email, title, category, target_college, target_department, condition, price, description, location, location_lat, location_lng, images } = req.body;

  const insertProduct = (resolvedSellerId) => {
    if (!resolvedSellerId) {
      return res.status(400).json({ message: '판매자 정보를 확인하지 못했습니다. 다시 로그인해주세요.' });
    }

    ensureProductTargetColumns((targetColumnErr) => {
      if (targetColumnErr) {
        console.error(targetColumnErr);
        return res.status(500).json({ message: '상품 관련 단과대 컬럼 준비에 실패했습니다.' });
      }

      ensureProductLocationColumns((locationColumnErr) => {
        if (locationColumnErr) {
          console.error(locationColumnErr);
          return res.status(500).json({ message: '상품 거래 장소 컬럼 준비에 실패했습니다.' });
        }

        const sql = `
        INSERT INTO products (seller_id, title, category, target_college, target_department, \`condition\`, price, description, location, location_lat, location_lng, images)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

        db.query(
          sql,
          [resolvedSellerId, title, category, target_college || null, target_department || null, condition, price, description, location, location_lat || null, location_lng || null, JSON.stringify(images)],
          (err, result) => {
            if (err) {
              console.error(err);
              return res.status(500).send('DB 오류');
            }

            res.json({ message: '등록 완료', product_id: result.insertId });
          }
        );
      });
    });
  };

  if (seller_id) {
    insertProduct(seller_id);
    return;
  }

  if (!seller_email) {
    insertProduct(null);
    return;
  }

  db.query('SELECT user_id FROM Users WHERE email = ?', [seller_email], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('DB 오류');
    }

    insertProduct(results[0] && results[0].user_id);
  });
});

// 상품 목록 조회: 메인페이지에 보여줄 상품과 판매자 정보를 함께 반환합니다.
app.get('/api/products', (req, res) => {
  ensureModerationSchema((schemaErr) => {
    if (schemaErr) {
      console.error(schemaErr);
      return res.status(500).json({ message: '상품 목록 준비 중 오류가 발생했습니다.' });
    }

    ensureProductLifecycleColumns((lifecycleErr) => {
      if (lifecycleErr) {
        console.error(lifecycleErr);
        return res.status(500).json({ message: '상품 상태 정보 준비 중 오류가 발생했습니다.' });
      }

    const sql = `
      SELECT
        p.*,
        u.name AS seller_name,
        u.nickname AS seller_nickname,
        u.college AS seller_college,
        u.department AS seller_department,
        u.email AS seller_email,
        COALESCE((
          SELECT SUM(
            CASE r.reason
              WHEN 'scam' THEN 5
              WHEN 'abuse' THEN 2
              WHEN 'no_show' THEN 3
              WHEN 'prohibited' THEN 4
              WHEN 'spam' THEN 2
              ELSE 1
            END + CASE WHEN r.status = 'resolved' THEN 8 ELSE 0 END
          )
          FROM reports r
          LEFT JOIN products rp ON r.target_type = 'product' AND r.target_id = rp.id
          WHERE r.status <> 'rejected'
            AND (
              (r.target_type = 'user' AND r.target_id = u.user_id)
              OR (r.target_type = 'product' AND rp.seller_id = u.user_id)
            )
        ), 0) AS seller_risk_score
      FROM products p
      LEFT JOIN Users u ON u.user_id = p.seller_id
      WHERE COALESCE(p.moderation_status, 'visible') <> 'hidden'
        AND COALESCE(u.account_status, 'active') <> 'deleted'
        AND NOT (
          p.status = '판매완료'
          AND p.sold_at IS NOT NULL
          AND p.sold_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
        )
      ORDER BY p.id DESC
    `;

    queryWithTimeout(sql, (err, results) => {
      if (err) return res.status(500).send(err);
      res.json(results);
    });
    });
  });
});

// 상품 상세 조회: 특정 상품과 판매자 정보를 상세 페이지에 제공합니다.
app.get('/api/products/:id', (req, res) => {
  const id = req.params.id;

  ensureModerationSchema((schemaErr) => {
    if (schemaErr) {
      console.error(schemaErr);
      return res.status(500).json({ message: '상품 정보 준비 중 오류가 발생했습니다.' });
    }

    queryWithTimeout(
      `SELECT
        p.*,
        u.name AS seller_name,
        u.nickname AS seller_nickname,
        u.college AS seller_college,
        u.department AS seller_department,
        u.email AS seller_email
       FROM products p
       LEFT JOIN Users u ON u.user_id = p.seller_id
       WHERE p.id = ?
         AND COALESCE(p.moderation_status, 'visible') <> 'hidden'
         AND COALESCE(u.account_status, 'active') <> 'deleted'`,
      [id],
      (err, result) => {
        if (err) return res.status(500).send(err);
        if (!result[0]) return res.status(404).json({ message: '상품 정보를 찾을 수 없습니다.' });
        res.json(result[0]);
      }
    );
  });
});

// 상품 수정: 본인 상품인지 확인한 뒤 products 테이블을 업데이트합니다.
app.put('/api/products/:id', (req, res) => {
  const productId = req.params.id;
  const {
    seller_id,
    seller_email,
    title,
    category,
    target_college,
    target_department,
    condition,
    price,
    description,
    location,
    location_lat,
    location_lng,
    images
  } = req.body || {};

  const updateProduct = (resolvedSellerId) => {
    if (!resolvedSellerId) {
      return res.status(400).json({ message: '판매자 정보를 확인하지 못했습니다.' });
    }

    if (!title || !category || !condition || !price || !description || !location || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ message: '상품 수정에 필요한 정보가 부족합니다.' });
    }

    ensureProductTargetColumns((targetColumnErr) => {
      if (targetColumnErr) {
        console.error(targetColumnErr);
        return res.status(500).json({ message: '상품 관련 단과대 컬럼 준비에 실패했습니다.' });
      }

      ensureProductLocationColumns((locationColumnErr) => {
        if (locationColumnErr) {
          console.error(locationColumnErr);
          return res.status(500).json({ message: '상품 거래 장소 컬럼 준비에 실패했습니다.' });
        }

        const sql = `
          UPDATE products
          SET title = ?,
              category = ?,
              target_college = ?,
              target_department = ?,
              \`condition\` = ?,
              price = ?,
              description = ?,
              location = ?,
              location_lat = ?,
              location_lng = ?,
              images = ?
          WHERE id = ? AND seller_id = ?
        `;

        db.query(
          sql,
          [
            title,
            category,
            target_college || null,
            target_department || null,
            condition,
            price,
            description,
            location,
            location_lat || null,
            location_lng || null,
            JSON.stringify(images),
            productId,
            resolvedSellerId
          ],
          (err, result) => {
            if (err) {
              console.error(err);
              return res.status(500).json({ message: '상품 수정 중 DB 오류가 발생했습니다.' });
            }

            if (result.affectedRows === 0) {
              return res.status(403).json({ message: '본인이 등록한 상품만 수정할 수 있습니다.' });
            }

            res.json({ message: '상품이 수정되었습니다.', product_id: productId });
          }
        );
      });
    });
  };
  
  resolveUserId({ seller_id, seller_email }, (userErr, userId) => {
    if (userErr) {
      console.error(userErr);
      return res.status(500).json({ message: '사용자 확인 중 DB 오류가 발생했습니다.' });
    }

    updateProduct(userId);
  });
});

// ✨ 마이페이지: 내 상품 동아리 뱃지 온오프 토글 API
app.put('/api/products/:id/badge-toggle', (req, res) => {
  const productId = req.params.id;
  const { seller_id, show_club_badge } = req.body;

  db.query(
    'UPDATE products SET show_club_badge = ? WHERE id = ? AND seller_id = ?',
    [show_club_badge, productId, seller_id],
    (err, result) => {
      if (err) {
        console.error('동아리 뱃지 토글 에러:', err);
        return res.status(500).json({ message: 'DB 수정 오류가 발생했습니다.' });
      }
      res.json({ message: '동아리 표시 설정이 변경되었습니다.' });
    }
  );
});

// 신고 접수: 신고자/대상/중복 여부를 검증하고 reports 테이블에 저장합니다.
app.post('/api/reports', (req, res) => {
  const { reporter_id, reporter_email, target_type, target_id, reason, detail } = req.body || {};
  const allowedTypes = ['product', 'user', 'chat'];
  const allowedReasons = ['scam', 'abuse', 'no_show', 'prohibited', 'spam', 'other'];

  if (!allowedTypes.includes(target_type) || !target_id || !allowedReasons.includes(reason)) {
    return res.status(400).json({ message: '신고 대상과 사유를 확인해주세요.' });
  }

  ensureReportsTable((tableErr) => {
    if (tableErr) {
      console.error(tableErr);
      return res.status(500).json({ message: '신고 테이블 준비에 실패했습니다.' });
    }

    resolveUserId({ user_id: reporter_id, email: reporter_email }, (userErr, reporterId) => {
      if (userErr) {
        console.error(userErr);
        return res.status(500).json({ message: '신고자 확인 중 오류가 발생했습니다.' });
      }

      if (!reporterId) {
        return res.status(400).json({ message: '로그인이 필요합니다.' });
      }

      db.query(
        `INSERT INTO reports (reporter_id, target_type, target_id, reason, detail)
         VALUES (?, ?, ?, ?, ?)`,
        [reporterId, target_type, target_id, reason, detail || null],
        (err, result) => {
          if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
              return res.status(409).json({ message: '이미 신고한 대상입니다. 관리자가 확인할 예정입니다.' });
            }

            console.error(err);
            return res.status(500).json({ message: '신고 접수 중 DB 오류가 발생했습니다.' });
          }

          res.json({ message: '신고가 접수되었습니다.', report_id: result.insertId });
        }
      );
    });
  });
});

app.get('/api/users/:id/risk', (req, res) => {
  const userId = req.params.id;

  ensureReportsTable((tableErr) => {
    if (tableErr) {
      console.error(tableErr);
      return res.status(500).json({ message: '신고 테이블 준비에 실패했습니다.' });
    }

    db.query(
      `SELECT r.*
       FROM reports r
       LEFT JOIN products p ON r.target_type = 'product' AND r.target_id = p.id
       WHERE (r.target_type = 'user' AND r.target_id = ?)
          OR (r.target_type = 'product' AND p.seller_id = ?)`,
      [userId, userId],
      (err, reports) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: '위험 점수 계산 중 오류가 발생했습니다.' });
        }

        const score = calculateRiskScore(reports);
        res.json({
          user_id: Number(userId),
          risk_score: score,
          risk_level: getRiskLevel(score),
          report_count: reports.filter(report => report.status !== 'rejected').length
        });
      }
    );
  });
});

app.get('/api/users/:id/reviews', (req, res) => {
  const targetUserId = Number(req.params.id);

  if (!targetUserId) {
    return res.status(400).json({ message: '사용자 정보가 필요합니다.' });
  }

  ensureTradeReviewsTable((tableErr) => {
    if (tableErr) {
      console.error(tableErr);
      return res.status(500).json({ message: '거래 신뢰도 테이블 준비에 실패했습니다.' });
    }

    const sql = `
      SELECT
        tr.*,
        reviewer.nickname AS reviewer_nickname,
        reviewer.name AS reviewer_name
      FROM trade_reviews tr
      LEFT JOIN Users reviewer ON reviewer.user_id = tr.reviewer_id
      WHERE tr.target_user_id = ?
      ORDER BY tr.created_at DESC
    `;

    queryWithTimeout(sql, [targetUserId], (err, reviews) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: '거래 신뢰도를 불러오지 못했습니다.' });
      }

      const tagCounts = {};
      let ratingSum = 0;

      const normalizedReviews = reviews.map(review => {
        let tags = [];

        try {
          tags = JSON.parse(review.tags || '[]');
        } catch (error) {
          tags = [];
        }

        tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });

        ratingSum += Number(review.rating || 0);

        return {
          id: review.id,
          rating: Number(review.rating || 0),
          tags,
          comment: review.comment || '',
          reviewer_name: review.reviewer_nickname || review.reviewer_name || '사용자',
          created_at: review.created_at
        };
      });

      const topTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([tag, count]) => ({ tag, count }));

      res.json({
        average_rating: reviews.length ? Number((ratingSum / reviews.length).toFixed(1)) : 0,
        review_count: reviews.length,
        top_tags: topTags,
        reviews: normalizedReviews.slice(0, 5)
      });
    });
  });
});

// 거래 신뢰도 평가: 하트 점수, 선택 태그, 짧은 평가를 사용자 프로필에 저장합니다.
app.post('/api/reviews', (req, res) => {
  const { reviewer_id, reviewer_email, target_user_id, rating, tags, comment } = req.body || {};
  const numericRating = Number(rating);

  if (!target_user_id || !numericRating || numericRating < 1 || numericRating > 5) {
    return res.status(400).json({ message: '평가 대상과 점수를 확인해주세요.' });
  }

  ensureTradeReviewsTable((tableErr) => {
    if (tableErr) {
      console.error(tableErr);
      return res.status(500).json({ message: '거래 신뢰도 테이블 준비에 실패했습니다.' });
    }

    resolveUserId({ user_id: reviewer_id, email: reviewer_email }, (userErr, reviewerId) => {
      if (userErr) {
        console.error(userErr);
        return res.status(500).json({ message: '평가자 확인 중 오류가 발생했습니다.' });
      }

      if (!reviewerId) {
        return res.status(400).json({ message: '로그인이 필요합니다.' });
      }

      if (String(reviewerId) === String(target_user_id)) {
        return res.status(400).json({ message: '본인에게는 평가를 남길 수 없습니다.' });
      }

      const safeTags = Array.isArray(tags) ? tags.slice(0, 5) : [];
      const safeComment = String(comment || '').trim().slice(0, 300) || null;

      db.query(
        `INSERT INTO trade_reviews (reviewer_id, target_user_id, rating, tags, comment)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE rating = VALUES(rating), tags = VALUES(tags), comment = VALUES(comment), created_at = CURRENT_TIMESTAMP`,
        [reviewerId, target_user_id, numericRating, JSON.stringify(safeTags), safeComment],
        (err) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ message: '거래 신뢰도 저장 중 오류가 발생했습니다.' });
          }

          res.json({ message: '거래 신뢰도 평가가 저장되었습니다.' });
        }
      );
    });
  });
});

// 문의 접수: 사용자가 남긴 계정/상품/신고/채팅 문의를 운영자 확인용으로 저장합니다.
app.post('/api/inquiries', (req, res) => {
  const { user_id, user_email, category, message } = req.body || {};
  const allowedCategories = ['account', 'product', 'report', 'chat', 'other'];
  const inquiryMessage = String(message || '').trim();

  if (!allowedCategories.includes(category) || !inquiryMessage) {
    return res.status(400).json({ message: '문의 유형과 내용을 입력해주세요.' });
  }

  ensureInquiriesTable((tableErr) => {
    if (tableErr) {
      console.error(tableErr);
      return res.status(500).json({ message: '문의 테이블 준비에 실패했습니다.' });
    }

    resolveUserId({ user_id, email: user_email }, (userErr, resolvedUserId) => {
      if (userErr) {
        console.error(userErr);
        return res.status(500).json({ message: '문의자 확인 중 오류가 발생했습니다.' });
      }

      if (!resolvedUserId) {
        return res.status(400).json({ message: '로그인이 필요합니다.' });
      }

      db.query(
        'INSERT INTO inquiries (user_id, category, message) VALUES (?, ?, ?)',
        [resolvedUserId, category, inquiryMessage.slice(0, 1000)],
        (err, result) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ message: '문의 접수 중 오류가 발생했습니다.' });
          }

          res.json({ message: '문의가 접수되었습니다.', inquiry_id: result.insertId });
        }
      );
    });
  });
});

// 관리자 문의 목록: 팀원 관리자만 문의 접수 내역을 확인할 수 있습니다.
app.get('/api/admin/inquiries', (req, res) => {
  const adminEmail = getRequestAdminEmail(req);

  if (!isAdminEmail(adminEmail)) {
    return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
  }

  ensureInquiriesTable((tableErr) => {
    if (tableErr) {
      console.error(tableErr);
      return res.status(500).json({ message: '문의 테이블 준비에 실패했습니다.' });
    }

    const sql = `
      SELECT
        i.*,
        u.nickname AS user_nickname,
        u.name AS user_name,
        u.email AS user_email
      FROM inquiries i
      LEFT JOIN Users u ON u.user_id = i.user_id
      ORDER BY i.status = 'pending' DESC, i.created_at DESC
    `;

    queryWithTimeout(sql, (err, inquiries) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: '문의 목록을 불러오지 못했습니다.' });
      }

      res.json(inquiries);
    });
  });
});

// 관리자 문의 처리: 문의 상태와 관리자 메모를 저장합니다.
app.put('/api/admin/inquiries/:id', (req, res) => {
  const adminEmail = getRequestAdminEmail(req);
  const { status, admin_memo } = req.body || {};
  const allowedStatuses = ['pending', 'reviewing', 'answered', 'closed'];

  if (!isAdminEmail(adminEmail)) {
    return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
  }

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: '문의 상태 값을 확인해주세요.' });
  }

  ensureInquiriesTable((tableErr) => {
    if (tableErr) {
      console.error(tableErr);
      return res.status(500).json({ message: '문의 테이블 준비에 실패했습니다.' });
    }

    db.query(
      'UPDATE inquiries SET status = ?, admin_memo = ? WHERE id = ?',
      [status, String(admin_memo || '').trim() || null, req.params.id],
      (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: '문의 처리 저장에 실패했습니다.' });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ message: '문의를 찾을 수 없습니다.' });
        }

        res.json({ message: '문의 처리가 저장되었습니다.' });
      }
    );
  });
});

// 관리자 신고 목록: 지정된 팀원 이메일만 신고 목록을 확인할 수 있습니다.
app.get('/api/admin/reports', (req, res) => {
  const adminEmail = getRequestAdminEmail(req);

  if (!isAdminEmail(adminEmail)) {
    return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
  }

  ensureReportsTable((tableErr) => {
    if (tableErr) {
      console.error(tableErr);
      return res.status(500).json({ message: '신고 테이블 준비에 실패했습니다.' });
    }

    const sql = `
      SELECT
        r.*,
        reporter.nickname AS reporter_nickname,
        reporter.email AS reporter_email,
        targetUser.nickname AS target_user_nickname,
        targetUser.email AS target_user_email,
        targetProduct.title AS target_product_title,
        targetProduct.seller_id AS target_product_seller_id
      FROM reports r
      LEFT JOIN Users reporter ON reporter.user_id = r.reporter_id
      LEFT JOIN Users targetUser ON r.target_type = 'user' AND targetUser.user_id = r.target_id
      LEFT JOIN products targetProduct ON r.target_type = 'product' AND targetProduct.id = r.target_id
      ORDER BY r.status = 'pending' DESC, r.created_at DESC
    `;

    queryWithTimeout(sql, (err, reports) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: '신고 목록을 불러오지 못했습니다.' });
      }

      res.json(reports);
    });
  });
});

// 관리자 신고 처리: 팀원 관리자만 신고 상태와 조치를 저장할 수 있습니다.
app.put('/api/admin/reports/:id', (req, res) => {
  const adminEmail = getRequestAdminEmail(req);
  const { status, admin_action } = req.body || {};
  const allowedStatuses = ['pending', 'reviewed', 'resolved', 'rejected'];
  const allowedActions = ['', 'none', 'hide_product', 'show_product', 'warn_user', 'restrict_user'];

  if (!isAdminEmail(adminEmail)) {
    return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
  }

  if (!allowedStatuses.includes(status) || !allowedActions.includes(admin_action || '')) {
    return res.status(400).json({ message: '처리 상태나 조치 값을 확인해주세요.' });
  }

  ensureReportsTable((tableErr) => {
    if (tableErr) {
      console.error(tableErr);
      return res.status(500).json({ message: '신고 테이블 준비에 실패했습니다.' });
    }

    db.query('SELECT * FROM reports WHERE id = ?', [req.params.id], (selectErr, reports) => {
      if (selectErr) {
        console.error(selectErr);
        return res.status(500).json({ message: '신고 정보를 불러오지 못했습니다.' });
      }

      if (reports.length === 0) {
        return res.status(404).json({ message: '신고를 찾을 수 없습니다.' });
      }

      const report = reports[0];
      const finish = () => {
        db.query(
          'UPDATE reports SET status = ?, admin_action = ? WHERE id = ?',
          [status, admin_action || 'none', req.params.id],
          (updateErr) => {
            if (updateErr) {
              console.error(updateErr);
              return res.status(500).json({ message: '신고 처리 중 DB 오류가 발생했습니다.' });
            }

            res.json({ message: '신고 처리가 저장되었습니다.' });
          }
        );
      };

      if (admin_action === 'hide_product' || admin_action === 'show_product') {
        const productStatus = admin_action === 'hide_product' ? 'hidden' : 'visible';

        ensureProductModerationColumn((columnErr) => {
          if (columnErr) {
            console.error(columnErr);
            return res.status(500).json({ message: '상품 제재 컬럼 준비에 실패했습니다.' });
          }

          const updateProductModeration = (sql, values) => {
            db.query(sql, values, (productErr, result) => {
              if (productErr) {
                console.error(productErr);
                return res.status(500).json({ message: '상품 제재 처리에 실패했습니다.' });
              }

              if (result.affectedRows === 0) {
                return res.status(404).json({ message: '숨김 처리할 상품을 찾지 못했습니다.' });
              }

              finish();
            });
          };

          // 상품 신고는 해당 상품만, 사용자 신고는 해당 사용자의 상품 전체를 숨김/공개 처리합니다.
          if (report.target_type === 'product') {
            updateProductModeration(
              'UPDATE products SET moderation_status = ? WHERE id = ?',
              [productStatus, report.target_id]
            );
            return;
          }

          if (report.target_type === 'user') {
            updateProductModeration(
              'UPDATE products SET moderation_status = ? WHERE seller_id = ?',
              [productStatus, report.target_id]
            );
            return;
          }

          finish();
        });
        return;
      }

      if (admin_action === 'warn_user' || admin_action === 'restrict_user') {
        const accountStatus = admin_action === 'restrict_user' ? 'restricted' : 'warned';

        ensureUserModerationColumn((columnErr) => {
          if (columnErr) {
            console.error(columnErr);
            return res.status(500).json({ message: '사용자 제재 컬럼 준비에 실패했습니다.' });
          }

          const updateUserStatus = (targetUserId) => {
            if (!targetUserId) {
              finish();
              return;
            }

            db.query(
              'UPDATE Users SET account_status = ? WHERE user_id = ?',
              [accountStatus, targetUserId],
              (userErr) => {
                if (userErr) {
                  console.error(userErr);
                  return res.status(500).json({ message: '사용자 제재 처리에 실패했습니다.' });
                }

                finish();
              }
            );
          };

          if (report.target_type === 'user') {
            updateUserStatus(report.target_id);
            return;
          }

          if (report.target_type === 'product') {
            db.query('SELECT seller_id FROM products WHERE id = ?', [report.target_id], (productErr, products) => {
              if (productErr) {
                console.error(productErr);
                return res.status(500).json({ message: '상품 판매자 확인에 실패했습니다.' });
              }

              updateUserStatus(products[0] && products[0].seller_id);
            });
            return;
          }

          finish();
        });
        return;
      }

      finish();
    });
  });
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

app.get('/api/products/:id/like', (req, res) => {
  const productId = req.params.id;

  ensureProductLikesTable((tableErr) => {
    if (tableErr) return res.status(500).json({ message: '관심목록 준비 실패' });

    resolveUserId(req.query, (userErr, userId) => {
      if (userErr) return res.status(500).json({ message: '사용자 확인 실패' });
      if (!userId) return res.json({ liked: false });

      db.query(
        'SELECT id FROM product_likes WHERE user_id = ? AND product_id = ?',
        [userId, productId],
        (err, rows) => {
          if (err) return res.status(500).json({ message: '관심 상태 확인 실패' });
          res.json({ liked: rows.length > 0 });
        }
      );
    });
  });
});

app.post('/api/products/:id/like', (req, res) => {
  const productId = req.params.id;

  ensureProductLikesTable((tableErr) => {
    if (tableErr) return res.status(500).json({ message: '관심목록 준비 실패' });

    resolveUserId(req.body, (userErr, userId) => {
      if (userErr) return res.status(500).json({ message: '사용자 확인 실패' });
      if (!userId) return res.status(400).json({ message: '로그인이 필요합니다.' });

      db.query(
        'INSERT IGNORE INTO product_likes (user_id, product_id) VALUES (?, ?)',
        [userId, productId],
        (err) => {
          if (err) return res.status(500).json({ message: '관심 등록 실패' });

          refreshProductLikeCount(productId, (countErr) => {
            if (countErr) return res.status(500).json({ message: '관심 수 갱신 실패' });
            res.json({ message: '관심 등록 완료' });
          });
        }
      );
    });
  });
});

// 1. 동아리 개설 API (클라이언트에서 데이터 받아 DB에 저장 + 회장 자동 가입)
app.post('/api/clubs', (req, res) => {
  const { 
    clubName, clubCategory, clubTagline, intro, 
    clubMeet, clubLocation, meetingInfo, feeAmount, 
    feeInfo, eligibilityAndTips, leader_id, images
  } = req.body;

  // 로그인된 유저(leader_id)가 제대로 넘어왔는지 확인
  if (!leader_id) {
    return res.status(400).json({ message: '회장(로그인 사용자) 정보가 없습니다.' });
  }

 const sql = `
    INSERT INTO Clubs 
    (leader_id, name, category, tagline, intro, meet_time, location, meeting_info, fee_amount, fee_info, eligibility, images) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const values = [
    leader_id, clubName, clubCategory, clubTagline, intro, 
    clubMeet, clubLocation, meetingInfo, feeAmount, feeInfo, eligibilityAndTips, JSON.stringify(images || [])
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('동아리 개설 DB 에러:', err);
      return res.status(500).json({ message: '동아리 개설 중 DB 오류가 발생했습니다.' });
    }
    
    // ✨ 1단계 성공: 새로 생성된 동아리의 고유 ID를 가져옵니다.
    const newClubId = result.insertId;

    // 👑 2단계: 개설한 회장을 부원 명단(Club_Members)에 'APPROVED'로 자동 등록!
    const memberSql = `
      INSERT INTO Club_Members (club_id, user_id, status)
      VALUES (?, ?, 'APPROVED')
    `;

    db.query(memberSql, [newClubId, leader_id], (memberErr) => {
      if (memberErr) {
        console.error('회장 자동 가입 에러:', memberErr);
        // 동아리는 만들어졌으니 에러 로그만 남기고 넘어갑니다.
      }
      
      // 개설 성공 시, 새로 만들어진 동아리의 ID를 프론트로 돌려줌
      res.json({ 
        message: '동아리가 성공적으로 개설되었으며, 회장으로 자동 등록되었습니다! 👑', 
        club_id: newClubId 
      });
    });
  });
});

// 2. 동아리 목록 불러오기 API (클라이언트에 DB 데이터 전달)
app.get('/api/clubs', (req, res) => {
  const sql = `
    SELECT c.*, u.name AS leader_name, u.nickname AS leader_nickname 
    FROM Clubs c 
    LEFT JOIN Users u ON c.leader_id = u.user_id 
    ORDER BY c.created_at DESC
  `;
  
  // 기존에 만들어두신 queryWithTimeout 함수 활용
  queryWithTimeout(sql, (err, results) => {
    if (err) {
      console.error('동아리 목록 조회 DB 에러:', err);
      return res.status(500).json({ message: '동아리 목록을 불러오는 중 오류가 발생했습니다.' });
    }
    res.json(results);
  });
});

// 3. 특정 동아리 상세 정보 불러오기 API
app.get('/api/clubs/:id', (req, res) => {
  const clubId = req.params.id; // 주소창에서 동아리 번호 뽑아오기
  
  const sql = `
    SELECT c.*, u.name AS leader_name, u.nickname AS leader_nickname, u.department AS leader_department
    FROM Clubs c
    LEFT JOIN Users u ON c.leader_id = u.user_id
    WHERE c.club_id = ?
  `;
  
  queryWithTimeout(sql, [clubId], (err, results) => {
    if (err) {
      console.error('동아리 상세 조회 DB 에러:', err);
      return res.status(500).json({ message: '동아리 정보를 불러오는 중 오류가 발생했습니다.' });
    }
    
    // 동아리가 삭제되었거나 없는 번호일 경우
    if (results.length === 0) {
      return res.status(404).json({ message: '해당 동아리를 찾을 수 없습니다.' });
    }
    
    // 성공적으로 찾았으면 딱 1개의 동아리 정보(results[0])만 프론트로 던져줌!
    res.json(results[0]);
  });
});

// 4. 내가 가입한(회장이거나 승인된 부원인) 동아리 목록 불러오기 API
app.get('/api/users/:userId/my-clubs', (req, res) => {
  const userId = req.params.userId;
  
  // c(Clubs)와 cm(Club_Members)을 사용해 기존 코드와 완벽하게 통일!
  const sql = `
    SELECT DISTINCT c.* FROM Clubs c
    LEFT JOIN Club_Members cm ON c.club_id = cm.club_id
    WHERE c.leader_id = ? OR (cm.user_id = ? AND cm.status = 'APPROVED')
    ORDER BY c.created_at DESC
  `;
  
  queryWithTimeout(sql, [userId, userId], (err, results) => {
    if (err) {
      console.error('내 동아리 조회 DB 에러:', err);
      return res.status(500).json({ message: '내 동아리를 불러오는 중 오류가 발생했습니다.' });
    }
    res.json(results);
  });
});
// 5. 동아리 가입 신청 API
app.post('/api/clubs/:clubId/apply', (req, res) => {
  const clubId = req.params.clubId;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: '로그인 정보가 없습니다.' });
  }

  const tableName = 'Club_Members'; 

  // 👑 0단계: 내가 이 동아리 회장인지 먼저 검사!
  const checkLeaderSql = `SELECT leader_id FROM Clubs WHERE club_id = ?`;
  
  queryWithTimeout(checkLeaderSql, [clubId], (leaderErr, leaderResults) => {
    if (leaderErr) {
      console.error('회장 검사 DB 에러:', leaderErr);
      return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }

    // DB에 동아리가 있고, 접속한 사람(userId)이 회장(leader_id)이랑 똑같다면 컷!
    if (leaderResults.length > 0 && leaderResults[0].leader_id == userId) {
      return res.status(400).json({ message: '회장님은 이미 이 동아리의 주인이십니다! 👑' });
    }

    // 1단계: 이미 신청했거나 멤버인지 중복 검사
    const checkSql = `SELECT * FROM ${tableName} WHERE club_id = ? AND user_id = ?`;
    
    queryWithTimeout(checkSql, [clubId, userId], (checkErr, checkResults) => {
      if (checkErr) {
        console.error('가입 중복 검사 DB 에러:', checkErr);
        return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
      }
      
      if (checkResults.length > 0) {
        return res.status(400).json({ message: '이미 가입 신청을 했거나 소속된 동아리입니다! 😅' });
      }

      // 2단계: 문제없으면 가입 대기(PENDING) 상태로 쾅!
      const insertSql = `INSERT INTO ${tableName} (club_id, user_id) VALUES (?, ?)`;
      
      queryWithTimeout(insertSql, [clubId, userId], (insertErr, results) => {
        if (insertErr) {
          console.error('가입 신청 DB 에러:', insertErr);
          return res.status(500).json({ message: '가입 신청 중 오류가 발생했습니다.' });
        }
        res.json({ message: '가입 신청이 성공적으로 완료되었습니다! 🎉' });
      });
    });
  });
});

// 6. 동아리 가입 신청자(PENDING) 목록 불러오기 API
app.get('/api/clubs/:clubId/pending-members', (req, res) => {
  const clubId = req.params.clubId;
  
  // Club_Members 테이블과 Users 테이블을 조인해서 신청자의 이름과 학번까지 가져옵니다.
  const sql = `
    SELECT cm.user_id, cm.status, u.name, u.student_id 
    FROM Club_Members cm
    JOIN Users u ON cm.user_id = u.user_id
    WHERE cm.club_id = ? AND cm.status = 'PENDING'
  `;
  
  queryWithTimeout(sql, [clubId], (err, results) => {
    if (err) {
      console.error('신청자 목록 DB 에러:', err);
      return res.status(500).json({ message: '신청자 목록을 불러오지 못했습니다.' });
    }
    res.json(results);
  });
});

// 7. 동아리 가입 승인 API
app.put('/api/clubs/:clubId/members/:userId/approve', (req, res) => {
  const { clubId, userId } = req.params;
  
  // 상태를 PENDING(대기)에서 APPROVED(승인)로 업데이트!
  const sql = `UPDATE Club_Members SET status = 'APPROVED' WHERE club_id = ? AND user_id = ?`;
  
  queryWithTimeout(sql, [clubId, userId], (err) => {
    if (err) {
      console.error('가입 승인 DB 에러:', err);
      return res.status(500).json({ message: '승인 처리 중 오류가 발생했습니다.' });
    }
    res.json({ message: '부원 가입이 승인되었습니다! 🎉' });
  });
});

// 8. 동아리 소식(게시글) 작성 API
app.post('/api/club-posts', (req, res) => {
  const { author_id, post_type, category, title, content, images } = req.body; // ✨ images 추가

  if (!author_id) {
    return res.status(400).json({ message: '로그인이 필요합니다.' });
  }

  // 1단계: 글쓴이(author_id)가 회장으로 있는 동아리의 번호(club_id)를 몰래 찾아옵니다!
  const findClubSql = 'SELECT club_id FROM Clubs WHERE leader_id = ?';

  queryWithTimeout(findClubSql, [author_id], (findErr, clubs) => {
    if (findErr) {
      console.error('동아리 찾기 에러:', findErr);
      return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }

    if (clubs.length === 0) {
      return res.status(403).json({ message: '동아리 회장님만 글을 쓸 수 있습니다!' });
    }

    const clubId = clubs[0].club_id; // 찾은 동아리 번호

    // 2단계: 찾아낸 club_id와 함께 Club_Posts 테이블에 글을 등록합니다!
    const insertSql = `
      INSERT INTO Club_Posts (club_id, author_id, post_type, category, title, content, images)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    queryWithTimeout(insertSql, [clubId, author_id, post_type, category, title, content, JSON.stringify(images || [])], (insertErr) => {
      if (insertErr) {
        console.error('게시글 등록 DB 에러:', insertErr);
        return res.status(500).json({ message: '글 등록 중 오류가 발생했습니다.' });
      }
      res.json({ message: '동아리 소식이 성공적으로 등록되었습니다! 🎉' });
    });
  });
});

// 9. 캠퍼스 소식통(전체 게시글) 불러오기 API
app.get('/api/club-posts', (req, res) => {
  // 💡 센스 포인트: post_type이 'PUBLIC(전체 홍보)'인 글만 가져옵니다! 
  // (INTERNAL(내부 공지)은 나중에 내 동아리 상세 페이지에서만 보이게 할 겁니다)
  const sql = `
    SELECT cp.*, c.name AS club_name, u.name AS author_name 
    FROM Club_Posts cp
    JOIN Clubs c ON cp.club_id = c.club_id
    JOIN Users u ON cp.author_id = u.user_id
    WHERE cp.post_type = 'PUBLIC'
    ORDER BY cp.created_at DESC
  `;
  
  queryWithTimeout(sql, (err, results) => {
    if (err) {
      console.error('게시글 목록 DB 에러:', err);
      return res.status(500).json({ message: '소식을 불러오는 중 오류가 발생했습니다.' });
    }
    res.json(results);
  });
});

// 10. 특정 소식(게시글) 상세 보기 API
app.get('/api/club-posts/:postId', (req, res) => {
  const postId = req.params.postId;
  
  // 글 정보와 함께, 이 글을 쓴 동아리의 이름(club_name)과 번호(club_id)도 같이 가져옵니다.
  const sql = `
    SELECT cp.*, c.name AS club_name, c.club_id 
    FROM Club_Posts cp
    JOIN Clubs c ON cp.club_id = c.club_id
    WHERE cp.post_id = ?
  `;
  
  queryWithTimeout(sql, [postId], (err, results) => {
    if (err) {
      console.error('게시글 상세 조회 DB 에러:', err);
      return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ message: '해당 글을 찾을 수 없습니다.' });
    }
    
    // 딱 1개의 글 데이터만 프론트로 보냅니다.
    res.json(results[0]);
  });
});

// 11. 동아리 내부 공지 불러오기 API (철통 보안! 부원/회장 전용)
app.get('/api/clubs/:clubId/internal-posts', (req, res) => {
  const clubId = req.params.clubId;
  const userId = req.query.userId; // 프론트엔드에서 보내준 내 신분증 번호

  if (!userId) {
    return res.status(403).json({ message: '로그인이 필요합니다.' });
  }

  // 1. 일반 부원(APPROVED 상태)인지 먼저 검사합니다. (Club_Members 테이블)
  const checkMemberSql = `SELECT * FROM Club_Members WHERE club_id = ? AND user_id = ? AND status = 'APPROVED'`;
  
  queryWithTimeout(checkMemberSql, [clubId, userId], (checkErr, members) => {
    if (checkErr) return res.status(500).json({ message: '권한 확인 중 오류가 발생했습니다.' });

    // 2. 부원이 아니면 혹시 이 동아리 회장님인지 검사합니다. (Clubs 테이블)
    const checkLeaderSql = `SELECT * FROM Clubs WHERE club_id = ? AND leader_id = ?`;
    
    queryWithTimeout(checkLeaderSql, [clubId, userId], (leaderErr, leaders) => {
      if (leaderErr) return res.status(500).json({ message: '권한 확인 중 오류가 발생했습니다.' });
      
      // 부원 명단에도 없고 회장도 아니면 바로 쫓아냅니다! 🔒
      if (members.length === 0 && leaders.length === 0) {
        return res.status(403).json({ message: '동아리 부원만 볼 수 있는 공지입니다.' });
      }

      // 권한 검사 통과! 내부 공지(INTERNAL)만 모아서 보내줍니다.
      const postSql = `
        SELECT cp.*, u.name AS author_name 
        FROM Club_Posts cp
        JOIN Users u ON cp.author_id = u.user_id
        WHERE cp.club_id = ? AND cp.post_type = 'INTERNAL'
        ORDER BY cp.created_at DESC
      `;

      queryWithTimeout(postSql, [clubId], (postErr, posts) => {
        if (postErr) return res.status(500).json({ message: '공지를 불러오지 못했습니다.' });
        res.json(posts);
      });
    });
  });
});

// 12. 동아리 승인된 부원(기존 부원) 목록 불러오기 API (회장님 강제 포함)
app.get('/api/clubs/:clubId/approved-members', (req, res) => {
  const clubId = req.params.clubId;
  
  // c(Clubs), cm(Club_Members), u(Users) 기존 별칭 스타일 그대로 유지!
  const sql = `
    SELECT u.user_id, 'APPROVED' AS status, u.name, u.student_id 
    FROM Clubs c
    JOIN Users u ON c.leader_id = u.user_id
    WHERE c.club_id = ?
    UNION
    SELECT cm.user_id, cm.status, u.name, u.student_id 
    FROM Club_Members cm
    JOIN Users u ON cm.user_id = u.user_id
    WHERE cm.club_id = ? AND cm.status = 'APPROVED'
  `;
  
  queryWithTimeout(sql, [clubId, clubId], (err, results) => {
    if (err) return res.status(500).json({ message: '부원 목록 DB 에러' });
    res.json(results);
  });
});

// 13. 동아리 부원 뱃지 회수(추방) API
app.delete('/api/clubs/:clubId/members/:userId', (req, res) => {
  const { clubId, userId } = req.params;
  const sql = `DELETE FROM Club_Members WHERE club_id = ? AND user_id = ?`;
  
  queryWithTimeout(sql, [clubId, userId], (err) => {
    if (err) return res.status(500).json({ message: '뱃지 회수 중 오류가 발생했습니다.' });
    res.json({ message: '해당 부원의 인증 뱃지가 회수(내보내기) 되었습니다.' });
  });
});

// 14. 동아리 폐부(삭제) API - CASCADE 덕분에 소식/부원 데이터도 자동 삭제됨!
app.delete('/api/clubs/:clubId', (req, res) => {
  const clubId = req.params.clubId;
  const sql = 'DELETE FROM Clubs WHERE club_id = ?';

  queryWithTimeout(sql, [clubId], (err) => {
    if (err) return res.status(500).json({ message: '폐부 처리 중 오류가 발생했습니다.' });
    res.json({ message: '동아리가 안전하게 폐부되었습니다. 그동안 고생 많으셨습니다!' });
  });
});

// 15. 회장 권한 상속(leader_id 변경) API
app.put('/api/clubs/:clubId/transfer', (req, res) => {
  const { clubId } = req.params;
  const { newLeaderId } = req.body;

  if (!newLeaderId) return res.status(400).json({ message: '새로운 회장을 선택해주세요.' });

  const sql = 'UPDATE Clubs SET leader_id = ? WHERE club_id = ?';

  queryWithTimeout(sql, [newLeaderId, clubId], (err) => {
    if (err) return res.status(500).json({ message: '권한 승계 중 오류가 발생했습니다.' });
    res.json({ message: '회장 권한이 성공적으로 상속되었습니다. 새로운 시작을 응원합니다!' });
  });
});

// 16. 동아리 프로필 정보 수정 API
app.put('/api/clubs/:clubId', (req, res) => {
  const clubId = req.params.clubId;
  // ✨ req.body에 images 추가
  const { tagline, intro, meet_time, location, meeting_info, fee_amount, fee_info, eligibility, images } = req.body;

  // ✨ SET 쿼리에 images = ? 추가
  const sql = `
    UPDATE Clubs 
    SET tagline = ?, intro = ?, meet_time = ?, location = ?, meeting_info = ?, fee_amount = ?, fee_info = ?, eligibility = ?, images = ?
    WHERE club_id = ?
  `;

  // ✨ values 배열에 JSON.stringify(images || []) 추가
  queryWithTimeout(sql, [tagline, intro, meet_time, location, meeting_info, fee_amount || 0, fee_info, eligibility, JSON.stringify(images || []), clubId], (err) => {
    if (err) {
      console.error('프로필 수정 에러:', err);
      return res.status(500).json({ message: '프로필 수정 중 오류가 발생했습니다.' });
    }
    res.json({ message: '동아리 프로필이 성공적으로 업데이트되었습니다! ✨' });
  });
});

// 17. 가입 거절 API (server.js 하단 추가)
app.delete('/api/clubs/:clubId/members/:userId/reject', (req, res) => {
  const { clubId, userId } = req.params;
  const sql = `DELETE FROM Club_Members WHERE club_id = ? AND user_id = ? AND status = 'PENDING'`;
  queryWithTimeout(sql, [clubId, userId], (err) => {
    if (err) return res.status(500).json({ message: '거절 처리 중 오류가 발생했습니다.' });
    res.json({ message: '가입 신청이 거절되었습니다.' });
  });
});

// 18. 특정 동아리 소식(게시글) 삭제 API
app.delete('/api/club-posts/:postId', (req, res) => {
  const postId = req.params.postId;
  
  const sql = 'DELETE FROM Club_Posts WHERE post_id = ?';
  
  db.query(sql, [postId], (err, result) => {
    if (err) {
      console.error('게시글 삭제 DB 에러:', err);
      return res.status(500).json({ message: '게시글 삭제 중 오류가 발생했습니다.' });
    }
    res.json({ message: '해당 공지가 성공적으로 삭제되었습니다. 🗑️' });
  });
});

app.delete('/api/products/:id/like', (req, res) => {
  const productId = req.params.id;

  ensureProductLikesTable((tableErr) => {
    if (tableErr) return res.status(500).json({ message: '관심목록 준비 실패' });

    resolveUserId(req.body, (userErr, userId) => {
      if (userErr) return res.status(500).json({ message: '사용자 확인 실패' });
      if (!userId) return res.status(400).json({ message: '로그인이 필요합니다.' });

      db.query(
        'DELETE FROM product_likes WHERE user_id = ? AND product_id = ?',
        [userId, productId],
        (err) => {
          if (err) return res.status(500).json({ message: '관심 해제 실패' });

          refreshProductLikeCount(productId, (countErr) => {
            if (countErr) return res.status(500).json({ message: '관심 수 갱신 실패' });
            res.json({ message: '관심 해제 완료' });
          });
        }
      );
    });
  });
});

app.delete('/api/products/:id', (req, res) => {
  const productId = req.params.id;
  const { seller_id, seller_email } = req.body || {};

  const deleteProduct = (resolvedSellerId) => {
    if (!resolvedSellerId) {
      return res.status(400).json({ message: '판매자 정보를 확인하지 못했습니다.' });
    }

    db.query(
      'DELETE FROM products WHERE id = ? AND seller_id = ?',
      [productId, resolvedSellerId],
      (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: '상품 삭제 중 DB 오류가 발생했습니다.' });
        }

        if (result.affectedRows === 0) {
          return res.status(403).json({ message: '본인이 등록한 상품만 삭제할 수 있습니다.' });
        }

        res.json({ message: '상품이 삭제되었습니다.' });
      }
    );
  };

  if (seller_id) {
    deleteProduct(seller_id);
    return;
  }

  if (!seller_email) {
    deleteProduct(null);
    return;
  }

  db.query('SELECT user_id FROM Users WHERE email = ?', [seller_email], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: '사용자 확인 중 DB 오류가 발생했습니다.' });
    }

    deleteProduct(results[0] && results[0].user_id);
  });
});

// 판매완료 처리: 상품 판매자 본인인지 확인한 뒤 status 값을 변경합니다.
app.put('/api/products/:id/status', (req, res) => {
  const productId = req.params.id;
  const { seller_id, seller_email, status } = req.body || {};
  const allowedStatuses = ['판매중', '예약중', '판매완료'];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: '변경할 수 없는 상품 상태입니다.' });
  }

  const updateStatus = (resolvedSellerId) => {
    if (!resolvedSellerId) {
      return res.status(400).json({ message: '판매자 정보를 확인하지 못했습니다.' });
    }

    ensureProductLifecycleColumns((columnErr) => {
      if (columnErr) {
        console.error(columnErr);
        return res.status(500).json({ message: '상품 상태 컬럼 준비에 실패했습니다.' });
      }

      // 판매완료가 된 시점을 저장해 7일 뒤 일반 상품 목록에서 숨길 기준으로 사용합니다.
      const updateSql = status === '판매완료'
        ? 'UPDATE products SET status = ?, sold_at = COALESCE(sold_at, NOW()) WHERE id = ? AND seller_id = ?'
        : 'UPDATE products SET status = ?, sold_at = NULL WHERE id = ? AND seller_id = ?';

      db.query(
        updateSql,
        [status, productId, resolvedSellerId],
        (err, result) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ message: '상품 상태 변경 중 DB 오류가 발생했습니다.' });
          }

          if (result.affectedRows === 0) {
            return res.status(403).json({ message: '본인이 등록한 상품만 상태를 변경할 수 있습니다.' });
          }

          res.json({ message: '상품 상태가 변경되었습니다.', status });
        }
      );
    });
  };

  if (seller_id) {
    updateStatus(seller_id);
    return;
  }

  if (!seller_email) {
    updateStatus(null);
    return;
  }

  db.query('SELECT user_id FROM Users WHERE email = ?', [seller_email], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: '사용자 확인 중 DB 오류가 발생했습니다.' });
    }

    updateStatus(results[0] && results[0].user_id);
  });
});

app.delete('/api/products/legacy/orphans', (req, res) => {
  const cleanupKey = req.headers['x-cleanup-key'];

  if (cleanupKey !== 'delete-orphan-products') {
    return res.status(403).json({ message: '정리 권한이 없습니다.' });
  }

  db.query('DELETE FROM products WHERE seller_id IS NULL', (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: '기존 상품 정리 실패' });
    }

    res.json({ message: '기존 상품을 정리했습니다.', deletedCount: result.affectedRows });
  });
});

// DB 연결 테스트
db.getConnection((err, connection) => {
    if (err) {
        console.log('DB 연결 실패 ㅠㅠ 원인:', err);
    } else {
        console.log('MySQL 데이터베이스 연결 성공!');
        connection.release();
        ensureUserCollegeColumn((columnErr) => {
          if (columnErr) {
            console.log('Users college 컬럼 준비 실패:', columnErr);
          }
        });
        ensureProductTargetColumns((columnErr) => {
          if (columnErr) {
            console.log('products target 컬럼 준비 실패:', columnErr);
          }
        });
        ensureProductLocationColumns((columnErr) => {
          if (columnErr) {
            console.log('products location 컬럼 준비 실패:', columnErr);
          }
        });
        ensureReportsTable((tableErr) => {
          if (tableErr) {
            console.log('reports 테이블 준비 실패:', tableErr);
          }
        });
        ensureTradeReviewsTable((tableErr) => {
          if (tableErr) {
            console.log('trade_reviews 테이블 준비 실패:', tableErr);
          }
        });
        ensureInquiriesTable((tableErr) => {
          if (tableErr) {
            console.log('inquiries 테이블 준비 실패:', tableErr);
          }
        });
        ensureUserModerationColumn((columnErr) => {
          if (columnErr) {
            console.log('Users 제재 컬럼 준비 실패:', columnErr);
          }
        });
        ensureProductModerationColumn((columnErr) => {
          if (columnErr) {
            console.log('products 제재 컬럼 준비 실패:', columnErr);
          }
        });
    }
});

// 2. 길(API) 터주기: 이 주소로 접속하면 DB에서 데이터를 꺼내줌
app.get('/api/users', (req, res) => {
    const sql = "SELECT user_id, student_id, email, name, nickname, college, department FROM Users WHERE COALESCE(account_status, 'active') <> 'deleted'";

    queryWithTimeout(sql, (err, results) => {
        if (err) {
            res.status(500).send('데이터 가져오기 에러');
        } else {
            res.json(results); 
        }
    });
});

app.get('/messages/:roomId', (req, res) => {
  const roomId = req.params.roomId;

  db.query(
    'SELECT * FROM messages WHERE room_id = ? ORDER BY created_at ASC',
    [roomId],
    (err, results) => {
      if (err) return res.status(500).send(err);
      res.json(results);
    }
  );
});

app.post('/messages', (req, res) => {
  const { room_id, sender_id, message } = req.body;

  if (!room_id || !sender_id || !message) {
    return res.status(400).json({
      message: '필수값 누락'
    });
  }

  const sql = `
    INSERT INTO messages (room_id, sender_id, message)
    VALUES (?, ?, ?)
  `;

  db.query(sql, [room_id, sender_id, message], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send(err);
    }

    res.json({
      message: '메시지 저장 완료',
      id: result.insertId
    });
  });
});

app.get('/api/users/:id', (req, res) => {
    const sql = "SELECT user_id, student_id, email, name, nickname, college, department FROM Users WHERE user_id = ? AND COALESCE(account_status, 'active') <> 'deleted'";

    queryWithTimeout(sql, [req.params.id], (err, results) => {
        if (err) return res.status(500).send('데이터 가져오기 에러');
        if (results.length === 0) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        res.json(results[0]);
    });
});

app.put('/api/users/:id', (req, res) => {
    const { name, nickname, college, department, currentPassword, newPassword } = req.body;
    const values = [name, nickname, department, college || null];
    let sql = 'UPDATE Users SET name = ?, nickname = ?, department = ?, college = COALESCE(?, college)';

    if (newPassword) {
        if (!currentPassword) {
            return res.status(400).json({ message: '현재 비밀번호를 입력해주세요.' });
        }

        db.query(
            'SELECT password FROM Users WHERE user_id = ?',
            [req.params.id],
            (selectErr, users) => {
                if (selectErr) return res.status(500).json({ message: '사용자 확인 실패' });
                if (users.length === 0) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
                if (users[0].password !== currentPassword) {
                    return res.status(400).json({ message: '현재 비밀번호가 일치하지 않습니다.' });
                }

                db.query(
                    'UPDATE Users SET name = ?, nickname = ?, department = ?, college = COALESCE(?, college), password = ? WHERE user_id = ?',
                    [name, nickname, department, college || null, newPassword, req.params.id],
                    (updateErr) => {
                        if (updateErr) return res.status(500).json({ message: '계정 정보 수정 실패' });
                        res.json({ message: '계정 정보가 수정되었습니다.' });
                    }
                );
            }
        );
        return;
    }

    sql += ' WHERE user_id = ?';
    values.push(req.params.id);

    db.query(sql, values, (err) => {
        if (err) return res.status(500).json({ message: '계정 정보 수정 실패' });
        res.json({ message: '계정 정보가 수정되었습니다.' });
    });
});

// 회원 탈퇴: 사용자 정보는 보관하되 계정은 비활성화하고 등록 상품은 숨김 처리합니다.
app.delete('/api/users/:id', (req, res) => {
    const userId = Number(req.params.id);
    const { email } = req.body || {};

    if (!userId) {
        return res.status(400).json({ message: '사용자 정보가 필요합니다.' });
    }

    ensureModerationSchema((schemaErr) => {
        if (schemaErr) {
            console.error(schemaErr);
            return res.status(500).json({ message: '탈퇴 처리 준비 중 오류가 발생했습니다.' });
        }

        db.query(
            'SELECT user_id, email, account_status FROM Users WHERE user_id = ?',
            [userId],
            (selectErr, users) => {
                if (selectErr) return res.status(500).json({ message: '사용자 확인 실패' });
                if (users.length === 0) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
                if (email && users[0].email !== email) {
                    return res.status(403).json({ message: '본인 계정만 탈퇴할 수 있습니다.' });
                }

                db.query(
                    "UPDATE Users SET account_status = 'deleted' WHERE user_id = ?",
                    [userId],
                    (updateUserErr) => {
                        if (updateUserErr) return res.status(500).json({ message: '계정 탈퇴 처리 실패' });

                        db.query(
                            "UPDATE products SET moderation_status = 'hidden' WHERE seller_id = ?",
                            [userId],
                            (updateProductErr) => {
                                if (updateProductErr) return res.status(500).json({ message: '등록 상품 숨김 처리 실패' });
                                res.json({ message: '탈퇴 처리가 완료되었습니다.' });
                            }
                        );
                    }
                );
            }
        );
    });
});

// 유저의 기기별 푸시 알림 토큰(FCM Token)을 DB에 저장하는 API
app.post('/api/save-fcm-token', (req, res) => {
  const { user_id, token } = req.body;

  if (!user_id || !token) {
    return res.status(400).json({ message: '유저 ID와 토큰이 필요합니다.' });
  }

  db.query(
    'UPDATE Users SET fcm_token = ? WHERE user_id = ?',
    [token, user_id],
    (err, result) => {
      if (err) {
        console.error('FCM 토큰 저장 중 DB 에러:', err);
        return res.status(500).json({ message: 'DB에 토큰을 저장하지 못했습니다.' });
      }
      res.json({ success: true, message: '알림 토큰이 성공적으로 저장되었습니다.' });
    }
  );
});

server.listen(PORT, () => {
    console.log(`서버 실행중: ${PORT}`);
});

// 마이페이지 조회: 사용자 정보, 내 상품, 관심목록을 한 번에 구성해 반환합니다.
app.get('/api/mypage', (req, res) => {
  const userId = Number(req.query.userId);

  if (!userId) {
    return res.status(400).json({ message: 'userId가 필요합니다.' });
  }

    db.query(
    'SELECT user_id, email, name, nickname, college, department, account_status FROM Users WHERE user_id = ?',
    [userId],
    (userErr, users) => {
      if (userErr) return res.status(500).send(userErr);
      if (users.length === 0) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
      if (users[0].account_status === 'deleted') return res.status(403).json({ message: '탈퇴 처리된 계정입니다.' });

      const user = users[0];
      const productSql = `
        SELECT
          p.*,
          u.name AS seller_name,
          u.nickname AS seller_nickname,
          u.college AS seller_college,
          u.department AS seller_department,
          u.email AS seller_email
        FROM products p
        LEFT JOIN Users u ON u.user_id = p.seller_id
        WHERE p.seller_id = ?
        ORDER BY p.id DESC
      `;

      db.query(productSql, [userId], (productErr, products) => {
        if (productErr) return res.status(500).send(productErr);

        ensureProductLikesTable((tableErr) => {
          if (tableErr) return res.status(500).json({ message: '관심목록 준비 실패' });

          const likedSql = `
            SELECT
              p.*,
              u.name AS seller_name,
              u.nickname AS seller_nickname,
              u.college AS seller_college,
              u.department AS seller_department,
              u.email AS seller_email
            FROM product_likes l
            JOIN products p ON p.id = l.product_id
            LEFT JOIN Users u ON u.user_id = p.seller_id
            WHERE l.user_id = ?
            ORDER BY l.created_at DESC
          `;

          db.query(likedSql, [userId], (likedErr, liked) => {
            if (likedErr) return res.status(500).send(likedErr);

            const normalizedProducts = products.map(product => ({
              ...product,
              status: normalizeProductStatus(product)
            }));
            const selling = normalizedProducts.filter(product => product.status !== '판매완료');
            const sold = normalizedProducts.filter(product => product.status === '판매완료');

            res.json({
              user: {
                id: user.user_id,
                name: user.nickname || user.name,
                college: user.college,
                department: user.department,
                email: user.email,
                verified: true
              },
              stats: {
                sellingCount: selling.length,
                soldCount: sold.length,
                likedCount: liked.length
              },
              selling,
              sold,
              liked
            });
          });
        });
      });
    }
  );
});

// 채팅 목록: 참여 중인 방, 마지막 메시지, 안 읽은 수를 반환합니다.
app.get('/api/chat-list', (req, res) => {
  const userId = req.query.user_id;

  if (!userId) {
    return res.status(400).json({ message: 'user_id가 필요합니다.' });
  }

  const sql = `
    SELECT 
      r.id AS room_id,
      r.product_id,
      r.club_id,
      r.type,

      CASE
        WHEN r.type = 'club' THEN c.name
        ELSE p.title
      END AS name,

      opponent.nickname AS opponent_nickname,
      opponent.name AS opponent_name,

      (
        SELECT m.text
        FROM messages m
        WHERE m.room_id = r.id
        ORDER BY m.id DESC
        LIMIT 1
      ) AS last_message,

      (
        SELECT m.created_at
        FROM messages m
        WHERE m.room_id = r.id
        ORDER BY m.id DESC
        LIMIT 1
      ) AS last_message_time,

      (
        SELECT COUNT(*)
        FROM messages m2
        WHERE m2.room_id = r.id
          AND m2.is_read = 0
          AND m2.sender != ?
      ) AS unread

    FROM rooms r

    JOIN room_users my_ru
      ON r.id = my_ru.room_id

    LEFT JOIN room_users other_ru
      ON r.id = other_ru.room_id
      AND other_ru.user_id <> my_ru.user_id

    LEFT JOIN Users opponent
      ON opponent.user_id = other_ru.user_id

    LEFT JOIN products p
      ON r.product_id = p.id

    LEFT JOIN Clubs c
      ON r.club_id = c.club_id

    WHERE my_ru.user_id = ?
      AND my_ru.is_active = 1

    ORDER BY last_message_time DESC
  `;

  db.query(sql, [userId, userId], (err, results) => {
    if (err) return res.status(500).send(err);

    res.json(results);
  });
});

app.post('/messages', (req, res) => {
  const { room_id, sender_id, message } = req.body;

  if (!room_id || !sender_id || !message) {
    return res.status(400).json({ message: '값 부족' });
  }

  const sql = `
    INSERT INTO messages (room_id, sender_id, message)
    VALUES (?, ?, ?)
  `;

  db.query(sql, [room_id, sender_id, message], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send(err);
    }

    res.json({
      message: '메시지 저장 완료',
      id: result.insertId
    });
  });
});

io.on('connection', (socket) => {
  console.log('유저 접속:', socket.id);

  // 방 입장
  socket.on('join_room', (data) => {
    const roomId = data.roomId;
    const userId = data.userId;

    console.log('방 입장 요청:', roomId, userId);

    socket.join(roomId);

    // 상대 메시지 읽음 처리
    db.query(
      `
      UPDATE messages
      SET is_read = 1
      WHERE room_id = ?
        AND sender != ?
        AND is_read = 0
      `,
      [roomId, userId],
      (err, result) => {
        if (!err && result.affectedRows > 0) {
          io.to(roomId).emit('read_update');
        }
      }
    );

    // 메시지 불러오기
    db.query(
      'SELECT id, room_id, sender, text, created_at, is_read FROM messages WHERE room_id = ? ORDER BY id ASC',
      [roomId],
      (err, results) => {
        if (!err) {
          socket.emit('loadMessages', results);
        }
      }
    );
  });

  // 메시지 보내기
  socket.on('send_message', (data) => {
    console.log('send_message 들어옴:', data);

    // 실시간 전송
    io.to(data.roomId).emit('receive_message', data);

    // DB 저장
    db.query(
      'INSERT INTO messages (room_id, sender, text, is_read) VALUES (?, ?, ?, 0)',
      [data.roomId, data.sender, data.text],
      (err) => {
        if (err) {
          console.log('메시지 저장 실패:', err);
        } else {
          console.log('메시지 저장 성공');

          // 누군가 메시지를 보내면 나갔던 사용자도 다시 목록에 보이게 복구
          db.query(
            'UPDATE room_users SET is_active = 1 WHERE room_id = ?',
            [data.roomId]
          );

          // 🚀 [푸시 알림 발송 로직 추가] 🚀
          // 1. 현재 채팅방에서 메시지를 보낸 '나(sender)'를 제외한 '상대방'의 fcm_token을 찾습니다.
          const findTokenSql = `
            SELECT u.fcm_token 
            FROM room_users ru
            JOIN Users u ON ru.user_id = u.user_id
            WHERE ru.room_id = ? AND ru.user_id != ?
          `;

          db.query(findTokenSql, [data.roomId, data.sender], (tokenErr, users) => {
            if (!tokenErr && users.length > 0) {
              const opponentToken = users[0].fcm_token;

              // 2. 상대방이 알림 토큰을 가지고 있다면 (알림을 켜둔 유저라면) 파이어베이스에 발송 명령!
              if (opponentToken) {
                const messagePayload = {
                  notification: {
                    title: '대구마켓 새 채팅 💬',
                    body: data.text // 보낸 메시지 내용 그대로 바탕화면에 띄움
                  },
                  token: opponentToken
                };

                admin.messaging().send(messagePayload)
                  .then((response) => {
                    console.log('✅ 푸시 알림 발송 대성공:', response);
                  })
                  .catch((error) => {
                    console.error('🚨 푸시 알림 발송 실패:', error);
                  });
              }
            }
          });
          // 🚀 [푸시 알림 발송 로직 끝] 🚀
        }
      }
    );
  });
       
  // 접속 중인 채팅방에서 메시지를 받았을 때 즉시 읽음 처리
  socket.on('mark_read', (data) => {
    const roomId = data.roomId;
    const userId = data.userId;

    db.query(
      `
      UPDATE messages
      SET is_read = 1
      WHERE room_id = ?
        AND sender != ?
        AND is_read = 0
      `,
      [roomId, userId],
      (err, result) => {
        if (!err && result.affectedRows > 0) {
          io.to(roomId).emit('read_update');
        }
      }
    );
  });

  socket.on('disconnect', () => {
    console.log('유저 나감:', socket.id);
  });
});

app.delete('/chat/rooms/:roomId/leave', (req, res) => {
  const roomId = req.params.roomId;
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({
      message: 'user_id가 필요합니다.'
    });
  }

  const sql = `
    UPDATE room_users
    SET is_active = 0
    WHERE room_id = ? AND user_id = ?
  `;

  db.query(sql, [roomId, user_id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({
        message: '채팅방 나가기 실패'
      });
    }

    res.json({
      message: '채팅방 나가기 완료'
    });
  });
});

// --- 🧹 동아리 게시판 데이터베이스 자동 정리 (6개월 경과 게시글 삭제) ---
function cleanupOldPosts() {
  // 💡 DELETE 문을 사용하여 6개월이 지난 데이터를 실제로 삭제합니다.
  const sql = "DELETE FROM Club_Posts WHERE created_at < DATE_SUB(NOW(), INTERVAL 6 MONTH)";
  
  db.query(sql, (err, result) => {
    if (err) {
      console.error('데이터 자동 정리 중 오류 발생:', err);
    } else if (result.affectedRows > 0) {
      // 삭제된 데이터가 있을 때만 로그를 남깁니다.
      console.log(`[자동 정리 완료] 6개월이 경과한 게시글 ${result.affectedRows}건이 삭제되었습니다.`);
    }
  });
}

// 24시간(1000ms * 60s * 60m * 24h)마다 청소 함수 실행
setInterval(cleanupOldPosts, 24 * 60 * 60 * 1000);

// 서버가 처음 켜질 때도 한 번 실행해서 밀린 숙제를 하게 합니다.
cleanupOldPosts();

// ==========================================
// 💬 [동아리 서비스] 댓글 시스템 API
// ==========================================

// 1. 댓글 등록 API (POST)
app.post('/api/club-posts/:postId/comments', (req, res) => {
  const postId = req.params.postId;
  const { userId, content } = req.body;

  if (!userId || !content) {
    return res.status(400).json({ message: '댓글 내용 또는 사용자 정보가 부족합니다.' });
  }

  const sql = 'INSERT INTO Club_Comments (post_id, user_id, content) VALUES (?, ?, ?)';
  db.query(sql, [postId, userId, content], (err, result) => {
    if (err) {
      console.error('댓글 DB 등록 에러:', err);
      return res.status(500).json({ message: '댓글을 등록하는 동안 오류가 발생했습니다.' });
    }
    res.json({ message: '댓글이 성공적으로 등록되었습니다! 💬' });
  });
});

// 2. 댓글 목록 가져오기 API (GET)
app.get('/api/club-posts/:postId/comments', (req, res) => {
  const postId = req.params.postId;

  // Users 테이블과 조인하여 작성자의 실제 닉네임과 이름을 가져옵니다.
  const sql = `
    SELECT cc.*, u.nickname, u.name 
    FROM Club_Comments cc
    JOIN Users u ON cc.user_id = u.user_id
    WHERE cc.post_id = ?
    ORDER BY cc.created_at DESC
  `;
  
  db.query(sql, [postId], (err, results) => {
    if (err) {
      console.error('댓글 목록 조회 에러:', err);
      return res.status(500).json({ message: '댓글을 불러오는 중 오류가 발생했습니다.' });
    }
    res.json(results);
  });
});

