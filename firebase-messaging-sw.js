importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js');

// 🌟 여기에 아까 파이어베이스 콘솔에서 복사해둔 내 firebaseConfig 코드를 넣으세요!
const firebaseConfig = {
  apiKey: "AIzaSyB5NZNgEhcq8njI2-7z4LgmyGi9RYr05xk",
  authDomain: "daegu-market.firebaseapp.com",
  projectId: "daegu-market",
  storageBucket: "daegu-market.firebasestorage.app",
  messagingSenderId: "767402252031",
  appId: "1:767402252031:web:266d3c3760a950b7b91eca"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// 백그라운드에서 알림이 오면 화면에 띄워주는 역할
messaging.onBackgroundMessage(function(payload) {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png' // 나중에 대구마켓 로고 이미지 경로로 바꾸시면 됩니다.
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});