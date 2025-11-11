<?php
require_once '../config/database.php';
require_once '../config/security.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$database = new Database();
$pdo = $database->getConnection(); 
$user_id = checkAuth($pdo);

if (!$user_id) {
    return;
}

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

try {
    if ($method === 'GET') {
        handleGet($pdo, $user_id);
    } else {
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}

function handleGet($pdo, $user_id) {
    $category = $_GET['category'] ?? 'all';
    $search = $_GET['search'] ?? '';
    $id = $_GET['id'] ?? null;
    $params = [];
    
    if ($id) {
        $sql = "SELECT * FROM library_content WHERE id = ?";
        $params[] = $id;
    } else {
        $whereClause = "WHERE status = 'active'";
        
        if ($category !== 'all') {
            $whereClause .= " AND category = ?";
            $params[] = $category;
        }
        
        if (!empty($search)) {
            $whereClause .= " AND (title LIKE ? OR description LIKE ?)";
            $searchTerm = "%$search%";
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }
        
        $sql = "SELECT * FROM library_content $whereClause ORDER BY is_featured DESC, rating DESC";
    }
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $content = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Build absolute URLs for PDFs
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";
    $host = $_SERVER['HTTP_HOST'];
    $script_path = dirname($_SERVER['SCRIPT_NAME']); 
    $base_path = dirname($script_path); 
    $base_url = rtrim($protocol . $host . $base_path, '/');
    
    foreach ($content as &$item) {
        if (!empty($item['file_url']) && strpos($item['file_url'], 'http') !== 0) {
            // Make sure the URL is properly formatted
            $item['file_url'] = $base_url . '/' . ltrim($item['file_url'], '/');
            
            // Add cache-busting parameter for mobile
            $item['file_url'] .= '?t=' . time();
        }
    }
    unset($item);
    
    echo json_encode(['success' => true, 'content' => $content]);
}
?>