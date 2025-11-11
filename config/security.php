<?php
// Basic security bootstrap used by API endpoints.
// Lightweight and safe for local development. Review before production.

// Security headers (some are already set in API files, but these are safe defaults)
header('X-Frame-Options: SAMEORIGIN');
header('X-Content-Type-Options: nosniff');
header("Referrer-Policy: no-referrer-when-downgrade");
// Do not force HSTS in development; enable in production only when HTTPS is in use.

// Session hardening
if (session_status() == PHP_SESSION_NONE) {
    // Try to set strict cookie params if possible
    $cookieParams = session_get_cookie_params();
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');

    session_set_cookie_params([
        'lifetime' => 0,
        'path' => $cookieParams['path'] ?? '/',
        'domain' => $cookieParams['domain'] ?? '',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_start();
}

// Simple CSRF helpers used by the endpoints
function csrf_token() {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        $_SESSION['csrf_token_time'] = time();
    }
    return $_SESSION['csrf_token'];
}

function verify_csrf() {
    // Check common locations: X-CSRF-Token header, POST field, JSON body _csrf
    $token = null;
    if (!empty($_SERVER['HTTP_X_CSRF_TOKEN'])) {
        $token = $_SERVER['HTTP_X_CSRF_TOKEN'];
    } elseif (!empty($_POST['csrf_token'])) {
        $token = $_POST['csrf_token'];
    } else {
        // try JSON body
        $raw = @file_get_contents('php://input');
        if ($raw) {
            $body = json_decode($raw, true);
            if (is_array($body) && !empty($body['_csrf'])) $token = $body['_csrf'];
            if (is_array($body) && !empty($body['csrf_token'])) $token = $body['csrf_token'];
        }
    }

    if (empty($token) || empty($_SESSION['csrf_token'])) return false;
    // Compare using hash_equals
    $ok = hash_equals($_SESSION['csrf_token'], $token);

    // Optional token expiry: 8 hours
    if ($ok && isset($_SESSION['csrf_token_time'])) {
        if (time() - $_SESSION['csrf_token_time'] > 8 * 3600) {
            // expired
            unset($_SESSION['csrf_token']);
            unset($_SESSION['csrf_token_time']);
            return false;
        }
    }

    return $ok;
}

// Basic sanitization helper (fallback if not already present)
if (!function_exists('sanitizeInput')) {
    function sanitizeInput($data) {
        if (is_null($data)) return null;
        $data = trim($data);
        if (is_string($data)) {
            $data = stripslashes($data);
            $data = htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
        }
        return $data;
    }
}

?>
