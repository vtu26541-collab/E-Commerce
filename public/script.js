const API = 'http://localhost:3000/api';

const PRODUCTS_FALLBACK = [
  { id:1, name:'Wireless Noise-Cancelling Headphones', category:'electronics', price:14999, old_price:19999, rating:4.8, reviews:312, badge:'sale', image:'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', description:'Premium audio experience with 30h battery and adaptive noise cancellation.' },
  { id:2, name:'Minimalist Leather Watch', category:'fashion', price:8999, old_price:null, rating:4.9, reviews:188, badge:'new', image:'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400', description:'Swiss movement, sapphire crystal glass, genuine calfskin strap.' },
  { id:3, name:'Aroma Diffuser Set', category:'home', price:2499, old_price:3499, rating:4.7, reviews:94, badge:'sale', image:'https://images.unsplash.com/photo-1616594266894-c6f57f40e57d?w=400', description:'Ultrasonic diffuser with 10 essential oil blends for any mood.' },
  { id:4, name:'Luxury Face Serum', category:'beauty', price:3299, old_price:null, rating:4.6, reviews:227, badge:'new', image:'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400', description:'Vitamin C & hyaluronic acid blend for radiant, youthful skin.' },
  { id:5, name:'Ultra-Slim Laptop Stand', category:'electronics', price:1899, old_price:2499, rating:4.5, reviews:65, badge:'sale', image:'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400', description:'Aluminium alloy, adjustable height, compatible with all laptops.' },
  { id:6, name:'Handwoven Linen Shirt', category:'fashion', price:4599, old_price:null, rating:4.7, reviews:143, badge:null, image:'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400', description:'100% pure linen, relaxed fit, ethically sourced, naturally breathable.' },
  { id:7, name:'Ceramic Pour-Over Coffee Set', category:'home', price:3199, old_price:3999, rating:4.9, reviews:78, badge:'sale', image:'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400', description:'Handmade ceramic dripper with matching mug and tray.' },
  { id:8, name:'Botanical Perfume Oil', category:'beauty', price:1799, old_price:null, rating:4.8, reviews:201, badge:'new', image:'https://images.unsplash.com/photo-1541643600914-78b084683702?w=400', description:'Long-lasting roll-on perfume with natural floral and woody notes.' },
  { id:9, name:'Mechanical Keyboard', category:'electronics', price:9999, old_price:12999, rating:4.6, reviews:521, badge:'sale', image:'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=400', description:'Tactile switches, RGB backlit, compact tenkeyless layout.' },
  { id:10, name:'Silk Slip Dress', category:'fashion', price:6499, old_price:null, rating:4.7, reviews:89, badge:'new', image:'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400', description:'100% mulberry silk, adjustable straps, available in 6 colours.' },
  { id:11, name:'Himalayan Salt Lamp', category:'home', price:1299, old_price:1899, rating:4.4, reviews:156, badge:'sale', image:'https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=400', description:'Authentic Himalayan pink salt, warm amber glow, wood base.' },
  { id:12, name:'Retinol Night Cream', category:'beauty', price:2699, old_price:null, rating:4.5, reviews:312, badge:null, image:'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400', description:'Advanced retinol formula that works overnight for smoother skin.' },
];

/* ─── STATE ─────────────────────────────────────── */
let cart = JSON.parse(localStorage.getItem('luminary_cart')) || [];
let wishlist = JSON.parse(localStorage.getItem('luminary_wishlist')) || [];
let products = [];
let currentFilter = 'all';
let currentSort = 'default';
let searchQuery = '';

/* ─── INIT ──────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  loadProducts();
  renderCart();
  updateCartBadge();
  initNavbar();
  initUserMenu();
  initSearch();
  initFilters();
  initSort();
  initCartEvents();
  initModalClose();
});

/* ─── PRODUCTS ──────────────────────────────────── */
async function loadProducts() {
  try {
    const res = await fetch(`${API}/products`);
    if (!res.ok) throw new Error();
    products = await res.json();
  } catch {
    products = PRODUCTS_FALLBACK;
  }
  renderProducts();
}

function getFilteredProducts() {
  let list = [...products];
  if (currentFilter !== 'all') list = list.filter(p => p.category === currentFilter);
  if (searchQuery) list = list.filter(p => p.name.toLowerCase().includes(searchQuery) || p.category.toLowerCase().includes(searchQuery));
  if (currentSort === 'price-asc') list.sort((a,b) => a.price - b.price);
  if (currentSort === 'price-desc') list.sort((a,b) => b.price - a.price);
  if (currentSort === 'rating') list.sort((a,b) => b.rating - a.rating);
  if (currentSort === 'name') list.sort((a,b) => a.name.localeCompare(b.name));
  return list;
}

function renderProducts() {
  const grid = document.getElementById('productsGrid');
  const noRes = document.getElementById('noResults');
  const list = getFilteredProducts();

  if (!list.length) {
    grid.innerHTML = '';
    noRes.style.display = 'block';
    return;
  }
  noRes.style.display = 'none';
  grid.innerHTML = list.map((p, i) => productCardHTML(p, i)).join('');
  grid.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); addToCart(+btn.dataset.id); });
  });
  grid.querySelectorAll('.card-wishlist').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); toggleWishlist(+btn.dataset.id, btn); });
  });
  grid.querySelectorAll('.card-quick-view').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); openModal(+btn.dataset.id); });
  });
  grid.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', () => openModal(+card.dataset.id));
  });
  // Stagger animation
  grid.querySelectorAll('.product-card').forEach((c, i) => {
    c.style.animationDelay = `${i * 0.05}s`;
  });
}

function productCardHTML(p, i) {
  const inCart = cart.find(c => c.id === p.id);
  const inWish = wishlist.includes(p.id);
  const stars = starsHTML(p.rating);
  const badge = p.badge ? `<span class="card-badge ${p.badge}">${p.badge === 'sale' ? 'Sale' : 'New'}</span>` : '';
  const oldPrice = p.old_price ? `<span class="price-old">₹${p.old_price.toLocaleString()}</span>` : '';
  return `
  <div class="product-card" data-id="${p.id}">
    <div class="card-img-wrap">
      <img src="${p.image}" alt="${p.name}" loading="lazy"/>
      ${badge}
      <button class="card-wishlist${inWish ? ' active' : ''}" data-id="${p.id}">
        <i class="fa${inWish ? 's' : 'r'} fa-heart"></i>
      </button>
      <button class="card-quick-view" data-id="${p.id}">Quick View</button>
    </div>
    <div class="card-body">
      <p class="card-category">${p.category}</p>
      <p class="card-name">${p.name}</p>
      <div class="card-rating">
        <span class="stars">${stars}</span>
        <span class="rating-count">${p.rating} (${p.reviews})</span>
      </div>
      <div class="card-footer">
        <div class="price-wrap">
          <span class="price">₹${p.price.toLocaleString()}</span>
          ${oldPrice}
        </div>
        <button class="add-btn${inCart ? ' added' : ''}" data-id="${p.id}" title="Add to cart">
          <i class="fa${inCart ? 's' : 'r'} fa-bag-shopping"></i>
        </button>
      </div>
    </div>
  </div>`;
}

function starsHTML(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

/* ─── FILTERS & SORT ────────────────────────────── */
function initFilters() {
  document.querySelectorAll('.nav-link[data-filter]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      document.querySelectorAll('.nav-link[data-filter]').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      currentFilter = link.dataset.filter;
      renderProducts();
    });
  });
}

function initSort() {
  document.getElementById('sortSelect').addEventListener('change', e => {
    currentSort = e.target.value;
    renderProducts();
  });
}

function initSearch() {
  const inp = document.getElementById('searchInput');
  if (!inp) return;
  let timer;
  inp.addEventListener('input', e => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      searchQuery = e.target.value.trim().toLowerCase();
      renderProducts();
    }, 300);
  });
}

/* ─── CART FUNCTIONS ────────────────────────────── */
function saveCart() { localStorage.setItem('luminary_cart', JSON.stringify(cart)); }

async function addToCart(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const existing = cart.find(c => c.id === id);
  if (existing) { existing.qty += 1; }
  else { cart.push({ id: p.id, name: p.name, price: p.price, image: p.image, category: p.category, qty: 1 }); }
  saveCart();

  // sync to server if logged in
  const token = localStorage.getItem('luminary_token');
  if (token) {
    try {
      await fetch(`${API}/cart`, { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+token}, body: JSON.stringify({ product_id: id, qty: 1 }) });
    } catch {}
  }

  renderCart();
  updateCartBadge();
  renderProducts();
  showToast(`Added "${p.name}" to cart`, 'success');
}

function removeFromCart(id) {
  cart = cart.filter(c => c.id !== id);
  saveCart(); renderCart(); updateCartBadge(); renderProducts();
  showToast('Item removed from cart');
}

function updateQty(id, delta) {
  const item = cart.find(c => c.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) return removeFromCart(id);
  saveCart(); renderCart(); updateCartBadge();
}

function clearCart() {
  cart = [];
  saveCart(); renderCart(); updateCartBadge(); renderProducts();
  showToast('Cart cleared');
}

function renderCart() {
  const container = document.getElementById('cartItems');
  const empty = document.getElementById('cartEmpty');
  const footer = document.getElementById('cartFooter');
  const count = document.getElementById('cartItemCount');

  const totalItems = cart.reduce((s,c) => s + c.qty, 0);
  count.textContent = `(${totalItems})`;

  if (!cart.length) {
    container.innerHTML = '';
    container.appendChild(empty);
    empty.style.display = 'block';
    footer.style.display = 'none';
    return;
  }
  empty.style.display = 'none';
  footer.style.display = 'block';
  container.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-img"><img src="${item.image}" alt="${item.name}"/></div>
      <div class="cart-item-info">
        <p class="cart-item-name">${item.name}</p>
        <p class="cart-item-cat">${item.category}</p>
        <p class="cart-item-price">₹${(item.price * item.qty).toLocaleString()}</p>
      </div>
      <div class="cart-item-actions">
        <button class="remove-btn" onclick="removeFromCart(${item.id})"><i class="fa fa-trash-can"></i></button>
        <div class="qty-wrap">
          <button class="qty-btn" onclick="updateQty(${item.id}, -1)">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" onclick="updateQty(${item.id}, +1)">+</button>
        </div>
      </div>
    </div>`).join('');

  const subtotal = cart.reduce((s,c) => s + c.price * c.qty, 0);
  const tax = Math.round(subtotal * 0.18);
  const total = subtotal + tax;
  document.getElementById('cartSubtotal').textContent = `₹${subtotal.toLocaleString()}`;
  document.getElementById('cartTax').textContent = `₹${tax.toLocaleString()}`;
  document.getElementById('cartTotal').textContent = `₹${total.toLocaleString()}`;
}

function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  const total = cart.reduce((s,c) => s + c.qty, 0);
  badge.textContent = total;
  total > 0 ? badge.classList.add('show') : badge.classList.remove('show');
}

function initCartEvents() {
  const toggle = document.getElementById('cartToggle');
  const overlay = document.getElementById('cartOverlay');
  const sidebar = document.getElementById('cartSidebar');
  const close = document.getElementById('cartClose');
  const clearBtn = document.getElementById('clearCartBtn');
  const checkoutBtn = document.getElementById('checkoutBtn');

  const openCart = () => { sidebar.classList.add('open'); overlay.classList.add('open'); };
  const closeCart = () => { sidebar.classList.remove('open'); overlay.classList.remove('open'); };

  toggle.addEventListener('click', openCart);
  close.addEventListener('click', closeCart);
  overlay.addEventListener('click', closeCart);
  clearBtn.addEventListener('click', () => { clearCart(); });
  checkoutBtn.addEventListener('click', () => {
    const token = localStorage.getItem('luminary_token');
    if (!token) { showToast('Please login to checkout', 'error'); window.location.href = 'login.html'; return; }
    showToast('Proceeding to checkout…', 'success');
  });
}

/* ─── WISHLIST ──────────────────────────────────── */
function toggleWishlist(id, btn) {
  const idx = wishlist.indexOf(id);
  if (idx === -1) { wishlist.push(id); showToast('Added to wishlist', 'success'); }
  else { wishlist.splice(idx, 1); showToast('Removed from wishlist'); }
  localStorage.setItem('luminary_wishlist', JSON.stringify(wishlist));
  renderProducts();
}

/* ─── MODAL ─────────────────────────────────────── */
function openModal(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const overlay = document.getElementById('modalOverlay');
  const content = document.getElementById('modalContent');
  const inCart = cart.find(c => c.id === id);
  const oldP = p.old_price ? `<span class="old">₹${p.old_price.toLocaleString()}</span>` : '';
  content.innerHTML = `
    <div class="modal-inner">
      <div class="modal-img"><img src="${p.image}" alt="${p.name}"/></div>
      <div class="modal-info">
        <p class="modal-cat">${p.category}</p>
        <h2 class="modal-name">${p.name}</h2>
        <div class="modal-rating">
          <span class="stars">${starsHTML(p.rating)}</span>
          <span style="color:var(--text3);font-size:.85rem">&nbsp;${p.rating} · ${p.reviews} reviews</span>
        </div>
        <p class="modal-desc">${p.description || 'A premium quality product crafted for the discerning buyer.'}</p>
        <p class="modal-price">₹${p.price.toLocaleString()} ${oldP}</p>
        <button class="modal-add-btn" onclick="addToCart(${p.id}); closeModal();">
          <i class="fa fa-bag-shopping"></i> Add to Cart
        </button>
      </div>
    </div>`;
  overlay.classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

function initModalClose() {
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  });
}

/* ─── NAVBAR ────────────────────────────────────── */
function initNavbar() {
  let lastY = 0;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    const nav = document.getElementById('navbar');
    if (y > 80) { nav.style.boxShadow = '0 4px 24px rgba(0,0,0,0.4)'; }
    else { nav.style.boxShadow = 'none'; }
    lastY = y;
  });
}

/* ─── USER MENU ─────────────────────────────────── */
function initUserMenu() {
  const token = localStorage.getItem('luminary_token');
  const user = JSON.parse(localStorage.getItem('luminary_user') || 'null');
  const loginLink = document.getElementById('loginLink');
  const registerLink = document.getElementById('registerLink');
  const logoutLink = document.getElementById('logoutLink');
  const ordersLink = document.getElementById('ordersLink');
  const userInfo = document.getElementById('userInfo');

  if (token && user) {
    loginLink.style.display = 'none';
    registerLink.style.display = 'none';
    logoutLink.style.display = 'flex';
    ordersLink.style.display = 'flex';
    userInfo.textContent = `Hi, ${user.first_name || user.email}`;
  }

  logoutLink && logoutLink.addEventListener('click', e => {
    e.preventDefault();
    localStorage.removeItem('luminary_token');
    localStorage.removeItem('luminary_user');
    showToast('Logged out successfully');
    setTimeout(() => location.reload(), 800);
  });
}

/* ─── TOAST ─────────────────────────────────────── */
let toastTimer;
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}