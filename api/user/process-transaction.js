// File: api/user/process-transaction.js
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

// 🔥 FUNGSI HITUNG BONUS REFERRAL
function calculateBonus(transactionData) {
  const { 
    transactionType,      // 'deposit' atau 'topup'
    amountRupiah,         // nominal dalam Rupiah (untuk deposit)
    robuxAmount,          // jumlah Robux (untuk topup)
    isFirstTransaction,   // apakah ini transaksi pertama user?
    totalOrders,          // total pesanan user (termasuk transaksi ini)
    hasReceivedDepositBonus,
    hasReceivedTopupBonus
  } = transactionData;

  // 🔥 BONUS DEPOSIT PERTAMA (minimal Rp50.000)
  if (transactionType === 'deposit' && isFirstTransaction && amountRupiah >= 50000) {
    return {
      amount: 2500,
      type: 'first_deposit',
      description: `Deposit pertama Rp${amountRupiah.toLocaleString('id-ID')}`
    };
  }

  // 🔥 BONUS TOPUP PERTAMA (minimal 100 Robux)
  if (transactionType === 'topup' && isFirstTransaction && robuxAmount >= 100) {
    return {
      amount: 1000,
      type: 'first_topup',
      description: `Top up pertama ${robuxAmount} Robux`
    };
  }

  // 🔥 BONUS 1% UNTUK TRANSAKSI KEDUA DAN SETERUSNYA
  // Untuk deposit: dari nominal Rupiah
  // Untuk topup: dari nominal Rupiah (total pembayaran)
  if (!isFirstTransaction && totalOrders >= 2) {
    let bonusBaseAmount = 0;
    
    if (transactionType === 'deposit') {
      bonusBaseAmount = amountRupiah;
    } else if (transactionType === 'topup') {
      bonusBaseAmount = amountRupiah; // total pembayaran dalam Rupiah
    }
    
    const bonusAmount = Math.floor(bonusBaseAmount * 0.01); // 1%
    
    if (bonusAmount > 0) {
      return {
        amount: bonusAmount,
        type: 'daily_transaction',
        description: `1% dari transaksi (Rp${bonusBaseAmount.toLocaleString('id-ID')})`
      };
    }
  }

  return null;
}

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

  const { 
    discordId, 
    amount,           // nominal dalam Rupiah (total pembayaran)
    transactionType,  // 'deposit' atau 'topup'
    robuxAmount = 0   // jumlah Robux (khusus topup)
  } = body;

  console.log('📥 Process transaction:', { discordId, amount, transactionType, robuxAmount });

  if (!discordId || !amount || amount <= 0) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    const userId = `discord_${discordId}`;
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    let currentBalance = 0;
    let totalOrders = 0;
    let isFirstTransaction = false;
    let hasReceivedDepositBonus = false;
    let hasReceivedTopupBonus = false;

    if (!userDoc.exists) {
      isFirstTransaction = true;
      totalOrders = 1;
      await userRef.set({
        discordId: discordId,
        balance: transactionType === 'deposit' ? amount : 0,
        totalDeposited: transactionType === 'deposit' ? amount : 0,
        totalSpent: transactionType === 'topup' ? amount : 0,
        totalRobuxBought: transactionType === 'topup' ? robuxAmount : 0,
        totalOrders: 1,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        role: 'member'
      });
      currentBalance = transactionType === 'deposit' ? amount : 0;
    } else {
      const userData = userDoc.data();
      totalOrders = (userData.totalOrders || 0) + 1;
      isFirstTransaction = totalOrders === 1;
      hasReceivedDepositBonus = userData.hasReceivedDepositBonus || false;
      hasReceivedTopupBonus = userData.hasReceivedTopupBonus || false;
      
      if (transactionType === 'deposit') {
        currentBalance = (userData.balance || 0) + amount;
        await userRef.update({
          balance: currentBalance,
          totalDeposited: admin.firestore.FieldValue.increment(amount),
          totalOrders: totalOrders,
          updatedAt: admin.firestore.Timestamp.now()
        });
      } else {
        currentBalance = userData.balance || 0;
        await userRef.update({
          totalSpent: admin.firestore.FieldValue.increment(amount),
          totalRobuxBought: admin.firestore.FieldValue.increment(robuxAmount),
          totalOrders: totalOrders,
          updatedAt: admin.firestore.Timestamp.now()
        });
      }
    }

    // 🔥 CEK USER DATA TERBARU
    const updatedUserDoc = await userRef.get();
    const userData = updatedUserDoc.data();
    const referredBy = userData.referredBy;

    // 🔥 HITUNG BONUS
    const bonus = calculateBonus({
      transactionType,
      amountRupiah: amount,
      robuxAmount: robuxAmount,
      isFirstTransaction,
      totalOrders,
      hasReceivedDepositBonus,
      hasReceivedTopupBonus
    });

    console.log('🎁 Bonus calculated:', bonus);

    // 🔥 JIKA USER DIREFER DAN DAPAT BONUS
    if (referredBy && bonus) {
      const referrerRef = db.collection('referrals').doc(referredBy);
      const referrerDoc = await referrerRef.get();
      
      if (referrerDoc.exists) {
        const bonusAmount = bonus.amount;
        
        // Tambah bonus ke saldo referrer
        const referrerUserRef = db.collection('users').doc(`discord_${referredBy}`);
        await referrerUserRef.update({
          balance: admin.firestore.FieldValue.increment(bonusAmount),
          updatedAt: admin.firestore.Timestamp.now()
        });
        
        // 🔥 TAMBAHKAN KE EARNED BONUSES
        const newBonus = {
          type: bonus.type,
          amount: bonusAmount,
          description: bonus.description,
          fromUserId: discordId,
          fromUsername: userData.username || 'User',
          transactionAmount: transactionType === 'topup' ? robuxAmount : amount,
          transactionType: transactionType,
          orderNumber: totalOrders,
          createdAt: new Date()
        };
        
        await referrerRef.update({
          earnedBonuses: admin.firestore.FieldValue.arrayUnion(newBonus),
          totalBonus: admin.firestore.FieldValue.increment(bonusAmount),
          updatedAt: admin.firestore.Timestamp.now()
        });
        
        // 🔥 UPDATE STATUS BONUS DI USER (agar bonus tidak double)
        if (bonus.type === 'first_deposit') {
          await userRef.update({
            hasReceivedDepositBonus: true,
            depositBonusReceivedAt: new Date(),
            depositBonusAmount: bonusAmount
          });
        }
        
        if (bonus.type === 'first_topup') {
          await userRef.update({
            hasReceivedTopupBonus: true,
            topupBonusReceivedAt: new Date(),
            topupBonusAmount: bonusAmount
          });
        }
        
        console.log(`✅ Bonus referral Rp${bonusAmount} (${bonus.type}) given to ${referredBy}`);
      }
    }

    res.status(200).json({ 
      success: true, 
      newBalance: currentBalance,
      bonus: bonus || null
    });

  } catch (error) {
    console.error('Error in process-transaction:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};