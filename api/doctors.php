<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';
require_once '../config/security.php';

// Create database connection
$database = new Database();
$db = $database->getConnection();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Return a single fixed doctor entry (Dr. Casallo). Email/contact intentionally null for now.
    try {
        $doctor = [
            'id' => 1,
            'name' => 'Dr. Casallo',
            'email' => null,
            'contact' => null,
            'is_active' => 1
        ];

        echo json_encode([
            'success' => true,
            'doctors' => [$doctor]
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Failed to fetch doctors: ' . $e->getMessage()
        ]);
    }
} else {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed'
    ]);
}
?>
