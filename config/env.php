<?php
// Local environment configuration for MomAdmin5.
// Update these values to match your XAMPP/MySQL setup before running migrations or tests.

return [
    // MySQL host
    'DB_HOST' => 'localhost',

    // Database name (update if different)
    'DB_NAME' => 'momcare_app',

    // DB user and password (XAMPP default is usually 'root' with empty password)
    'DB_USER' => 'root',
    'DB_PASS' => 'root',

    // Environment: 'development' keeps rate-limits relaxed and dev fallbacks enabled.
    'ENV' => 'development',
];
