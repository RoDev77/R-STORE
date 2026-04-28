// File: api/user/complete-deposit.js
const admin = require('firebase-admin');

if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : null;
  
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
}

const db = admin.firestore();

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) {
      return res.status(400).json({ success: false, error: 'Invalid JSON body' });
    }
  }

  const { depositId, discordId, amount } = body;

  if (!depositId || !discordId || !amount) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    const depositRef = db.collection('deposit_orders').doc(depositId);
    const depositDoc = await depositRef.get();

    if (!depositDoc.exists()) {
      return res.status(404).json({ success: false, error: 'Deposit order not found' });
    }

    if (depositDoc.data().status === 'completed') {
      return res.status(400).json({ success: false, error: 'Deposit already completed' });
    }

    // Update deposit status
    await depositRef.update({
      status: 'completed',
      completedAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    });

    // Tambah balance user
    const userId = `discord_${discordId}`;
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists()) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const currentBalance = userDoc.data().balance || 0;
    const newBalance = currentBalance + amount;

    await userRef.update({
      balance: newBalance,
      totalDeposited: admin.firestore.FieldValue.increment(amount),
      updatedAt: admin.firestore.Timestamp.now()
    });

    res.status(200).json({ success: true, newBalance });

  } catch (error) {
    console.error('Error completing deposit:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};