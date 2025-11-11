<?php
require_once '../config/database.php';
require_once '../config/security.php';

header('Content-Type: application/json');

$database = new Database();
$db = $database->getConnection();

$user_id = checkAuth($db);
if (!$user_id) {
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit;
}

try {
    // Get active members count (users who posted in last 30 days)
    $stmt_active = $db->prepare("SELECT COUNT(DISTINCT user_id) as active_members FROM forum_posts WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)");
    $stmt_active->execute();
    $active_members = $stmt_active->fetch(PDO::FETCH_ASSOC)['active_members'] ?? 0;
    
    // Get posts today count
    $stmt_today = $db->prepare("SELECT COUNT(*) as posts_today FROM forum_posts WHERE DATE(created_at) = CURDATE()");
    $stmt_today->execute();
    $posts_today = $stmt_today->fetch(PDO::FETCH_ASSOC)['posts_today'] ?? 0;
    
    echo json_encode([
        'success' => true,
        'stats' => [
            'active_members' => $active_members,
            'posts_today' => $posts_today
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error loading forum stats: ' . $e->getMessage()
    ]);
}
?>
