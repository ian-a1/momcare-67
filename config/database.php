<?php
// Enable error reporting but DO NOT display errors in responses (send to log instead)
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
ini_set('log_errors', 1);
// Optionally set error log file (commented out — uses PHP default)
// ini_set('error_log', __DIR__ . '/php-error.log');

// Database configuration
class Database {
    private $host = 'localhost';
    private $db_name = 'momcare_app';
    private $username = 'root';
    private $password = 'root';
    private $env = 'development';
    private $conn;

    public function __construct()
    {
        // Load environment configuration if present (config/env.php should return an array)
        $envPath = __DIR__ . '/env.php';
        if (file_exists($envPath)) {
            $cfg = include $envPath;
            if (is_array($cfg)) {
                $this->host = $cfg['DB_HOST'] ?? $this->host;
                $this->db_name = $cfg['DB_NAME'] ?? $this->db_name;
                $this->username = $cfg['DB_USER'] ?? $this->username;
                $this->password = $cfg['DB_PASS'] ?? $this->password;
                $this->env = $cfg['ENV'] ?? $this->env;
            }
        }
    }

    public function getConnection() {
        $this->conn = null;
        
        try {
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";dbname=" . $this->db_name,
                $this->username,
                $this->password,
                array(
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8"
                )
            );
        } catch(PDOException $exception) {
            header('Content-Type: application/json');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Database connection error: ' . $exception->getMessage()]);
            exit;
        }
        
        // FIX: Corrected syntax from `$this.conn` to `$this->conn`
        return $this->conn;
    }
}

// Security functions
function sanitizeInput($data) {
    if (is_null($data)) return null;
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
    return $data;
}

function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL);
}

function generateSessionToken() {
    return bin2hex(random_bytes(32));
}

function hashPassword($password) {
    return password_hash($password, PASSWORD_DEFAULT);
}

function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

// Start session if not already started
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// MODIFIED: This function is now more robust.
function checkAuth($db) {
    $authHeader = null;
    // A more reliable way to get the Authorization header
    if (isset($_SERVER['Authorization'])) {
        $authHeader = $_SERVER['Authorization'];
    } elseif (isset($_SERVER['HTTP_AUTHORIZATION'])) { // Nginx or fast CGI
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (function_exists('getallheaders')) {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? null;
    }

    // Priority 1: Check for Authorization header (for API calls from JS)
    if ($authHeader && preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        $token = $matches[1];
        $stmt = $db->prepare("SELECT user_id FROM user_sessions WHERE session_token = ? AND expires_at > NOW()");
        $stmt->execute([$token]);
        $session = $stmt->fetch();
        if ($session) {
            // Set session variables for this script's execution
            $_SESSION['user_id'] = $session['user_id'];
            $_SESSION['session_token'] = $token;
            return $session['user_id'];
        }
    }

    // Priority 2: Check existing PHP session
    if (isset($_SESSION['user_id']) && isset($_SESSION['session_token'])) {
        $stmt = $db->prepare("SELECT user_id FROM user_sessions WHERE session_token = ? AND expires_at > NOW()");
        $stmt->execute([$_SESSION['session_token']]);
        if ($stmt->fetch()) {
            return $_SESSION['user_id'];
        }
    }
    
    // If neither method works, authentication fails
    http_response_code(401); // Unauthorized
    echo json_encode(['success' => false, 'message' => 'Authentication failed. Please log in.']);
    exit; // Stop script execution immediately
}
?>

