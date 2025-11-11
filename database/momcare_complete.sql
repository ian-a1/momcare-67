-- MySQL dump 10.13  Distrib 8.0.40, for Win64 (x86_64)
--
-- Host: localhost    Database: momcare_app
-- ------------------------------------------------------
-- Server version	8.0.40

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `account_locks`
--

DROP TABLE IF EXISTS `account_locks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `account_locks` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `failed_count` int NOT NULL DEFAULT '0',
  `locked_until` datetime DEFAULT NULL,
  `last_failed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_account_locks_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `account_locks`
--

LOCK TABLES `account_locks` WRITE;
/*!40000 ALTER TABLE `account_locks` DISABLE KEYS */;
/*!40000 ALTER TABLE `account_locks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `appointments`
--

DROP TABLE IF EXISTS `appointments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `appointments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `title` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `appointment_date` datetime NOT NULL,
  `doctor_name` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `doctor_id` int DEFAULT NULL,
  `location` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `type` enum('prenatal','ultrasound','blood_test','other') COLLATE utf8mb4_general_ci DEFAULT 'prenatal',
  `status` enum('pending','approved','completed','cancelled') COLLATE utf8mb4_general_ci DEFAULT 'pending',
  `doctor_comment` text COLLATE utf8mb4_general_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `doctor_id` (`doctor_id`),
  CONSTRAINT `appointments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `appointments_ibfk_2` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `appointments`
--

LOCK TABLES `appointments` WRITE;
/*!40000 ALTER TABLE `appointments` DISABLE KEYS */;
INSERT INTO `appointments` VALUES (1,1,'Prenatal Checkup','Regular monthly checkup','2025-11-02 10:00:00','Dr. Josefina Santos',NULL,'Manila General Hospital','prenatal','pending',NULL,'2025-09-27 07:18:58','2025-10-31 03:31:59'),(2,1,'Blood Test','Glucose screening test','2025-11-15 14:30:00','Dr. Maria Cruz',NULL,'Lab Center','blood_test','pending',NULL,'2025-09-27 07:18:58','2025-10-31 03:31:59'),(3,1,'Ultrasound','3D ultrasound scan','2025-11-28 11:15:00','Dr. Ana Reyes',NULL,'Imaging Center','ultrasound','pending',NULL,'2025-09-27 07:18:58','2025-10-31 03:31:59'),(4,5,'bfvb','vbv','2025-11-03 13:33:00','Dr. Casallo',1,NULL,'prenatal','cancelled','','2025-10-31 03:33:14','2025-10-31 03:38:05');
/*!40000 ALTER TABLE `appointments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `doctors`
--

DROP TABLE IF EXISTS `doctors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `doctors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `phone_number` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `doctors`
--

LOCK TABLES `doctors` WRITE;
/*!40000 ALTER TABLE `doctors` DISABLE KEYS */;
INSERT INTO `doctors` VALUES (1,'Dr. Maria Santos','(02) 8723-0101','maria.santos@momcare.com',1,'2025-10-30 13:43:30','2025-10-30 13:43:30'),(2,'Dr. Anna Reyes','(02) 8723-0102','anna.reyes@momcare.com',1,'2025-10-30 13:43:30','2025-10-30 13:43:30');
/*!40000 ALTER TABLE `doctors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `emergency_contacts`
--

DROP TABLE IF EXISTS `emergency_contacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `emergency_contacts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `relationship` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `contact_type` enum('mobile','landline','emergency') COLLATE utf8mb4_general_ci DEFAULT 'mobile',
  `is_primary` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `emergency_contacts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `emergency_contacts`
--

LOCK TABLES `emergency_contacts` WRITE;
/*!40000 ALTER TABLE `emergency_contacts` DISABLE KEYS */;
INSERT INTO `emergency_contacts` VALUES (1,1,'Partner/Spouse','+639171234567','Spouse','mobile',1,'2025-09-27 07:18:58','2025-10-08 13:30:00'),(2,1,'Dr. Santos (OB-GYN)','+639172345678','Doctor','mobile',0,'2025-09-27 07:18:58','2025-10-08 13:30:00'),(3,1,'Home Landline','(02) 8123-4567','Family','landline',0,'2025-09-27 07:18:58','2025-10-08 13:30:00'),(4,1,'Emergency Hotline','911','National Emergency','emergency',0,'2025-09-27 07:18:58','2025-10-08 13:30:00'),(5,2,'Emergency Hotline','911','National Emergency','emergency',0,'2025-10-08 12:36:30','2025-10-08 13:30:00'),(6,5,'Emergency Hotline','911','National Emergency','emergency',0,'2025-10-31 03:19:35','2025-10-31 03:19:35'),(8,6,'Emergency Hotline','911','National Emergency','emergency',0,'2025-11-05 14:36:38','2025-11-05 14:36:38'),(9,7,'Emergency Hotline','911','National Emergency','emergency',0,'2025-11-07 09:08:59','2025-11-07 09:08:59'),(10,8,'Emergency Hotline','911','National Emergency','emergency',0,'2025-11-08 08:25:44','2025-11-08 08:25:44');
/*!40000 ALTER TABLE `emergency_contacts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `forum_post_likes`
--

DROP TABLE IF EXISTS `forum_post_likes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `forum_post_likes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `post_id` int NOT NULL,
  `user_id` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_post_like` (`post_id`,`user_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `forum_post_likes_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `forum_posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `forum_post_likes_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `forum_post_likes`
--

LOCK TABLES `forum_post_likes` WRITE;
/*!40000 ALTER TABLE `forum_post_likes` DISABLE KEYS */;
/*!40000 ALTER TABLE `forum_post_likes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `forum_post_reports`
--

DROP TABLE IF EXISTS `forum_post_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `forum_post_reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `post_id` int NOT NULL,
  `user_id` int NOT NULL,
  `type` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `details` text COLLATE utf8mb4_general_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_report` (`post_id`,`user_id`),
  KEY `post_id` (`post_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `fk_report_post` FOREIGN KEY (`post_id`) REFERENCES `forum_posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_report_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `forum_post_reports`
--

LOCK TABLES `forum_post_reports` WRITE;
/*!40000 ALTER TABLE `forum_post_reports` DISABLE KEYS */;
/*!40000 ALTER TABLE `forum_post_reports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `forum_posts`
--

DROP TABLE IF EXISTS `forum_posts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `forum_posts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_general_ci NOT NULL,
  `content` text COLLATE utf8mb4_general_ci NOT NULL,
  `tags` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `likes_count` int DEFAULT '0',
  `replies_count` int DEFAULT '0',
  `is_pinned` tinyint(1) DEFAULT '0',
  `status` enum('active','hidden','deleted') COLLATE utf8mb4_general_ci DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `reports_count` int DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `forum_posts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `forum_posts`
--

LOCK TABLES `forum_posts` WRITE;
/*!40000 ALTER TABLE `forum_posts` DISABLE KEYS */;
INSERT INTO `forum_posts` VALUES (1,1,'First trimester morning sickness tips?','Hi everyone! I\'m 8 weeks pregnant and struggling with severe morning sickness. What natural remedies have worked for you?','first-trimester,morning-sickness,advice',12,2,0,'active','2025-09-27 07:19:11','2025-10-08 13:30:00',0),(2,1,'Best prenatal vitamins in the Philippines','Can anyone recommend good prenatal vitamins available locally? Looking for something with good folate content.','nutrition,first-trimester,advice',15,1,0,'active','2025-09-27 07:19:11','2025-10-08 13:30:00',0),(3,1,'Exercise during second trimester','What exercises are safe during the second trimester? I used to run but not sure if I should continue.','second-trimester,exercise,mental-health',9,0,0,'active','2025-09-27 07:19:11','2025-10-08 13:30:00',0),(4,5,'fgfg','fgfg','advice',0,0,0,'deleted','2025-10-31 04:36:34','2025-10-31 04:44:42',0),(5,5,'fgfg','fgfg','advice',0,0,0,'deleted','2025-10-31 04:36:45','2025-10-31 04:44:40',0),(6,5,'fdfd','dfdf','advice',0,0,0,'active','2025-11-08 10:11:53','2025-11-08 10:11:53',0);
/*!40000 ALTER TABLE `forum_posts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `forum_replies`
--

DROP TABLE IF EXISTS `forum_replies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `forum_replies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `post_id` int NOT NULL,
  `user_id` int NOT NULL,
  `content` text COLLATE utf8mb4_general_ci NOT NULL,
  `likes_count` int DEFAULT '0',
  `status` enum('active','hidden','deleted') COLLATE utf8mb4_general_ci DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `post_id` (`post_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `forum_replies_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `forum_posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `forum_replies_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `forum_replies`
--

LOCK TABLES `forum_replies` WRITE;
/*!40000 ALTER TABLE `forum_replies` DISABLE KEYS */;
INSERT INTO `forum_replies` VALUES (1,1,2,'Ginger tea really helped me! Also eating small frequent meals instead of large ones.',5,'active','2025-09-28 07:19:11','2025-10-08 13:30:00'),(2,1,2,'Try crackers before getting out of bed in the morning. It made a huge difference for me.',3,'active','2025-09-29 07:19:11','2025-10-08 13:30:00'),(3,2,2,'I\'ve been taking Obimin Plus and it\'s been great. Available in most Mercury Drug stores.',7,'active','2025-09-30 07:19:11','2025-10-08 13:30:00');
/*!40000 ALTER TABLE `forum_replies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `forum_reply_likes`
--

DROP TABLE IF EXISTS `forum_reply_likes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `forum_reply_likes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `reply_id` int NOT NULL,
  `user_id` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_reply_like` (`reply_id`,`user_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `forum_reply_likes_ibfk_1` FOREIGN KEY (`reply_id`) REFERENCES `forum_replies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `forum_reply_likes_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `forum_reply_likes`
--

LOCK TABLES `forum_reply_likes` WRITE;
/*!40000 ALTER TABLE `forum_reply_likes` DISABLE KEYS */;
/*!40000 ALTER TABLE `forum_reply_likes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `library_content`
--

DROP TABLE IF EXISTS `library_content`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `library_content` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(200) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `content` text COLLATE utf8mb4_general_ci,
  `category` enum('recipes','mental-health','exercise','medicine-supplements') COLLATE utf8mb4_general_ci NOT NULL,
  `author` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `rating` decimal(3,2) DEFAULT '0.00',
  `views_count` int DEFAULT '0',
  `downloads_count` int DEFAULT '0',
  `tags` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `image_url` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `file_url` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `file_size` bigint DEFAULT '0' COMMENT 'in bytes',
  `duration_minutes` int DEFAULT '0',
  `item_count` int DEFAULT '0',
  `difficulty_level` enum('beginner','intermediate','advanced') COLLATE utf8mb4_general_ci DEFAULT 'beginner',
  `is_featured` tinyint(1) DEFAULT '0',
  `status` enum('active','draft','archived') COLLATE utf8mb4_general_ci DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=73 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `library_content`
--

LOCK TABLES `library_content` WRITE;
/*!40000 ALTER TABLE `library_content` DISABLE KEYS */;
INSERT INTO `library_content` VALUES (15,'Understanding Prenatal Vitamins','A complete guide to the essential nutrients needed during pregnancy.',NULL,'medicine-supplements','Dr. Patricia Lim, OB-GYN',4.90,0,0,'prenatal,vitamins,essential',NULL,'library/supplements/ms5.html',0,0,1,'beginner',1,'active','2025-10-11 14:33:20','2025-11-05 15:02:17'),(16,'Folic Acid: The Super Nutrient','Why folic acid is crucial for preventing neural tube defects in your baby.',NULL,'medicine-supplements','Pharmacist Ana Reyes',4.90,0,0,'folic-acid,folate,development',NULL,'library/supplements/ms15.html',0,0,1,'beginner',1,'active','2025-10-11 14:33:20','2025-11-05 15:02:17'),(17,'The Importance of Iron','How to prevent iron-deficiency anemia and boost your energy levels.',NULL,'medicine-supplements','Dr. Patricia Lim, OB-GYN',4.80,0,0,'iron,anemia,energy',NULL,'library/supplements/ms1.html',0,0,1,'beginner',0,'active','2025-10-11 14:33:20','2025-11-05 15:02:17'),(18,'Calcium for Strong Bones','Ensuring you and your baby get enough calcium for skeletal development.',NULL,'medicine-supplements','Pharmacist Ana Reyes',4.70,0,0,'calcium,bones,development',NULL,'library/supplements/ms2.html',0,0,1,'beginner',0,'active','2025-10-11 14:33:20','2025-11-05 15:02:17'),(19,'Vitamin D: The Sunshine Vitamin','The role of Vitamin D in baby\'s bone growth and immune function.',NULL,'medicine-supplements','Dr. Patricia Lim, OB-GYN',4.80,0,0,'vitamin-d,immunity,bones',NULL,'library/supplements/ms4.html',0,0,1,'beginner',0,'active','2025-10-11 14:33:20','2025-11-05 15:02:17'),(20,'Omega-3 (DHA) for Brain Health','How DHA supports your baby\'s brain and eye development.',NULL,'medicine-supplements','Pharmacist Ana Reyes',4.90,0,0,'omega-3,dha,brain-health',NULL,'library/supplements/ms3.html',0,0,1,'beginner',1,'active','2025-10-11 14:33:20','2025-11-05 15:02:17'),(21,'Choline: An Unsung Hero','The importance of choline for fetal brain development and memory.',NULL,'medicine-supplements','Dr. Patricia Lim, OB-GYN',4.60,0,0,'choline,brain-development',NULL,'library/supplements/ms7.html',0,0,1,'beginner',0,'active','2025-10-11 14:33:20','2025-11-05 15:02:18'),(22,'Iodine and Thyroid Function','How iodine supports healthy thyroid function for you and your baby.',NULL,'medicine-supplements','Pharmacist Ana Reyes',4.70,0,0,'iodine,thyroid,health',NULL,'library/supplements/ms16.html',0,0,1,'beginner',0,'active','2025-10-11 14:33:20','2025-11-05 15:02:18'),(23,'Safe Medications for Headaches','What you can take for headaches and what to avoid during pregnancy.',NULL,'medicine-supplements','Dr. Patricia Lim, OB-GYN',4.80,0,0,'headache,safe-meds,pain-relief',NULL,'library/supplements/ms9.html',0,0,1,'beginner',0,'active','2025-10-11 14:33:20','2025-11-05 15:02:18'),(24,'Managing Heartburn Safely','A guide to over-the-counter antacids and lifestyle changes for heartburn.',NULL,'medicine-supplements','Pharmacist Ana Reyes',4.70,0,0,'heartburn,acid-reflux,safe-meds',NULL,'library/supplements/ms10.html',0,0,1,'beginner',0,'active','2025-10-11 14:33:20','2025-11-05 15:02:18'),(25,'Constipation Relief During Pregnancy','Safe laxatives and fiber supplements to consider for constipation.',NULL,'medicine-supplements','Dr. Patricia Lim, OB-GYN',4.60,0,0,'constipation,fiber,safe-meds',NULL,'library/supplements/ms11.html',0,0,1,'beginner',0,'active','2025-10-11 14:33:20','2025-11-05 15:02:18'),(26,'Guide to Nausea & Morning Sickness Meds','Understanding options like Vitamin B6 and doxylamine for morning sickness.',NULL,'medicine-supplements','Pharmacist Ana Reyes',4.80,0,0,'nausea,morning-sickness,safe-meds',NULL,'library/supplements/ms13.html',0,0,1,'beginner',0,'active','2025-10-11 14:33:20','2025-11-05 15:02:18'),(27,'Allergies: What\'s Safe to Take?','A breakdown of safe antihistamines for seasonal allergies during pregnancy.',NULL,'medicine-supplements','Dr. Patricia Lim, OB-GYN',4.70,0,0,'allergies,antihistamines,safe-meds',NULL,'library/supplements/ms11.html',0,0,1,'beginner',0,'active','2025-10-11 14:33:20','2025-11-05 15:02:18'),(28,'Understanding Gestational Diabetes Meds','An overview of medications like metformin if diet and exercise aren\'t enough.',NULL,'medicine-supplements','Dr. Patricia Lim, OB-GYN',4.90,0,0,'gdm,diabetes,medication',NULL,'library/supplements/ms12.html',0,0,1,'beginner',0,'active','2025-10-11 14:33:20','2025-11-05 15:02:18'),(29,'Herbal Supplements to Avoid','A list of common herbal remedies that are not safe during pregnancy.',NULL,'medicine-supplements','Pharmacist Ana Reyes',4.80,0,0,'herbal,safety,supplements',NULL,'library/supplements/ms8.html',0,0,1,'beginner',1,'active','2025-10-11 14:33:20','2025-11-05 15:02:18'),(30,'Postnatal Vitamins: Do You Need Them?','Continuing nutritional support for recovery and breastfeeding after birth.',NULL,'medicine-supplements','Dr. Patricia Lim, OB-GYN',4.70,0,0,'postnatal,breastfeeding,nutrition',NULL,'library/supplements/ms14.html',0,0,1,'beginner',0,'active','2025-10-11 14:33:20','2025-11-05 15:02:18'),(31,'Mindful Breathing for Expectant Moms','Simple breathing exercises to calm anxiety and connect with your baby.',NULL,'mental-health','Yoga Instructor Lisa Chen',4.90,0,0,'mindfulness,breathing,anxiety',NULL,'library/mental_health/mh1.html',0,0,1,'beginner',1,'active','2025-10-11 14:33:20','2025-11-05 10:26:30'),(32,'Pregnancy Journaling Prompts','Guided prompts to help you process emotions and document your journey.',NULL,'mental-health','Psychologist Dr. Anna Garcia',4.80,0,0,'journaling,emotional-wellness,self-care',NULL,'library/mental_health/mh2.html',0,0,1,'beginner',1,'active','2025-10-11 14:33:20','2025-11-05 10:26:30'),(33,'Navigating Mood Swings','Understanding the hormonal changes that affect your mood and how to cope.',NULL,'mental-health','Psychologist Dr. Anna Garcia',4.70,0,0,'mood-swings,hormones,emotions',NULL,'library/mental_health/mh3.html',0,0,1,'beginner',0,'active','2025-10-11 14:33:20','2025-11-05 10:26:30'),(34,'Building a Support System','Tips on how to communicate your needs to your partner, family, and friends.',NULL,'mental-health','Psychologist Dr. Anna Garcia',4.80,0,0,'support-system,communication,relationships',NULL,'library/mental_health/mh4.html',0,0,1,'beginner',0,'active','2025-10-11 14:33:20','2025-11-05 10:26:30'),(35,'Guided Meditation for Deep Sleep','A 15-minute audio guide to help you overcome pregnancy-related insomnia.',NULL,'mental-health','Yoga Instructor Lisa Chen',4.90,0,0,'meditation,sleep,insomnia',NULL,'library/mental_health/mh5.html',0,0,1,'beginner',1,'active','2025-10-11 14:33:20','2025-11-05 10:26:30'),(36,'Perinatal Anxiety: Signs & Symptoms','Learn to recognize the signs of perinatal anxiety and when to seek help.',NULL,'mental-health','Psychologist Dr. Anna Garcia',4.80,0,0,'anxiety,perinatal,mental-health',NULL,'library/mental_health/mh6.html',0,0,1,'beginner',0,'active','2025-10-11 14:33:20','2025-11-05 10:26:30'),(37,'Positive Affirmations for Pregnancy','A list of powerful affirmations to boost your confidence and reduce fear.',NULL,'mental-health','Yoga Instructor Lisa Chen',4.70,0,0,'affirmations,positivity,self-talk',NULL,'library/mental_health/mh7.html',0,0,1,'beginner',0,'active','2025-10-11 14:33:20','2025-11-05 10:26:30'),(38,'Connecting with Your Partner','Activities and conversation starters to strengthen your bond before baby arrives.',NULL,'mental-health','Psychologist Dr. Anna Garcia',4.80,0,0,'partner,relationship,connection',NULL,'library/mental_health/mh8.html',0,0,1,'beginner',0,'active','2025-10-11 14:33:20','2025-11-05 10:26:30'),(39,'Understanding the Baby Blues','Differentiating between the common \"baby blues\" and postpartum depression.',NULL,'mental-health','Psychologist Dr. Anna Garcia',4.90,0,0,'baby-blues,postpartum,awareness',NULL,'library/mental_health/mh9.html',0,0,1,'beginner',0,'active','2025-10-11 14:33:20','2025-11-05 10:26:30'),(40,'Creating a Postpartum Mental Health Plan','A proactive guide to preparing for your emotional well-being after birth.',NULL,'mental-health','Psychologist Dr. Anna Garcia',4.80,0,0,'postpartum,planning,self-care',NULL,'library/mental_health/mh10.html',0,0,1,'beginner',1,'active','2025-10-11 14:33:20','2025-11-05 10:26:30'),(41,'General Covered Maternal Exercises','Safe and easy exercises to maintain energy and combat morning sickness.',NULL,'exercise','Yoga Instructor Lisa Chen',4.80,0,0,'first-trimester,gentle-exercise,yoga',NULL,'library/exercises/1_general.html',0,0,1,'beginner',1,'active','2025-10-11 14:33:20','2025-10-11 14:33:20'),(42,'Second Trimester: Building Strength','Workouts to support your growing belly and prevent back pain.',NULL,'exercise','Fitness Coach David Cruz',4.90,0,0,'second-trimester,strength,back-pain',NULL,'library/exercises/2_breathing_pre.html',0,0,1,'beginner',1,'active','2025-10-11 14:33:20','2025-11-05 10:26:30'),(43,'Third Trimester: Preparing for Labor','Stretches and movements to help prepare your body for childbirth.',NULL,'exercise','Yoga Instructor Lisa Chen',4.80,0,0,'third-trimester,labor-prep,stretching',NULL,'library/exercises/3_breathing_post.html',0,0,1,'beginner',0,'active','2025-10-11 14:33:20','2025-11-05 10:26:30'),(44,'Pelvic Floor Exercises (Kegels)','A complete guide to properly performing Kegels to support delivery and recovery.',NULL,'exercise','Physical Therapist Angela Solis',4.90,0,0,'kegels,pelvic-floor,recovery',NULL,'library/exercises/4_gentle_pre.html',0,0,1,'beginner',1,'active','2025-10-11 14:33:20','2025-11-05 10:26:30'),(45,'Prenatal Yoga for Flexibility','A sequence of safe yoga poses to improve flexibility and reduce stress.',NULL,'exercise','Yoga Instructor Lisa Chen',4.80,0,0,'yoga,flexibility,stress-relief',NULL,'library/exercises/5_gentle_post.html',0,0,1,'beginner',0,'active','2025-10-11 14:33:20','2025-11-05 10:26:30'),(46,'Walking: The Perfect Pregnancy Workout','How to get the most out of walking, from pace to posture.',NULL,'exercise','Fitness Coach David Cruz',4.70,0,0,'walking,cardio,low-impact',NULL,'library/exercises/6_seated_pre.html',0,0,1,'beginner',0,'active','2025-10-11 14:33:20','2025-11-05 10:26:30'),(47,'Swimming and Water Aerobics','Enjoy a weightless workout that reduces swelling and joint pain.',NULL,'exercise','Physical Therapist Angela Solis',4.90,0,0,'swimming,water-aerobics,joint-pain',NULL,'library/exercises/7_seated_post.html',0,0,1,'beginner',0,'active','2025-10-11 14:33:20','2025-11-05 10:26:30'),(48,'Stationary Biking Guide','A safe cardiovascular workout to do at home or the gym.',NULL,'exercise','Fitness Coach David Cruz',4.60,0,0,'biking,cardio,low-impact',NULL,'library/exercises/8_yoga_pre.html',0,0,1,'beginner',0,'active','2025-10-11 14:33:20','2025-11-05 10:26:30'),(49,'Strength Training with Resistance Bands','Safe, low-impact exercises to maintain muscle tone.',NULL,'exercise','Fitness Coach David Cruz',4.70,0,0,'strength-training,resistance-bands',NULL,'library/exercises/9_yoga_post.html',0,0,1,'beginner',0,'active','2025-10-11 14:33:20','2025-11-05 10:26:30'),(50,'Stretches for a Sore Back','Gentle stretches to alleviate common pregnancy-related backaches.',NULL,'exercise','Physical Therapist Angela Solis',4.80,0,0,'stretching,back-pain,relief',NULL,'library/exercises/10_aerobics_pre.html',0,0,1,'beginner',1,'active','2025-10-11 14:33:20','2025-11-05 10:26:30'),(51,'Exercises to Avoid During Pregnancy','A crucial guide on which movements and activities to steer clear of.',NULL,'exercise','Physical Therapist Angela Solis',4.90,0,0,'safety,contraindications,exercise',NULL,'library/exercises/11_aerobics_post.html',0,0,1,'beginner',0,'active','2025-10-11 14:33:20','2025-11-05 10:26:30'),(52,'Postpartum Recovery Exercises','Gentle movements to help you regain strength and heal after delivery.',NULL,'exercise','Physical Therapist Angela Solis',4.80,0,0,'postpartum,recovery,healing',NULL,'library/exercises/12_references.html',0,0,1,'beginner',0,'active','2025-10-11 14:33:20','2025-11-05 10:26:30'),(53,'Tinola (Chicken Ginger Soup)','A healthy and delicious soup perfect for expectant mothers.',NULL,'recipes','Nutritionist Maria Santos',4.80,0,0,'soup,filipino,healthy,first-trimester',NULL,'library/recipes/r1.html',0,0,1,'beginner',1,'active','2025-10-11 15:01:42','2025-10-31 05:28:29'),(54,'Sinigang na Isda (Fish Tamarind Soup)','This nutritious stew is a great choice for a healthy pregnancy meal.',NULL,'recipes','Chef Elena Reyes',4.90,0,0,'beans,folate,iron,filipino',NULL,'library/recipes/r2.html',0,0,1,'beginner',1,'active','2025-10-11 15:01:42','2025-10-31 06:08:00'),(55,'Ginisang Monggo (Sautéed Mung Beans)','A light and healthy fish soup that is both comforting and beneficial.',NULL,'recipes','Nutritionist Maria Santos',4.70,0,0,'fish,omega-3,soup,healthy',NULL,'library/recipes/r3.html',0,0,1,'beginner',0,'active','2025-10-11 15:01:42','2025-10-31 06:16:34'),(56,'Lugaw (Rice Porridge)','Enjoy a classic Filipino dish made healthier for you and your baby.',NULL,'recipes','Chef Elena Reyes',4.60,0,0,'adobo,low-sodium,filipino',NULL,'library/recipes/r4.html',0,0,1,'beginner',0,'active','2025-10-11 15:01:42','2025-10-31 06:38:15'),(57,'Ginataang Mais (Corn in Coconut Milk)','A wholesome vegetable dish to support a balanced pregnancy diet.',NULL,'recipes','Nutritionist Maria Santos',4.50,0,0,'vegetable,diabetes-friendly,filipino',NULL,'library/recipes/r5.html',0,0,1,'beginner',0,'active','2025-10-11 15:01:42','2025-10-31 06:44:06'),(58,'Ginisang Sayote (Sautéed Chayote with Ground Pork)','This flavorful soup is packed with vegetables and is wonderfully hydrating.',NULL,'recipes','Chef Elena Reyes',4.80,0,0,'soup,filipino,vegetables',NULL,'library/recipes/r6.html',0,0,1,'beginner',0,'active','2025-10-11 15:01:42','2025-10-31 06:47:47'),(59,'Laing (Taro Leaves in Coconut Milk)','A creamy and nutritious dish that provides essential nutrients for moms-to-be.',NULL,'recipes','Chef Elena Reyes',4.70,0,0,'vegetable,coconut-milk,calcium,filipino',NULL,'library/recipes/r7.html',0,0,1,'beginner',0,'active','2025-10-11 15:01:42','2025-10-31 06:58:20'),(60,'Bulalo (Beef Bone Marrow Soup)','A warm and comforting porridge, perfect for a soothing meal.',NULL,'recipes','Nutritionist Maria Santos',4.90,0,0,'porridge,comfort-food,filipino',NULL,'library/recipes/r8.html',0,0,1,'beginner',1,'active','2025-10-11 15:01:42','2025-10-31 07:00:54'),(61,'Sopas (Filipino Chicken Macaroni Soup)','A simple, protein-rich meal that is both healthy and easy to make.',NULL,'recipes','Nutritionist Maria Santos',4.80,0,0,'fish,protein,steamed,healthy',NULL,'library/recipes/r9.html',0,0,1,'beginner',0,'active','2025-10-11 15:01:42','2025-10-31 07:05:44'),(62,'Nilagang Baka (Boiled Beef with Vegetables)','A hearty and nourishing beef soup to enjoy during your pregnancy journey.',NULL,'recipes','Chef Elena Reyes',4.70,0,0,'beef,soup,collagen,filipino',NULL,'library/recipes/r10.html',0,0,1,'beginner',0,'active','2025-10-11 15:01:42','2025-10-31 07:07:16'),(64,'Recipe for Moms 12','A simple and healthy baked chicken dish, perfect for dinner.',NULL,'recipes','Chef Elena Reyes',4.80,0,0,'chicken,baked,protein',NULL,'pdfs/r12.pdf',0,0,1,'beginner',0,'draft','2025-10-11 15:01:42','2025-10-31 05:47:12'),(65,'Recipe for Moms 13','A vegetable lasagna packed with nutrients for a satisfying meal.',NULL,'recipes','Nutritionist Maria Santos',4.70,0,0,'lasagna,vegetable,pasta',NULL,'pdfs/r13.pdf',0,0,1,'beginner',0,'draft','2025-10-11 15:01:42','2025-10-31 05:47:12'),(66,'Recipe for Moms 14','A smoothie designed for a quick and healthy energy boost.',NULL,'recipes','Chef Elena Reyes',4.90,0,0,'smoothie,energy,fruit',NULL,'pdfs/r14.pdf',0,0,1,'beginner',1,'draft','2025-10-11 15:01:42','2025-10-31 05:47:12'),(67,'Recipe for Moms 15','A hearty lentil soup, rich in fiber and plant-based protein.',NULL,'recipes','Nutritionist Maria Santos',4.80,0,0,'lentil,soup,fiber,vegan',NULL,'pdfs/r15.pdf',0,0,1,'beginner',0,'draft','2025-10-11 15:01:42','2025-10-31 05:47:12'),(68,'Recipe for Moms 16','A healthy quinoa salad with fresh vegetables, perfect for lunch.',NULL,'recipes','Chef Elena Reyes',4.70,0,0,'quinoa,salad,healthy,gluten-free',NULL,'pdfs/r16.pdf',0,0,1,'beginner',0,'draft','2025-10-11 15:01:42','2025-10-31 05:47:12'),(69,'Recipe for Moms 17','A delicious and healthy salmon dish rich in Omega-3 fatty acids.',NULL,'recipes','Nutritionist Maria Santos',4.90,0,0,'salmon,omega-3,fish',NULL,'pdfs/r17.pdf',0,0,1,'beginner',1,'draft','2025-10-11 15:01:42','2025-10-31 05:47:12'),(70,'Recipe for Moms 18','A classic Filipino vegetable stir-fry, quick and easy to prepare.',NULL,'recipes','Chef Elena Reyes',4.60,0,0,'vegetable,stir-fry,filipino',NULL,'pdfs/r18.pdf',0,0,1,'beginner',0,'draft','2025-10-11 15:01:42','2025-10-31 05:47:12'),(71,'Recipe for Moms 19','Light and healthy chicken and vegetable skewers for a fun meal.',NULL,'recipes','Nutritionist Maria Santos',4.70,0,0,'chicken,vegetable,skewers,healthy',NULL,'pdfs/r19.pdf',0,0,1,'beginner',0,'draft','2025-10-11 15:01:42','2025-10-31 05:47:12'),(72,'Recipe for Moms 20','A comforting and healthy sweet potato soup, perfect for a cozy day.',NULL,'recipes','Chef Elena Reyes',4.80,0,0,'sweet-potato,soup,comfort-food',NULL,'pdfs/r20.pdf',0,0,1,'beginner',0,'draft','2025-10-11 15:01:42','2025-10-31 05:47:12');
/*!40000 ALTER TABLE `library_content` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `milestones`
--

DROP TABLE IF EXISTS `milestones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `milestones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `week_number` int DEFAULT NULL,
  `status` enum('pending','complete') COLLATE utf8mb4_general_ci DEFAULT 'pending',
  `completed_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `milestones_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `milestones`
--

LOCK TABLES `milestones` WRITE;
/*!40000 ALTER TABLE `milestones` DISABLE KEYS */;
INSERT INTO `milestones` VALUES (1,1,'Anatomy Scan','Detailed ultrasound scan',20,'complete','2025-10-15','2025-09-27 07:18:58','2025-10-08 13:30:00'),(2,1,'Glucose Screening','Test for gestational diabetes',24,'pending',NULL,'2025-09-27 07:18:58','2025-10-08 13:30:00'),(3,1,'sasa','saas',2,'pending',NULL,'2025-10-08 13:25:48','2025-10-08 13:25:48');
/*!40000 ALTER TABLE `milestones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_resets`
--

DROP TABLE IF EXISTS `password_resets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_resets` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `token_hash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `used` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_password_resets_user_id` (`user_id`),
  KEY `idx_password_resets_token_hash` (`token_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_resets`
--

LOCK TABLES `password_resets` WRITE;
/*!40000 ALTER TABLE `password_resets` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_resets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `predefined_milestones`
--

DROP TABLE IF EXISTS `predefined_milestones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `predefined_milestones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `week_number` int NOT NULL,
  `category` enum('medical','development','personal','preparation') COLLATE utf8mb4_general_ci DEFAULT 'personal',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `predefined_milestones`
--

LOCK TABLES `predefined_milestones` WRITE;
/*!40000 ALTER TABLE `predefined_milestones` DISABLE KEYS */;
INSERT INTO `predefined_milestones` VALUES (1,'Schedule first prenatal appointment','Schedule first prenatal appointment',6,'medical','2025-10-31 04:43:49','2025-10-31 04:43:49'),(2,'Confirm pregnancy with doctor','Confirm pregnancy with doctor',6,'medical','2025-10-31 04:43:49','2025-10-31 04:43:49'),(3,'Start prenatal vitamins','Start prenatal vitamins',4,'medical','2025-10-31 04:43:49','2025-10-31 04:43:49'),(4,'First ultrasound completed','First ultrasound completed',8,'medical','2025-10-31 04:43:49','2025-10-31 04:43:49'),(5,'Hear baby\'s heartbeat','Hear baby\'s heartbeat',10,'development','2025-10-31 04:43:49','2025-10-31 04:43:49'),(6,'Announce pregnancy to close family','Announce pregnancy to close family',12,'personal','2025-10-31 04:43:49','2025-10-31 04:43:49'),(7,'Research healthcare providers/hospitals','Research healthcare providers/hospitals',8,'preparation','2025-10-31 04:43:49','2025-10-31 04:43:49'),(8,'Begin pregnancy journal','Begin pregnancy journal',6,'personal','2025-10-31 04:43:49','2025-10-31 04:43:49'),(9,'Anatomy scan completed (18-22 weeks)','Anatomy scan completed (18-22 weeks)',20,'medical','2025-10-31 04:43:49','2025-10-31 04:43:49'),(10,'Feel baby\'s first kicks','Feel baby\'s first kicks',18,'development','2025-10-31 04:43:49','2025-10-31 04:43:49'),(11,'Announce pregnancy publicly','Announce pregnancy publicly',14,'personal','2025-10-31 04:43:49','2025-10-31 04:43:49'),(12,'Start shopping for maternity clothes','Start shopping for maternity clothes',16,'preparation','2025-10-31 04:43:49','2025-10-31 04:43:49'),(13,'Begin researching baby gear','Begin researching baby gear',18,'preparation','2025-10-31 04:43:49','2025-10-31 04:43:49'),(14,'Create baby registry','Create baby registry',20,'preparation','2025-10-31 04:43:49','2025-10-31 04:43:49'),(15,'Take glucose tolerance test (24-28 weeks)','Take glucose tolerance test (24-28 weeks)',26,'medical','2025-10-31 04:43:49','2025-10-31 04:43:49'),(16,'Choose baby\'s name','Choose baby\'s name',24,'personal','2025-10-31 04:43:49','2025-10-31 04:43:49'),(17,'Start planning nursery','Start planning nursery',22,'preparation','2025-10-31 04:43:49','2025-10-31 04:43:49'),(18,'Complete childbirth education class','Complete childbirth education class',32,'preparation','2025-10-31 04:43:49','2025-10-31 04:43:49'),(19,'Take infant CPR class','Take infant CPR class',34,'preparation','2025-10-31 04:43:49','2025-10-31 04:43:49'),(20,'Hospital/birth center tour completed','Hospital/birth center tour completed',32,'preparation','2025-10-31 04:43:49','2025-10-31 04:43:49'),(21,'Create and finalize birth plan','Create and finalize birth plan',34,'preparation','2025-10-31 04:43:49','2025-10-31 04:43:49'),(22,'Pack hospital bag','Pack hospital bag',36,'preparation','2025-10-31 04:43:49','2025-10-31 04:43:49'),(23,'Wash and organize baby clothes','Wash and organize baby clothes',35,'preparation','2025-10-31 04:43:49','2025-10-31 04:43:49'),(24,'Set up nursery','Set up nursery',34,'preparation','2025-10-31 04:43:49','2025-10-31 04:43:49'),(25,'Stock postpartum supplies','Stock postpartum supplies',36,'preparation','2025-10-31 04:43:49','2025-10-31 04:43:49'),(26,'Prepare freezer meals','Prepare freezer meals',36,'preparation','2025-10-31 04:43:49','2025-10-31 04:43:49'),(27,'Select pediatrician','Select pediatrician',34,'medical','2025-10-31 04:43:49','2025-10-31 04:43:49'),(28,'Arrange parental leave','Arrange parental leave',32,'preparation','2025-10-31 04:43:49','2025-10-31 04:43:49'),(29,'Take maternity photos','Take maternity photos',34,'personal','2025-10-31 04:43:49','2025-10-31 04:43:49'),(30,'Reach full term (37 weeks)','Reach full term (37 weeks)',37,'development','2025-10-31 04:43:49','2025-10-31 04:43:49');
/*!40000 ALTER TABLE `predefined_milestones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pregnancy_info`
--

DROP TABLE IF EXISTS `pregnancy_info`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pregnancy_info` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `due_date` date DEFAULT NULL,
  `current_week` int DEFAULT '1',
  `doctor_name` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `hospital` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `pregnancy_info_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pregnancy_info`
--

LOCK TABLES `pregnancy_info` WRITE;
/*!40000 ALTER TABLE `pregnancy_info` DISABLE KEYS */;
INSERT INTO `pregnancy_info` VALUES (1,1,'2026-03-15',17,'Dr. Josefina Santos','Manila General Hospital','2025-09-27 07:18:58','2025-10-08 13:25:33'),(3,5,'2025-10-15',1,NULL,NULL,'2025-10-31 04:45:11','2025-10-31 04:45:11');
/*!40000 ALTER TABLE `pregnancy_info` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_downloads_tracking`
--

DROP TABLE IF EXISTS `user_downloads_tracking`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_downloads_tracking` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `content_id` int NOT NULL,
  `download_path` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `file_size_mb` decimal(10,2) DEFAULT NULL,
  `download_status` enum('downloading','completed','failed') COLLATE utf8mb4_general_ci DEFAULT 'downloading',
  `progress_percentage` int DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `content_id` (`content_id`),
  CONSTRAINT `user_downloads_tracking_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_downloads_tracking_ibfk_2` FOREIGN KEY (`content_id`) REFERENCES `library_content` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_downloads_tracking`
--

LOCK TABLES `user_downloads_tracking` WRITE;
/*!40000 ALTER TABLE `user_downloads_tracking` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_downloads_tracking` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_library_interactions`
--

DROP TABLE IF EXISTS `user_library_interactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_library_interactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `content_id` int NOT NULL,
  `interaction_type` enum('view','like','bookmark','download','rating') COLLATE utf8mb4_general_ci NOT NULL,
  `rating_value` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_content_interaction` (`user_id`,`content_id`,`interaction_type`),
  KEY `content_id` (`content_id`),
  CONSTRAINT `user_library_interactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_library_interactions_ibfk_2` FOREIGN KEY (`content_id`) REFERENCES `library_content` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_library_interactions`
--

LOCK TABLES `user_library_interactions` WRITE;
/*!40000 ALTER TABLE `user_library_interactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_library_interactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_medical_info`
--

DROP TABLE IF EXISTS `user_medical_info`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_medical_info` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `blood_type` varchar(5) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `allergies` text COLLATE utf8mb4_general_ci,
  `medical_conditions` text COLLATE utf8mb4_general_ci,
  `medications` text COLLATE utf8mb4_general_ci,
  `healthcare_provider` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `primary_obgyn_name` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `clinic_address` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `clinic_phone_number` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `user_medical_info_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_medical_info`
--

LOCK TABLES `user_medical_info` WRITE;
/*!40000 ALTER TABLE `user_medical_info` DISABLE KEYS */;
INSERT INTO `user_medical_info` VALUES (1,1,'O+','Peanuts,Shellfish','None','Prenatal Vitamins','St. Luke\'s Medical Center','Dr. Josefina Santos','Global City, Taguig','(02) 8789-7700','2025-09-27 07:19:11','2025-10-08 13:14:00');
/*!40000 ALTER TABLE `user_medical_info` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_milestone_completions`
--

DROP TABLE IF EXISTS `user_milestone_completions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_milestone_completions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `milestone_id` int NOT NULL,
  `completed_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_milestone` (`user_id`,`milestone_id`),
  KEY `milestone_id` (`milestone_id`),
  CONSTRAINT `user_milestone_completions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_milestone_completions_ibfk_2` FOREIGN KEY (`milestone_id`) REFERENCES `predefined_milestones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_milestone_completions`
--

LOCK TABLES `user_milestone_completions` WRITE;
/*!40000 ALTER TABLE `user_milestone_completions` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_milestone_completions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_profile_settings`
--

DROP TABLE IF EXISTS `user_profile_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_profile_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `two_factor_auth` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `user_profile_settings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_profile_settings`
--

LOCK TABLES `user_profile_settings` WRITE;
/*!40000 ALTER TABLE `user_profile_settings` DISABLE KEYS */;
INSERT INTO `user_profile_settings` VALUES (1,1,1,'2025-09-27 07:19:11','2025-10-08 13:14:00'),(2,5,1,'2025-11-08 09:00:15','2025-11-08 09:00:37');
/*!40000 ALTER TABLE `user_profile_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_sessions`
--

DROP TABLE IF EXISTS `user_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `session_token` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `expires_at` timestamp NOT NULL DEFAULT ((now() + interval 30 day)),
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `user_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_sessions`
--

LOCK TABLES `user_sessions` WRITE;
/*!40000 ALTER TABLE `user_sessions` DISABLE KEYS */;
INSERT INTO `user_sessions` VALUES (1,1,'554859b244ca8c35dd1070f0c57d4b2ed86475da9faf0fbba8048f4ca3161414','2025-11-07 13:30:00','2025-10-08 13:30:00'),(3,5,'9d9a5927919d95ca9c236a91c6fa98d535c40a2c1054e31073fcdc492bba9c8d','2025-11-29 20:38:20','2025-10-31 03:38:20'),(4,4,'ca3c44c165ebb23685fe4f7a4c9954697341eba17d78973da5a8e7d74ebc1b8f','2025-10-31 08:18:04','2025-10-31 07:18:04'),(5,4,'0234613719b46c63bfd4f9d8b0b1c772ca9236ed006a03cf2a0db4f29e79f993','2025-10-31 08:18:55','2025-10-31 07:18:55'),(6,6,'d2b9a2443856ce41eb970a8c591bc7a65cc75a2394c459282590a4640dc62e53','2025-12-05 07:36:38','2025-11-05 14:36:38'),(7,5,'be547cde405a739aebf67ac222557a14cbd16374c6158b0bc9578b5c775b3ffd','2025-12-07 02:08:09','2025-11-07 09:08:09'),(9,7,'58f8058aa86373c98156c14c76723fa8637e15f167b682d71cb614f186832408','2025-12-07 02:08:59','2025-11-07 09:08:59'),(11,8,'d6c97984149cabba01bf9f8d9a286ba2be09d486d99839be5667a6ed7ed1422e','2025-12-08 01:25:44','2025-11-08 08:25:44'),(16,5,'1b326a026dcf88f9cc939f6b187a81c3aa5897b69140722f7ad97ab1cbf052c5','2025-12-08 03:11:41','2025-11-08 10:11:41');
/*!40000 ALTER TABLE `user_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `phone_number` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `birthdate` date DEFAULT NULL,
  `sex` enum('female','male','other','prefer-not-to-say') COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address_line1` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address_line2` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `barangay` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `city` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `zip_code` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Maria Santoss','maria@example.com','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','+639171234567','1995-03-15','female','123 Main St','','Poblacion','Makati','1210','2025-09-27 07:18:58','2025-10-08 13:25:33'),(2,'Test User','test@gmail.com','$2a$12$P/tPLvPuWUWPty5qKgiOru5DOZCg/FYStTaRWs81axFqHGJD3DLay',NULL,'2001-02-22','male','qwqqwq','wqwqw','wqwq','qwqw','q3131','2025-10-08 12:36:30','2025-10-30 13:51:58'),(3,'Dr. Maria Santos','maria.santos@momcare.com','$2y$10$Un76DEErxSIzIVcF1qhU5e3/CT8JlfVtnAo.HsqTK3L2SkarOZcrm',NULL,NULL,'female',NULL,NULL,NULL,NULL,NULL,'2025-10-30 13:43:30','2025-11-07 16:00:00'),(4,'Dr. Anna Reyes','anna.reyes@momcare.com','$2y$10$mUh8u7zESz5P8hgsOMKK1eYFpgkQdj/24VagU37m0GIRs.U8eVjIK',NULL,NULL,'female',NULL,NULL,NULL,NULL,NULL,'2025-10-30 13:43:30','2025-10-31 03:35:55'),(5,'Pau','pau@gmail.com','$2y$10$r6cBqD6Jzqz1GUammxV/SuDGgnQw980vfX9zEXUbloUQDyzsONesK','','2005-01-22','female','123','123','123','123','3019','2025-10-31 03:19:35','2025-11-08 09:00:15'),(6,'er','er@gmail.com','$2y$10$N6GVAxSiyFYMwpmUbLe4Ie8tr66LWyHFEwzXRpNgQg4fP/t99LdcO',NULL,'2001-01-12','male','aawqw','qwqw','qwq','wqwq','qwqw','2025-11-05 14:36:38','2025-11-05 14:36:38'),(7,'testuser','testuser@gmail.com','$2y$10$7ZL9RPvObmZS8beiF2h5t.tzCfAg8AQ4zLkbnVEXcxa1MOPHeYUZO',NULL,'2004-12-22','female','123','123','123','123','3019','2025-11-07 09:08:59','2025-11-07 09:08:59'),(8,'Test User','existing@example.com','$2y$10$r47JzeVVcnsPzbIuTt/CCOYPaJ2hLTmKcAHbsJyqHI4GnSxS94SeW',NULL,'1990-01-01','female','X',NULL,NULL,NULL,NULL,'2025-11-08 08:25:44','2025-11-08 08:25:44');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-11-08 18:13:19
