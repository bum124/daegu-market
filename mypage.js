const state = {
  activeTab: 'selling',
  data: null,
  currentUserId: null
};

const tabLabels = {
  selling: '판매중 상품',
  sold: '판매완료 상품',
  liked: '관심목록',
  recent: '최근 본 상품'
};

const emptyMessages = {
  selling: '현재 판매중인 상품이 없습니다.',
  sold: '아직 판매완료된 상품이 없습니다.',
  liked: '아직 관심목록에 담은 상품이 없습니다.',
  recent: '최근 본 상품이 없습니다.'
};

const userName = document.getElementById('user-name');
const userDepartment = document.getElementById('user-department');
const userEmail = document.getElementById('user-email');
const verifyBadge = document.getElementById('verify-badge');
const profileBadge = document.getElementById('profile-badge');
const sellingCount = document.getElementById('selling-count');
const soldCount = document.getElementById('sold-count');
const likedCount = document.getElementById('liked-count');
const recentCount = document.getElementById('recent-count');
const reviewScore = document.getElementById('review-score');
const reviewSummary = document.getElementById('review-summary');
const itemList = document.getElementById('item-list');
const emptyState = document.getElementById('empty-state');
const tabTitle = document.getElementById('tab-title');
const tabButtons = document.querySelectorAll('.tab-trigger');
const inquiryModal = document.getElementById('inquiryModal');
const inquiryForm = document.getElementById('inquiryForm');
const inquiryButton = document.getElementById('inquiryButton');
const inquirySubmitButton = document.getElementById('inquirySubmitButton');

const API_BASE_URL = 'https://daegu-market-api.onrender.com';
const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/800x800?text=Product';
const RECENT_PRODUCTS_KEY = 'recentViewedProducts';
const ADMIN_EMAILS = ['qkrrjs0131@daegu.ac.kr', 'hye70301@daegu.ac.kr', 'bears0144@daegu.ac.kr'];
const adminReportsLink = document.getElementById('adminReportsLink');

function isAdminUser(email) {
  return ADMIN_EMAILS.includes(String(email || '').trim().toLowerCase());
}

function openInquiryModal() {
  if (!inquiryModal || !inquiryForm) return;
  inquiryForm.reset();
  inquiryModal.classList.remove('hidden');
  inquiryModal.classList.add('flex');
}

function closeInquiryModal() {
  if (!inquiryModal) return;
  inquiryModal.classList.add('hidden');
  inquiryModal.classList.remove('flex');
}

function navigateToProduct(productId) {
  window.location.href = `product.html?id=${encodeURIComponent(productId)}`;
}

function updateUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set('tab', state.activeTab);
  window.history.replaceState({}, '', url);
}

function initializeTabFromUrl() {
  const url = new URL(window.location.href);
  const tab = url.searchParams.get('tab');

  if (tab && tabLabels[tab]) {
    state.activeTab = tab;
  }
}

function formatPrice(price) {
  return `${Number(price).toLocaleString('ko-KR')}원`;
}

function parseImages(images) {
  if (Array.isArray(images)) {
    return images;
  }

  if (typeof images !== 'string' || !images.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [images];
  }
}

function getTimeAgo(dateString) {
  const createdAt = new Date(dateString).getTime();

  if (!createdAt) {
    return '방금 전';
  }

  const diffMinutes = Math.floor((Date.now() - createdAt) / (1000 * 60));

  if (diffMinutes < 1) {
    return '방금 전';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}시간 전`;
  }

  return `${Math.floor(diffHours / 24)}일 전`;
}

function normalizeCategory(value) {
  const category = String(value || '기타').trim();
  const aliases = {
    '디지털': '전자기기',
    '도서': '도서/문구',
    '문구': '도서/문구',
    '패션': '의류/잡화',
    '생활': '생활용품',
    '스포츠': '스포츠/레저',
    '뷰티': '뷰티/미용'
  };

  return aliases[category] || category;
}

function normalizeProduct(item) {
  const images = parseImages(item.images);
  const createdAt = item.createdAt || item.created_at || new Date().toISOString();
  const status = normalizeStatus(item.status || item.condition);

  return {
    id: item.id,
    title: item.title || '제목 없음',
    category: normalizeCategory(item.category),
    college: item.target_college || item.college || item.seller_college || item.seller_department || '관련 단과대 미지정',
    targetDepartment: item.target_department || '',
    price: Number(item.price || 0),
    location: item.location || '위치 미정',
    posted: item.posted || getTimeAgo(createdAt),
    likes: Number(item.likes || 0),
    views: Number(item.views || 0),
    seller: item.seller || item.seller_nickname || item.seller_name || (item.seller_id ? `판매자 ${item.seller_id}` : '판매자'),
    image: item.image || item.image_url || images[0] || PLACEHOLDER_IMAGE,
    status,
    createdAt,
    sellerId: item.seller_id || item.sellerId || null,
    showClubBadge: Number(item.show_club_badge || 0) // ✨ [추가] 온오프 상태값 저장 (0:숨김, 1:노출)
  };
}

function normalizeStatus(value) {
  const status = String(value || '판매중').trim();

  if (status.includes('판매완료')) {
    return '판매완료';
  }

  if (status.includes('예약')) {
    return '예약중';
  }

  return '판매중';
}

function isSold(item) {
  return normalizeStatus(item.status || item.condition) === '판매완료';
}

// /api/mypage 응답을 화면에서 바로 쓰기 좋은 구조로 정리합니다.
function normalizeMyPageData(data, loggedInUser) {
  if (!data || !data.user || !data.stats) {
    throw new Error('Invalid mypage response');
  }

  return {
    user: {
      id: data.user.id || loggedInUser.user_id || loggedInUser.id || '',
      name: data.user.name || loggedInUser.name || loggedInUser.nickname || '사용자',
      department: [data.user.college, data.user.department || loggedInUser.department].filter(Boolean).join(' · ') || '학과 미지정',
      email: data.user.email || loggedInUser.email || '',
      verified: Boolean(data.user.verified ?? true)
    },
    stats: {
      sellingCount: Number(data.stats.sellingCount || 0),
      soldCount: Number(data.stats.soldCount || 0),
      likedCount: Number(data.stats.likedCount || 0)
    },
    selling: Array.isArray(data.selling) ? data.selling.map(normalizeProduct) : [],
    sold: Array.isArray(data.sold) ? data.sold.map(normalizeProduct) : [],
    liked: Array.isArray(data.liked) ? data.liked.map(normalizeProduct) : [],
    recent: [],
    reviews: null
  };
}

// 상품 상세에서 localStorage에 저장한 최근 본 상품 ID 목록을 가져옵니다.
function getRecentProductIds() {
  try {
    const ids = JSON.parse(localStorage.getItem(RECENT_PRODUCTS_KEY) || '[]');
    return Array.isArray(ids) ? ids.map(String).filter(Boolean) : [];
  } catch (error) {
    return [];
  }
}

// 최근 본 상품 ID를 실제 상품 데이터와 매칭해 마이페이지에 표시할 목록을 만듭니다.
async function loadRecentProducts() {
  const recentIds = getRecentProductIds();

  if (!recentIds.length) {
    return [];
  }

  const response = await fetch(`${API_BASE_URL}/api/products`);

  if (!response.ok) {
    throw new Error('Failed to load recent products');
  }

  const productMap = new Map(
    (await response.json())
      .map(normalizeProduct)
      .map(product => [String(product.id), product])
  );

  return recentIds
    .map(id => productMap.get(id))
    .filter(Boolean)
    .slice(0, 10);
}

async function loadProductFallback(loggedInUser) {
  const response = await fetch(`${API_BASE_URL}/api/products`);

  if (!response.ok) {
    throw new Error('Failed to load product fallback');
  }

  const products = (await response.json()).map(normalizeProduct);
  const userId = loggedInUser.user_id || loggedInUser.id || null;
  const myProducts = userId
    ? products.filter(product => String(product.sellerId || '') === String(userId))
    : [];
  const selling = myProducts.filter(product => !isSold(product));
  const sold = myProducts.filter(isSold);

  return {
    user: {
      id: userId || '',
      name: loggedInUser.name || loggedInUser.nickname || '사용자',
      department: loggedInUser.department || '학과 미지정',
      email: loggedInUser.email || '',
      verified: true
    },
    stats: {
      sellingCount: selling.length,
      soldCount: sold.length,
      likedCount: 0
    },
    selling,
    sold,
    liked: [],
    recent: []
  };
}

async function resolveUserId(user) {
  if (user.user_id || user.id) {
    return user.user_id || user.id;
  }

  if (!user.email) {
    return null;
  }

  const response = await fetch(`${API_BASE_URL}/api/users`);

  if (!response.ok) {
    return null;
  }

  const users = await response.json();
  const matchedUser = users.find(item => item.email === user.email);

  return matchedUser ? matchedUser.user_id : null;
}

async function loadMyReviewSummary(userId) {
  const response = await fetch(`${API_BASE_URL}/api/users/${encodeURIComponent(userId)}/reviews`);

  if (!response.ok) {
    return null;
  }

  return response.json();
}

// 사용자 이름, 학과, 이메일, 인증 상태와 각 탭의 개수를 상단 프로필 카드에 표시합니다.
function renderProfile(data) {
  userName.textContent = data.user.name;
  userDepartment.textContent = data.user.department;
  userEmail.textContent = data.user.email;
  verifyBadge.textContent = data.user.verified ? '학교 인증 완료' : '미인증';
  verifyBadge.className = data.user.verified
    ? 'rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700'
    : 'rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700';
  profileBadge.textContent = data.user.name.slice(0, 2).toUpperCase();

  if (adminReportsLink) {
    adminReportsLink.classList.toggle('hidden', !isAdminUser(data.user.email));
  }

  sellingCount.textContent = data.stats.sellingCount;
  soldCount.textContent = data.stats.soldCount;
  likedCount.textContent = data.stats.likedCount;
  recentCount.textContent = (data.recent || []).length;

  if (!data.reviews || !data.reviews.review_count) {
    reviewScore.textContent = '-';
    reviewSummary.classList.add('hidden');
    return;
  }

  reviewScore.textContent = Number(data.reviews.average_rating || 0).toFixed(1);
  const topTags = (data.reviews.top_tags || []).map(item => `${item.tag} ${item.count}`).join(' · ');
  reviewSummary.textContent = `평가 ${data.reviews.review_count}개${topTags ? ` · 많이 받은 평가: ${topTags}` : ''}`;
  reviewSummary.classList.remove('hidden');
}

// 현재 선택된 탭에 맞춰 판매중/판매완료/관심/최근 본 상품 목록을 그립니다.
function renderItems() {
  if (!state.data) {
    tabTitle.textContent = '마이페이지 데이터를 불러오는 중입니다.';
    itemList.classList.add('hidden');
    emptyState.classList.remove('hidden');
    emptyState.textContent = '잠시만 기다려주세요.';
    updateUrl();
    return;
  }

  const items = state.data[state.activeTab] || [];
  tabTitle.textContent = tabLabels[state.activeTab];
  emptyState.textContent = emptyMessages[state.activeTab];

  emptyState.classList.toggle('hidden', items.length !== 0);
  itemList.classList.toggle('hidden', items.length === 0);

  itemList.innerHTML = items.map(item => {
    const sold = isSold(item);

    return `
    <article
      class="mypage-item flex cursor-pointer gap-4 rounded-2xl border border-slate-200 bg-white p-3 ${sold ? 'opacity-80' : ''}"
      data-product-id="${item.id}"
      role="link"
      tabindex="0"
      aria-label="${item.title} 상세 보기"
    >
      <div class="relative h-24 w-24 overflow-hidden rounded-xl bg-slate-100">
        <img src="${item.image}" alt="${item.title}" class="h-full w-full object-cover ${sold ? 'grayscale opacity-45' : ''}">
        ${sold ? '<div class="absolute inset-0 bg-white/50"></div><div class="absolute inset-0 flex items-center justify-center"><span class="rounded-full bg-slate-900/80 px-2.5 py-1 text-[11px] font-semibold text-white">완료</span></div>' : ''}
      </div>
      <div class="min-w-0 flex-1 ${sold ? 'text-slate-500' : ''}">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs font-medium text-slate-500">${item.category}</p>
            <h3 class="mt-1 line-clamp-2 text-sm font-semibold text-slate-900">${item.title}</h3>
          </div>
          <span class="rounded-full px-2.5 py-1 text-xs font-medium ${item.status === '판매완료' ? 'bg-slate-200 text-slate-700' : item.status === '예약중' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}">${item.status}</span>
        </div>
        <p class="mt-2 text-base font-bold text-slate-900">${formatPrice(item.price)}</p>
        <p class="mt-1 text-xs text-slate-500">${item.location} · ${item.posted}</p>
        <p class="mt-1 text-xs text-slate-500">관련 ${item.college}${item.targetDepartment ? ` · ${item.targetDepartment}` : ''}</p>
        <div class="mt-2 flex gap-3 text-xs text-slate-400">
          <span>관심 ${item.likes}</span>
          <span>조회 ${item.views}</span>
        </div>
        ${state.activeTab !== 'liked' && state.activeTab !== 'recent' ? `
          <div class="mt-3 flex flex-wrap gap-2">
            ${state.activeTab === 'selling' && item.status !== '판매완료' ? `
              <button
                type="button"
                data-edit-id="${item.id}"
                class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                수정
              </button>
        

              <button
                type="button"
                data-sold-id="${item.id}"
                class="rounded-lg border border-green-200 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50"
              >
                판매완료
              </button>
            ` : ''}
            <button
              type="button"
              data-delete-id="${item.id}"
              class="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              삭제
            </button>
          </div>
        ` : ''}
      </div>
    </article>
  `;
  }).join('');

  updateUrl();
}

function syncTabs() {
  tabButtons.forEach(button => {
    const active = button.dataset.tab === state.activeTab;
    button.className = active
      ? 'tab-trigger rounded-2xl bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm'
      : 'tab-trigger rounded-2xl px-4 py-2 text-sm font-medium text-slate-600';
  });
}

// 로그인 사용자를 확인한 뒤 마이페이지 API와 최근 본 상품 데이터를 불러옵니다.
async function loadMyPage() {
  renderItems();

  const userStr = localStorage.getItem('loggedInUser');
  if (!userStr) {
    alert('로그인이 필요한 서비스입니다.');
    window.location.href = 'login.html';
    return;
  }

  const user = JSON.parse(userStr);
  const userId = await resolveUserId(user);

  if (!userId) {
    throw new Error('로그인 사용자 ID를 확인하지 못했습니다.');
  }

  state.currentUserId = userId;

  loadMyClubBadge(userId);

  try {
    const response = await fetch(`${API_BASE_URL}/api/mypage?userId=${encodeURIComponent(userId)}`);

    if (!response.ok) {
      throw new Error('Failed to load mypage');
    }

    state.data = normalizeMyPageData(await response.json(), user);
  } catch (error) {
    console.warn('마이페이지 API가 없어 상품 API 기반 임시 데이터로 표시합니다.', error);
    state.data = await loadProductFallback(user);
  }

  try {
    state.data.recent = await loadRecentProducts();
  } catch (error) {
    console.warn('최근 본 상품을 불러오지 못했습니다.', error);
    state.data.recent = [];
  }

  try {
    state.data.reviews = await loadMyReviewSummary(userId);
  } catch (error) {
    console.warn('거래 신뢰도를 불러오지 못했습니다.', error);
    state.data.reviews = null;
  }

  renderProfile(state.data);
  syncTabs();
  renderItems();
}

tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    state.activeTab = button.dataset.tab;
    syncTabs();
    renderItems();
  });
});

itemList.addEventListener('click', event => {


  const editButton = event.target.closest('[data-edit-id]');

  if (editButton) {
    event.stopPropagation();
    window.location.href = `sell.html?id=${encodeURIComponent(editButton.dataset.editId)}`;
    return;
  }

  const soldButton = event.target.closest('[data-sold-id]');

  if (soldButton) {
    event.stopPropagation();
    markMyProductSold(soldButton.dataset.soldId);
    return;
  }

  const deleteButton = event.target.closest('[data-delete-id]');

  if (deleteButton) {
    event.stopPropagation();
    deleteMyProduct(deleteButton.dataset.deleteId);
    return;
  }

  const card = event.target.closest('[data-product-id]');

  if (!card) {
    return;
  }

  navigateToProduct(card.dataset.productId);
});

itemList.addEventListener('keydown', event => {
  const card = event.target.closest('[data-product-id]');

  if (!card || (event.key !== 'Enter' && event.key !== ' ')) {
    return;
  }

  event.preventDefault();
  navigateToProduct(card.dataset.productId);
});

if (inquiryButton) {
  inquiryButton.addEventListener('click', openInquiryModal);
}

['inquiryCloseButton', 'inquiryCancelButton'].forEach(id => {
  const button = document.getElementById(id);
  if (button) {
    button.addEventListener('click', closeInquiryModal);
  }
});

if (inquiryModal) {
  inquiryModal.addEventListener('click', event => {
    if (event.target === inquiryModal) {
      closeInquiryModal();
    }
  });
}

// 문의하기는 로그인 사용자 정보를 함께 보내 관리자 문의 목록에서 확인할 수 있게 합니다.
if (inquiryForm) {
  inquiryForm.addEventListener('submit', async event => {
    event.preventDefault();

    const userStr = localStorage.getItem('loggedInUser');
    const user = userStr ? JSON.parse(userStr) : null;
    const message = document.getElementById('inquiryMessage').value.trim();

    if (!user) {
      alert('로그인이 필요한 서비스입니다.');
      window.location.href = 'login.html';
      return;
    }

    if (!message) {
      alert('문의 내용을 입력해주세요.');
      return;
    }

    inquirySubmitButton.disabled = true;
    inquirySubmitButton.textContent = '접수 중';

    const response = await fetch(`${API_BASE_URL}/api/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: state.currentUserId || user.user_id || user.id,
        user_email: user.email,
        category: document.getElementById('inquiryCategory').value,
        message
      })
    });
    const result = await response.json().catch(() => ({}));

    inquirySubmitButton.disabled = false;
    inquirySubmitButton.textContent = '접수';

    if (!response.ok) {
      alert(result.message || '문의 접수에 실패했습니다.');
      return;
    }

    alert('문의가 접수되었습니다. 운영자가 확인할 예정입니다.');
    closeInquiryModal();
  });
}

// 내 상품의 status 값을 판매완료로 변경하고 화면 목록도 바로 갱신합니다.
async function markMyProductSold(productId) {
  if (!state.currentUserId) {
    alert('로그인 정보를 확인하지 못했습니다.');
    return;
  }

  if (!confirm('이 상품을 판매완료로 변경할까요?')) {
    return;
  }

  const userStr = localStorage.getItem('loggedInUser');
  const user = userStr ? JSON.parse(userStr) : {};
  const response = await fetch(`${API_BASE_URL}/api/products/${encodeURIComponent(productId)}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      seller_id: state.currentUserId,
      seller_email: user.email,
      status: '판매완료'
    })
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    alert(result.message || '판매완료 처리에 실패했습니다.');
    return;
  }

  const product = state.data.selling.find(item => String(item.id) === String(productId));

  if (product) {
    product.status = '판매완료';
    state.data.selling = state.data.selling.filter(item => String(item.id) !== String(productId));
    state.data.sold = [product, ...state.data.sold.filter(item => String(item.id) !== String(productId))];
  }

  state.data.stats.sellingCount = state.data.selling.length;
  state.data.stats.soldCount = state.data.sold.length;
  state.activeTab = 'sold';
  renderProfile(state.data);
  syncTabs();
  renderItems();
}

// 본인이 등록한 상품만 삭제 요청을 보내고, 성공하면 목록에서 제거합니다.
async function deleteMyProduct(productId) {
  if (!state.currentUserId) {
    alert('로그인 정보를 확인하지 못했습니다.');
    return;
  }

  if (!confirm('이 상품을 삭제할까요?')) {
    return;
  }

  const userStr = localStorage.getItem('loggedInUser');
  const user = userStr ? JSON.parse(userStr) : {};
  const response = await fetch(`${API_BASE_URL}/api/products/${encodeURIComponent(productId)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      seller_id: state.currentUserId,
      seller_email: user.email
    })
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    alert(result.message || '상품 삭제에 실패했습니다.');
    return;
  }

  state.data.selling = state.data.selling.filter(item => String(item.id) !== String(productId));
  state.data.sold = state.data.sold.filter(item => String(item.id) !== String(productId));
  state.data.stats.sellingCount = state.data.selling.length;
  state.data.stats.soldCount = state.data.sold.length;
  renderProfile(state.data);
  renderItems();
}

initializeTabFromUrl();
syncTabs();
loadMyPage().catch(error => {
  console.error('마이페이지 로딩 실패:', error);
  tabTitle.textContent = '데이터를 불러오지 못했습니다.';
  itemList.classList.add('hidden');
  emptyState.classList.remove('hidden');
  emptyState.textContent = '마이페이지 데이터를 불러오지 못했습니다. 서버와 DB 연결을 확인하세요.';
});

// ✨ 마이페이지 전용: 내 동아리 뱃지 실시간 연동 제어 함수
async function loadMyClubBadge(userId) {
  const badgeEl = document.getElementById('userClubBadge');
  if (!badgeEl) return;

  const emojiMap = {
    '운동': '⚽', '음악': '🎸', '게임': '🎮', 'IT': '💻', '학술': '📚', '기타': '✨'
  };

  try {
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}/my-clubs`);
    if (!response.ok) return;
    
    const myClubs = await response.json();
    
    // 가입하거나 개설한 동아리가 존재한다면 첫 번째 동아리를 대표로 매운맛 뱃지 주입!
    if (myClubs && myClubs.length > 0) {
      const repClub = myClubs[0];
      const emoji = emojiMap[repClub.category] || '✨';
      
      badgeEl.innerHTML = `<span>${emoji}</span><span>${repClub.name}</span>`;
      badgeEl.classList.remove('hidden');
      badgeEl.classList.add('inline-flex');
    }
  } catch (error) {
    console.warn('마이페이지 동아리 소속 뱃지 로드 실패:', error);
  }
}

// ==========================================
// 🔔 [푸시 알림] 토글 스위치 설정 로직
// ==========================================

// 1. 파이어베이스 설정 (파이어베이스 콘솔에서 복사해둔 내 config 코드로 덮어쓰세요!)
const firebaseConfig = {
    apiKey: "AIzaSyB5NZNgEhcq8njI2-7z4LgmyGi9RYr05xk",
    authDomain: "daegu-market.firebaseapp.com",
    projectId: "daegu-market",
    storageBucket: "daegu-market.firebasestorage.app",
    messagingSenderId: "767402252031",
    appId: "1:767402252031:web:266d3c3760a950b7b91eca"
  };

// 파이어베이스가 여러 번 실행되는 것을 방지
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const messaging = firebase.messaging();

// 2. 알림 토글 스위치 찾기
const notiToggle = document.getElementById('notiToggle');

if (notiToggle) {
  // UX 디테일: 사용자가 이미 알림을 허용해둔 상태라면 새로고침해도 스위치를 켜진 상태로 보여줌
  if (Notification.permission === 'granted') {
    notiToggle.checked = true;
  }

  // 스위치를 누를 때마다 실행되는 이벤트
  notiToggle.addEventListener('change', async (e) => {
  if (e.target.checked) {
    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        const token = await messaging.getToken({ vapidKey: 'BGAfaPxHzHgVtvwtLZrPX5p_g_CAXehN3q-wT0E70bv9rDynGK-v6FNkT2X7pp_J2guk1P7dkF1Z8yrnFmvyv8I' }); // 🌟 VAPID 키 유지!
        
        if (token) {
          // 🔎 [무적의 유저 번호 탐지기]
          let currentUserId = null;

          // 1순위: 주소창 확인 (예: ?userId=3)
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.has('userId')) currentUserId = urlParams.get('userId');

          // 2순위: 로컬 스토리지 단독 키 확인
          if (!currentUserId) currentUserId = localStorage.getItem('userId') || localStorage.getItem('user_id');

          // 3순위: 로컬 스토리지 묶음 객체(user) 확인
          if (!currentUserId) {
            try {
              // 💡 'user'가 없으면 'loggedInUser'를 가져오고, 그것도 없으면 '{}'를 파싱합니다.
              const rawData = localStorage.getItem('user') || localStorage.getItem('loggedInUser') || '{}';
              const storedUser = JSON.parse(rawData);
              
              // 유저 ID 추출 (user_id나 id 둘 중 존재하는 것으로 매핑)
              currentUserId = storedUser.user_id || storedUser.id;
            } catch (err) {
              console.error("로컬스토리지 파싱 에러:", err);
            }
          }

          // 👀 콘솔창에서 최종 결과 확인!
          console.log("👀 샅샅이 뒤져서 찾아낸 유저 번호:", currentUserId);
          console.log("🔑 발급된 토큰:", token);

          // 다 뒤졌는데도 없으면 멈춤! (에러 방지)
          if (!currentUserId) {
            alert('로그인 정보를 찾을 수 없습니다. 다시 로그인해주세요!');
            e.target.checked = false;
            return; 
          }

          // 🚀 드디어 백엔드로 완벽한 데이터 상자 보내기
          const response = await fetch('https://daegu-market-api.onrender.com/api/save-fcm-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              user_id: currentUserId, // 이제 빈값이 절대 아님!
              token: token 
            })
          });

          if (response.ok) {
            alert('✅ 알림이 켜졌습니다! 이제 채팅이 오면 바탕화면에 표시됩니다.');
          } else {
            throw new Error('서버 저장 실패');
          }
        }
      } else {
        alert('알림 권한이 차단되었습니다.');
        e.target.checked = false;
      }
    } catch (error) {
      console.error('알림 설정 에러:', error);
      alert('알림 설정 중 오류가 발생했습니다.');
      e.target.checked = false;
    }
  } else {
    alert('알림이 꺼졌습니다.');
  }
  });
}