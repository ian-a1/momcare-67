<?php
require_once '../config/database.php';
require_once '../config/security.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

$database = new Database();
$db = $database->getConnection();

$user_id = checkAuth($db);
if (!$user_id) {
    // checkAuth handles the response and exit
    return;
}

$method = $_SERVER['REQUEST_METHOD'];

// Handle POST method for updates (simulate PUT)
if ($method === 'OPTIONS') {
    exit;
}

// Require CSRF for updates
if ($method === 'POST') {
    // if it's an update (PUT override) require CSRF
    $raw = @file_get_contents('php://input');
    $dataPreview = json_decode($raw, true);
    $isUpdate = is_array($dataPreview) && isset($dataPreview['_method']) && strtoupper($dataPreview['_method']) === 'PUT';
    // If the request is an update, require CSRF unless the client used a Bearer token
    if ($isUpdate) {
        $hasBearer = false;
        $authHeader = null;
        // Try multiple ways to detect Authorization header (depends on SAPI / Apache config)
        if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
        } elseif (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        } elseif (function_exists('getallheaders')) {
            $hdrs = getallheaders();
            if (!empty($hdrs['Authorization'])) $authHeader = $hdrs['Authorization'];
            elseif (!empty($hdrs['authorization'])) $authHeader = $hdrs['authorization'];
        }
        if ($authHeader && preg_match('/Bearer\s+(\S+)/', $authHeader)) {
            $hasBearer = true;
        }
        if (!$hasBearer && !verify_csrf()) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'CSRF verification failed']);
            exit;
        }
    }
}

try {
    if ($method === 'GET') {
        getProfile($db, $user_id);
    } elseif ($method === 'POST') {
        // Check if frontend sent a _method override
        $input = json_decode(file_get_contents('php://input'), true);
        if (isset($input['_method']) && strtoupper($input['_method']) === 'PUT') {
            updateProfile($db, $user_id, $input);
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid POST request.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}


function getProfile($db, $user_id) {
    $sql = "
        SELECT 
            u.id, u.name, u.email, u.birthdate, u.sex, u.phone_number,
            u.address_line1, u.address_line2, u.barangay, u.city, u.zip_code,
            p.due_date, p.current_week, mi.primary_obgyn_name, mi.clinic_address,
            mi.blood_type, mi.allergies, mi.medical_conditions, mi.medications,
            mi.healthcare_provider, mi.clinic_phone_number,
            ups.two_factor_auth
        FROM users u
        LEFT JOIN pregnancy_info p ON u.id = p.user_id
        LEFT JOIN user_profile_settings ups ON u.id = ups.user_id
        LEFT JOIN user_medical_info mi ON u.id = mi.user_id
        WHERE u.id = ?
    ";

    $stmt = $db->prepare($sql);
    $stmt->execute([$user_id]);
    $profile = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($profile) {
        // ONLY calculate current_week if user hasn't manually set it yet
        // (i.e., if current_week is NULL or 0, but due_date exists)
        if ((empty($profile['current_week']) || $profile['current_week'] == 0) && !empty($profile['due_date'])) {
            try {
                $dueDate = new DateTime($profile['due_date']);
                $today = new DateTime();
                $conceptionDate = (clone $dueDate)->modify('-280 days');
                if ($today > $conceptionDate) {
                    $daysPregnant = $today->diff($conceptionDate)->days;
                    $currentWeek = floor($daysPregnant / 7);
                    $profile['current_week'] = max(1, $currentWeek); 
                } else {
                     $profile['current_week'] = 1;
                }
            } catch (Exception $e) {
                // If date parsing fails, set to 1
                $profile['current_week'] = 1;
            }
        }
        // If current_week is already set in DB (user manually entered it), 
        // we keep that value and don't override it
        
        echo json_encode(['success' => true, 'profile' => $profile]);
    } else {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Profile not found']);
    }
}

function updateProfile($db, $user_id, $input) {
    $section = $input['section'] ?? '';
    $data = $input['data'] ?? [];

    if (empty($section) || empty($data)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid input.']);
        return;
    }

    $db->beginTransaction();

    try {
        switch ($section) {
            case 'basic-info':
                updateBasicInfo($db, $user_id, $data);
                break;
            case 'medical-info':
                updateMedicalInfo($db, $user_id, $data);
                break;
            case 'password-security':
                updatePasswordSecurity($db, $user_id, $data);
                break;
            default:
                throw new Exception("Invalid profile section specified.");
        }
        
        $db->commit();
        echo json_encode(['success' => true, 'message' => 'Profile updated successfully']);

    } catch (Exception $e) {
        $db->rollBack();
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function updateBasicInfo($db, $user_id, $data) {
    // Update users table
    $stmt_user = $db->prepare("UPDATE users SET name = ?, email = ?, phone_number = ?, birthdate = ?, address_line1 = ?, address_line2 = ?, barangay = ?, city = ?, zip_code = ? WHERE id = ?");
    $stmt_user->execute([
        sanitizeInput($data['name'] ?? null),
        sanitizeInput($data['email'] ?? null),
        sanitizeInput($data['phone_number'] ?? null),
        $data['birthdate'] ?? null,
        sanitizeInput($data['address_line1'] ?? null),
        sanitizeInput($data['address_line2'] ?? null),
        sanitizeInput($data['barangay'] ?? null),
        sanitizeInput($data['city'] ?? null),
        sanitizeInput($data['zip_code'] ?? null),
        $user_id
    ]);

    // Update or Insert pregnancy_info table
    $stmt_preg = $db->prepare("INSERT INTO pregnancy_info (user_id, current_week, due_date) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE current_week = VALUES(current_week), due_date = VALUES(due_date)");
    $stmt_preg->execute([
        $user_id,
        $data['current_week'] ?? 1,
        $data['due_date'] ?? null
    ]);
}

function updateMedicalInfo($db, $user_id, $data) {
    $stmt = $db->prepare("
        INSERT INTO user_medical_info (user_id, healthcare_provider, primary_obgyn_name, clinic_address, clinic_phone_number, allergies, medical_conditions) 
        VALUES (?, ?, ?, ?, ?, ?, ?) 
        ON DUPLICATE KEY UPDATE 
            healthcare_provider = VALUES(healthcare_provider), 
            primary_obgyn_name = VALUES(primary_obgyn_name), 
            clinic_address = VALUES(clinic_address), 
            clinic_phone_number = VALUES(clinic_phone_number), 
            allergies = VALUES(allergies), 
            medical_conditions = VALUES(medical_conditions)
    ");
    $stmt->execute([
        $user_id,
        sanitizeInput($data['healthcare_provider'] ?? null),
        sanitizeInput($data['primary_obgyn_name'] ?? null),
        sanitizeInput($data['clinic_address'] ?? null),
        sanitizeInput($data['clinic_phone_number'] ?? null),
        sanitizeInput($data['allergies'] ?? null),
        sanitizeInput($data['medical_conditions'] ?? null)
    ]);
}

function updatePasswordSecurity($db, $user_id, $data) {
    // Handle password change
    if (!empty($data['new_password'])) {
        if (empty($data['current_password'])) {
            throw new Exception('Current password is required to set a new one.');
        }

        $stmt_user = $db->prepare("SELECT password FROM users WHERE id = ?");
        $stmt_user->execute([$user_id]);
        $user = $stmt_user->fetch();

        if (!$user || !password_verify($data['current_password'], $user['password'])) {
            throw new Exception('Incorrect current password.');
        }

        if ($data['new_password'] !== $data['confirm_password']) {
            throw new Exception('New passwords do not match.');
        }

        if (strlen($data['new_password']) < 8) {
            throw new Exception('New password must be at least 8 characters long.');
        }

        $new_hashed_password = password_hash($data['new_password'], PASSWORD_DEFAULT);
        $stmt_update_pass = $db->prepare("UPDATE users SET password = ? WHERE id = ?");
        $stmt_update_pass->execute([$new_hashed_password, $user_id]);
    }

    // Handle 2FA setting
    $stmt_settings = $db->prepare("
        INSERT INTO user_profile_settings (user_id, two_factor_auth) 
        VALUES (?, ?) 
        ON DUPLICATE KEY UPDATE two_factor_auth = VALUES(two_factor_auth)
    ");
    $stmt_settings->execute([
        $user_id,
        !empty($data['two_factor_auth']) ? 1 : 0
    ]);
}
?>