<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once '../config/database.php';
require_once '../config/security.php';

$database = new Database();
$db = $database->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

// Authentication
$user_id = checkAuth($db);
if (!$user_id) {
    return;
}

if ($method === 'GET') {
    // Get all predefined milestones with user's completion status
    $stmt = $db->prepare("
        SELECT 
            pm.id,
            pm.name,
            pm.description,
            pm.week_number,
            pm.category,
            CASE WHEN umc.id IS NOT NULL THEN 'complete' ELSE 'pending' END as status,
            umc.completed_date
        FROM predefined_milestones pm
        LEFT JOIN user_milestone_completions umc ON pm.id = umc.milestone_id AND umc.user_id = ?
        ORDER BY pm.id ASC
    ");
    $stmt->execute([$user_id]);
    $milestones = $stmt->fetchAll();
    
    echo json_encode(['success' => true, 'milestones' => $milestones]);
    exit;
    
} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Handle milestone completion toggle
    if (isset($input['action']) && $input['action'] === 'toggle_completion') {
        $milestone_id = $input['milestone_id'];
        $complete = $input['complete']; // true or false
        
        if (!$milestone_id) {
            echo json_encode(['success' => false, 'message' => 'Milestone ID is required']);
            exit;
        }
        
        if ($complete) {
            // Mark as complete
            $stmt = $db->prepare("
                INSERT INTO user_milestone_completions (user_id, milestone_id, completed_date) 
                VALUES (?, ?, CURDATE())
                ON DUPLICATE KEY UPDATE completed_date = CURDATE()
            ");
            
            if ($stmt->execute([$user_id, $milestone_id])) {
                echo json_encode(['success' => true, 'message' => 'Milestone marked as completed!']);
                exit;
            } else {
                echo json_encode(['success' => false, 'message' => 'Failed to mark milestone as complete']);
                exit;
            }
        } else {
            // Mark as incomplete (remove completion)
            $stmt = $db->prepare("
                DELETE FROM user_milestone_completions 
                WHERE user_id = ? AND milestone_id = ?
            ");
            
            if ($stmt->execute([$user_id, $milestone_id])) {
                echo json_encode(['success' => true, 'message' => 'Milestone marked as pending']);
                exit;
            } else {
                echo json_encode(['success' => false, 'message' => 'Failed to update milestone']);
                exit;
            }
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
        exit;
    }
}