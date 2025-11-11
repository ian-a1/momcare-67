<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once '../config/database.php';
require_once '../config/security.php';

$database = new Database();
$db = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];

// Allow method override via JSON payload or form field for hosts that block PUT/DELETE
$rawInput = file_get_contents('php://input');
$jsonInput = json_decode($rawInput, true);
$postMethod = isset($_POST['_method']) ? strtoupper($_POST['_method']) : null;

if ($method === 'POST') {
    if (is_array($jsonInput) && isset($jsonInput['_method'])) {
        $override = strtoupper($jsonInput['_method']);
        if (in_array($override, ['PUT', 'DELETE'])) {
            $method = $override;
        }
    } elseif ($postMethod && in_array($postMethod, ['PUT', 'DELETE'])) {
        $method = $postMethod;
    }
}

// ✅ Authenticate user
$user_id = checkAuth($db);
if (!$user_id) {
    return;
}

// Enforce CSRF for state-changing methods (POST/PUT/DELETE)
if (in_array($method, ['POST', 'PUT', 'DELETE'])) {
    if (!verify_csrf()) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'CSRF verification failed']);
        exit;
    }
}

if ($method === 'GET') {
    try {
        $updateStmt = $db->prepare("UPDATE appointments SET status = 'completed' WHERE user_id = ? AND status = 'approved' AND appointment_date <= NOW()");
        $updateStmt->execute([$user_id]);
    } catch (Exception $e) {
        error_log('Failed to auto-complete appointments: ' . $e->getMessage());
    }

    $stmt = $db->prepare("SELECT * FROM appointments WHERE user_id = ? 
                          ORDER BY 
                          CASE WHEN status = 'completed' THEN 1 ELSE 0 END,
                          appointment_date ASC");
    $stmt->execute([$user_id]);
    $appointments = $stmt->fetchAll();

    echo json_encode(['success' => true, 'appointments' => $appointments]);
    exit;

} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    $title = sanitizeInput($input['title']);
    $description = sanitizeInput($input['description'] ?? '');
    $appointment_date = $input['appointment_date'];
    $doctor_name = sanitizeInput($input['doctor_name'] ?? '');
    $doctor_id = isset($input['doctor_id']) && $input['doctor_id'] !== '' ? intval($input['doctor_id']) : null;
    $type = sanitizeInput($input['type'] ?? 'other');
    $status = sanitizeInput($input['status'] ?? 'pending');

    $stmt = $db->prepare("INSERT INTO appointments (user_id, title, description, appointment_date, doctor_name, doctor_id, type, status) 
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?)");

    if ($stmt->execute([$user_id, $title, $description, $appointment_date, $doctor_name, $doctor_id, $type, $status])) {
        echo json_encode(['success' => true, 'message' => 'Appointment request sent! Waiting for doctor approval.']);
        exit;
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to create appointment']);
        exit;
    }

} elseif ($method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['id'])) {
        echo json_encode(['success' => false, 'message' => 'Appointment ID is required']);
        exit;
    }
    
    $id = $input['id'];
    $updateFields = [];
    $params = [];

    if (isset($input['title'])) {
        $updateFields[] = "title = ?";
        $params[] = sanitizeInput($input['title']);
    }
    if (isset($input['description'])) {
        $updateFields[] = "description = ?";
        $params[] = sanitizeInput($input['description']);
    }
    if (isset($input['appointment_date'])) {
        $updateFields[] = "appointment_date = ?";
        $params[] = $input['appointment_date'];
    }
    if (isset($input['doctor_name'])) {
        $updateFields[] = "doctor_name = ?";
        $params[] = sanitizeInput($input['doctor_name']);
    }
    if (isset($input['doctor_id'])) {
        $updateFields[] = "doctor_id = ?";
        $params[] = $input['doctor_id'] !== '' ? intval($input['doctor_id']) : null;
    }
    if (isset($input['type'])) {
        $updateFields[] = "type = ?";
        $params[] = sanitizeInput($input['type']);
    }
    if (isset($input['status'])) {
        $updateFields[] = "status = ?";
        $params[] = sanitizeInput($input['status']);
    }

    if (empty($updateFields)) {
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        exit;
    }

    $params[] = $id;
    $params[] = $user_id;

    $sql = "UPDATE appointments SET " . implode(", ", $updateFields) . " WHERE id = ? AND user_id = ?";
    $stmt = $db->prepare($sql);

    if ($stmt->execute($params)) {
        echo json_encode(['success' => true, 'message' => 'Appointment updated successfully']);
        exit;
    } else {
        $errorInfo = $stmt->errorInfo();
        echo json_encode(['success' => false, 'message' => 'Failed to update appointment', 'error' => $errorInfo]);
        exit;
    }

} elseif ($method === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = $input['id'] ?? $_GET['id'] ?? null;

    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'Appointment ID is required']);
        exit;
    }

    $stmt = $db->prepare("DELETE FROM appointments WHERE id = ? AND user_id = ?");
    if ($stmt->execute([$id, $user_id])) {
        echo json_encode(['success' => true, 'message' => 'Appointment deleted successfully']);
        exit;
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to delete appointment']);
        exit;
    }
}