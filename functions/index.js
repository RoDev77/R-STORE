const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// ========== 1. OTOMATIS KURANGI STOK SAAT ORDER WAITING_PAYMENT ==========
exports.reduceStockOnOrder = functions.firestore
    .document('orders/{orderId}')
    .onCreate(async (snap, context) => {
        const order = snap.data();
        const orderId = context.params.orderId;
        
        // Hanya proses jika status pending (baru dibuat)
        if (order.status !== 'pending') {
            console.log(`Order ${orderId} status: ${order.status}, tidak diproses`);
            return null;
        }
        
        const robuxAmount = order.robuxAmount;
        console.log(`🔄 Memproses order ${orderId} - Robux: ${robuxAmount}`);
        
        // Update status menjadi waiting_payment
        await snap.ref.update({
            status: 'waiting_payment',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            paymentDeadline: admin.firestore.Timestamp.fromDate(
                new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 jam dari sekarang
            )
        });
        
        // Baca config saat ini
        const configRef = db.collection('config').doc('storeSettings');
        const configSnap = await configRef.get();
        
        if (!configSnap.exists) {
            console.error('❌ Config tidak ditemukan!');
            return null;
        }
        
        let config = configSnap.data();
        let currentStock = config.currentStock || 0;
        let currentPO = config.currentPO || 0;
        
        // Logika pengurangan stok
        let stockReduced = 0;
        let poReduced = 0;
        
        if (currentStock >= robuxAmount) {
            // Ambil dari stock instant
            currentStock -= robuxAmount;
            stockReduced = robuxAmount;
        } else {
            // Ambil dari stock instant dulu, sisanya dari PO
            stockReduced = currentStock;
            poReduced = robuxAmount - currentStock;
            currentStock = 0;
            currentPO -= poReduced;
        }
        
        // Simpan stok baru
        await configRef.update({
            currentStock: currentStock,
            currentPO: currentPO,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Simpan info pengurangan stok ke order
        await snap.ref.update({
            stockReduced: stockReduced,
            poReduced: poReduced,
            stockUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ Stok berkurang: Instant -${stockReduced}, PO -${poReduced}`);
        console.log(`📦 Sisa stok: Instant ${currentStock}, PO ${currentPO}`);
        
        return null;
    });

// ========== 2. OTOMATIS KEMBALIKAN STOK JIKA 2 JAM TIDAK DIBAYAR ==========
exports.returnExpiredStock = functions.pubsub
    .schedule('every 5 minutes')  // Cek setiap 5 menit
    .onRun(async (context) => {
        console.log('🔍 Mengecek pesanan expired...');
        
        const now = admin.firestore.Timestamp.now();
        const twoHoursAgo = admin.firestore.Timestamp.fromDate(
            new Date(Date.now() - 2 * 60 * 60 * 1000)
        );
        
        // Cari pesanan yang:
        // 1. Status waiting_payment
        // 2. paymentDeadline sudah lewat
        const expiredOrders = await db.collection('orders')
            .where('status', '==', 'waiting_payment')
            .where('paymentDeadline', '<', now)
            .get();
        
        if (expiredOrders.empty) {
            console.log('✅ Tidak ada pesanan expired');
            return null;
        }
        
        console.log(`⚠️ Ditemukan ${expiredOrders.size} pesanan expired`);
        
        // Baca config untuk update stok
        const configRef = db.collection('config').doc('storeSettings');
        const configSnap = await configRef.get();
        const config = configSnap.data();
        
        let currentStock = config.currentStock || 0;
        let currentPO = config.currentPO || 0;
        
        for (const doc of expiredOrders.docs) {
            const order = doc.data();
            const orderId = doc.id;
            const stockReduced = order.stockReduced || 0;
            const poReduced = order.poReduced || 0;
            
            // Kembalikan stok
            currentStock += stockReduced;
            currentPO += poReduced;
            
            // Update status order menjadi cancelled
            await doc.ref.update({
                status: 'cancelled',
                cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
                cancelReason: 'Payment timeout (2 jam)'
            });
            
            console.log(`🔄 Stok dikembalikan untuk order ${orderId}: Instant +${stockReduced}, PO +${poReduced}`);
        }
        
        // Simpan stok terbaru
        await configRef.update({
            currentStock: currentStock,
            currentPO: currentPO,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ Selesai. Stok terkini: Instant ${currentStock}, PO ${currentPO}`);
        
        return null;
    });

// ========== 3. OPSIONAL: HAPUS OTOMATIS PESANAN YANG SUDAH LAMA CANCELLED ==========
exports.cleanupOldOrders = functions.pubsub
    .schedule('every 24 hours')
    .onRun(async (context) => {
        console.log('🧹 Membersihkan pesanan lama...');
        
        const sevenDaysAgo = admin.firestore.Timestamp.fromDate(
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        );
        
        // Hapus pesanan yang status cancelled/expired lebih dari 7 hari
        const oldOrders = await db.collection('orders')
            .where('status', 'in', ['cancelled', 'expired'])
            .where('updatedAt', '<', sevenDaysAgo)
            .get();
        
        let deletedCount = 0;
        for (const doc of oldOrders.docs) {
            await doc.ref.delete();
            deletedCount++;
        }
        
        console.log(`🗑️ Dihapus ${deletedCount} pesanan lama`);
        return null;
    });