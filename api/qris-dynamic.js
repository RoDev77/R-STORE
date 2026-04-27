// File: api/qris-dynamic.js
const STATIC_QRIS = "00020101021126570011ID.DANA.WWW011893600915379496903402097949690340303UMI51440014ID.CO.QRIS.WWW0215ID10243608040650303UMI5204753853033605802ID5906RodiFx6015Kota Jakarta Pu6105105606304D394";

function injectAmountToQRIS(qrisString, amount) {
    const amountStr = String(amount).padStart(11, '0');
    const amountTag = '5405' + amountStr.length + amountStr;
    const currencyTag = '5303360';
    const currencyPos = qrisString.indexOf(currencyTag);
    
    if (currencyPos !== -1) {
        const before = qrisString.substring(0, currencyPos + currencyTag.length);
        const after = qrisString.substring(currencyPos + currencyTag.length);
        return before + amountTag + after;
    }
    const crc = qrisString.slice(-4);
    const body = qrisString.slice(0, -4);
    return body + amountTag + crc;
}

async function generateQRBase64(data, size = 300) {
    const url = `https://quickchart.io/qr?text=${encodeURIComponent(data)}&size=${size}&margin=2`;
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return `data:image/png;base64,${base64}`;
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    const amount = parseInt(req.query.amount) || 0;
    
    if (amount < 1000) {
        return res.status(400).json({ success: false, error: 'Minimal Rp1.000' });
    }
    
    if (amount > 2000000) {
        return res.status(400).json({ success: false, error: 'Maksimal Rp2.000.000' });
    }
    
    try {
        const dynamicQRIS = injectAmountToQRIS(STATIC_QRIS, amount);
        const qrBase64 = await generateQRBase64(dynamicQRIS);
        
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