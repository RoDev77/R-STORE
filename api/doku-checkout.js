// api/doku-checkout.js - Debug Version
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { orderId, amount, redirectUrl } = req.body;
    
    // GANTI DENGAN CREDENTIALS PRODUCTION ASLI ANDA
    const CLIENT_ID = 'BRN-0218-1776775043584';
    const SECRET_KEY = 'SK-2yZfPIww9K6CfEOjC6YA';
    const crypto = require('crypto');
    
    const requestId = 'REQ-' + Date.now() + '-' + Math.random().toString(36).substr(2, 8);
    const timestamp = new Date().toISOString();
    
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
    const digest = crypto.createHash('sha256').update(bodyString).digest('base64');
    const stringToSign = `Client-Id:${CLIENT_ID}\nRequest-Id:${requestId}\nRequest-Timestamp:${timestamp}\nRequest-Target:/checkout/v1/payment\nDigest:${digest}`;
    const signature = 'HMACSHA256=' + crypto.createHmac('sha256', SECRET_KEY).update(stringToSign).digest('base64');
    
    // Log semua data untuk debugging
    console.log('=== DOKU REQUEST DEBUG ===');
    console.log('CLIENT_ID:', CLIENT_ID);
    console.log('orderId:', orderId);
    console.log('amount:', amount);
    console.log('requestId:', requestId);
    console.log('timestamp:', timestamp);
    console.log('digest:', digest);
    console.log('stringToSign:', stringToSign.replace(/\n/g, '\\n'));
    console.log('signature:', signature);
    console.log('bodyString:', bodyString);
    
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
    console.log('DOKU Response Status:', response.status);
    console.log('DOKU Response Data:', JSON.stringify(data, null, 2));
    
    if (response.ok && data.payment?.url) {
      return res.status(200).json({ 
        success: true, 
        checkout_url: data.payment.url 
      });
    } else {
      return res.status(500).json({ 
        success: false, 
        error: data.error?.message || 'DOKU API error',
        status: response.status,
        details: data
      });
    }
  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    });
  }
}