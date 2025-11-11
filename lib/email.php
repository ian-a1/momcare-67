<?php
// Simple email wrapper. For dev it writes to a temp file if mail() is unavailable.

function send_email($to, $subject, $body, $from = null) {
    // Prefer mail() if available and configured
    $headers = '';
    if ($from) $headers = "From: " . $from . "\r\n";

    // Try mail()
    if (function_exists('mail')) {
        $ok = @mail($to, $subject, $body, $headers);
        if ($ok) return true;
    }

    // Fallback: write to temp file for dev inspection
    $dir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'momcare_emails';
    if (!is_dir($dir)) @mkdir($dir, 0777, true);
    $file = $dir . DIRECTORY_SEPARATOR . 'email_' . time() . '_' . bin2hex(random_bytes(4)) . '.txt';
    $content = "To: $to\nSubject: $subject\nFrom: $from\n\n$body\n";
    file_put_contents($file, $content);
    return $file;
}

function send_email_placeholder($to, $subject, $body) {
    // Historical helper; keep for compatibility. Returns file path or true.
    return send_email($to, $subject, $body);
}
?>