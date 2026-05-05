const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mysql = require('mysql2');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

// DB 연결 (server.js랑 동일하게)
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false }
});

// 연결 확인
db.connect((err) => {
  if (err) console.log("DB 연결 실패:", err);
  else console.log("채팅 DB 연결 성공");
});

// 소켓 시작
io.on('connection', (socket) => {
  console.log('유저 접속:', socket.id);

  // 방 입장
  socket.on('join_room', (roomId) => {
  socket.join(roomId);

  // 과거 메시지 불러오기 추가
  db.query(
    'SELECT * FROM messages WHERE room_id = ? ORDER BY id ASC',
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
    // data = { roomId, sender, text }

    // 1. 같은 방에 있는 사람에게 전송
    io.to(data.roomId).emit('receive_message', data);

    // 2. DB 저장
    db.query(
      'INSERT INTO messages (room_id, sender, text) VALUES (?, ?, ?)',
      [data.roomId, data.sender, data.text],
      (err) => {
        if (err) console.log("메시지 저장 실패:", err);
      }
    );
  });

  socket.on('disconnect', () => {
    console.log('유저 나감:', socket.id);
  });
});

// 서버 실행 (3001 포트로 따로)
server.listen(3001, () => {
  console.log("채팅 서버 실행됨: 3001");
});