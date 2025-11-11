<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
    
    
// MUST be at the very top, before any other code
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../config/database.php';
require_once '../config/security.php';
require_once __DIR__ . '/../tools/rate_limiter.php';
require_once __DIR__ . '/../lib/email.php';

// Helper: account lockout / failed login tracking using account_locks table
function email_hash_key($email) {
    return hash('sha256', strtolower(trim($email)));
}

function is_account_locked_db($db, $email) {
    try {
        $h = email_hash_key($email);
        $stmt = $db->prepare("SELECT locked_until FROM account_locks WHERE email_hash = ? LIMIT 1");
        $stmt->execute([$h]);
        $r = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($r && !empty($r['locked_until'])) {
            return strtotime($r['locked_until']) > time();
        }
    } catch (Exception $e) {
        // table may not exist or other DB error, fallback to no lock
    }
    return false;
}

function record_failed_login_db($db, $email, $maxAttempts = 5, $lockSeconds = 900) {
    try {
        $h = email_hash_key($email);
        $now = date('Y-m-d H:i:s');
        $db->beginTransaction();
        $stmt = $db->prepare("SELECT id, attempts FROM account_locks WHERE email_hash = ? FOR UPDATE");
        $stmt->execute([$h]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            $attempts = intval($row['attempts']) + 1;
            $locked_until = null;
            if ($attempts >= $maxAttempts) {
                $locked_until = date('Y-m-d H:i:s', time() + $lockSeconds);
            }
            $upd = $db->prepare("UPDATE account_locks SET attempts = ?, locked_until = ?, last_attempt_at = ? WHERE id = ?");
            $upd->execute([$attempts, $locked_until, $now, $row['id']]);
        } else {
            $attempts = 1;
            $locked_until = ($attempts >= $maxAttempts) ? date('Y-m-d H:i:s', time() + $lockSeconds) : null;
            $ins = $db->prepare("INSERT INTO account_locks (email_hash, attempts, locked_until, last_attempt_at) VALUES (?, ?, ?, ?)");
            $ins->execute([$h, $attempts, $locked_until, $now]);
        }
        $db->commit();
    } catch (Exception $e) {
        try { $db->rollBack(); } catch (Exception $_) {}
    }
}

function reset_failed_logins_db($db, $email) {
    try {
        $h = email_hash_key($email);
        $stmt = $db->prepare("DELETE FROM account_locks WHERE email_hash = ?");
        $stmt->execute([$h]);
    } catch (Exception $e) {
        // ignore
    }
}

$database = new Database();
$db = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if ($action === 'signup') {
        // Rate-limit signup attempts per IP to prevent abuse
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $key = 'signup:' . $ip;
        $envName = $env['ENV'] ?? 'development';
        // Skip strict rate-limiting in non-production (developer convenience)
        if ($envName === 'production') {
            if (!rate_limit_allow($key, 5, 3600)) {
                list($remaining, $reset) = rate_limit_remaining($key, 5, 3600);
                $retryAfter = max(60, $reset - time());
                http_response_code(429);
                header('Retry-After: ' . $retryAfter);
                echo json_encode(['success' => false, 'message' => 'Too many signup attempts. Please try again later.']);
                exit;
            }
        }

        // User registration
        $name = sanitizeInput($input['name']);
        $email = sanitizeInput($input['email']);
        $password = $input['password'];
        $birthdate = $input['birthdate'];
        $sex = sanitizeInput($input['sex']);
        $address_line1 = sanitizeInput($input['address_line1']);
        $address_line2 = sanitizeInput($input['address_line2']);
        $barangay = sanitizeInput($input['barangay']);
        $city = sanitizeInput($input['city']);
        $zip_code = sanitizeInput($input['zip_code']);
        
        // Validate required fields
        if (empty($name) || empty($email) || empty($password)) {
            echo json_encode(['success' => false, 'message' => 'Required fields missing']);
            exit;
        }
        
        if (!validateEmail($email)) {
            echo json_encode(['success' => false, 'message' => 'Invalid email format']);
            exit;
        }
        
        // Check if email already exists
        $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->rowCount() > 0) {
            // Return a clear, user-friendly message including the submitted email
            // We keep it brief to avoid leaking extra info; email is already validated above.
            $safeEmail = htmlspecialchars($email, ENT_QUOTES, 'UTF-8');
            echo json_encode(['success' => false, 'message' => "The email '{$safeEmail}' has already been used. Please log in or use a different email."]);
            exit;
        }
        
        // Hash password
        $hashed_password = hashPassword($password);
        
        // Insert user
        $stmt = $db->prepare("INSERT INTO users (name, email, password, birthdate, sex, address_line1, address_line2, barangay, city, zip_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        
        if ($stmt->execute([$name, $email, $hashed_password, $birthdate, $sex, $address_line1, $address_line2, $barangay, $city, $zip_code])) {
            $user_id = $db->lastInsertId();
            
            // --- MODIFIED: Add 911 as a default emergency contact ---
            $stmt_emergency = $db->prepare("INSERT INTO emergency_contacts (user_id, name, phone, relationship, contact_type, is_primary) VALUES (?, 'Emergency Hotline', '911', 'National Emergency', 'emergency', 0)");
            $stmt_emergency->execute([$user_id]);
            
            // Create session
            $session_token = generateSessionToken();
            $expires_at = date('Y-m-d H:i:s', strtotime('+30 days'));
            
            $stmt = $db->prepare("INSERT INTO user_sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)");
            $stmt->execute([$user_id, $session_token, $expires_at]);
            
            $_SESSION['user_id'] = $user_id;
            $_SESSION['session_token'] = $session_token;
            
            echo json_encode([
                'success' => true, 
                'message' => 'Registration successful',
                'user_id' => $user_id,
                'session_token' => $session_token
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Registration failed']);
        }
        
    } elseif ($action === 'login') {
        // Rate-limit login attempts per IP to reduce brute-force
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $key = 'login:' . $ip;
        $envName = $env['ENV'] ?? 'development';
        // Skip strict rate-limiting in non-production (developer convenience)
        if ($envName === 'production') {
            if (!rate_limit_allow($key, 5, 900)) {
                list($remaining, $reset) = rate_limit_remaining($key, 5, 900);
                $retryAfter = max(30, $reset - time());
                http_response_code(429);
                header('Retry-After: ' . $retryAfter);
                echo json_encode(['success' => false, 'message' => 'Too many login attempts. Please try again later.']);
                exit;
            }
        }

        // User login
        $email = sanitizeInput($input['email']);
        $password = $input['password'];
        
        if (empty($email) || empty($password)) {
            echo json_encode(['success' => false, 'message' => 'Email and password required']);
            exit;
        }
        
        // Protect against locked accounts (DB-backed). If account is locked, return generic message.
        if (is_account_locked_db($db, $email)) {
            // Generic response to avoid confirming existence
            http_response_code(423);
            echo json_encode(['success' => false, 'message' => 'Account temporarily locked. Please try again later or reset your password.']);
            exit;
        }

        // Get user
        $stmt = $db->prepare("SELECT id, name, email, password FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        
        if ($user && verifyPassword($password, $user['password'])) {
            // Create session
            $session_token = generateSessionToken();
            $expires_at = date('Y-m-d H:i:s', strtotime('+30 days'));
            
            $stmt = $db->prepare("INSERT INTO user_sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)");
            $stmt->execute([$user['id'], $session_token, $expires_at]);
            
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['session_token'] = $session_token;
            // Reset failed login counters on success
            reset_failed_logins_db($db, $email);
            
            echo json_encode([
                'success' => true,
                'message' => 'Login successful',
                'user' => [
                    'id' => $user['id'],
                    'name' => $user['name'],
                    'email' => $user['email']
                ],
                'session_token' => $session_token
            ]);
        } else {
            // Record failed login attempt (DB), then return generic message
            record_failed_login_db($db, $email, 5, 900);
            echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
        }
        
    } elseif ($action === 'logout') {
        // User logout
        if (isset($_SESSION['session_token'])) {
            $stmt = $db->prepare("DELETE FROM user_sessions WHERE session_token = ?");
            $stmt->execute([$_SESSION['session_token']]);
        }
        
        session_destroy();
        echo json_encode(['success' => true, 'message' => 'Logged out successfully']);
    }
    
    // Password reset request
    elseif ($action === 'request_reset') {
        // Always return generic response to avoid user enumeration
        $email = sanitizeInput($input['email'] ?? '');
        $generic = ['success' => true, 'message' => 'If an account with that email exists, a password reset link has been sent.'];

        if (empty($email)) {
            echo json_encode($generic);
            exit;
        }

        // Find user
        $stmt = $db->prepare("SELECT id, email FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user) {
            // Do not reveal
            echo json_encode($generic);
            exit;
        }

        // Create token
        $token = bin2hex(random_bytes(32));
        $token_hash = hash('sha256', $token);
        $expires_at = date('Y-m-d H:i:s', time() + 3600); // 1 hour

        try {
            $ins = $db->prepare("INSERT INTO password_resets (user_id, token_hash, expires_at, used) VALUES (?, ?, ?, 0)");
            $ins->execute([$user['id'], $token_hash, $expires_at]);
        } catch (Exception $e) {
            // If table missing or error, silently ignore and return generic
            echo json_encode($generic);
            exit;
        }

        // Send email (placeholder) with reset link
        $resetLink = (isset($_SERVER['HTTP_HOST']) ? (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 'https://' : 'http://') . $_SERVER['HTTP_HOST'] : '') . '/reset_password.php?token=' . $token;
        $subject = 'Password reset for your account';
        $body = "You requested a password reset. Use the link below (valid 1 hour):\n\n" . $resetLink . "\n\nIf you didn't request this, ignore this message.";

        // Send the reset email. send_email returns true on success or a file path when falling back.
        send_email($user['email'], $subject, $body);
        // Always return a generic response to avoid user enumeration
        echo json_encode($generic);
        exit;
    }

    // Confirm reset (perform password change)
    elseif ($action === 'reset_password') {
        $token = $input['token'] ?? '';
        $new_password = $input['new_password'] ?? '';
        $confirm = $input['confirm_password'] ?? '';

        if (empty($token) || empty($new_password) || $new_password !== $confirm) {
            echo json_encode(['success' => false, 'message' => 'Invalid input or passwords do not match']);
            exit;
        }

        $token_hash = hash('sha256', $token);
        try {
            $stmt = $db->prepare("SELECT pr.id as reset_id, pr.user_id, pr.expires_at, pr.used, u.email FROM password_resets pr JOIN users u ON u.id = pr.user_id WHERE pr.token_hash = ? LIMIT 1");
            $stmt->execute([$token_hash]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row) {
                echo json_encode(['success' => false, 'message' => 'Invalid or expired token']);
                exit;
            }

            if ($row['used']) {
                echo json_encode(['success' => false, 'message' => 'Token already used']);
                exit;
            }

            if (strtotime($row['expires_at']) < time()) {
                echo json_encode(['success' => false, 'message' => 'Token expired']);
                exit;
            }

            // Update password
            $newHash = hashPassword($new_password);
            $upd = $db->prepare("UPDATE users SET password = ? WHERE id = ?");
            $upd->execute([$newHash, $row['user_id']]);

            // Mark token used
            $mark = $db->prepare("UPDATE password_resets SET used = 1 WHERE id = ?");
            $mark->execute([$row['reset_id']]);

            // Reset failed login counters
            reset_failed_logins_db($db, $row['email']);

            // Notify user placeholder
            $subject = 'Your password was changed';
            $body = "Your account password was successfully changed. If you did not perform this action, contact support immediately.";
            send_email_placeholder($row['email'], $subject, $body);

            echo json_encode(['success' => true, 'message' => 'Password updated successfully']);
            exit;
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Server error']);
            exit;
        }
    }
}
?>