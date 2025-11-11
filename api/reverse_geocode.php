<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // optional for testing
header('Access-Control-Allow-Headers: Authorization, Content-Type');
require_once __DIR__ . '/../config/security.php';

try {
    // --- 1. Get lat/lon from query ---
    if (!isset($_GET['lat']) || !isset($_GET['lon'])) {
        throw new Exception('Missing latitude or longitude.');
    }

    $lat = floatval($_GET['lat']);
    $lon = floatval($_GET['lon']);

    // --- 2. Use OpenStreetMap Nominatim API ---
    $url = "https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat={$lat}&lon={$lon}";

    // --- 3. Fetch from API ---
    $opts = [
        "http" => [
            "header" => "User-Agent: MomCareApp/1.0 (your_email@example.com)\r\n"
        ]
    ];
    $context = stream_context_create($opts);
    $json = @file_get_contents($url, false, $context);

    if ($json === FALSE) {
        throw new Exception('Failed to fetch location data.');
    }

    // --- 4. Parse and return ---
    $data = json_decode($json, true);
    echo json_encode([
        'success' => true,
        'display_name' => $data['display_name'] ?? null,
        'address' => $data['address'] ?? []
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
