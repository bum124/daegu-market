const fallbackProductData = [
  {
    id: 1,
    title: "MacBook Pro 14 M3 Pro",
    category: "디지털",
    college: "IT·공과대학",
    price: 2200000,
    location: "중앙도서관 앞",
    posted: "3시간 전",
    likes: 45,
    views: 234,
    seller: "컴공 3학년",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&h=800&fit=crop",
    status: "판매중",
    createdAt: "2026-04-05T15:00:00+09:00"
  },
  {
    id: 2,
    title: "경영학 원론 교재",
    category: "도서",
    college: "글로벌경영대학",
    price: 15000,
    location: "경상대 로비",
    posted: "4시간 전",
    likes: 12,
    views: 89,
    seller: "경영 2학년",
    image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&h=800&fit=crop",
    status: "판매중",
    createdAt: "2026-04-05T14:00:00+09:00"
  },
  {
    id: 3,
    title: "나이키 에어포스 265",
    category: "패션",
    college: "디자인예술대학",
    price: 85000,
    location: "체육관 앞",
    posted: "5시간 전",
    likes: 28,
    views: 156,
    seller: "체육 1학년",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=800&fit=crop",
    status: "예약중",
    createdAt: "2026-04-05T13:00:00+09:00"
  },
  {
    id: 4,
    title: "전자레인지",
    category: "생활",
    college: "재활과학대학",
    price: 35000,
    location: "기숙사 앞",
    posted: "6시간 전",
    likes: 8,
    views: 67,
    seller: "자취생",
    image: "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=800&h=800&fit=crop",
    status: "판매중",
    createdAt: "2026-04-05T12:00:00+09:00"
  },
  {
    id: 5,
    title: "민법총칙 요약집",
    category: "도서",
    college: "사회과학대학",
    price: 10000,
    location: "사회대 세미나실 앞",
    posted: "8시간 전",
    likes: 7,
    views: 58,
    seller: "법행정 2학년",
    image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&h=800&fit=crop",
    status: "판매중",
    createdAt: "2026-04-05T10:00:00+09:00"
  },
  {
    id: 6,
    title: "영문학 개론 필기노트",
    category: "도서",
    college: "자유전공학부",
    price: 8000,
    location: "인문관 앞 벤치",
    posted: "10시간 전",
    likes: 4,
    views: 31,
    seller: "영문학과 1학년",
    image: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&h=800&fit=crop",
    status: "판매중",
    createdAt: "2026-04-05T08:00:00+09:00"
  },
  {
    id: 7,
    title: "임용 교육학 기출문제집",
    category: "도서",
    college: "사범대학",
    price: 18000,
    location: "사범대 강의동 입구",
    posted: "12시간 전",
    likes: 10,
    views: 74,
    seller: "수학교육과 4학년",
    image: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800&h=800&fit=crop",
    status: "판매중",
    createdAt: "2026-04-05T06:00:00+09:00"
  },
  {
    id: 8,
    title: "식물생리학 전공서",
    category: "도서",
    college: "보건바이오대학",
    price: 22000,
    location: "생명환경대 로비",
    posted: "1일 전",
    likes: 6,
    views: 40,
    seller: "원예학과 3학년",
    image: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800&h=800&fit=crop",
    status: "판매중",
    createdAt: "2026-04-04T16:00:00+09:00"
  },
  {
    id: 9,
    title: "그래픽 태블릿",
    category: "디지털",
    college: "디자인예술대학",
    price: 95000,
    location: "예술대 실기실 앞",
    posted: "1일 전",
    likes: 22,
    views: 145,
    seller: "시각디자인과 2학년",
    image: "https://images.unsplash.com/photo-1587614382346-4ec70e388b28?w=800&h=800&fit=crop",
    status: "판매중",
    createdAt: "2026-04-04T13:00:00+09:00"
  },
  {
    id: 10,
    title: "공학용 계산기",
    category: "디지털",
    college: "IT·공과대학",
    price: 25000,
    location: "공대 1호관 앞",
    posted: "2일 전",
    likes: 13,
    views: 93,
    seller: "기계공학과 2학년",
    image: "https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=800&h=800&fit=crop",
    status: "판매중",
    createdAt: "2026-04-03T17:00:00+09:00"
  },
  {
    id: 11,
    title: "면접용 자켓",
    category: "패션",
    college: "글로벌경영대학",
    price: 30000,
    location: "취업지원센터 앞",
    posted: "2일 전",
    likes: 9,
    views: 61,
    seller: "무역학과 4학년",
    image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&h=800&fit=crop",
    status: "판매중",
    createdAt: "2026-04-03T14:00:00+09:00"
  },
  {
    id: 12,
    title: "배구 무릎 보호대",
    category: "스포츠",
    college: "체육레저학부",
    price: 12000,
    location: "체육관 보관함 앞",
    posted: "3일 전",
    likes: 5,
    views: 28,
    seller: "심리학과 1학년",
    image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=800&fit=crop",
    status: "판매중",
    createdAt: "2026-04-02T15:00:00+09:00"
  }
];

const state = {
  activeCategory: "전체",
  activeCollege: "전체",
  searchTerm: "",
  sortBy: "recommended"
};

const categoryContainer = document.getElementById("category-filter");
const collegeContainer = document.getElementById("college-filter");
const productGrid = document.getElementById("product-grid");
const summary = document.getElementById("result-summary");
const emptyState = document.getElementById("empty-state");
const loadingState = document.getElementById("loading-state");
const errorState = document.getElementById("error-state");
const errorMessage = document.getElementById("error-message");
const searchInput = document.getElementById("search-input");
const resetFiltersButton = document.getElementById("reset-filters");
const sortButtons = document.querySelectorAll(".sort-button");
const collegeScrollLeftButton = document.getElementById("college-scroll-left");
const collegeScrollRightButton = document.getElementById("college-scroll-right");

let products = [];
let isLoading = true;
let hasLoadError = false;

const API_BASE_URL = "https://daegu-market-api.onrender.com";
const PLACEHOLDER_IMAGE = "https://via.placeholder.com/800x800?text=Product";
const API_TIMEOUT_MS = 12000;

async function fetchWithTimeout(url, options = {}, timeoutMs = API_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function getLoggedInUser() {
  try {
    return JSON.parse(localStorage.getItem("loggedInUser") || "null");
  } catch (error) {
    return null;
  }
}

function isLoggedIn() {
  return Boolean(getLoggedInUser());
}

function redirectToLogin(targetUrl) {
  const next = targetUrl || `${location.pathname}${location.search}`;
  window.location.href = `login.html?next=${encodeURIComponent(next)}`;
}

function bindAuthRequiredLinks() {
  document.addEventListener("click", event => {
    const link = event.target.closest("[data-auth-required='true']");

    if (!link || isLoggedIn()) {
      return;
    }

    event.preventDefault();
    redirectToLogin(link.getAttribute("href"));
  });
}

function setDataStatus({ loading = false, error = false, message = "" } = {}) {
  isLoading = loading;
  hasLoadError = error;

  loadingState.classList.toggle("hidden", !isLoading);
  errorState.classList.toggle("hidden", !hasLoadError);
  productGrid.classList.toggle("hidden", isLoading || hasLoadError);
  emptyState.classList.toggle("hidden", true);

  if (message) {
    errorMessage.textContent = message;
  }
}

function navigateToProduct(productId) {
  window.location.href = `product.html?id=${encodeURIComponent(productId)}`;
}

function scrollCollegeFilter(direction) {
  const scrollAmount = 220;
  collegeContainer.scrollBy({
    left: direction * scrollAmount,
    behavior: "smooth"
  });
}

function updateCollegeScrollButtons() {
  const canScrollLeft = collegeContainer.scrollLeft > 4;
  const canScrollRight = collegeContainer.scrollLeft + collegeContainer.clientWidth < collegeContainer.scrollWidth - 4;

  collegeScrollLeftButton.disabled = !canScrollLeft;
  collegeScrollRightButton.disabled = !canScrollRight;

  collegeScrollLeftButton.className = canScrollLeft
    ? "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-border bg-white text-muted-foreground hover:bg-muted"
    : "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-border bg-muted text-slate-300";

  collegeScrollRightButton.className = canScrollRight
    ? "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-border bg-white text-muted-foreground hover:bg-muted"
    : "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-border bg-muted text-slate-300";
}

function updateUrl() {
  const url = new URL(window.location.href);

  if (state.activeCategory && state.activeCategory !== "전체") {
    url.searchParams.set("category", state.activeCategory);
  } else {
    url.searchParams.delete("category");
  }

  if (state.activeCollege && state.activeCollege !== "전체") {
    url.searchParams.set("college", state.activeCollege);
  } else {
    url.searchParams.delete("college");
  }

  if (state.searchTerm) {
    url.searchParams.set("q", state.searchTerm);
  } else {
    url.searchParams.delete("q");
  }

  if (state.sortBy && state.sortBy !== "recommended") {
    url.searchParams.set("sort", state.sortBy);
  } else {
    url.searchParams.delete("sort");
  }

  window.history.replaceState({}, "", url);
}

function initializeStateFromUrl() {
  const url = new URL(window.location.href);

  state.activeCategory = url.searchParams.get("category") || "전체";
  state.activeCollege = url.searchParams.get("college") || "전체";
  state.searchTerm = url.searchParams.get("q") || "";
  state.sortBy = url.searchParams.get("sort") || "recommended";

  searchInput.value = state.searchTerm;
}

function resetFilters() {
  state.activeCategory = "전체";
  state.activeCollege = "전체";
  state.searchTerm = "";
  state.sortBy = "recommended";
  searchInput.value = "";

  createCategoryButtons();
  createCollegeButtons();
  syncSortButtons();
  renderProducts();
}

function formatPrice(price) {
  return `${Number(price || 0).toLocaleString("ko-KR")}원`;
}

function parseImages(images) {
  if (Array.isArray(images)) {
    return images;
  }

  if (typeof images !== "string" || !images.trim()) {
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
    return "방금 전";
  }

  const diffMinutes = Math.floor((Date.now() - createdAt) / (1000 * 60));

  if (diffMinutes < 1) {
    return "방금 전";
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

function isSold(product) {
  return product.status === "판매완료" || product.condition === "판매완료";
}

function getExposureScore(product) {
  const ageHours = Math.max(0, (Date.now() - new Date(product.createdAt).getTime()) / 36e5);
  const recencyScore = Math.max(0, 48 - ageHours);
  const reactionScore = product.likes * 2 + product.views * 0.2;
  const riskPenalty = product.sellerRiskScore * 1.5;
  const soldPenalty = isSold(product) ? 1000 : 0;

  return recencyScore + reactionScore - riskPenalty - soldPenalty;
}

function normalizeProduct(product) {
  const images = parseImages(product.images);
  const createdAt = product.createdAt || product.created_at || new Date().toISOString();

  return {
    id: product.id,
    title: product.title || "제목 없음",
    category: product.category || "기타",
    college: product.target_college || product.college || product.seller_college || product.seller_department || "관련 단과대 미지정",
    targetDepartment: product.target_department || "",
    price: Number(product.price || 0),
    location: product.location || "위치 미정",
    posted: product.posted || getTimeAgo(createdAt),
    likes: Number(product.likes || 0),
    views: Number(product.views || 0),
    sellerRiskScore: Number(product.seller_risk_score || 0),
    seller: product.seller || product.seller_nickname || product.seller_name || (product.seller_id ? `판매자 ${product.seller_id}` : "판매자"),
    image: product.image || product.image_url || images[0] || PLACEHOLDER_IMAGE,
    status: product.status || product.condition || "판매중",
    createdAt
  };
}

function createCategoryButtons() {
  const categories = ["전체", ...new Set(products.map(product => product.category).filter(Boolean))];

  categoryContainer.innerHTML = categories.map(category => {
    const isActive = category === state.activeCategory;
    const buttonClass = isActive
      ? "bg-primary text-white"
      : "border border-border bg-white text-foreground hover:bg-muted";

    return `
      <button
        type="button"
        data-category="${category}"
        class="category-button flex flex-shrink-0 items-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium ${buttonClass}"
      >
        ${category}
      </button>
    `;
  }).join("");
}

function createCollegeButtons() {
  const colleges = [
    "전체",
    "공공인재대학",
    "글로벌경영대학",
    "사회과학대학",
    "보건바이오대학",
    "IT·공과대학",
    "디자인예술대학",
    "사범대학",
    "재활과학대학",
    "간호대학",
    "체육레저학부",
    "문화콘텐츠학부",
    "자유전공학부",
    "글로컬라이프대학",
    "국제 대학"
  ];

  collegeContainer.innerHTML = colleges.map(college => {
    const isActive = college === state.activeCollege;
    const buttonClass = isActive
      ? "bg-primary text-white"
      : "border border-border bg-white text-foreground hover:bg-muted";

    return `
      <button
        type="button"
        data-college="${college}"
        class="college-button flex flex-shrink-0 items-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium ${buttonClass}"
      >
        ${college}
      </button>
    `;
  }).join("");

  requestAnimationFrame(updateCollegeScrollButtons);
}

function getFilteredProducts() {
  const keyword = state.searchTerm.trim().toLowerCase();

  const filtered = products.filter(product => {
    const matchesCategory = state.activeCategory === "전체" || product.category === state.activeCategory;
    const matchesCollege = state.activeCollege === "전체" || product.college === state.activeCollege;
    const matchesKeyword = !keyword || [product.title, product.category, product.college, product.targetDepartment, product.location, product.seller]
      .some(value => String(value || "").toLowerCase().includes(keyword));

    return matchesCategory && matchesCollege && matchesKeyword;
  });

  const compareActiveFirst = (a, b) => Number(isSold(a)) - Number(isSold(b));

  if (state.sortBy === "recommended") {
    return [...filtered].sort((a, b) => getExposureScore(b) - getExposureScore(a) || new Date(b.createdAt) - new Date(a.createdAt));
  }

  if (state.sortBy === "oldest") {
    return [...filtered].sort((a, b) => compareActiveFirst(a, b) || new Date(a.createdAt) - new Date(b.createdAt));
  }

  if (state.sortBy === "price-low") {
    return [...filtered].sort((a, b) => compareActiveFirst(a, b) || a.price - b.price);
  }

  if (state.sortBy === "price-high") {
    return [...filtered].sort((a, b) => compareActiveFirst(a, b) || b.price - a.price);
  }

  return [...filtered].sort((a, b) => compareActiveFirst(a, b) || new Date(b.createdAt) - new Date(a.createdAt));
}

async function loadProducts() {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/products`);

    if (!response.ok) {
      throw new Error('Failed to load products');
    }

    const data = await response.json();
    products = Array.isArray(data) ? data.map(normalizeProduct) : [];
  } catch (error) {
    console.error('상품 데이터를 불러오지 못해 샘플 데이터를 사용합니다.', error);
    hasLoadError = true;
    products = fallbackProductData.map(normalizeProduct);
  }
}
function renderProducts() {
  if (isLoading || hasLoadError) {
    return;
  }

  const filteredProducts = getFilteredProducts();

  const categoryLabel = state.activeCategory === "전체" ? "전체 카테고리" : state.activeCategory;
  const collegeLabel = state.activeCollege === "전체" ? "전체 관련 단과대" : state.activeCollege;
  summary.textContent = `${categoryLabel} · ${collegeLabel} · 상품 ${filteredProducts.length}개`;
  emptyState.classList.toggle("hidden", filteredProducts.length !== 0);
  productGrid.classList.toggle("hidden", filteredProducts.length === 0);

  productGrid.innerHTML = filteredProducts.map(product => {
    const sold = isSold(product);

    return `
    <article
      class="product-card cursor-pointer overflow-hidden rounded-2xl border border-border bg-card transition-all ${sold ? 'opacity-80' : 'hover:-translate-y-1 hover:shadow-lg'}"
      data-product-id="${product.id}"
      role="link"
      tabindex="0"
      aria-label="${product.title} 상세 보기"
    >
      <div class="relative aspect-square overflow-hidden bg-muted">
        <img src="${product.image}" alt="${product.title}" class="h-full w-full object-cover ${sold ? 'grayscale opacity-45' : ''}">
        ${sold ? '<div class="absolute inset-0 bg-white/50"></div><div class="absolute inset-0 flex items-center justify-center"><span class="rounded-full bg-slate-900/80 px-4 py-2 text-sm font-semibold text-white">판매완료</span></div>' : ''}
        <span class="absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold ${sold ? "bg-slate-900/80 text-white" : product.status === "예약중" ? "bg-amber-500 text-white" : "bg-white/90 text-foreground"}">
          ${product.status}
        </span>
      </div>
      <div class="p-4 ${sold ? 'text-slate-500' : ''}">
        <div class="mb-2 flex items-center justify-between gap-2">
          <span class="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">${product.category}</span>
          <span class="text-xs text-muted-foreground">${product.posted}</span>
        </div>
        <h3 class="line-clamp-2 text-sm font-semibold">${product.title}</h3>
        <p class="mt-2 text-lg font-bold">${formatPrice(product.price)}</p>
        <p class="mt-1 text-xs text-muted-foreground">${product.location} · ${product.seller}</p>
        <p class="mt-1 text-xs text-muted-foreground">관련 ${product.college || "단과대 미지정"}${product.targetDepartment ? ` · ${product.targetDepartment}` : ""}</p>
        <div class="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span>관심 ${product.likes}</span>
          <span>조회 ${product.views}</span>
        </div>
      </div>
    </article>
  `;
  }).join("");

  updateUrl();
  updateCollegeScrollButtons();
}

function syncSortButtons() {
  sortButtons.forEach(button => {
    const isActive = button.dataset.sort === state.sortBy;
    button.className = isActive
      ? "sort-button inline-flex items-center rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white"
      : "sort-button inline-flex items-center rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted";
  });
}

categoryContainer.addEventListener("click", event => {
  const button = event.target.closest("[data-category]");

  if (!button) {
    return;
  }

  state.activeCategory = button.dataset.category;
  createCategoryButtons();
  renderProducts();
});

collegeContainer.addEventListener("click", event => {
  const button = event.target.closest("[data-college]");

  if (!button) {
    return;
  }

  state.activeCollege = button.dataset.college;
  createCollegeButtons();
  renderProducts();
});

searchInput.addEventListener("input", event => {
  state.searchTerm = event.target.value;
  renderProducts();
});

searchInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    renderProducts();
  }
});

sortButtons.forEach(button => {
  button.addEventListener("click", () => {
    state.sortBy = button.dataset.sort;
    syncSortButtons();
    renderProducts();
  });
});

resetFiltersButton.addEventListener("click", resetFilters);

productGrid.addEventListener("click", event => {
  const card = event.target.closest("[data-product-id]");

  if (!card) {
    return;
  }

  navigateToProduct(card.dataset.productId);
});

productGrid.addEventListener("keydown", event => {
  const card = event.target.closest("[data-product-id]");

  if (!card || (event.key !== "Enter" && event.key !== " ")) {
    return;
  }

  event.preventDefault();
  navigateToProduct(card.dataset.productId);
});

collegeScrollLeftButton.addEventListener("click", () => {
  scrollCollegeFilter(-1);
});

collegeScrollRightButton.addEventListener("click", () => {
  scrollCollegeFilter(1);
});

collegeContainer.addEventListener("scroll", updateCollegeScrollButtons);

window.addEventListener("resize", updateCollegeScrollButtons);

bindAuthRequiredLinks();
initializeStateFromUrl();
setDataStatus({ loading: true });
loadProducts().then(() => {
  if (!["recommended", "latest", "oldest", "price-low", "price-high"].includes(state.sortBy)) {
    state.sortBy = "recommended";
  }

  if (hasLoadError) {
    setDataStatus({
      error: true,
      message: "서버 데이터를 불러오지 못해 임시 샘플 데이터로 표시했습니다. 서버 상태를 확인해주세요."
    });
    hasLoadError = false;
  } else {
    setDataStatus();
  }

  createCategoryButtons();
  createCollegeButtons();
  syncSortButtons();
  renderProducts();
});
