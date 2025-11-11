<?php
require_once '../config/database.php';
require_once '../config/security.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$database = new Database();
$db = $database->getConnection();

$user_id = checkAuth($db);
if (!$user_id) {
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit;
}

try {
    $stats = [
        'recipes' => ['count' => 0, 'rating' => 0],
        'mental-health' => ['count' => 0, 'rating' => 0],
        'exercise' => ['count' => 0, 'rating' => 0],
        'medicine-supplements' => ['count' => 0, 'rating' => 0]
    ];

    $sql = "SELECT category, COUNT(*) as count, AVG(rating) as rating FROM library_content GROUP BY category";
    $stmt = $db->prepare($sql);
    $stmt->execute();
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($results as $row) {
        if (isset($stats[$row['category']])) {
            $stats[$row['category']]['count'] = (int)$row['count'];
            $stats[$row['category']]['rating'] = round((float)$row['rating'], 1);
        }
    }

    $final_stats = [
        'recipes_count' => $stats['recipes']['count'],
        'recipes_rating' => $stats['recipes']['rating'],
        'mental_health_count' => $stats['mental-health']['count'],
        'mental_health_rating' => $stats['mental-health']['rating'],
        'exercise_count' => $stats['exercise']['count'],
        'exercise_rating' => $stats['exercise']['rating'],
        'medicine_supplements_count' => $stats['medicine-supplements']['count'],
        'medicine_supplements_rating' => $stats['medicine-supplements']['rating']
    ];
    
    echo json_encode([
        'success' => true,
        'stats' => $final_stats
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error loading library stats: ' . $e->getMessage()
    ]);
}
?>
