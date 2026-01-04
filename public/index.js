/* index.js */

/* ===== CONFIG ===== */
const PRICE_PER_ROBUX = 115;
let CURRENT_STOCK = 10000;
let CURRENT_PO = 5000;
const PO_LIMIT = 10000;

/* ===== ELEMENT ===== */
const robuxInput = document.getElementById('robuxInput');
const totalPrice = document.getElementById('totalPrice');
const deliveryInfo = document.getElementById('deliveryInfo');
const stockAlert = document.getElementById('stockAlert');
const stockTitle = document.getElementById('stockTitle');
const stockDesc = document.getElementById('stockDesc');
const stockReady = document.getElementById('stockReady');
const poAvailable = document.getElementById('poAvailable');
const btnBuy = document.getElementById('btnBuy');
const robuxError = document.getElementById('robuxError');

/* ===== FORMAT NUMBER ===== */
function formatNumber(num) {
  return num.toLocaleString('id-ID');
}

/* ===== UPDATE STOCK DISPLAY ===== */
function updateStockDisplay() {
  stockReady.textContent = formatNumber(CURRENT_STOCK);
  poAvailable.textContent = formatNumber(CURRENT_PO);
}

/* ===== UPDATE UI ===== */
function updateUI() {
  const robux = Number(robuxInput.value || 0);
  const total = robux * PRICE_PER_ROBUX;
  
  // Update total price
  totalPrice.textContent = 'Rp ' + formatNumber(total);

  // Hide error by default
  robuxError.classList.remove('show');

  // Disable button if invalid
  if (robux < 100) {
    btnBuy.disabled = true;
    if (robux > 0) {
      robuxError.classList.add('show');
    }
  } else {
    btnBuy.disabled = false;
  }

  // Update delivery info and stock alert
  if (CURRENT_STOCK <= 0) {
    // No stock, all PO
    if (robux <= CURRENT_PO) {
      deliveryInfo.textContent = '📦 Pre-Order (15 hari kerja)';
      stockAlert.className = 'stock-alert out';
      stockTitle.textContent = '📦 Pre-Order Mode';
      stockDesc.textContent = `Stock habis – Sisa PO: ${formatNumber(CURRENT_PO)} Robux`;
    } else {
      deliveryInfo.textContent = '❌ Melebihi kapasitas PO';
      stockAlert.className = 'stock-alert out';
      stockTitle.textContent = '❌ Tidak Tersedia';
      stockDesc.textContent = `Maksimal PO: ${formatNumber(CURRENT_PO)} Robux`;
      btnBuy.disabled = true;
    }
  } else if (robux > CURRENT_STOCK) {
    // Partial stock + PO
    const instantPart = CURRENT_STOCK;
    const poPart = robux - CURRENT_STOCK;
    
    if (poPart <= CURRENT_PO) {
      deliveryInfo.textContent = `⚡ ${formatNumber(instantPart)} Instant + 📦 ${formatNumber(poPart)} PO`;
      stockAlert.className = 'stock-alert low';
      stockTitle.textContent = '⚠️ Stock Terbatas';
      stockDesc.textContent = `${formatNumber(CURRENT_STOCK)} instant tersisa, sisanya PO`;
    } else {
      deliveryInfo.textContent = '❌ Melebihi kapasitas';
      stockAlert.className = 'stock-alert out';
      stockTitle.textContent = '❌ Tidak Tersedia';
      stockDesc.textContent = `Maksimal: ${formatNumber(CURRENT_STOCK + CURRENT_PO)} Robux`;
      btnBuy.disabled = true;
    }
  } else {
    // All instant
    deliveryInfo.textContent = '⚡ Pengiriman Instant';
    stockAlert.className = 'stock-alert available';
    stockTitle.textContent = '✅ Stock Tersedia';
    stockDesc.textContent = `${formatNumber(CURRENT_STOCK)} Robux ready untuk pengiriman instant`;
  }
}

/* ===== SUBMIT ORDER (REDIRECT TO PAYMENT) ===== */
function submitOrder() {
  const robux = Number(robuxInput.value);
  
  if (robux < 100) {
    alert('❌ Minimal pembelian 100 Robux');
    return;
  }

  const total = robux * PRICE_PER_ROBUX;
  const maxAvailable = CURRENT_STOCK + CURRENT_PO;

  if (robux > maxAvailable) {
    alert(`❌ Maksimal pembelian saat ini: ${formatNumber(maxAvailable)} Robux`);
    return;
  }

  // Redirect to payment page with parameters
  const params = new URLSearchParams({
    amount: robux,
    price: 'Rp ' + formatNumber(total),
    delivery: deliveryInfo.textContent
  });

  window.location.href = 'payment.html?' + params.toString();
}

/* ===== EVENT LISTENERS ===== */
robuxInput.addEventListener('input', updateUI);

// Add click event listener to button
btnBuy.addEventListener('click', submitOrder);

// Initialize
updateStockDisplay();
updateUI();