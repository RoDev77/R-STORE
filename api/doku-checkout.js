// api/doku-checkout.js (Versi Vercel)
let admin = null;

// Inisialisasi Firebase Admin SDK
if (!admin) {
  admin = require('firebase-admin');
  
  // Cek apakah running di Vercel atau local
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Di Vercel - ambil dari env variable
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else {
    // Di local - gunakan default credentials
    admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });
  }
}

const db = admin.firestore();

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { orderId, amount, bankCode, customerName, customerEmail, redirectUrl } = req.body;
    
    // 🔥 AMBIL CREDENTIALS DARI FIRESTORE
    const credDoc = await db.collection('pconfig').doc('doku_credentials').get();
    
    if (!credDoc.exists) {
      console.error('❌ Credentials not found in Firestore');
      return res.status(500).json({ 
        success: false, 
        error: 'DOKU credentials not configured' 
      });
    }
    
    const CLIENT_ID = credDoc.data().clientId;
    const SECRET_KEY = credDoc.data().secretKey;
    
    console.log('✅ Credentials loaded from Firestore');
    
    const crypto = require('crypto');
    
    const requestId = 'REQ-' + Date.now() + '-' + Math.random().toString(36).substr(2, 8);
    const timestamp = new Date().toISOString();
    
    // Map bank code ke channel DOKU
    const channelMap = {
      bca: 'VIRTUAL_ACCOUNT_BCA',
      mandiri: 'VIRTUAL_ACCOUNT_MANDIRI',
      bni: 'VIRTUAL_ACCOUNT_BNI',
      bri: 'VIRTUAL_ACCOUNT_BRI'
    };
    
    const requestBody = {
      order: { 
        invoice_number: orderId, 
        amount: Number(amount) 
      },
      customer: { 
        name: customerName || 'Customer R STORE', 
        email: customerEmail || 'customer@rstore.com' 
      },
      payment: { 
        redirect_url: redirectUrl || 'https://store.rstudiolab.online/done.html',
        channel: channelMap[bankCode] || 'VIRTUAL_ACCOUNT_BCA'
      }
    };
    
    const bodyString = JSON.stringify(requestBody);
    const digest = crypto.createHash('sha256').update(bodyString).digest('base64');
    const stringToSign = `Client-Id:${CLIENT_ID}\nRequest-Id:${requestId}\nRequest-Timestamp:${timestamp}\nRequest-Target:/checkout/v1/payment\nDigest:${digest}`;
    const signature = 'HMACSHA256=' + crypto.createHmac('sha256', SECRET_KEY).update(stringToSign).digest('base64');
    
    console.log('Calling DOKU API for order:', orderId);
    
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
    console.log('DOKU Response status:', response.status);
    
    if (response.ok && data.payment?.url) {
      return res.status(200).json({ 
        success: true, 
        checkout_url: data.payment.url 
      });
    } else {
      console.error('DOKU Error:', data);
      return res.status(500).json({ 
        success: false, 
        error: data.error?.message || 'DOKU API error',
        details: data
      });
    }
  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}