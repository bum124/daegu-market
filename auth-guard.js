(() => {
  const API_BASE_URL = 'https://daegu-market-api.onrender.com';
  const SESSION_LIMIT_MS = 6 * 60 * 60 * 1000;
  const LOGIN_PAGE = 'login.html';
  const REQUIRED_PAGES = new Set([
    'account.html',
    'chat.html',
    'chat_id.html',
    'mypage.html',
    'sell.html'
  ]);

  function getCurrentPage() {
    return window.location.pathname.split('/').pop() || 'index.html';
  }

  function getStoredUser() {
    try {
      return JSON.parse(localStorage.getItem('loggedInUser') || 'null');
    } catch (error) {
      return null;
    }
  }

  function clearSession() {
    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('login_at');
  }

  function redirectToLogin(message) {
    if (message) {
      alert(message);
    }

    const page = getCurrentPage();
    if (page === LOGIN_PAGE) return;

    const next = `${page}${window.location.search || ''}${window.location.hash || ''}`;
    window.location.href = `${LOGIN_PAGE}?next=${encodeURIComponent(next)}`;
  }

  async function checkAccountStatus(user) {
    const userId = user && (user.user_id || user.id);
    if (!userId) return null;

    const response = await fetch(`${API_BASE_URL}/api/account-status?user_id=${encodeURIComponent(userId)}`);
    if (!response.ok) return null;
    return response.json();
  }

  async function guardSession() {
    const page = getCurrentPage();
    const requiresLogin = REQUIRED_PAGES.has(page);
    const user = getStoredUser();

    if (!user) {
      if (requiresLogin) {
        redirectToLogin('로그인이 필요한 서비스입니다.');
      }
      return;
    }

    const loginAt = Number(localStorage.getItem('login_at') || 0);
    if (!loginAt || Date.now() - loginAt > SESSION_LIMIT_MS) {
      clearSession();
      if (requiresLogin) {
        redirectToLogin('로그인 유지 시간이 만료되었습니다. 다시 로그인해주세요.');
      }
      return;
    }

    try {
      const status = await checkAccountStatus(user);
      if (!status) return;

      if (status.account_status === 'restricted' || status.account_status === 'deleted') {
        clearSession();
        redirectToLogin(status.message || '계정 이용이 제한되었습니다.');
        return;
      }

      if (status.account_status === 'warned' && !sessionStorage.getItem('warned_notice_seen')) {
        sessionStorage.setItem('warned_notice_seen', '1');
        alert(status.warning_message || '관리자 검토 결과 계정에 경고가 부여되었습니다.');
      }
    } catch (error) {
      // 네트워크가 잠깐 불안정할 때 화면 사용을 막지 않기 위해 조용히 통과합니다.
    }
  }

  guardSession();
})();
