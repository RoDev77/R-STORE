// api/doku-checkout.js
export default async function handler(req, res) {
  // Hanya menerima POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderId, amount, customerName, customerEmail, redirectUrl } = req.body;

  // Credentials DOKU (ganti dengan milik Anda)
  const CLIENT_ID = 'BRN-0218-1776775043584';
  const SECRET_KEY = 'SK-2yZfPIww9K6CfEOjC6YA';

  // Generate Request-Id
  const requestId = 'REQ-' + Date.now() + '-' + Math.random().toString(36).substr(2, 8);

  // Generate timestamp ISO 8601
  const timestamp = new Date().toISOString();

  // Body request ke DOKU
  const requestBody = {
    order: {
      invoice_number: orderId,
      amount: amount
    },
    customer: {
      name: customerName || 'Customer R STORE',
      email: customerEmail || 'customer@rstore.com'
    },
    payment: {
      redirect_url: redirectUrl || 'https://store.rstudiolab.online/done.html'
    }
  };

  const bodyString = JSON.stringify(requestBody);

  // Generate signature (format DOKU)
  const digest = require('crypto').createHash('sha256').update(bodyString).digest('base64');
  const stringToSign = `Client-Id:${CLIENT_ID}\nRequest-Id:${requestId}\nRequest-Timestamp:${timestamp}\nRequest-Target:/checkout/v1/payment\nDigest:${digest}`;
  const signature = 'HMACSHA256=' + require('crypto').createHmac('sha256', SECRET_KEY).update(stringToSign).digest('base64');

  try {
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

    if (response.ok) {
      // Return checkout_url ke frontend
      return res.status(200).json({
        success: true,
        checkout_url: data.payment?.url || data.checkout_url
      });
    } else {
      return res.status(response.status).json({
        success: false,
        error: data
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}