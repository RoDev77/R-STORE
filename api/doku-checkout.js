// api/doku-checkout.js
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Hanya POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse body
    const body = req.body;
    console.log('Body received:', JSON.stringify(body));
    
    const { orderId, amount, redirectUrl } = body;
    
    // Validasi sederhana
    if (!orderId) {
      return res.status(400).json({ success: false, error: 'Missing orderId' });
    }
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }
    
    // Credentials
    const CLIENT_ID = 'BRN-0218-1776775043584';
    const SECRET_KEY = 'SK-2yZfPIww9K6CfEOjC6YA';
    
    // Request body ke DOKU
    const requestBody = {
      order: {
        invoice_number: orderId,
        amount: Number(amount)
      },
      customer: {
        name: 'Customer R STORE',
        email: 'customer@rstore.com'
      },
      payment: {
        redirect_url: redirectUrl || 'https://store.rstudiolab.online/done.html'
      }
    };
    
    const bodyString = JSON.stringify(requestBody);
    
    // Generate signature sederhana (untuk testing)
    const crypto = require('crypto');
    const requestId = 'REQ-' + Date.now();
    const timestamp = new Date().toISOString();
    
    // Hitung digest
    const digest = crypto.createHash('sha256').update(bodyString).digest('base64');
    
    // String to sign
    const stringToSign = `Client-Id:${CLIENT_ID}\nRequest-Id:${requestId}\nRequest-Timestamp:${timestamp}\nRequest-Target:/checkout/v1/payment\nDigest:${digest}`;
    
    // Signature
    const signature = 'HMACSHA256=' + crypto.createHmac('sha256', SECRET_KEY).update(stringToSign).digest('base64');
    
    console.log('Calling DOKU API...');
    
    // Panggil DOKU
    const response = await fetch('https://api.doku.com/checkout/v1/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Id': CLIENT_ID,
        'Request-Id': requestId,
        'Request-Timestamp': timestamp,
        'Signature': signature
      },
      body: bodyString
    });
    
    const data = await response.json();
    console.log('DOKU Response:', JSON.stringify(data));
    
    if (response.ok) {
      const checkoutUrl = data.payment?.url || data.checkout_url;
      if (checkoutUrl) {
        return res.status(200).json({
          success: true,
          checkout_url: checkoutUrl
        });
      }
    }
    
    return res.status(response.status).json({
      success: false,
      error: data.error?.message || 'Unknown error',
      dokuResponse: data
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}