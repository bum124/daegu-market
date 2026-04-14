const state = {
  activeTab: 'selling',
  data: null
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

  itemList.innerHTML = items.map(item => `
    <article
      class="mypage-item flex cursor-pointer gap-4 rounded-2xl border border-slate-200 bg-white p-3"
      data-product-id="${item.id}"
      role="link"
      tabindex="0"
      aria-label="${item.title} 상세 보기"
    >
      <div class="h-24 w-24 overflow-hidden rounded-xl bg-slate-100">
        <img src="${item.image}" alt="${item.title}" class="h-full w-full object-cover">
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs font-medium text-slate-500">${item.category}</p>
            <h3 class="mt-1 line-clamp-2 text-sm font-semibold text-slate-900">${item.title}</h3>
          </div>
          <span class="rounded-full px-2.5 py-1 text-xs font-medium ${item.status === '판매완료' ? 'bg-slate-200 text-slate-700' : item.status === '예약중' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}">${item.status}</span>
        </div>
        <p class="mt-2 text-base font-bold text-slate-900">${formatPrice(item.price)}</p>
        <p class="mt-1 text-xs text-slate-500">${item.location} · ${item.posted}</p>
        <div class="mt-2 flex gap-3 text-xs text-slate-400">
          <span>관심 ${item.likes}</span>
          <span>조회 ${item.views}</span>
        </div>
      </div>
    </article>
  `).join('');

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

  const response = await fetch('/api/mypage?userId=1');

  if (!response.ok) {
    throw new Error('Failed to load mypage');
  }

  state.data = await response.json();
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

initializeTabFromUrl();
syncTabs();
loadMyPage().catch(error => {
  console.error('마이페이지 로딩 실패:', error);
  tabTitle.textContent = '데이터를 불러오지 못했습니다.';
  itemList.classList.add('hidden');
  emptyState.classList.remove('hidden');
  emptyState.textContent = '마이페이지 데이터를 불러오지 못했습니다. 서버와 DB 연결을 확인하세요.';
});
