<?php
// File: api/qris-dynamic.php
// Tempatkan di folder api/

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// 🔴 GANTI DENGAN STRING QRIS DANA ANDA (hasil scan tadi)
$STATIC_QRIS = "00020101021126570011ID.DANA.WWW011893600915379496903402097949690340303UMI51440014ID.CO.QRIS.WWW0215ID10243608040650303UMI5204753853033605802ID5906RodiFx6015Kota Jakarta Pu6105105606304D394";

$amount = isset($_GET['amount']) ? intval($_GET['amount']) : 0;

if ($amount < 1000) {
    echo json_encode(['success' => false, 'error' => 'Minimal Rp1.000']);
    exit;
}

// Fungsi modify QRIS string dengan nominal
function modifyQRISWithAmount($qrisString, $amount) {
    $amountStr = str_pad($amount, 11, '0', STR_PAD_LEFT);
    $amountLength = strlen($amountStr);
    $nominalTemplate = '5405' . $amountLength . $amountStr;
    
    if (preg_match('/(5303\d{3})/', $qrisString, $matches)) {
        $newQRIS = preg_replace('/(5303\d{3})/', '$1' . $nominalTemplate, $qrisString);
    } else {
        $newQRIS = substr($qrisString, 0, -4) . $nominalTemplate . substr($qrisString, -4);
    }
    return $newQRIS;
}

$dynamicQRIS = modifyQRISWithAmount($STATIC_QRIS, $amount);

// Generate QR code base64
function generateQRBase64($data, $size = 300) {
    $url = 'https://quickchart.io/qr?text=' . urlencode($data) . '&size=' . $size . '&margin=2';
    $qrImageData = file_get_contents($url);
    return 'data:image/png;base64,' . base64_encode($qrImageData);
}

echo json_encode([
    'success' => true,
    'qr_base64' => generateQRBase64($dynamicQRIS),
    'amount' => $amount,
    'qr_string' => $dynamicQRIS
]);
?>