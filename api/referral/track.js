// File: api/referral/track.js
const admin = require('firebase-admin');

if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : null;
  if (serviceAccount) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
}

const db = admin.firestore();

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const { ref } = req.query;
  
  if (ref) {
    // Catat klik referral ke database
    const statsRef = doc(db, 'referral_stats', ref);
    const statsSnap = await getDoc(statsRef);
    
    if (statsSnap.exists()) {
      await updateDoc(statsRef, {
        clicks: admin.firestore.FieldValue.increment(1),
        lastClick: new Date()
      });
    } else {
      await setDoc(statsRef, {
        referralCode: ref,
        clicks: 1,
        conversions: 0,
        createdAt: new Date()
      });
    }
  }
  
  // Redirect ke halaman utama
  res.redirect('/');
};