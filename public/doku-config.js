// DOKU Configuration
const DOKU_CONFIG = {
  // Untuk Sandbox (testing)
  sandbox: {
    clientId: 'BRN-0292-1776814732519',     // Ganti dengan milik Anda
    secretKey: 'SK-sTXgCWsr9eEV0pALHrE0',   // Ganti dengan milik Anda
    baseUrl: 'https://api-sandbox.doku.com'
  },
  // Untuk Production (live)
  production: {
    clientId: 'YOUR_PRODUCTION_CLIENT_ID',   // Ganti dengan milik Anda
    secretKey: 'YOUR_PRODUCTION_SECRET_KEY', // Ganti dengan milik Anda
    baseUrl: 'https://api.doku.com'
  },
  // Mode: 'sandbox' atau 'production'
  mode: 'sandbox',
  
  // Konfigurasi pembayaran
  payment: {
    expiredTime: 60,        // Masa berlaku VA (menit)
    autoRedirect: false,    // Auto redirect ke success/failed page
    callbackUrl: window.location.origin + '/payment-callback.html',  // URL webhook
    successUrl: window.location.origin + '/done.html',
    failedUrl: window.location.origin + '/payment-failed.html'
  }
};

export { DOKU_CONFIG };