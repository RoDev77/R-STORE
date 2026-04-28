// File: api/qris-dynamic.js
const { makeQRPayment, generateQRDataUrl } = require('my-qris');

const STATIC_QRIS = "00020101021126570011ID.DANA.WWW011893600915379496903402097949690340303UMI51440014ID.CO.QRIS.WWW0215ID10243608040650303UMI5204753853033605802ID5906RodiFx6015Kota Jakarta Pu6105105606304D394";

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    const amount = parseInt(req.query.amount) || 0;
    
    if (amount < 1000) {
        return res.status(400).json({ success: false, error: 'Minimal Rp1.000' });
    }
    
    try {
        // 🔥 Generate QRIS dinamis dengan library my-qris
        const dynamicQRIS = makeQRPayment({
            qrCode: STATIC_QRIS,
            amount: amount,
            fee: 0,
            feeType: "percentage"
        });
        
        const qrBase64 = await generateQRDataUrl(dynamicQRIS);
        
        res.status(200).json({
            success: true,
            qr_base64: qrBase64,
            amount: amount
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};