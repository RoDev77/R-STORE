// File: api/user/add-balance.js

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : null;
  
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else {
    // Fallback untuk development local
    admin.initializeApp({
      projectId: 'r-store',
      credential: admin.credential.applicationDefault()
    });
  }
}

const db = admin.firestore();

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  // Handle OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Hanya menerima POST
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use POST.' 
    });
  }

  // Parse body
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid JSON body' 
      });
    }
  }

  const { discordId, amount } = body;

  console.log('📥 Add balance request:', { discordId, amount });

  if (!discordId) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing discordId' 
    });
  }

  if (!amount || amount <= 0) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid amount' 
    });
  }

  try {
    const userId = `discord_${discordId}`;
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    // 🔥 PERBAIKAN: userDoc.exists adalah property, bukan function
    // userDoc.exists (boolean), BUKAN userDoc.exists()

    if (!userDoc.exists) {
      // User tidak ditemukan, buat baru
      await userRef.set({
        discordId: discordId,
        balance: amount,
        totalDeposited: amount,
        totalSpent: 0,
        totalOrders: 0,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        role: 'member'
      });
      console.log('✅ New user created with balance:', amount);
      return res.status(200).json({ 
        success: true, 
        newBalance: amount 
      });
    }

    const currentBalance = userDoc.data().balance || 0;
    const newBalance = currentBalance + amount;

    await userRef.update({
      balance: newBalance,
      totalDeposited: admin.firestore.FieldValue.increment(amount),
      updatedAt: admin.firestore.Timestamp.now()
    });

    console.log('✅ Balance updated:', currentBalance, '->', newBalance);

    res.status(200).json({ 
      success: true, 
      newBalance 
    });

  } catch (error) {
    console.error('❌ Error in add-balance:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};