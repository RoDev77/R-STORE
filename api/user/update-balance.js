// File: api/user/update-balance.js

const admin = require('firebase-admin');

if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      admin.initializeApp({
        projectId: 'r-store',
        credential: admin.credential.applicationDefault()
      });
    }
  } catch (error) {
    console.error('Firebase Admin init error:', error);
  }
}

const db = admin.firestore();

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ 
      success: false, 
      error: 'Use POST method to update balance' 
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      return res.status(400).json({ success: false, error: 'Invalid JSON body' });
    }
  }

  const { discordId, balance, totalSpent, totalOrders, lastOrderAmount, lastOrderRobux } = body;

  if (!discordId) {
    return res.status(400).json({ success: false, error: 'Missing discordId' });
  }

  try {
    const userId = `discord_${discordId}`;
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists()) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const updateData = {
      updatedAt: admin.firestore.Timestamp.now()
    };

    if (balance !== undefined) updateData.balance = balance;
    if (totalSpent !== undefined) updateData.totalSpent = totalSpent;
    if (totalOrders !== undefined) updateData.totalOrders = totalOrders;
    if (lastOrderAmount !== undefined) updateData.lastOrderAmount = lastOrderAmount;
    if (lastOrderRobux !== undefined) updateData.lastOrderRobux = lastOrderRobux;

    await userRef.update(updateData);

    res.status(200).json({ success: true });

  } catch (error) {
    console.error('Error in update-balance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};