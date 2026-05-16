// File: api/referral/claim.js
const admin = require('firebase-admin');

if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : null;
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      firestore: { ignoreUndefinedProperties: true }
    });
  } else {
    admin.initializeApp({
      projectId: 'r-store',
      firestore: { ignoreUndefinedProperties: true }
    });
  }
}

const db = admin.firestore();

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'GET') {
    return res.status(200).json({ success: false, error: 'Use POST method' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) {
      return res.status(400).json({ success: false, error: 'Invalid JSON' });
    }
  }

  const { discordId, username, globalName, referralCode } = body;

  if (!discordId || !referralCode) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    // 🔥 CEK APAKAH USER MENGGUNAKAN KODE SENDIRI
    const userRef = db.collection('users').doc(`discord_${discordId}`);
    const userSnap = await userRef.get();
    
    // 🔥 PERBAIKAN: userSnap.exists adalah property, BUKAN function
    if (userSnap.exists) {
      const userData = userSnap.data();
      if (userData.referredBy) {
        return res.status(400).json({ 
          success: false, 
          error: 'Anda sudah pernah menggunakan kode referral sebelumnya' 
        });
      }
    }

    // Cari referrer berdasarkan referral code
    const referralsQuery = await db.collection('referrals')
      .where('referralCode', '==', referralCode)
      .limit(1)
      .get();

    if (referralsQuery.empty) {
      return res.status(404).json({ success: false, error: 'Kode referral tidak valid' });
    }

    const referrerDoc = referralsQuery.docs[0];
    const referrerId = referrerDoc.id;
    
    // 🔥 CEK APAKAH USER MENGGUNAKAN KODE SENDIRI
    if (referrerId === discordId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Anda tidak bisa menggunakan kode referral milik sendiri' 
      });
    }

    const referrerData = referrerDoc.data();
    
    // Cek apakah user sudah ada di referredUsers
    const existingReferral = (referrerData.referredUsers || []).find(u => u.userId === discordId);
    if (existingReferral) {
      return res.status(400).json({ 
        success: false, 
        error: 'Anda sudah pernah direfer oleh user lain' 
      });
    }

    // Tambahkan user ke daftar referred users
    const newReferredUser = {
      userId: discordId,
      username: username || 'Unknown',
      globalName: globalName || username || 'Unknown',
      bonusAmount: 0,
      bonusPaid: false,
      createdAt: new Date()
    };

    await referrerDoc.ref.update({
      referredUsers: admin.firestore.FieldValue.arrayUnion(newReferredUser),
      totalReferred: admin.firestore.FieldValue.increment(1),
      updatedAt: new Date()
    });

    // Simpan referral info ke user
    if (!userSnap.exists) {
      await userRef.set({
        discordId: discordId,
        username: username || 'Unknown',
        globalName: globalName || username || 'Unknown',
        referredBy: referrerId,
        referralCode: referralCode,
        referredAt: new Date(),
        createdAt: new Date(),
        balance: 0,
        role: 'member'
      });
    } else {
      await userRef.update({
        referredBy: referrerId,
        referralCode: referralCode,
        referredAt: new Date(),
        updatedAt: new Date()
      });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Referral berhasil diklaim! Dapatkan bonus setelah melakukan transaksi.' 
    });

  } catch (error) {
    console.error('Error in claim referral:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};