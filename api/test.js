// File: api/test.js
// Endpoint untuk debugging Firebase Admin

const admin = require('firebase-admin');

let initError = null;
let db = null;
let initMethod = '';

try {
  if (!admin.apps.length) {
    // Coba metode 1: Service Account dari env
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        initMethod = 'Service Account (FIREBASE_SERVICE_ACCOUNT)';
        console.log('✅ Initialized with Service Account');
      } catch (e) {
        console.error('Failed to parse service account:', e.message);
        initError = `Service Account parse error: ${e.message}`;
      }
    }
    
    // Coba metode 2: Project ID saja
    if (!admin.apps.length && process.env.FIREBASE_PROJECT_ID) {
      try {
        admin.initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID
        });
        initMethod = 'Project ID (FIREBASE_PROJECT_ID)';
        console.log('✅ Initialized with Project ID');
      } catch (e) {
        console.error('Project ID init error:', e.message);
        if (!initError) initError = `Project ID error: ${e.message}`;
      }
    }
    
    // Coba metode 3: Default (hanya untuk development)
    if (!admin.apps.length) {
      try {
        admin.initializeApp({
          projectId: 'r-store'
        });
        initMethod = 'Default (r-store)';
        console.log('✅ Initialized with default project ID');
      } catch (e) {
        console.error('Default init error:', e.message);
        if (!initError) initError = `Default init error: ${e.message}`;
      }
    }
    
    // Jika berhasil inisialisasi, ambil db
    if (admin.apps.length) {
      db = admin.firestore();
    }
  } else {
    initMethod = 'Already initialized';
    db = admin.firestore();
  }
} catch (error) {
  initError = error.message;
  console.error('Critical init error:', error);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  const result = {
    timestamp: new Date().toISOString(),
    success: !!db && !initError,
    initMethod: initMethod || 'none',
    initError: initError || null,
    hasServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT,
    hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
    nodeVersion: process.version,
    envVars: {
      DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID ? '✅ set' : '❌ missing',
      DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET ? '✅ set' : '❌ missing',
      JWT_SECRET: process.env.JWT_SECRET ? '✅ set' : '❌ missing',
      FRONTEND_URL: process.env.FRONTEND_URL || '❌ missing'
    }
  };
  
  // Coba akses Firestore
  if (db && !initError) {
    try {
      // Coba baca collection users (limit 1)
      const usersRef = db.collection('users');
      const snapshot = await usersRef.limit(1).get();
      result.firestore = {
        accessible: true,
        usersCount: snapshot.size,
        message: 'Firestore is accessible'
      };
    } catch (firestoreError) {
      result.firestore = {
        accessible: false,
        error: firestoreError.message,
        code: firestoreError.code,
        message: 'Firestore access failed - check Rules'
      };
    }
  } else {
    result.firestore = {
      accessible: false,
      error: 'Firebase not initialized',
      initError: initError
    };
  }
  
  res.status(200).json(result);
};