// State Management
let currentUser = null;
let products = [
  { id: 1, name: '800 Robux', price: 95000, image: '💎', category: 'Robux', seller: 'TrustedSeller99', rating: 4.9, sales: 1523, stock: 50 },
  { id: 2, name: '1700 Robux', price: 185000, image: '💎', category: 'Robux', seller: 'GameStore', rating: 4.8, sales: 892, stock: 30 },
  { id: 3, name: '4500 Robux', price: 475000, image: '💎', category: 'Robux', seller: 'TrustedSeller99', rating: 5.0, sales: 654, stock: 20 },
  { id: 4, name: 'Valorant 475 VP', price: 45000, image: '🎮', category: 'Valorant', seller: 'ValorantPro', rating: 4.7, sales: 445, stock: 100 },
  { id: 5, name: 'ML 1000 Diamond', price: 250000, image: '💠', category: 'Mobile Legends', seller: 'MLStore', rating: 4.9, sales: 2341, stock: 80 },
  { id: 6, name: 'PUBG 3850 UC', price: 950000, image: '🔫', category: 'PUBG', seller: 'PUBGMaster', rating: 4.8, sales: 567, stock: 40 },
  { id: 7, name: 'Genshin Blessing', price: 65000, image: '⚔️', category: 'Genshin Impact', seller: 'GenshinHub', rating: 5.0, sales: 1876, stock: 150 },
  { id: 8, name: 'Steam Wallet 120K', price: 130000, image: '🎯', category: 'Steam', seller: 'SteamDeals', rating: 4.9, sales: 3421, stock: 200 }
];
let cart = [];
let selectedCategory = 'Semua';
let searchQuery = '';
let activeTab = 'browse';

const gameIcons = {
  'Robux': '💎',
  'Valorant': '🎮',
  'Mobile Legends': '💠',
  'PUBG': '🔫',
  'Genshin Impact': '⚔️',
  'Steam': '🎯',
  'Free Fire': '🔥'
};

// Utility Functions
function formatPrice(price) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(price);
}

function getCategories() {
  return ['Semua', ...new Set(products.map(p => p.category))];
}

function getFilteredProducts() {
  return products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Semua' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
}

// Cart Functions
function addToCart(productId) {
  if (!currentUser) {
    alert('Silakan login terlebih dahulu!');
    showLoginModal();
    return;
  }

  const product = products.find(p => p.id === productId);
  const cartItem = cart.find(item => item.id === productId);

  if (cartItem) {
    if (cartItem.quantity < product.stock) {
      cartItem.quantity++;
    } else {
      alert('Stok tidak cukup!');
    }
  } else {
    cart.push({ ...product, quantity: 1 });
  }
  
  renderCart();
  updateCartBadge();
}

function updateCartQuantity(productId, change) {
  const cartItem = cart.find(item => item.id === productId);
  const product = products.find(p => p.id === productId);
  
  if (cartItem) {
    const newQuantity = cartItem.quantity + change;
    if (newQuantity > 0 && newQuantity <= product.stock) {
      cartItem.quantity = newQuantity;
    } else if (newQuantity > product.stock) {
      alert('Stok tidak cukup!');
    }
  }
  
  renderCart();
  updateCartBadge();
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  renderCart();
  updateCartBadge();
}

function getTotalPrice() {
  return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function getTotalItems() {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  const total = getTotalItems();
  
  if (total > 0) {
    badge.textContent = total;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

function checkout() {
  if (cart.length === 0) {
    alert('Keranjang masih kosong!');
    return;
  }
  
  const total = getTotalPrice();
  if (currentUser.balance < total) {
    alert('Saldo tidak cukup! Silakan top up terlebih dahulu.');
    return;
  }
  
  alert(`✅ Pembayaran berhasil!\nTotal: ${formatPrice(total)}\n\nPesanan akan segera diproses.`);
  cart = [];
  renderCart();
  updateCartBadge();
}

// Authentication Functions
function showLoginModal() {
  document.getElementById('auth-modal').classList.remove('hidden');
}

function hideLoginModal() {
  document.getElementById('auth-modal').classList.add('hidden');
}

function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  if (username && password) {
    currentUser = { name: username, balance: 500000 };
    hideLoginModal();
    renderUserInfo();
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
  } else {
    alert('Mohon isi username dan password!');
  }
}

function logout() {
  currentUser = null;
  cart = [];
  activeTab = 'browse';
  renderUserInfo();
  renderCart();
  updateCartBadge();
  switchTab('browse');
}

// Seller Functions
function showSellerForm() {
  document.getElementById('seller-dashboard').classList.add('hidden');
  document.getElementById('seller-form').classList.remove('hidden');
}

function hideSellerForm() {
  document.getElementById('seller-dashboard').classList.remove('hidden');
  document.getElementById('seller-form').classList.add('hidden');
}

function addProduct() {
  if (!currentUser) {
    alert('Silakan login terlebih dahulu!');
    return;
  }

  const name = document.getElementById('product-name').value;
  const category = document.getElementById('product-category').value;
  const price = parseInt(document.getElementById('product-price').value);
  const stock = parseInt(document.getElementById('product-stock').value);

  if (!name || !price || !stock) {
    alert('Mohon lengkapi semua field!');
    return;
  }

  const newProduct = {
    id: Date.now(),
    name: name,
    price: price,
    image: gameIcons[category],
    category: category,
    seller: currentUser.name,
    rating: 5.0,
    sales: 0,
    stock: stock
  };

  products.push(newProduct);
  
  // Reset form
  document.getElementById('product-name').value = '';
  document.getElementById('product-price').value = '';
  document.getElementById('product-stock').value = '';
  
  hideSellerForm();
  renderProducts();
  renderMyProducts();
  
  alert('✅ Produk berhasil ditambahkan!');
}

// Render Functions
function renderUserInfo() {
  const userInfoContainer = document.getElementById('user-info');
  
  if (currentUser) {
    userInfoContainer.innerHTML = `
      <div class="user-balance">
        <span class="balance-label">Saldo:</span>
        <span class="balance-amount">${formatPrice(currentUser.balance)}</span>
      </div>
      <div class="user-profile">
        <span class="user-icon">👤</span>
        <span class="user-name">${currentUser.name}</span>
      </div>
      <button onclick="logout()" class="btn-logout">Logout</button>
    `;
  } else {
    userInfoContainer.innerHTML = `
      <button onclick="showLoginModal()" class="btn-login">
        <span>🔐</span> Login
      </button>
    `;
  }
}

function renderCategories() {
  const categoriesContainer = document.getElementById('categories');
  const categories = getCategories();
  
  categoriesContainer.innerHTML = categories.map(category => `
    <button 
      class="category-btn ${category === selectedCategory ? 'active' : ''}"
      onclick="selectCategory('${category}')"
    >
      ${category}
    </button>
  `).join('');
}

function renderProducts() {
  const productsContainer = document.getElementById('products-container');
  const filteredProducts = getFilteredProducts();
  
  if (filteredProducts.length === 0) {
    productsContainer.innerHTML = `
      <div class="no-products">
        <p>😔 Produk tidak ditemukan</p>
      </div>
    `;
    return;
  }
  
  productsContainer.innerHTML = filteredProducts.map(product => `
    <div class="product-card">
      <div class="product-image">${product.image}</div>
      <div class="product-header">
        <span class="product-category">${product.category}</span>
        <div class="product-rating">
          <span class="star">⭐</span>
          <span>${product.rating}</span>
        </div>
      </div>
      <h3 class="product-name">${product.name}</h3>
      <div class="product-seller">
        <span class="seller-icon">👤</span>
        <span>${product.seller}</span>
        <span class="sales">• ${product.sales} terjual</span>
      </div>
      <p class="product-price">${formatPrice(product.price)}</p>
      <p class="product-stock">📦 Stok: ${product.stock}</p>
      <button 
        class="btn-add-cart ${product.stock === 0 ? 'disabled' : ''}"
        onclick="addToCart(${product.id})"
        ${product.stock === 0 ? 'disabled' : ''}
      >
        ${product.stock === 0 ? 'Stok Habis' : '🛒 Tambah ke Keranjang'}
      </button>
    </div>
  `).join('');
}

function renderCart() {
  const cartContainer = document.getElementById('cart-items');
  const cartTotal = document.getElementById('cart-total');
  
  if (cart.length === 0) {
    cartContainer.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">🛒</div>
        <p>Keranjang masih kosong</p>
      </div>
    `;
    cartTotal.innerHTML = '';
    return;
  }
  
  cartContainer.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-image">${item.image}</div>
      <div class="cart-item-info">
        <h4>${item.name}</h4>
        <p class="cart-item-price">${formatPrice(item.price)}</p>
        <p class="cart-item-seller">${item.seller}</p>
      </div>
      <div class="cart-item-controls">
        <button onclick="updateCartQuantity(${item.id}, -1)" class="btn-quantity">−</button>
        <span class="quantity">${item.quantity}</span>
        <button onclick="updateCartQuantity(${item.id}, 1)" class="btn-quantity">+</button>
        <button onclick="removeFromCart(${item.id})" class="btn-remove">🗑️</button>
      </div>
    </div>
  `).join('');
  
  cartTotal.innerHTML = `
    <div class="cart-summary">
      <div class="total-items">
        <span>Total Item:</span>
        <span class="total-value">${getTotalItems()}</span>
      </div>
      <div class="total-price">
        <span>Total Bayar:</span>
        <span class="total-amount">${formatPrice(getTotalPrice())}</span>
      </div>
      <button onclick="checkout()" class="btn-checkout">💳 Bayar Sekarang</button>
      <p class="security-note">🛡️ Pembayaran 100% Aman & Terpercaya</p>
    </div>
  `;
}

function renderMyProducts() {
  if (!currentUser) return;
  
  const myProducts = products.filter(p => p.seller === currentUser.name);
  const container = document.getElementById('my-products');
  
  if (myProducts.length === 0) {
    container.innerHTML = '';
    return;
  }
  
  container.innerHTML = `
    <h3 class="section-title">Produk Saya</h3>
    <div class="my-products-list">
      ${myProducts.map(product => `
        <div class="my-product-item">
          <div class="my-product-image">${product.image}</div>
          <div class="my-product-info">
            <h4>${product.name}</h4>
            <div class="my-product-stats">
              <span>💰 ${formatPrice(product.price)}</span>
              <span>📦 Stok: ${product.stock}</span>
              <span>📊 ${product.sales} terjual</span>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// Tab Functions
function switchTab(tab) {
  activeTab = tab;
  
  if (tab === 'sell' && !currentUser) {
    alert('Silakan login terlebih dahulu!');
    showLoginModal();
    activeTab = 'browse';
    return;
  }
  
  document.getElementById('browse-tab').classList.toggle('active', tab === 'browse');
  document.getElementById('sell-tab').classList.toggle('active', tab === 'sell');
  
  document.getElementById('browse-section').classList.toggle('hidden', tab !== 'browse');
  document.getElementById('sell-section').classList.toggle('hidden', tab !== 'sell');
  
  if (tab === 'sell') {
    hideSellerForm();
    renderMyProducts();
  }
}

function selectCategory(category) {
  selectedCategory = category;
  renderCategories();
  renderProducts();
}

function handleSearch(value) {
  searchQuery = value;
  renderProducts();
}

// Initialize App
function init() {
  renderUserInfo();
  renderCategories();
  renderProducts();
  renderCart();
  updateCartBadge();
  
  // Event Listeners
  document.getElementById('search-input').addEventListener('input', (e) => {
    handleSearch(e.target.value);
  });
  
  document.getElementById('username').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') login();
  });
  
  document.getElementById('password').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') login();
  });
}

// Start the app when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}