// File: api/user/deduct-balance.js
const admin = require('firebase-admin');

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Hanya POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Parse body (penting!)
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      return res.status(400).json({ success: false, error: 'Invalid JSON' });
    }
  }

  const { discordId, amount } = body;

  if (!discordId) {
    return res.status(400).json({ success: false, error: 'Missing discordId' });
  }

  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, error: 'Invalid amount' });
  }

  try {
    const userId = `discord_${discordId}`;
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const currentBalance = userDoc.data().balance || 0;
    
    if (currentBalance < amount) {
      return res.status(400).json({ success: false, error: 'Insufficient balance' });
    }

    const newBalance = currentBalance - amount;

    await userRef.update({
      balance: newBalance,
      totalSpent: admin.firestore.FieldValue.increment(amount),
      updatedAt: admin.firestore.Timestamp.now()
    });

    return res.status(200).json({ success: true, newBalance });
  } catch (error) {
    console.error('Error in deduct-balance:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};