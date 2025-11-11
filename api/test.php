<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "PHP is working!<br>";
echo "Testing database connection...<br>";

require_once '../config/database.php';
require_once '../config/security.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    echo "Database connected successfully!";
} catch (Exception $e) {
    echo "Database error: " . $e->getMessage();
}
?>