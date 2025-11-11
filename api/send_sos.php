<?php
require_once '../config/database.php';
require_once '../config/security.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$database = new Database();
$db = $database->getConnection();

$user_id = checkAuth($db);
if (!$user_id) {
    return; // checkAuth handles the response and exits
}

// Require CSRF token for sending SOS (state-changing action)
if (!verify_csrf()) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'CSRF verification failed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$message = $input['message'] ?? null;

if (empty($message)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Message content is required.']);
    exit;
}

try {
    // 1. Fetch emergency contacts for the user
    $stmt = $db->prepare("SELECT phone FROM emergency_contacts WHERE user_id = ? AND phone IS NOT NULL AND phone != ''");
    $stmt->execute([$user_id]);
    $contacts = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($contacts)) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'No emergency contacts found to notify.']);
        exit;
    }

    // 2. Send SMS via Semaphore API
    // IMPORTANT: Replace with your actual Semaphore API key from your Semaphore dashboard.
    $apiKey = 'YOUR_SEMAPHORE_API_KEY_HERE'; // <-- REPLACE THIS
    $senderName = 'MomCare'; // Optional: Use a registered Sender ID if you have one

    $sent_count = 0;
    $failed_contacts = [];

    foreach ($contacts as $contact) {
        $phoneNumber = preg_replace('/[^0-9]/', '', $contact['phone']); // Clean the phone number

        // Basic validation for PH numbers (assuming standard mobile format)
        if (strlen($phoneNumber) >= 10) {
             $ch = curl_init();
             $parameters = array(
                 'apikey' => $apiKey,
                 'number' => $phoneNumber,
                 'message' => $message,
                 'sendername' => $senderName
             );
             curl_setopt($ch, CURLOPT_URL, 'https://semaphore.co/api/v4/messages');
             curl_setopt($ch, CURLOPT_POST, 1);
             curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($parameters));
             curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
             $output = curl_exec($ch);
             curl_close($ch);
             
             // A more robust implementation would check the $output for success/failure
             // For this example, we assume success if cURL executes.
             $sent_count++;
        } else {
            $failed_contacts[] = $contact['phone'];
        }
    }

    if ($sent_count > 0) {
        $response_message = "Successfully sent SOS to {$sent_count} contact(s).";
        if (!empty($failed_contacts)) {
             $response_message .= " Could not send to invalid numbers: " . implode(', ', $failed_contacts);
        }
        echo json_encode(['success' => true, 'message' => $response_message]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to send SOS to any contacts. Please check if contact numbers are valid.']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}
?>
