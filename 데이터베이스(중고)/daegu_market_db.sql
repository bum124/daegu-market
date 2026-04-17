USE defaultdb;


-- 1. 회원 정보 (Users)
CREATE TABLE Users (
    student_id VARCHAR(20) PRIMARY KEY, -- 학번 (0으로 시작할 수 있어 VARCHAR 권장)
    password VARCHAR(255) NOT NULL,     -- 비밀번호
    name VARCHAR(50) NOT NULL,          -- 이름
    department VARCHAR(100) NOT NULL,   -- 학과 (컴퓨터소프트웨어공학 등)
    email VARCHAR(100) NOT NULL,        -- 학교 이메일
    is_verified BOOLEAN DEFAULT FALSE,  -- 인증 여부
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- 가입일
);

-- 2. 중고 상품 (Products)
CREATE TABLE Products (
    product_id INT AUTO_INCREMENT PRIMARY KEY, -- 상품번호 (자동 1, 2, 3...)
    seller_id VARCHAR(20),                     -- 판매자 학번 (FK)
    title VARCHAR(255) NOT NULL,               -- 제목
    category VARCHAR(50) NOT NULL,             -- 카테고리 (도서, 전자기기 등)
    item_condition VARCHAR(50) NOT NULL,       -- 상품 상태 (거의새것 등)
    price INT NOT NULL,                        -- 가격
    location VARCHAR(100) NOT NULL,            -- 거래장소 (중앙도서관 등)
    description TEXT,                          -- 상품 설명
    status VARCHAR(20) DEFAULT '판매중',         -- 판매 상태
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES Users(student_id)
);

-- 3. 동아리 모집 (Clubs)
CREATE TABLE Clubs (
    club_id INT AUTO_INCREMENT PRIMARY KEY,
    leader_id VARCHAR(20),                     -- 회장 학번 (FK)
    name VARCHAR(100) NOT NULL,                -- 동아리명
    category VARCHAR(50) NOT NULL,             -- 카테고리
    description TEXT NOT NULL,                 -- 모집 내용
    location VARCHAR(100),                     -- 활동 장소
    status VARCHAR(20) DEFAULT '모집중',         -- 모집 상태
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (leader_id) REFERENCES Users(student_id)
);

-- 4. 채팅방 (ChatRooms)
CREATE TABLE ChatRooms (
    room_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT,                            -- 어떤 상품에 대한 대화인지 (FK)
    buyer_id VARCHAR(20),                      -- 구매자 학번 (FK)
    seller_id VARCHAR(20),                     -- 판매자 학번 (FK)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES Products(product_id),
    FOREIGN KEY (buyer_id) REFERENCES Users(student_id),
    FOREIGN KEY (seller_id) REFERENCES Users(student_id)
);

-- 5. 채팅 메시지 (Messages)
CREATE TABLE Messages (
    message_id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT,                               -- 어느 채팅방의 메시지인지 (FK)
    sender_id VARCHAR(20),                     -- 보낸 사람 학번 (FK)
    content TEXT NOT NULL,                     -- 메시지 내용
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 보낸 시간
    FOREIGN KEY (room_id) REFERENCES ChatRooms(room_id),
    FOREIGN KEY (sender_id) REFERENCES Users(student_id)
);

-- Users 테이블에 verification_code(인증번호) 칸 추가
ALTER TABLE Users ADD verification_code VARCHAR(10);

USE defaultdb;

-- 이미 nickname 칸이 있다면 ADD 대신 MODIFY를 써야 에러가 안 납니다!
ALTER TABLE Users 
MODIFY COLUMN nickname VARCHAR(50) NOT NULL DEFAULT '임시닉네임' AFTER name;

SELECT * FROM Users;
DELETE FROM Users WHERE student_id = '22105555';

USE defaultdb;
ALTER TABLE Users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;




