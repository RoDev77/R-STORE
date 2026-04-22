// DOKU Configuration - PRODUCTION MODE
const DOKU_CONFIG = {
  production: {
    clientId: 'BRN-0218-1776775043584',  // Ganti dengan Client ID Production Anda
    secretKey: 'SK-2yZfPIww9K6CfEOjC6YA', // Ganti dengan Secret Key Production Anda
    baseUrl: 'https://checkout.doku.com'
  },
  mode: 'production',
  redirectUrl: window.location.origin + '/done.html',
  expiredTime: 60
};

export { DOKU_CONFIG };