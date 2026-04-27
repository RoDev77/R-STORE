// File: api/qris-dynamic.js
// Jalan di Vercel (Node.js)

// 🔴 GANTI DENGAN STRING QRIS DANA ANDA (hasil scan tadi)
const STATIC_QRIS = "00020101021126570011ID.DANA.WWW011893600915379496903402097949690340303UMI51440014ID.CO.QRIS.WWW0215ID10243608040650303UMI5204753853033605802ID5906RodiFx6015Kota Jakarta Pu6105105606304D394";

// Fungsi modify QRIS string dengan nominal dinamis
function modifyQRISWithAmount(qrisString, amount) {
    const amountStr = String(amount).padStart(11, '0');
    const amountLength = amountStr.length;
    const nominalTemplate = '5405' + amountLength + amountStr;
    
    // Cari kode 53 (mata uang IDR)
    const match = qrisString.match(/(5303\d{3})/);
    if (match) {
        return qrisString.replace(/(5303\d{3})/, '$1' + nominalTemplate);
    }
    
    // Fallback: tambah di akhir sebelum CRC
    return qrisString.slice(0, -4) + nominalTemplate + qrisString.slice(-4);
}

// Generate QR Code ke base64
async function generateQRBase64(data, size = 300) {
    const url = `https://quickchart.io/qr?text=${encodeURIComponent(data)}&size=${size}&margin=2`;
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return `data:image/png;base64,${base64}`;
}

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Content-Type', 'application/json');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const amount = parseInt(req.query.amount) || 0;
    
    if (amount < 1000) {
        return res.status(400).json({
            success: false,
            error: 'Minimal nominal Rp1.000'
        });
    }
    
    if (amount > 2000000) {
        return res.status(400).json({
            success: false,
            error: 'Maksimal nominal Rp2.000.000'
        });
    }
    
    try {
        const dynamicQRIS = modifyQRISWithAmount(STATIC_QRIS, amount);
        const qrBase64 = await generateQRBase64(dynamicQRIS);
        
        res.status(200).json({
            success: true,
            qr_base64: qrBase64,
            amount: amount,
            qr_string: dynamicQRIS
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Gagal generate QR: ' + error.message
        });
    }
};