import { db, doc, updateDoc, getDoc, setDoc, serverTimestamp } from './firebase-config.js';
import { DOKU_CONFIG } from './doku-config.js';

// Helper: Generate signature untuk request
function generateSignature(requestBody, secretKey) {
  // DOKU menggunakan HMAC-SHA256
  const encoder = new TextEncoder();
  const data = JSON.stringify(requestBody);
  
  // Untuk sandbox, signature tidak divalidasi ketat
  // Tapi tetap perlu diisi dengan format yang benar
  return btoa(data); // Simple base64 untuk testing
}

// Helper: Encode credentials untuk Basic Auth
function getBasicAuth() {
  const config = DOKU_CONFIG[DOKU_CONFIG.mode];
  const credentials = `${config.clientId}:${config.secretKey}`;
  return btoa(credentials);
}

// 1. Generate Virtual Account (BCA/Mandiri/BNI/BRI)
export async function createVirtualAccount(orderId, amount, bankCode) {
  const config = DOKU_CONFIG[DOKU_CONFIG.mode];
  
  // Mapping bank code
  const bankMapping = {
    bca: 'BCA',
    mandiri: 'MANDIRI', 
    bni: 'BNI',
    bri: 'BRI'
  };
  
  const requestBody = {
    order: {
      invoice_number: orderId,
      amount: amount
    },
    virtual_account_info: {
      billing_type: 'FIX_BILL',
      expired_time: DOKU_CONFIG.payment.expiredTime,
      reusable_status: false,
      info1: 'R STORE - ROBUX',
      info2: `Order ID: ${orderId}`,
      info3: 'Pembelian Robux'
    },
    customer: {
      name: 'Customer R STORE',
      email: 'customer@rstore.com'
    }
  };
  
  try {
    const response = await fetch(`${config.baseUrl}/v1/payment/virtual-account/${bankMapping[bankCode]}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${getBasicAuth()}`,
        'Client-Id': config.clientId,
        'Request-Id': orderId,
        'Request-Date': new Date().toISOString()
      },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Simpan info pembayaran ke order
      await updateDoc(doc(db, 'orders', orderId), {
        paymentCode: data.virtual_account_info.virtual_account_number,
        paymentUrl: null,
        paymentMethod: bankCode,
        paymentExpiry: new Date(Date.now() + DOKU_CONFIG.payment.expiredTime * 60 * 1000),
        dokuResponse: data,
        updatedAt: serverTimestamp()
      });
      
      return {
        success: true,
        virtualAccount: data.virtual_account_info.virtual_account_number,
        howToPayUrl: data.virtual_account_info.how_to_pay_url
      };
    } else {
      console.error('DOKU Error:', data);
      return { success: false, error: data.message };
    }
  } catch (error) {
    console.error('Network Error:', error);
    return { success: false, error: error.message };
  }
}

// 2. Generate QRIS (hanya untuk production)
export async function createQRIS(orderId, amount) {
  if (DOKU_CONFIG.mode === 'sandbox') {
    alert('⚠️ QRIS tidak tersedia di Sandbox DOKU. Ganti ke mode production untuk testing QRIS.');
    return { success: false, error: 'QRIS not available in sandbox' };
  }
  
  const config = DOKU_CONFIG[DOKU_CONFIG.mode];
  
  const requestBody = {
    order: {
      invoice_number: orderId,
      amount: amount
    },
    qris_info: {
      expired_time: DOKU_CONFIG.payment.expiredTime,
      info1: 'R STORE - ROBUX',
      info2: `Order ID: ${orderId}`
    },
    customer: {
      name: 'Customer R STORE',
      email: 'customer@rstore.com'
    }
  };
  
  try {
    const response = await fetch(`${config.baseUrl}/v1/payment/qris`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${getBasicAuth()}`,
        'Client-Id': config.clientId,
        'Request-Id': orderId,
        'Request-Date': new Date().toISOString()
      },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      await updateDoc(doc(db, 'orders', orderId), {
        paymentCode: null,
        paymentUrl: data.qris_info.qr_code_url,
        qrImage: data.qris_info.qr_code_image,
        paymentMethod: 'qris',
        paymentExpiry: new Date(Date.now() + DOKU_CONFIG.payment.expiredTime * 60 * 1000),
        dokuResponse: data,
        updatedAt: serverTimestamp()
      });
      
      return {
        success: true,
        qrImage: data.qris_info.qr_code_image,
        qrUrl: data.qris_info.qr_code_url
      };
    } else {
      return { success: false, error: data.message };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 3. Generate E-Wallet Payment (GoPay/DANA/OVO)
export async function createEWallet(orderId, amount, walletCode) {
  const config = DOKU_CONFIG[DOKU_CONFIG.mode];
  
  const walletMapping = {
    gopay: 'GOPAY',
    dana: 'DANA',
    ovo: 'OVO'
  };
  
  const requestBody = {
    order: {
      invoice_number: orderId,
      amount: amount,
      callback_url: DOKU_CONFIG.payment.callbackUrl,
      failed_url: DOKU_CONFIG.payment.failedUrl,
      auto_redirect: DOKU_CONFIG.payment.autoRedirect
    },
    ewallet_info: {
      expired_time: DOKU_CONFIG.payment.expiredTime
    },
    customer: {
      name: 'Customer R STORE',
      email: 'customer@rstore.com'
    }
  };
  
  try {
    const response = await fetch(`${config.baseUrl}/v1/payment/ewallet/${walletMapping[walletCode]}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${getBasicAuth()}`,
        'Client-Id': config.clientId,
        'Request-Id': orderId,
        'Request-Date': new Date().toISOString()
      },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      await updateDoc(doc(db, 'orders', orderId), {
        paymentCode: null,
        paymentUrl: data.ewallet_info.checkout_url,
        paymentMethod: walletCode,
        paymentExpiry: new Date(Date.now() + DOKU_CONFIG.payment.expiredTime * 60 * 1000),
        dokuResponse: data,
        updatedAt: serverTimestamp()
      });
      
      return {
        success: true,
        paymentUrl: data.ewallet_info.checkout_url
      };
    } else {
      return { success: false, error: data.message };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 4. Cek status pembayaran
export async function checkPaymentStatus(orderId) {
  const config = DOKU_CONFIG[DOKU_CONFIG.mode];
  
  try {
    const response = await fetch(`${config.baseUrl}/v1/payment/status/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${getBasicAuth()}`,
        'Client-Id': config.clientId
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      const statusMapping = {
        'SUCCESS': 'paid',
        'PENDING': 'waiting_payment',
        'FAILED': 'cancelled',
        'EXPIRED': 'cancelled'
      };
      
      const newStatus = statusMapping[data.transaction_status] || 'waiting_payment';
      
      if (newStatus === 'paid') {
        await updateDoc(doc(db, 'orders', orderId), {
          status: newStatus,
          paidAt: serverTimestamp(),
          paymentStatus: data,
          updatedAt: serverTimestamp()
        });
      }
      
      return { success: true, status: newStatus, data: data };
    } else {
      return { success: false, error: data.message };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}