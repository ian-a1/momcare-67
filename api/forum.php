<?php
require_once '../config/database.php';
require_once '../config/security.php';

header('Content-Type: application/json');

$database = new Database();
$db = $database->getConnection();

$user_id = checkAuth($db);
if (!$user_id) {
    echo json_encode(['success' => false, 'message' => 'Authentication required']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_REQUEST['action'] ?? '';

try {
    if ($method === 'GET') {
        if ($action === 'posts') {
            getPosts($db);
        } elseif ($action === 'post_details') {
            getPostDetails($db, $user_id);
        } else {
             echo json_encode(['success' => false, 'message' => 'Invalid GET action']);
        }
    } elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if ($action === 'create_post') {
            createPost($db, $user_id, $input);
        } elseif ($action === 'create_reply') {
            createReply($db, $user_id, $input);
        } elseif ($action === 'like_post') {
            likePost($db, $user_id, $input);
        } elseif ($action === 'delete_post') {
            deletePost($db, $user_id, $input);
        } elseif ($action === 'report_post') {
            reportPost($db, $user_id, $input);
        } elseif ($action === 'report_reply') {
            reportReply($db, $user_id, $input);
        } else {
             echo json_encode(['success' => false, 'message' => 'Invalid POST action']);
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}

function getPosts($db) {
    global $user_id;
    $tag = isset($_GET['tag']) ? sanitizeInput($_GET['tag']) : 'all';
    $search = isset($_GET['search']) ? sanitizeInput($_GET['search']) : '';
    
    // Main query for posts
    $sql = "SELECT fp.*, u.name as author_name, IFNULL(fp.reports_count,0) as reports_count FROM forum_posts fp JOIN users u ON fp.user_id = u.id WHERE fp.status = 'active'";
    $params = [];

    if ($tag !== 'all') {
        $sql .= " AND FIND_IN_SET(?, fp.tags)";
        $params[] = $tag;
    }
    if (!empty($search)) {
        $sql .= " AND (fp.title LIKE ? OR fp.content LIKE ?)";
        $searchTerm = "%$search%";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }
    $sql .= " ORDER BY fp.created_at DESC";
    
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $posts = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Mark which posts were already reported by the current user (to avoid per-post queries)
    if ($posts && count($posts) > 0) {
        $postIds = array_map(function($p) { return $p['id']; }, $posts);
        // build placeholders
        $placeholders = implode(',', array_fill(0, count($postIds), '?'));
        $reported_sql = "SELECT post_id FROM forum_post_reports WHERE user_id = ? AND post_id IN ($placeholders)";
        $stmt_r = $db->prepare($reported_sql);
        $params_r = array_merge([$user_id], $postIds);
        $stmt_r->execute($params_r);
        $rows = $stmt_r->fetchAll(PDO::FETCH_ASSOC);
        $reported_map = [];
        foreach ($rows as $r) { $reported_map[intval($r['post_id'])] = true; }
        // annotate posts
        foreach ($posts as &$p) {
            $p['reported_by_user'] = !empty($reported_map[intval($p['id'])]);
        }
        unset($p);
    }

    // Query for trending tags
    $tags_sql = "SELECT SUBSTRING_INDEX(SUBSTRING_INDEX(t.tags, ',', n.n), ',', -1) as tag
                 FROM forum_posts t CROSS JOIN 
                 (SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5) n
                 WHERE n.n <= 1 + (LENGTH(t.tags) - LENGTH(REPLACE(t.tags, ',', '')))
                 AND tags IS NOT NULL AND tags != ''
                 GROUP BY tag
                 ORDER BY COUNT(*) DESC
                 LIMIT 12";
    $tags_stmt = $db->prepare($tags_sql);
    $tags_stmt->execute();
    $trending_tags = $tags_stmt->fetchAll(PDO::FETCH_ASSOC);


    echo json_encode([
        'success' => true, 
        'posts' => $posts,
        'trending_tags' => $trending_tags
    ]);
}

function getPostDetails($db, $user_id) {
    $post_id = $_GET['post_id'];
    
    $post_sql = "SELECT fp.*, u.name as author_name, IFNULL(fp.reports_count,0) as reports_count FROM forum_posts fp JOIN users u ON fp.user_id = u.id WHERE fp.id = ?";
    $stmt_post = $db->prepare($post_sql);
    $stmt_post->execute([$post_id]);
    $post = $stmt_post->fetch(PDO::FETCH_ASSOC);

    $replies_sql = "SELECT fr.*, u.name as author_name FROM forum_replies fr JOIN users u ON fr.user_id = u.id WHERE fr.post_id = ? ORDER BY fr.created_at ASC";
    $stmt_replies = $db->prepare($replies_sql);
    $stmt_replies->execute([$post_id]);
    $replies = $stmt_replies->fetchAll(PDO::FETCH_ASSOC);

    // Whether current user already reported this post
    $reported_by_user = false;
    $check_sql = "SELECT id FROM forum_post_reports WHERE post_id = ? AND user_id = ?";
    $stmt_check = $db->prepare($check_sql);
    $stmt_check->execute([$post_id, $user_id]);
    if ($stmt_check->fetch()) $reported_by_user = true;

    // For replies, annotate if current user already reported each reply
    if ($replies) {
        foreach ($replies as &$r) {
            $r['reported_by_user'] = false;
            $check_r = $db->prepare("SELECT id FROM forum_reply_reports WHERE reply_id = ? AND user_id = ?");
            $check_r->execute([$r['id'], $user_id]);
            if ($check_r->fetch()) $r['reported_by_user'] = true;
        }
        unset($r);
    }

    echo json_encode(['success' => true, 'post' => $post, 'replies' => $replies, 'reported_by_user' => $reported_by_user]);
}

function reportPost($db, $user_id, $data) {
    $post_id = isset($data['post_id']) ? intval($data['post_id']) : 0;
    $type = isset($data['type']) ? sanitizeInput($data['type']) : null;
    $details = isset($data['details']) ? sanitizeInput($data['details']) : null;

    if (!$post_id) {
        echo json_encode(['success' => false, 'message' => 'post_id required']);
        return;
    }

    // Prevent reporting own post
    $owner_sql = "SELECT user_id FROM forum_posts WHERE id = ?";
    $stmt_owner = $db->prepare($owner_sql);
    $stmt_owner->execute([$post_id]);
    $row_owner = $stmt_owner->fetch(PDO::FETCH_ASSOC);
    if ($row_owner && intval($row_owner['user_id']) === intval($user_id)) {
        echo json_encode(['success' => false, 'message' => 'You cannot report your own post']);
        return;
    }
    // Prevent double-reporting
    $check_sql = "SELECT id FROM forum_post_reports WHERE post_id = ? AND user_id = ?";
    $stmt_check = $db->prepare($check_sql);
    $stmt_check->execute([$post_id, $user_id]);
    if ($stmt_check->fetch()) {
        echo json_encode(['success' => false, 'message' => 'You have already reported this post']);
        return;
    }

    // Insert report (store structured type + details)
    $insert_sql = "INSERT INTO forum_post_reports (post_id, user_id, type, details) VALUES (?, ?, ?, ?)";
    $stmt_insert = $db->prepare($insert_sql);
    $stmt_insert->execute([$post_id, $user_id, $type, $details]);

    // Increment reports_count on posts table (create column if absent handled by migration)
    $update_sql = "UPDATE forum_posts SET reports_count = IFNULL(reports_count,0) + 1 WHERE id = ?";
    $stmt_update = $db->prepare($update_sql);
    $stmt_update->execute([$post_id]);

    echo json_encode(['success' => true, 'message' => 'Post reported']);
}

function reportReply($db, $user_id, $data) {
    $reply_id = isset($data['reply_id']) ? intval($data['reply_id']) : 0;
    $type = isset($data['type']) ? sanitizeInput($data['type']) : null;
    $details = isset($data['details']) ? sanitizeInput($data['details']) : null;

    if (!$reply_id) {
        echo json_encode(['success' => false, 'message' => 'reply_id required']);
        return;
    }

    // Prevent reporting own reply
    $owner_sql = "SELECT user_id FROM forum_replies WHERE id = ?";
    $stmt_owner = $db->prepare($owner_sql);
    $stmt_owner->execute([$reply_id]);
    $row_owner = $stmt_owner->fetch(PDO::FETCH_ASSOC);
    if ($row_owner && intval($row_owner['user_id']) === intval($user_id)) {
        echo json_encode(['success' => false, 'message' => 'You cannot report your own reply']);
        return;
    }

    // Prevent double-reporting
    $check_sql = "SELECT id FROM forum_reply_reports WHERE reply_id = ? AND user_id = ?";
    $stmt_check = $db->prepare($check_sql);
    $stmt_check->execute([$reply_id, $user_id]);
    if ($stmt_check->fetch()) {
        echo json_encode(['success' => false, 'message' => 'You have already reported this reply']);
        return;
    }

    $insert_sql = "INSERT INTO forum_reply_reports (reply_id, user_id, type, details) VALUES (?, ?, ?, ?)";
    $stmt_insert = $db->prepare($insert_sql);
    $stmt_insert->execute([$reply_id, $user_id, $type, $details]);

    // Increment reports_count on replies table
    $update_sql = "UPDATE forum_replies SET reports_count = IFNULL(reports_count,0) + 1 WHERE id = ?";
    $stmt_update = $db->prepare($update_sql);
    $stmt_update->execute([$reply_id]);

    echo json_encode(['success' => true, 'message' => 'Reply reported']);
}

function createPost($db, $user_id, $data) {
    $title = sanitizeInput($data['title']);
    $content = sanitizeInput($data['content']);
    // Sanitize tags: remove spaces, ensure lowercase, handle #
    $tags = implode(',', array_map(function($tag) {
        return str_replace('#', '', trim(strtolower($tag)));
    }, explode(',', $data['tags'])));


    $sql = "INSERT INTO forum_posts (user_id, title, content, tags) VALUES (?, ?, ?, ?)";
    $stmt = $db->prepare($sql);
    $stmt->execute([$user_id, $title, $content, $tags]);
    echo json_encode(['success' => true, 'message' => 'Post created successfully']);
}

function createReply($db, $user_id, $data) {
    $post_id = $data['post_id'];
    $content = sanitizeInput($data['content']);

    $sql = "INSERT INTO forum_replies (post_id, user_id, content) VALUES (?, ?, ?)";
    $stmt = $db->prepare($sql);
    $stmt->execute([$post_id, $user_id, $content]);

    $update_sql = "UPDATE forum_posts SET replies_count = replies_count + 1 WHERE id = ?";
    $stmt_update = $db->prepare($update_sql);
    $stmt_update->execute([$post_id]);

    echo json_encode(['success' => true, 'message' => 'Reply added successfully']);
}

function likePost($db, $user_id, $data) {
    $post_id = $data['post_id'];
    
    $check_sql = "SELECT id FROM forum_post_likes WHERE post_id = ? AND user_id = ?";
    $stmt_check = $db->prepare($check_sql);
    $stmt_check->execute([$post_id, $user_id]);
    
    if ($stmt_check->fetch()) {
        // Unlike
        $delete_sql = "DELETE FROM forum_post_likes WHERE post_id = ? AND user_id = ?";
        $stmt_delete = $db->prepare($delete_sql);
        $stmt_delete->execute([$post_id, $user_id]);
        
        $update_sql = "UPDATE forum_posts SET likes_count = likes_count - 1 WHERE id = ?";
        $stmt_update = $db->prepare($update_sql);
        $stmt_update->execute([$post_id]);
        
        echo json_encode(['success' => true, 'message' => 'Post unliked']);
    } else {
        // Like
        $insert_sql = "INSERT INTO forum_post_likes (post_id, user_id) VALUES (?, ?)";
        $stmt_insert = $db->prepare($insert_sql);
        $stmt_insert->execute([$post_id, $user_id]);

        $update_sql = "UPDATE forum_posts SET likes_count = likes_count + 1 WHERE id = ?";
        $stmt_update = $db->prepare($update_sql);
        $stmt_update->execute([$post_id]);
        
        echo json_encode(['success' => true, 'message' => 'Post liked']);
    }
}

function deletePost($db, $user_id, $data) {
    $post_id = isset($data['post_id']) ? intval($data['post_id']) : 0;
    if (!$post_id) {
        echo json_encode(['success' => false, 'message' => 'post_id required']);
        return;
    }

    // Ensure the post exists and belongs to the user
    $check_sql = "SELECT user_id FROM forum_posts WHERE id = ? AND status = 'active'";
    $stmt_check = $db->prepare($check_sql);
    $stmt_check->execute([$post_id]);
    $row = $stmt_check->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        echo json_encode(['success' => false, 'message' => 'Post not found or already deleted']);
        return;
    }

    if (intval($row['user_id']) !== intval($user_id)) {
        echo json_encode(['success' => false, 'message' => 'Permission denied']);
        return;
    }

    // Soft-delete: set status to 'deleted'
    $del_sql = "UPDATE forum_posts SET status = 'deleted' WHERE id = ?";
    $stmt_del = $db->prepare($del_sql);
    $stmt_del->execute([$post_id]);

    echo json_encode(['success' => true, 'message' => 'Post deleted']);
}
?>
