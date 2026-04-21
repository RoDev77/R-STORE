const DOKU_CONFIG = {
  sandbox: {
    clientId: 'BRN-0292-1776814732519',
    baseUrl: 'https://checkout-sandbox.doku.com'
  },
  production: {
    clientId: 'YOUR_PRODUCTION_CLIENT_ID',
    baseUrl: 'https://checkout.doku.com'
  },
  mode: 'sandbox', // atau 'production'
  redirectUrl: window.location.origin + '/done.html'
};

export { DOKU_CONFIG };