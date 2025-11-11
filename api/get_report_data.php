<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../config/database.php';
require_once '../config/security.php';

$database = new Database();
$db = $database->getConnection();

// Check authentication using your existing checkAuth function
$userId = checkAuth($db);

if (!$userId) {
    // checkAuth already sent response and exited, but just in case
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Authentication required']);
    exit();
}

try {
    // ========== GET USER PROFILE DATA ==========
    $stmt = $db->prepare("
        SELECT name, email, phone_number, birthdate
        FROM users 
        WHERE id = ?
    ");
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'User not found'
        ]);
        exit();
    }

    // ========== GET PREGNANCY INFO FROM pregnancy_info TABLE ==========
    $stmt = $db->prepare("
        SELECT due_date, doctor_name, hospital
        FROM pregnancy_info 
        WHERE user_id = ?
    ");
    $stmt->execute([$userId]);
    $pregnancyInfo = $stmt->fetch(PDO::FETCH_ASSOC);

    // ========== AUTO-CALCULATE CURRENT WEEK FROM DUE DATE ==========
    $currentWeek = 0;
    $dueDate = $pregnancyInfo['due_date'] ?? null;
    
    if (!empty($dueDate)) {
        try {
            $dueDateObj = new DateTime($dueDate);
            $todayObj = new DateTime();
            $conceptionDate = (clone $dueDateObj)->modify('-280 days');
            
            if ($todayObj >= $conceptionDate && $todayObj <= $dueDateObj) {
                // Currently pregnant - calculate week
                $daysPregnant = $todayObj->diff($conceptionDate)->days;
                $currentWeek = floor($daysPregnant / 7) + 1; // +1 because week 1 starts at day 0
                $currentWeek = min(40, max(1, $currentWeek)); // Clamp between 1-40
            } elseif ($todayObj > $dueDateObj) {
                // Past due date
                $currentWeek = 40;
            } else {
                // Before conception date (shouldn't happen)
                $currentWeek = 0;
            }
        } catch (Exception $e) {
            $currentWeek = 0;
        }
    }

    // ========== CALCULATE PREGNANCY STATISTICS ==========
    $totalWeeks = 40;
    $progressPercent = $currentWeek > 0 ? round(($currentWeek / $totalWeeks) * 100) : 0;
    
    // Calculate trimester
    $trimester = '1st Trimester';
    if ($currentWeek >= 28) {
        $trimester = '3rd Trimester';
    } elseif ($currentWeek >= 14) {
        $trimester = '2nd Trimester';
    }
    
    // Calculate days pregnant and remaining
    $daysPregnant = 0;
    $daysRemaining = 0;
    
    if ($dueDate) {
        $dueDateObj = new DateTime($dueDate);
        $todayObj = new DateTime();
        
        // Calculate days remaining
        if ($dueDateObj > $todayObj) {
            $interval = $todayObj->diff($dueDateObj);
            $daysRemaining = (int)$interval->days;
        }
        
        // Calculate days pregnant (40 weeks = 280 days)
        $totalPregnancyDays = 280;
        $daysPregnant = $totalPregnancyDays - $daysRemaining;
        $daysPregnant = max(0, $daysPregnant); // Don't allow negative
    }
    
    $pregnancy_data = [
        'currentWeek' => $currentWeek,
        'totalWeeks' => $totalWeeks,
        'progressPercent' => $progressPercent,
        'trimester' => $trimester,
        'daysPregnant' => $daysPregnant,
        'daysRemaining' => $daysRemaining,
        'dueDate' => $dueDate
    ];

    // ========== GET ALL APPOINTMENTS ==========
    $stmt = $db->prepare("
        SELECT id, title, appointment_date, doctor_name, location, type, status, description, created_at
        FROM appointments 
        WHERE user_id = ? 
        ORDER BY appointment_date ASC
    ");
    $stmt->execute([$userId]);
    $appointments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Count appointment statistics
    $today = date('Y-m-d H:i:s');
    $totalAppointments = count($appointments);
    $completedAppointments = 0;
    $pendingAppointments = 0;
    $approvedAppointments = 0;
    $cancelledAppointments = 0;
    $nextAppointment = null;

    foreach ($appointments as $apt) {
        if ($apt['status'] === 'completed') {
            $completedAppointments++;
        } elseif ($apt['status'] === 'cancelled') {
            $cancelledAppointments++;
        } elseif ($apt['status'] === 'pending') {
            $pendingAppointments++;
        } elseif ($apt['status'] === 'approved') {
            $approvedAppointments++;
            // Get the next approved appointment
            if ($nextAppointment === null && strtotime($apt['appointment_date']) > strtotime($today)) {
                $nextAppointment = $apt;
            }
        }
    }

    // Calculate completion rate (only from non-cancelled appointments)
    $nonCancelled = $totalAppointments - $cancelledAppointments;
    $completionRate = $nonCancelled > 0 ? round(($completedAppointments / $nonCancelled) * 100) : 0;

    $appointments_data = [
        'total' => $totalAppointments,
        'completed' => $completedAppointments,
        'pending' => $pendingAppointments,
        'approved' => $approvedAppointments,
        'cancelled' => $cancelledAppointments,
        'completionRate' => $completionRate,
        'next' => $nextAppointment,
        'all' => $appointments
    ];

    // ========== GET ALL MILESTONES ==========
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
    $stmt->execute([$userId]);
    $milestones = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Count milestone statistics
    $totalMilestones = count($milestones);
    $completedMilestones = 0;
    $pendingMilestones = 0;
    $latestCompletedMilestone = null;

    foreach ($milestones as $milestone) {
        if ($milestone['status'] === 'complete') {
            $completedMilestones++;
            // Find the most recently completed milestone
            if ($milestone['completed_date'] && 
                ($latestCompletedMilestone === null || 
                 strtotime($milestone['completed_date']) > strtotime($latestCompletedMilestone['completed_date']))) {
                $latestCompletedMilestone = $milestone;
            }
        } else {
            $pendingMilestones++;
        }
    }

    // Calculate milestone completion rate
    $milestoneCompletionRate = $totalMilestones > 0 ? round(($completedMilestones / $totalMilestones) * 100) : 0;

    $milestones_data = [
        'total' => $totalMilestones,
        'completed' => $completedMilestones,
        'pending' => $pendingMilestones,
        'completionRate' => $milestoneCompletionRate,
        'latestCompleted' => $latestCompletedMilestone,
        'all' => $milestones
    ];

    // ========== SEND RESPONSE ==========
    echo json_encode([
        'success' => true,
        'data' => [
            'pregnancy' => $pregnancy_data,
            'appointments' => $appointments_data,
            'milestones' => $milestones_data
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error occurred',
        'error' => $e->getMessage() // Remove in production
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred',
        'error' => $e->getMessage() // Remove in production
    ]);
}
?>
