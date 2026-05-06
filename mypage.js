const state = {
  activeTab: 'selling',
  data: null,
  currentUserId: null
};

const tabLabels = {
  selling: '판매중 상품',
  sold: '판매완료 상품',
  liked: '관심목록'
};

const emptyMessages = {
  selling: '현재 판매중인 상품이 없습니다.',
  sold: '아직 판매완료된 상품이 없습니다.',
  liked: '아직 관심목록에 담은 상품이 없습니다.'
};

const userName = document.getElementById('user-name');
const userDepartment = document.getElementById('user-department');
const userEmail = document.getElementById('user-email');
const verifyBadge = document.getElementById('verify-badge');
const profileBadge = document.getElementById('profile-badge');
const sellingCount = document.getElementById('selling-count');
const soldCount = document.getElementById('sold-count');
const likedCount = document.getElementById('liked-count');
const itemList = document.getElementById('item-list');
const emptyState = document.getElementById('empty-state');
const tabTitle = document.getElementById('tab-title');
const tabButtons = document.querySelectorAll('.tab-trigger');

const API_BASE_URL = 'https://daegu-market-api.onrender.com';
const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/800x800?text=Product';

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

function normalizeProduct(item) {
  const images = parseImages(item.images);
  const createdAt = item.createdAt || item.created_at || new Date().toISOString();

  return {
    id: item.id,
    title: item.title || '제목 없음',
    category: item.category || '기타',
    college: item.target_college || item.college || item.seller_college || item.seller_department || '관련 단과대 미지정',
    targetDepartment: item.target_department || '',
    price: Number(item.price || 0),
    location: item.location || '위치 미정',
    posted: item.posted || getTimeAgo(createdAt),
    likes: Number(item.likes || 0),
    views: Number(item.views || 0),
    seller: item.seller || item.seller_nickname || item.seller_name || (item.seller_id ? `판매자 ${item.seller_id}` : '판매자'),
    image: item.image || item.image_url || images[0] || PLACEHOLDER_IMAGE,
    status: item.status || item.condition || '판매중',
    createdAt,
    sellerId: item.seller_id || item.sellerId || null
  };
}

function isSold(item) {
  return item.status === '판매완료' || item.condition === '판매완료';
}

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
    liked: Array.isArray(data.liked) ? data.liked.map(normalizeProduct) : []
  };
}

async function loadProductFallback(loggedInUser) {
  const response = await fetch(`${API_BASE_URL}/api/products`);

  if (!response.ok) {
    throw new Error('Failed to load product fallback');
  }

  const products = (await response.json()).map(normalizeProduct);
  const userId = loggedInUser.user_id || loggedInUser.id || null;
  const selling = userId
    ? products.filter(product => String(product.sellerId || '') === String(userId))
    : [];

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
      soldCount: 0,
      likedCount: 0
    },
    selling,
    sold: [],
    liked: []
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

function renderProfile(data) {
  userName.textContent = data.user.name;
  userDepartment.textContent = data.user.department;
  userEmail.textContent = data.user.email;
  verifyBadge.textContent = data.user.verified ? '학교 인증 완료' : '미인증';
  verifyBadge.className = data.user.verified
    ? 'rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700'
    : 'rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700';
  profileBadge.textContent = data.user.name.slice(0, 2).toUpperCase();

  sellingCount.textContent = data.stats.sellingCount;
  soldCount.textContent = data.stats.soldCount;
  likedCount.textContent = data.stats.likedCount;
}

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
        ${state.activeTab !== 'liked' ? `
          <div class="mt-3 flex flex-wrap gap-2">
            ${state.activeTab === 'selling' && item.status !== '판매완료' ? `
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
