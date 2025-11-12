<?php
session_start();

require_once 'config/database.php';
$database = new Database();
$db = $database->getConnection();

$action = $_GET['action'] ?? null;
if ($action) {
    header('Content-Type: application/json');
    $response = ['success' => false, 'message' => 'Invalid action.'];
    $input = json_decode(file_get_contents('php://input'), true);
    
    $userId = $_SESSION['user_id'] ?? null;
    $doctorId = $_SESSION['doctor_id'] ?? null;

    switch ($action) {
        case 'login':
            $email = sanitizeInput($input['email'] ?? '');
            $password = $input['password'] ?? '';

            $stmt = $db->prepare("SELECT id, name, email, password FROM users WHERE email = ?");
            $stmt->execute([$email]);
            $user = $stmt->fetch();

            if ($user && verifyPassword($password, $user['password'])) {
                $stmt_doc = $db->prepare("SELECT id FROM doctors WHERE email = ?");
                $stmt_doc->execute([$user['email']]);
                $doctor = $stmt_doc->fetch();

                if ($doctor) {
                    $_SESSION['user_id'] = $user['id'];
                    $_SESSION['doctor_id'] = $doctor['id'];
                    $_SESSION['doctor_name'] = $user['name'];
                    $response = ['success' => true];
                } else {
                    $response = ['success' => false, 'message' => 'This user is not registered as a doctor.'];
                }
            } else {
                $response = ['success' => false, 'message' => 'Invalid email or password.'];
            }
            break;

        case 'logout':
            session_destroy();
            $response = ['success' => true];
            break;

        case 'get_appointments':
            if (!$doctorId) {
                $response = ['success' => false, 'message' => 'Not authenticated.'];
                break;
            }
            $stmt = $db->prepare("
                SELECT a.*, u.name as user_name, u.phone_number as user_phone
                FROM appointments a 
                JOIN users u ON a.user_id = u.id 
                WHERE a.doctor_id = ? 
                ORDER BY a.appointment_date DESC
            ");
            $stmt->execute([$doctorId]);
            $appointments = $stmt->fetchAll();
            $response = ['success' => true, 'appointments' => $appointments];
            break;
        
        case 'update_appointment':
            if (!$doctorId) {
                $response = ['success' => false, 'message' => 'Not authenticated.'];
                break;
            }
            $id = $input['id'] ?? null;
            $status = $input['status'] ?? null;
            $comment = sanitizeInput($input['comment'] ?? '');

            if (!$id || !$status) {
                $response = ['success' => false, 'message' => 'Missing ID or status.'];
                break;
            }

            $stmt = $db->prepare("
                UPDATE appointments 
                SET status = ?, doctor_comment = ? 
                WHERE id = ? AND doctor_id = ?
            ");
            
            if ($stmt->execute([$status, $comment, $id, $doctorId])) {
                $response = ['success' => true, 'message' => 'Appointment updated.'];
            } else {
                $response = ['success' => false, 'message' => 'Failed to update appointment.'];
            }
            break;

        case 'get_forum_posts':
            if (!$userId) {
                $response = ['success' => false, 'message' => 'Not authenticated.'];
                break;
            }
            $sql = "SELECT fp.*, u.name as author_name FROM forum_posts fp JOIN users u ON fp.user_id = u.id WHERE fp.status = 'active' ORDER BY fp.created_at DESC";
            $stmt = $db->prepare($sql);
            $stmt->execute();
            $posts = $stmt->fetchAll();
            $response = ['success' => true, 'posts' => $posts];
            break;

        case 'delete_post':
            if (!$userId) {
                $response = ['success' => false, 'message' => 'Not authenticated.'];
                break;
            }
            $postId = $input['post_id'] ?? null;
            if (!$postId) {
                $response = ['success' => false, 'message' => 'Post ID required.'];
                break;
            }
            $stmt = $db->prepare("UPDATE forum_posts SET status = 'deleted' WHERE id = ?");
            if ($stmt->execute([$postId])) {
                $response = ['success' => true, 'message' => 'Post deleted.'];
            } else {
                $response = ['success' => false, 'message' => 'Failed to delete post.'];
            }
            break;
    }
    
    echo json_encode($response);
    exit;
}

$loggedInDoctorId = $_SESSION['doctor_id'] ?? null;
$loggedInDoctorName = $_SESSION['doctor_name'] ?? 'Doctor';

?>

<?php if (!$loggedInDoctorId): ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes"/>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <title>Admin Login - MomCare</title>
        <link rel="stylesheet" href="css/landing.css" />
        <link rel="stylesheet" href="css/mobile-touch.css" />
    </head>
    <body>
        <div class="phone-container">
            <div id="loginPage" class="auth-container">
                <div class="auth-header">
                    <div class="app-logo" style="margin-bottom: 20px;">
                        <div class="logo-icon">
                            <img src="images/logo.png" alt="MomCare Logo" class="logo-image" />
                        </div>
                    </div>
                    <h1 class="auth-title">Doctor Portal Login</h1>
                    <p class="auth-subtitle">Sign in to manage appointments</p>
                </div>
                
                <div class="auth-content">
                    <form id="adminLoginForm">
                        <div id="loginError" class="error-message" style="display: none; background: #ff4757; color: white; padding: 10px; border-radius: 5px; margin-bottom: 15px; text-align: center;"></div>
                        <div class="form-group">
                            <div class="input-wrapper">
                                <div class="input-icon"></div>
                                <input type="email" id="loginEmail" name="email" class="form-input" placeholder="Email Address" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <div class="input-wrapper">
                                <div class="input-icon"></div>
                                <input type="password" id="loginPassword" name="password" class="form-input" placeholder="Password" required>
                            </div>
                        </div>
                        <button type="submit" class="form-btn primary">LOGIN</button>
                        <div style="margin-top:12px; text-align:center;">
                            <a href="landing.html#login" class="form-link">Not an Admin? Login Here</a>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <script>
            document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('loginEmail').value;
                const password = document.getElementById('loginPassword').value;
                const errorDiv = document.getElementById('loginError');

                try {
                    const response = await fetch('admin.php?action=login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password })
                    });
                    const result = await response.json();
                    
                    if (result.success) {
                        window.location.reload();
                    } else {
                        errorDiv.textContent = result.message || 'Login failed.';
                        errorDiv.style.display = 'block';
                    }
                } catch (err) {
                    errorDiv.textContent = 'An error occurred. Please try again.';
                    errorDiv.style.display = 'block';
                }
            });
        </script>
    </body>
    </html>

<?php else: ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <title>Admin Dashboard - MomCare</title>
        <link rel="stylesheet" href="css/styles.css" />
        <link rel="stylesheet" href="css/mobile-touch.css" />
        <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css"
        />
        <meta http-equiv="X-Content-Type-Options" content="nosniff" />
    </head>
    <body>
        <div class="phone-container">
            <div id="main-content-area" style="flex: 1; overflow-y: auto;">
                
                <div class="tab-content" id="tab-home">
                    <div class="header">
                        <div class="greeting">
                            Welcome, <span id="userName"><?php echo htmlspecialchars($loggedInDoctorName); ?></span>!
                        </div>
                        <p style="font-size: 16px; opacity: 0.9;">Here are your assigned appointments.</p>
                    </div>

                    <div class="content" style="padding-top: 10px;">
                        
                        <div class="appointments-section" style="background: #fff8e1;">
                            <div class="appointments-header">
                                <span class="appointments-title" style="color: #856404;">Pending Appointments</span>
                            </div>
                            <div id="pendingAppointmentsList">
                                <p class='no-data'>Loading pending appointments...</p>
                            </div>
                        </div>

                        <div class="appointments-section" style="background: #e8f5e9;">
                            <div class="appointments-header">
                                <span class="appointments-title" style="color: #155724;">Approved Appointments</span>
                            </div>
                            <div id="approvedAppointmentsList">
                                <p class='no-data'>No approved appointments.</p>
                            </div>
                        </div>

                        <div class="appointments-section" style="background: #f8d7da;">
                            <div class="appointments-header">
                                <span class="appointments-title" style="color: #721c24;">Cancelled / Rejected</span>
                            </div>
                            <div id="cancelledAppointmentsList">
                                <p class'no-data'>No cancelled appointments.</p>
                            </div>
                        </div>

                    </div>
                </div>

                <div class="tab-content" id="tab-chat" style="display: none;">
                    <div class="forum-container">
                        <div class="forum-header-new">
                            <h1 class="forum-title-new">Forum Moderation</h1>
                        </div>
                        <div class="forum-body-new">
                            <div id="postsContainer">
                            </div>
                        </div>
                    </div>
                </div>

                <div class="tab-content" id="tab-profile" style="display: none;">
                    <div class="profile-header-title">Profile</div>
                    <div class="profile-user-section">
                        <div class="profile-avatar">
                            <span class="avatar-letter" id="avatarLetter"><?php echo htmlspecialchars(strtoupper(substr($loggedInDoctorName, 0, 1))); ?></span>
                        </div>
                        <div class="profile-user-info">
                            <div class="profile-name" id="displayName"><?php echo htmlspecialchars($loggedInDoctorName); ?></div>
                            <div class="profile-status">Doctor</div>
                        </div>
                    </div>
                    <div class="profile-menu">
                        <div class="profile-menu-item" data-section="signOut">
                            <div class="profile-menu-icon">🚪</div>
                            <div class="profile-menu-info">
                                <div class="profile-menu-title">Sign Out</div>
                            </div>
                            <div class="profile-menu-arrow">❯</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="bottom-nav">
                <div class="nav-item active" data-tab="home">
                    <div class="nav-icon">📅</div>
                    <span>Appointments</span>
                </div>
                <div class="nav-item" data-tab="chat">
                    <div class="nav-icon">💬</div>
                    <span>Forum</span>
                </div>
                <div class="nav-item" data-tab="profile">
                    <div class="nav-icon">👤</div>
                    <span>Profile</span>
                </div>
            </div>

            <div class="modal-overlay" id="appointmentActionModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="appointmentModalTitle">Manage Appointment</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="appointmentActionForm">
                            <input type="hidden" id="action_appointment_id" name="id">
                            <div style="padding: 10px; background: #f4f4f4; border-radius: 8px; margin-bottom: 15px;">
                                <strong id="action_user_name" style="color: #333; display: block; margin-bottom: 5px;"></strong>
                                <span id="action_appointment_title" style="color: #555; display: block;"></span>
                                <span id="action_appointment_date" style="color: #555; display: block; font-size: 14px;"></span>
                            </div>
                            
                            <div class="form-group">
                                <label for="doctor_comment">Comment for User (Optional)</label>
                                <textarea id="doctor_comment" name="comment" rows="4" placeholder="e.g., 'Please come 15 minutes early for vitals check.'"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-cancel" id="rejectBtn" style="background: #e74c3c;">Reject</button>
                        <button class="btn-save" id="approveBtn" style="background: #2ecc71;">Approve</button>
                    </div>
                </div>
            </div>

            <div class="modal-overlay" id="viewPostModal">
                <div class="modal-content-forum">
                    <div class="modal-header">
                        <h3 id="viewPostTitle">Post Details</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body" id="viewPostContent" style="padding-bottom: 0;">
                    </div>
                </div>
            </div>
            
            <div class="modal-overlay" id="confirmModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Confirmation</h3>
                    </div>
                    <div class="modal-body">
                        <p id="confirmMessage">Are you sure?</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-cancel" id="confirmCancel">Cancel</button>
                        <button class="btn-save" id="confirmOK">OK</button>
                    </div>
                </div>
            </div>

        </div>

        <script src="js/mobile-touch.js"></script>
        <script src="js/admin_app.js"></script>
    </body>
    </html>
<?php endif; ?>