mysqldump: [Warning] Using a password on the command line interface can be insecure.
Warning: A partial dump from a server that has GTIDs will by default include the GTIDs of all transactions, even those that changed suppressed parts of the database. If you don't want to restore GTIDs, pass --set-gtid-purged=OFF. To make a complete dump, pass --all-databases --triggers --routines --events. 
Warning: A dump from a server that has GTIDs enabled will by default include the GTIDs of all transactions, even those that were executed during its extraction and might not be represented in the dumped data. This might result in an inconsistent data dump. 
In order to ensure a consistent backup of the database, pass --single-transaction or --lock-all-tables or --source-data. 
-- MySQL dump 10.13  Distrib 26.7.0, for macos26.6 (arm64)
--
-- Host: localhost    Database: fashion
-- ------------------------------------------------------
-- Server version	26.7.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ 'cacc4d32-ea5c-11f0-9fbc-b65790cc4f25:1-1240';

--
-- Table structure for table `api_responses`
--

DROP TABLE IF EXISTS `api_responses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `api_responses` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `active` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `type` varchar(255) NOT NULL,
  `transaction_id` varchar(500) DEFAULT NULL,
  `request_url` text,
  `request_payload` json DEFAULT NULL,
  `response_payload` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_4fd327d211da74ee89943c1aa7` (`type`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `api_responses`
--

LOCK TABLES `api_responses` WRITE;
/*!40000 ALTER TABLE `api_responses` DISABLE KEYS */;
INSERT INTO `api_responses` VALUES (1,1,'2026-08-25 10:29:37.646228','2026-08-25 10:29:37.000000',NULL,'PAN','KYC_PAN_1787633977641_56EC0B60','undefined/gratification/kyc','{\"headers\": {\"x-hmac\": \"90656fc3261e3fe37052f88b2cbcd8a5c3b63b2d6367ba88be18f9f01889b4c7\", \"content-type\": \"application/json\"}, \"payload\": {\"type\": \"kyc_pan\", \"id_number\": \"ABCDE1234F\", \"transaction_id\": \"KYC_PAN_1787633977641_56EC0B60\"}}','{\"status\": false, \"message\": \"Unknown error\"}');
/*!40000 ALTER TABLE `api_responses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `active` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `slug` varchar(170) NOT NULL,
  `parent_id` bigint DEFAULT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_CATEGORY_SLUG` (`slug`),
  KEY `IDX_88cea2dc9c31951d06437879b4` (`parent_id`),
  CONSTRAINT `FK_88cea2dc9c31951d06437879b40` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,1,'2026-08-25 02:07:32.659672','2026-08-25 02:10:54.011308',NULL,'Shoes','shoes',NULL,NULL,1,0),(2,1,'2026-08-25 02:07:45.214721','2026-08-25 02:07:45.214721',NULL,'Sneakers','sneakers',1,NULL,1,0),(3,1,'2026-08-25 09:27:45.933538','2026-08-25 09:27:45.933538',NULL,'Accessories','accessories',NULL,NULL,1,0);
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kyc_verification_logs`
--

DROP TABLE IF EXISTS `kyc_verification_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kyc_verification_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `active` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `type` enum('AADHAAR','PAN','GST','NAME_MATCH','BANK','UPI','BENE_PAN','BENE_AADHAAR') NOT NULL,
  `status` enum('OTP_SENT','VERIFIED','FAILED','EXPIRED','PROVIDER_ERROR','SUBMITTED') NOT NULL,
  `reference_id` varchar(255) DEFAULT NULL,
  `document_number` varchar(255) DEFAULT NULL,
  `provider` varchar(255) DEFAULT NULL,
  `request_payload` json DEFAULT NULL,
  `response_payload` json DEFAULT NULL,
  `failure_reason` varchar(255) DEFAULT NULL,
  `journey_id` varchar(255) DEFAULT NULL,
  `user_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_1748bd81e9814dbcbb34dd6cca` (`status`),
  KEY `IDX_ba461ccc92024b0dbfb3fa63c8` (`reference_id`),
  KEY `IDX_979ceb2ee046cf698a935f2b99` (`user_id`,`type`),
  CONSTRAINT `FK_616c8bdb62bc2621c5beecbbc3b` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kyc_verification_logs`
--

LOCK TABLES `kyc_verification_logs` WRITE;
/*!40000 ALTER TABLE `kyc_verification_logs` DISABLE KEYS */;
INSERT INTO `kyc_verification_logs` VALUES (1,1,'2026-08-25 10:29:37.715332','2026-08-25 10:29:37.715332',NULL,'PAN','FAILED','KYC_PAN_1787633977641_56EC0B60','K8sCW7AJwNGknJFyQn23RQ==','REWARDS_API','{\"type\": \"kyc_pan\", \"id_number\": \"ABCDE1234F\", \"transaction_id\": \"KYC_PAN_1787633977641_56EC0B60\"}','{\"status\": false, \"message\": \"Unknown error\"}','Unknown error',NULL,6),(7,1,'2026-08-25 11:42:57.438944','2026-08-25 11:42:57.438944',NULL,'PAN','VERIFIED','KYC_PAN_1787638377432_AE3B7849','K8sCW7AJwNGknJFyQn23RQ==','REWARDS_API','{\"type\": \"kyc_pan\", \"id_number\": \"ABCDE1234F\", \"transaction_id\": \"KYC_PAN_1787638377432_AE3B7849\"}','{\"data\": {\"full_name\": \"Dev Mock User\", \"aadhaar_linked\": \"successful\"}, \"status\": true, \"message\": \"PAN verification successful (dev mock)\"}',NULL,NULL,6),(8,1,'2026-08-25 11:42:57.473778','2026-08-25 11:42:57.473778',NULL,'NAME_MATCH','VERIFIED','KYC_NAME_MATCH_1787638377472_7A597911',NULL,'REWARDS_API','{\"type\": \"name_match\", \"name_1\": \"Dev Mock User\", \"name_2\": \"Sprint Footwear Co\", \"transaction_id\": \"KYC_NAME_MATCH_1787638377472_7A597911\"}','{\"data\": {\"match_score\": 100}, \"status\": true, \"message\": \"Name matching successful (dev mock)\"}',NULL,NULL,6),(14,1,'2026-08-25 12:11:53.659154','2026-08-25 12:11:53.659154',NULL,'GST','VERIFIED','KYC_GST_1787640113639_B3F117E5','hY/jGMBt4wyt8rDX+LYHJKcrePpQ0jKJhJp08qS27JQ=','REWARDS_API','{\"type\": \"kyc_gst\", \"id_number\": \"27ABCDE1234F1Z5\", \"transaction_id\": \"KYC_GST_1787640113639_B3F117E5\"}','{\"data\": {\"address\": \"Dev Mock Address\", \"legal_name\": \"Dev Mock Business\", \"trade_name\": \"Dev Mock Business\", \"gstin_status\": \"Active\", \"business_name\": \"Dev Mock Business\", \"date_of_registration\": \"2026-08-25\"}, \"status\": true, \"message\": \"GST verification successful (dev mock)\"}',NULL,NULL,6),(15,1,'2026-08-25 12:12:02.239857','2026-08-25 12:12:06.000000',NULL,'AADHAAR','EXPIRED','KYC_AADHAAR_1787640122238_68D2BE27','N081cKKMY8CYuy+4EFC8dg==','REWARDS_API','{\"type\": \"kyc_adhaar_otp_send\", \"id_number\": \"XXXXXXXX0123\", \"transaction_id\": \"KYC_AADHAAR_1787640122238_68D2BE27\"}','{\"data\": {\"client_id\": \"DEV-MOCK-KYC_AADHAAR_1787640122238_68D2BE27\", \"reference_id\": \"DEV-MOCK-KYC_AADHAAR_1787640122238_68D2BE27\"}, \"status\": true, \"message\": \"Aadhaar OTP generated successfully (dev mock)\"}','OTP expired due to new OTP request','a5a5b3e0-713d-45e9-9935-3de1c61e0640',6),(16,1,'2026-08-25 12:12:06.864374','2026-08-25 12:12:06.864374',NULL,'AADHAAR','VERIFIED','KYC_AADHAAR_1787640122238_68D2BE27','N081cKKMY8CYuy+4EFC8dg==','REWARDS_API','{\"otp\": \"******\", \"type\": \"kyc_adhaar_otp_verify\", \"id_number\": \"KYC_AADHAAR_1787640122238_68D2BE27\", \"transaction_id\": \"KYC_AADHAAR_1787640122238_68D2BE27\"}','{\"data\": {\"dob\": \"1990-01-01\", \"gender\": \"M\", \"address\": \"Dev Mock Address\", \"full_name\": \"Dev Mock User\", \"masked_aadhaar\": \"XXXXXXXX0000\"}, \"status\": true, \"message\": \"Aadhaar verified successfully (dev mock)\"}',NULL,'3f085c2e-d4c5-490d-a53a-8a7df5b2ba41',6),(17,1,'2026-08-30 01:20:11.544245','2026-08-30 01:20:11.544245',NULL,'PAN','VERIFIED','KYC_PAN_1788033011532_9DFB2C8D','eYlnVRkKXxzQlFFamhRYgw==','REWARDS_API','{\"type\": \"kyc_pan\", \"id_number\": \"ABCDE1234A\", \"transaction_id\": \"KYC_PAN_1788033011532_9DFB2C8D\"}','{\"data\": {\"full_name\": \"Dev Mock User\", \"aadhaar_linked\": \"successful\"}, \"status\": true, \"message\": \"PAN verification successful (dev mock)\"}',NULL,NULL,7),(18,1,'2026-08-30 01:20:11.606090','2026-08-30 01:20:11.606090',NULL,'NAME_MATCH','VERIFIED','KYC_NAME_MATCH_1788033011602_250AF2AB',NULL,'REWARDS_API','{\"type\": \"name_match\", \"name_1\": \"Dev Mock User\", \"name_2\": \"seller\", \"transaction_id\": \"KYC_NAME_MATCH_1788033011602_250AF2AB\"}','{\"data\": {\"match_score\": 100}, \"status\": true, \"message\": \"Name matching successful (dev mock)\"}',NULL,NULL,7),(19,1,'2026-08-30 01:21:33.159976','2026-08-30 01:21:33.159976',NULL,'GST','VERIFIED','KYC_GST_1788033093146_372149DB','sXZHoCS1okGfGLdzgCQr6dxWUh9ym944aFZ0pUvHe/c=','REWARDS_API','{\"type\": \"kyc_gst\", \"id_number\": \"27ABCDE1234F1Z1\", \"transaction_id\": \"KYC_GST_1788033093146_372149DB\"}','{\"data\": {\"address\": \"Dev Mock Address\", \"legal_name\": \"Dev Mock Business\", \"trade_name\": \"Dev Mock Business\", \"gstin_status\": \"Active\", \"business_name\": \"Dev Mock Business\", \"date_of_registration\": \"2026-08-29\"}, \"status\": true, \"message\": \"GST verification successful (dev mock)\"}',NULL,NULL,7),(20,1,'2026-08-30 01:23:36.328718','2026-08-30 01:23:53.000000',NULL,'AADHAAR','EXPIRED','KYC_AADHAAR_1788033216315_AC917741','1PSpZOMQK7uGVaqVKLch+g==','REWARDS_API','{\"type\": \"kyc_adhaar_otp_send\", \"id_number\": \"XXXXXXXX0121\", \"transaction_id\": \"KYC_AADHAAR_1788033216315_AC917741\"}','{\"data\": {\"client_id\": \"DEV-MOCK-KYC_AADHAAR_1788033216315_AC917741\", \"reference_id\": \"DEV-MOCK-KYC_AADHAAR_1788033216315_AC917741\"}, \"status\": true, \"message\": \"Aadhaar OTP generated successfully (dev mock)\"}','OTP expired due to new OTP request','853db4b8-965f-4be8-a163-5692250d1cf0',7),(21,1,'2026-08-30 01:23:53.327704','2026-08-30 01:23:53.327704',NULL,'AADHAAR','VERIFIED','KYC_AADHAAR_1788033216315_AC917741','1PSpZOMQK7uGVaqVKLch+g==','REWARDS_API','{\"otp\": \"******\", \"type\": \"kyc_adhaar_otp_verify\", \"id_number\": \"KYC_AADHAAR_1788033216315_AC917741\", \"transaction_id\": \"KYC_AADHAAR_1788033216315_AC917741\"}','{\"data\": {\"dob\": \"1990-01-01\", \"gender\": \"M\", \"address\": \"Dev Mock Address\", \"full_name\": \"Dev Mock User\", \"masked_aadhaar\": \"XXXXXXXX0000\"}, \"status\": true, \"message\": \"Aadhaar verified successfully (dev mock)\"}',NULL,'ea632f72-80f3-4d17-b19b-7f9662663add',7);
/*!40000 ALTER TABLE `kyc_verification_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kyc_verifications`
--

DROP TABLE IF EXISTS `kyc_verifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kyc_verifications` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `active` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `type` enum('AADHAAR','PAN','GST','NAME_MATCH','BANK','UPI','BENE_PAN','BENE_AADHAAR') NOT NULL,
  `status` enum('PENDING','VERIFIED','FAILED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `reference_id` varchar(255) DEFAULT NULL,
  `document_number` varchar(255) DEFAULT NULL,
  `masked_document_number` varchar(255) DEFAULT NULL,
  `verified_name` varchar(255) DEFAULT NULL,
  `provider` varchar(255) DEFAULT NULL,
  `provider_request` json DEFAULT NULL,
  `provider_response` json DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `failure_reason` varchar(255) DEFAULT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_0c32c0178254c7c4653c23908f` (`reference_id`),
  KEY `IDX_63139d0435bb7fb1e451aed090` (`type`,`status`),
  KEY `IDX_1e23c7821d740b4881f773c39a` (`user_id`),
  CONSTRAINT `FK_1e23c7821d740b4881f773c39aa` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kyc_verifications`
--

LOCK TABLES `kyc_verifications` WRITE;
/*!40000 ALTER TABLE `kyc_verifications` DISABLE KEYS */;
INSERT INTO `kyc_verifications` VALUES (1,1,'2026-08-25 02:13:03.659951','2026-08-25 02:13:03.659951',NULL,'PAN','VERIFIED',NULL,NULL,NULL,NULL,'REWARDS_API',NULL,NULL,NULL,NULL,2),(2,1,'2026-08-25 02:13:03.659951','2026-08-25 02:13:03.659951',NULL,'GST','VERIFIED',NULL,NULL,NULL,NULL,'REWARDS_API',NULL,NULL,NULL,NULL,2),(3,1,'2026-08-25 02:13:03.659951','2026-08-25 02:13:03.659951',NULL,'AADHAAR','VERIFIED',NULL,NULL,NULL,NULL,'REWARDS_API',NULL,NULL,NULL,NULL,2),(7,1,'2026-08-25 11:42:57.484362','2026-08-25 11:42:57.484362',NULL,'PAN','VERIFIED','KYC_PAN_1787638377432_AE3B7849','K8sCW7AJwNGknJFyQn23RQ==','XXXXXX234F','2bX7+nSBSbBpVvpqfzjDx45spMUqQBqvk3/qyo6o/hg=','REWARDS_API','{\"type\": \"kyc_pan\", \"id_number\": \"ABCDE1234F\", \"transaction_id\": \"KYC_PAN_1787638377432_AE3B7849\"}','{\"data\": {\"full_name\": \"VmxBPoTdPylzv10g59YetQ==\", \"aadhaar_linked\": \"+ezL/yO0RsOK8XA2pf8a+Q==\"}, \"status\": \"AwDyRbMhF7bD+rqjMjp/Vg==\", \"message\": \"7mB4+CTngbqR6GLxvUh8jBig1XUXruEUW9nlUoK1YdF50hEaVjST+Tm8FXMLvE4r\"}','{\"panImage\": \"/4dhUAm98yRQewbCuMzZ1WhBPOXyMWsUUm0J9ywG6wqlV2khcVS7JXsRNfl5lSwl\", \"matchScore\": 100, \"aadhaarLinked\": \"successful\"}',NULL,6),(11,1,'2026-08-25 12:11:53.722727','2026-08-25 12:11:53.722727',NULL,'GST','VERIFIED','KYC_GST_1787640113639_B3F117E5','hY/jGMBt4wyt8rDX+LYHJKcrePpQ0jKJhJp08qS27JQ=','27XXXXXXXXXX1Z5','d/e1M2dSlQ1rBYem4JkYHFCMGtwLfD3jwXTphiwkx6o=','REWARDS_API','{\"type\": \"kyc_gst\", \"id_number\": \"27ABCDE1234F1Z5\", \"transaction_id\": \"KYC_GST_1787640113639_B3F117E5\"}','{\"data\": {\"address\": \"mesLaRyLCARrinAtItJdsQidFOvqzXQC0V2B2UOJOao=\", \"legal_name\": \"d/e1M2dSlQ1rBYem4JkYHFCMGtwLfD3jwXTphiwkx6o=\", \"trade_name\": \"d/e1M2dSlQ1rBYem4JkYHFCMGtwLfD3jwXTphiwkx6o=\", \"gstin_status\": \"ZdN/ua5sI2RA3vRp+vwWUQ==\", \"business_name\": \"d/e1M2dSlQ1rBYem4JkYHFCMGtwLfD3jwXTphiwkx6o=\", \"date_of_registration\": \"eMVlaW/nLqTh+99RJg8jpQ==\"}, \"status\": \"AwDyRbMhF7bD+rqjMjp/Vg==\", \"message\": \"kGl2U88QuzkzuXr/NQNpUKkO5pfSN/PwvtgUK8jGOfj8et+T35Z/dMegVQMRDQEh\"}','{\"status\": \"Active\", \"address\": \"Dev Mock Address\", \"legalName\": \"Dev Mock Business\", \"tradeName\": \"Dev Mock Business\", \"dateOfRegistration\": \"2026-08-25\"}',NULL,6),(12,1,'2026-08-25 12:12:06.880321','2026-08-25 12:12:06.880321',NULL,'AADHAAR','VERIFIED','KYC_AADHAAR_1787640122238_68D2BE27','N081cKKMY8CYuy+4EFC8dg==','XXXXXXXX0000','VmxBPoTdPylzv10g59YetQ==','REWARDS_API','{\"otp\": \"******\", \"referenceId\": \"KYC_AADHAAR_1787640122238_68D2BE27\", \"referenceIdOtp\": \"KYC_AADHAAR_1787640122238_68D2BE27\"}','{\"data\": {\"dob\": \"WXvCp7+CcTVcERDy9zSxzg==\", \"gender\": \"rTawls8akdj2g6LqYDGbrQ==\", \"address\": \"mesLaRyLCARrinAtItJdsQidFOvqzXQC0V2B2UOJOao=\", \"full_name\": \"VmxBPoTdPylzv10g59YetQ==\", \"masked_aadhaar\": \"2vbDl9LsJ0/7JMomzvWPQQ==\"}, \"status\": \"AwDyRbMhF7bD+rqjMjp/Vg==\", \"message\": \"wm6yFqRVA40zxRYtkw4ye0q7iPcK1/MG4R88PpQ0R0CaI7ACr6IwrYXUlVcD24mW\"}','{\"dob\": \"WXvCp7+CcTVcERDy9zSxzg==\", \"gender\": \"rTawls8akdj2g6LqYDGbrQ==\", \"address\": \"mesLaRyLCARrinAtItJdsQidFOvqzXQC0V2B2UOJOao=\"}',NULL,6),(13,1,'2026-08-30 01:20:11.629405','2026-08-30 01:20:11.629405',NULL,'PAN','VERIFIED','KYC_PAN_1788033011532_9DFB2C8D','eYlnVRkKXxzQlFFamhRYgw==','XXXXXX234A','m/m8dm+OPA5yI709T7+h1Q==','REWARDS_API','{\"type\": \"kyc_pan\", \"id_number\": \"ABCDE1234A\", \"transaction_id\": \"KYC_PAN_1788033011532_9DFB2C8D\"}','{\"data\": {\"full_name\": \"VmxBPoTdPylzv10g59YetQ==\", \"aadhaar_linked\": \"+ezL/yO0RsOK8XA2pf8a+Q==\"}, \"status\": \"AwDyRbMhF7bD+rqjMjp/Vg==\", \"message\": \"7mB4+CTngbqR6GLxvUh8jBig1XUXruEUW9nlUoK1YdF50hEaVjST+Tm8FXMLvE4r\"}','{\"panImage\": \"/4dhUAm98yRQewbCuMzZ1WhBPOXyMWsUUm0J9ywG6wqlV2khcVS7JXsRNfl5lSwl\", \"matchScore\": 100, \"aadhaarLinked\": \"successful\"}',NULL,7),(14,1,'2026-08-30 01:21:33.194591','2026-08-30 01:21:33.194591',NULL,'GST','VERIFIED','KYC_GST_1788033093146_372149DB','sXZHoCS1okGfGLdzgCQr6dxWUh9ym944aFZ0pUvHe/c=','27XXXXXXXXXX1Z1','d/e1M2dSlQ1rBYem4JkYHFCMGtwLfD3jwXTphiwkx6o=','REWARDS_API','{\"type\": \"kyc_gst\", \"id_number\": \"27ABCDE1234F1Z1\", \"transaction_id\": \"KYC_GST_1788033093146_372149DB\"}','{\"data\": {\"address\": \"mesLaRyLCARrinAtItJdsQidFOvqzXQC0V2B2UOJOao=\", \"legal_name\": \"d/e1M2dSlQ1rBYem4JkYHFCMGtwLfD3jwXTphiwkx6o=\", \"trade_name\": \"d/e1M2dSlQ1rBYem4JkYHFCMGtwLfD3jwXTphiwkx6o=\", \"gstin_status\": \"ZdN/ua5sI2RA3vRp+vwWUQ==\", \"business_name\": \"d/e1M2dSlQ1rBYem4JkYHFCMGtwLfD3jwXTphiwkx6o=\", \"date_of_registration\": \"VkF3awC2NwbWz/vEJwC6DQ==\"}, \"status\": \"AwDyRbMhF7bD+rqjMjp/Vg==\", \"message\": \"kGl2U88QuzkzuXr/NQNpUKkO5pfSN/PwvtgUK8jGOfj8et+T35Z/dMegVQMRDQEh\"}','{\"status\": \"Active\", \"address\": \"Dev Mock Address\", \"legalName\": \"Dev Mock Business\", \"tradeName\": \"Dev Mock Business\", \"dateOfRegistration\": \"2026-08-29\"}',NULL,7),(15,1,'2026-08-30 01:23:53.368414','2026-08-30 01:23:53.368414',NULL,'AADHAAR','VERIFIED','KYC_AADHAAR_1788033216315_AC917741','1PSpZOMQK7uGVaqVKLch+g==','XXXXXXXX0000','VmxBPoTdPylzv10g59YetQ==','REWARDS_API','{\"otp\": \"******\", \"referenceId\": \"KYC_AADHAAR_1788033216315_AC917741\", \"referenceIdOtp\": \"KYC_AADHAAR_1788033216315_AC917741\"}','{\"data\": {\"dob\": \"WXvCp7+CcTVcERDy9zSxzg==\", \"gender\": \"rTawls8akdj2g6LqYDGbrQ==\", \"address\": \"mesLaRyLCARrinAtItJdsQidFOvqzXQC0V2B2UOJOao=\", \"full_name\": \"VmxBPoTdPylzv10g59YetQ==\", \"masked_aadhaar\": \"2vbDl9LsJ0/7JMomzvWPQQ==\"}, \"status\": \"AwDyRbMhF7bD+rqjMjp/Vg==\", \"message\": \"wm6yFqRVA40zxRYtkw4ye0q7iPcK1/MG4R88PpQ0R0CaI7ACr6IwrYXUlVcD24mW\"}','{\"dob\": \"WXvCp7+CcTVcERDy9zSxzg==\", \"gender\": \"rTawls8akdj2g6LqYDGbrQ==\", \"address\": \"mesLaRyLCARrinAtItJdsQidFOvqzXQC0V2B2UOJOao=\"}',NULL,7);
/*!40000 ALTER TABLE `kyc_verifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `login_histories`
--

DROP TABLE IF EXISTS `login_histories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `login_histories` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `latitude` varchar(45) DEFAULT NULL,
  `longitude` varchar(45) DEFAULT NULL,
  `ipAddress` varchar(45) DEFAULT NULL,
  `userAgent` varchar(100) DEFAULT NULL,
  `deviceType` varchar(100) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_LOGIN_HISTORY_CREATED_AT` (`created_at`),
  KEY `IDX_LOGIN_HISTORY_USER_ID` (`user_id`),
  CONSTRAINT `FK_135f437627847a40b2c4a39a4f5` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `login_histories`
--

LOCK TABLES `login_histories` WRITE;
/*!40000 ALTER TABLE `login_histories` DISABLE KEYS */;
INSERT INTO `login_histories` VALUES (1,6,NULL,NULL,'::1',NULL,NULL,'2026-08-25 10:24:23.681850'),(2,6,NULL,NULL,'::1',NULL,NULL,'2026-08-25 10:24:35.261676'),(3,6,NULL,NULL,'::1',NULL,NULL,'2026-08-25 10:24:38.268746'),(4,1,NULL,NULL,'::1',NULL,NULL,'2026-08-25 11:53:47.972851'),(5,1,NULL,NULL,'::1',NULL,NULL,'2026-08-25 11:53:55.682551'),(6,1,NULL,NULL,'::1',NULL,NULL,'2026-08-25 11:53:55.772425'),(7,4,NULL,NULL,'::1',NULL,NULL,'2026-08-25 11:54:07.078467'),(8,4,NULL,NULL,'::1',NULL,NULL,'2026-08-25 11:54:07.416099'),(9,4,NULL,NULL,'::1',NULL,NULL,'2026-08-25 11:54:07.559129'),(10,5,NULL,NULL,'::1',NULL,NULL,'2026-08-25 12:01:23.277605'),(11,1,NULL,NULL,'::1',NULL,NULL,'2026-08-25 12:01:23.370270'),(12,5,NULL,NULL,'::1',NULL,NULL,'2026-08-25 12:01:23.446656'),(13,1,NULL,NULL,'::1',NULL,NULL,'2026-08-25 12:02:33.898300'),(14,9,NULL,NULL,'::1',NULL,NULL,'2026-08-30 01:02:21.338836'),(15,6,NULL,NULL,'::1',NULL,NULL,'2026-08-30 01:03:01.993979'),(16,9,NULL,NULL,'::1',NULL,NULL,'2026-08-30 01:03:12.310322'),(17,1,NULL,NULL,'::1',NULL,NULL,'2026-08-30 01:04:02.517446'),(18,7,NULL,NULL,'::1',NULL,NULL,'2026-08-30 01:09:35.322869'),(19,7,NULL,NULL,'::1',NULL,NULL,'2026-08-30 01:09:56.048250'),(20,7,NULL,NULL,'::1',NULL,NULL,'2026-08-30 01:09:58.506037'),(21,7,NULL,NULL,'::1',NULL,NULL,'2026-08-30 01:09:59.727948'),(22,7,NULL,NULL,'::1',NULL,NULL,'2026-08-30 01:11:28.181276'),(23,9,NULL,NULL,'::1',NULL,NULL,'2026-08-30 01:12:22.448094'),(24,7,NULL,NULL,'::1',NULL,NULL,'2026-08-30 01:13:04.854053'),(25,7,NULL,NULL,'::1',NULL,NULL,'2026-08-30 01:13:06.131202'),(26,7,NULL,NULL,'::1',NULL,NULL,'2026-08-30 01:13:43.799101');
/*!40000 ALTER TABLE `login_histories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `timestamp` bigint NOT NULL,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migrations`
--

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (1,1787800000000,'AddOtpPurposeAndCustomerRole1787800000000'),(2,1787800200000,'CreateKycVerificationTables1787800200000'),(3,1787800300000,'CreateCategories1787800300000'),(4,1787800400000,'CreateProducts1787800400000'),(5,1787800500000,'AddCatalogSupport1787800500000'),(6,1787800600000,'CreateSellerKycOverrides1787800600000'),(7,1787800700000,'AddProductPricingFields1787800700000'),(8,1787800800000,'MultiRoleUsers1787800800000');
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `otp_attempt_logs`
--

DROP TABLE IF EXISTS `otp_attempt_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `otp_attempt_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `active` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `attemptType` enum('login','redemption','beneficiary','password_reset') NOT NULL DEFAULT 'login',
  `mobile` varchar(25) NOT NULL,
  `otp` varchar(255) NOT NULL,
  `isSuccess` tinyint NOT NULL DEFAULT '0',
  `errorMessage` varchar(255) DEFAULT NULL,
  `user_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_1b3370a1919b66438ea195818ba` (`user_id`),
  CONSTRAINT `FK_1b3370a1919b66438ea195818ba` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `otp_attempt_logs`
--

LOCK TABLES `otp_attempt_logs` WRITE;
/*!40000 ALTER TABLE `otp_attempt_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `otp_attempt_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_images`
--

DROP TABLE IF EXISTS `product_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_images` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `active` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `product_id` bigint NOT NULL,
  `variant_id` bigint DEFAULT NULL,
  `url` varchar(500) NOT NULL,
  `is_primary` tinyint NOT NULL DEFAULT '0',
  `sort_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `IDX_4f166bb8c2bfcef2498d97b406` (`product_id`),
  KEY `FK_7645bd68229997627f7b2191687` (`variant_id`),
  CONSTRAINT `FK_4f166bb8c2bfcef2498d97b4068` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_7645bd68229997627f7b2191687` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_images`
--

LOCK TABLES `product_images` WRITE;
/*!40000 ALTER TABLE `product_images` DISABLE KEYS */;
INSERT INTO `product_images` VALUES (1,1,'2026-08-25 02:13:13.878322','2026-08-25 02:13:13.878322',NULL,1,NULL,'https://cdn.example.com/air-runner-m.jpg',1,0);
/*!40000 ALTER TABLE `product_images` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_variants`
--

DROP TABLE IF EXISTS `product_variants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_variants` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `active` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `product_id` bigint NOT NULL,
  `size` varchar(50) NOT NULL,
  `sku` varchar(100) NOT NULL,
  `price_override` decimal(10,2) DEFAULT NULL,
  `stock_quantity` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_PRODUCT_VARIANT_SKU` (`sku`),
  KEY `IDX_6343513e20e2deab45edfce131` (`product_id`),
  KEY `IDX_PRODUCT_VARIANTS_SIZE_STOCK` (`size`,`stock_quantity`),
  CONSTRAINT `FK_6343513e20e2deab45edfce1316` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_variants`
--

LOCK TABLES `product_variants` WRITE;
/*!40000 ALTER TABLE `product_variants` DISABLE KEYS */;
INSERT INTO `product_variants` VALUES (5,1,'2026-08-25 02:15:04.085705','2026-08-25 02:15:04.085705',NULL,1,'S','AIR-RUN-S',NULL,2),(6,1,'2026-08-25 04:03:41.834577','2026-08-25 04:03:41.834577',NULL,2,'M','TRAIL-M',NULL,5),(7,1,'2026-08-25 09:09:25.852237','2026-08-25 09:09:25.852237',NULL,3,'M','CASUAL-M',NULL,3);
/*!40000 ALTER TABLE `product_variants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `active` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `seller_id` bigint NOT NULL,
  `category_id` bigint NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `base_price` decimal(10,2) NOT NULL,
  `wholesale_price` decimal(10,2) DEFAULT NULL,
  `mrp` decimal(10,2) DEFAULT NULL,
  `discount_percentage` decimal(5,2) DEFAULT NULL,
  `current_price` decimal(10,2) DEFAULT NULL,
  `zone` enum('RETAIL','WHOLESALE','BOTH') NOT NULL,
  `status` enum('DRAFT','PENDING_APPROVAL','APPROVED','REJECTED','INACTIVE') NOT NULL DEFAULT 'DRAFT',
  `rejection_reason` text,
  `rating_average` decimal(3,2) NOT NULL DEFAULT '0.00',
  `rating_count` int NOT NULL DEFAULT '0',
  `reviewed_by` bigint DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_1846199852a695713b1f8f5e9a` (`status`),
  KEY `IDX_9a5f6868c96e0069e699f33e12` (`category_id`),
  KEY `IDX_425ee27c69d6b8adc5d6475dcf` (`seller_id`),
  KEY `FK_2e9ff06d58c52cf500a7eefd023` (`reviewed_by`),
  KEY `IDX_PRODUCTS_STATUS_CATEGORY` (`status`,`category_id`),
  KEY `IDX_PRODUCTS_BASE_PRICE` (`base_price`),
  FULLTEXT KEY `FTX_PRODUCTS_NAME_DESCRIPTION` (`name`,`description`),
  CONSTRAINT `FK_2e9ff06d58c52cf500a7eefd023` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`),
  CONSTRAINT `FK_425ee27c69d6b8adc5d6475dcfe` FOREIGN KEY (`seller_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FK_9a5f6868c96e0069e699f33e124` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (1,1,'2026-08-25 02:13:13.853751','2026-08-25 09:09:06.138436',NULL,2,2,'Air Runner','Lightweight running shoe with breathable mesh upper',55.00,NULL,70.00,20.00,56.00,'RETAIL','APPROVED',NULL,0.00,0,NULL,NULL),(2,1,'2026-08-25 04:03:41.826225','2026-08-25 04:03:52.000000',NULL,3,2,'Trail Shoe',NULL,30.00,NULL,NULL,NULL,NULL,'RETAIL','APPROVED',NULL,0.00,0,1,'2026-08-25 04:03:53'),(3,1,'2026-08-25 09:09:25.845811','2026-08-25 09:09:25.845811',NULL,2,2,'Casual Sneaker',NULL,40.00,NULL,50.00,NULL,50.00,'RETAIL','PENDING_APPROVAL',NULL,0.00,0,NULL,NULL);
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `revoked_tokens`
--

DROP TABLE IF EXISTS `revoked_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `revoked_tokens` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `token_hash` varchar(64) NOT NULL,
  `user_id` bigint DEFAULT NULL,
  `token_type` enum('ACCESS','REFRESH') NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_REVOKED_TOKEN_EXPIRES_AT` (`expires_at`),
  KEY `IDX_REVOKED_TOKEN_TYPE` (`token_type`),
  KEY `IDX_REVOKED_TOKEN_USER_ID` (`user_id`),
  KEY `IDX_REVOKED_TOKEN_HASH` (`token_hash`),
  CONSTRAINT `FK_483872b2fdc8f1ec750c9c7567c` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `revoked_tokens`
--

LOCK TABLES `revoked_tokens` WRITE;
/*!40000 ALTER TABLE `revoked_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `revoked_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `active` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `name` enum('retailer','distributor','sub_distributor','sales_person','employee','super_admin','l1','l2','admin','seller_admin','customer') NOT NULL,
  `user_type` enum('USER','ADMIN') NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,1,'2026-08-25 02:07:23.802252','2026-08-25 02:07:23.802252',NULL,'super_admin','ADMIN'),(2,1,'2026-08-25 02:07:23.814841','2026-08-25 02:07:23.814841',NULL,'seller_admin','USER'),(3,1,'2026-08-25 04:03:09.586249','2026-08-25 04:03:09.586249',NULL,'customer','USER'),(4,1,'2026-08-25 04:04:27.663646','2026-08-25 04:04:27.663646',NULL,'admin','ADMIN');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `seller_kyc_overrides`
--

DROP TABLE IF EXISTS `seller_kyc_overrides`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `seller_kyc_overrides` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `seller_id` bigint NOT NULL,
  `status` enum('APPROVED','REJECTED') NOT NULL,
  `reason` text,
  `reviewed_by` bigint NOT NULL,
  `reviewed_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_SELLER_KYC_OVERRIDE_SELLER` (`seller_id`),
  KEY `FK_SELLER_KYC_OVERRIDE_REVIEWER` (`reviewed_by`),
  CONSTRAINT `FK_SELLER_KYC_OVERRIDE_REVIEWER` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `FK_SELLER_KYC_OVERRIDE_SELLER` FOREIGN KEY (`seller_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `seller_kyc_overrides`
--

LOCK TABLES `seller_kyc_overrides` WRITE;
/*!40000 ALTER TABLE `seller_kyc_overrides` DISABLE KEYS */;
INSERT INTO `seller_kyc_overrides` VALUES (1,1,'2026-08-25 04:03:41.723439','2026-08-25 12:08:36.485188',NULL,3,'REJECTED','Suspicious activity flagged by risk team',1,'2026-08-25 12:08:30'),(4,1,'2026-08-30 01:25:12.015458','2026-08-30 01:25:12.015458',NULL,7,'APPROVED',NULL,1,'2026-08-30 01:25:12');
/*!40000 ALTER TABLE `seller_kyc_overrides` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `store_information`
--

DROP TABLE IF EXISTS `store_information`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `store_information` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `seller_id` bigint NOT NULL,
  `store_name` varchar(150) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_STORE_INFORMATION_SELLER` (`seller_id`),
  CONSTRAINT `FK_STORE_INFORMATION_SELLER` FOREIGN KEY (`seller_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `store_information`
--

LOCK TABLES `store_information` WRITE;
/*!40000 ALTER TABLE `store_information` DISABLE KEYS */;
INSERT INTO `store_information` VALUES (1,1,'2026-08-25 09:27:28.211673','2026-08-25 09:27:28.211673',NULL,4,'Casey\'s Corner Store'),(2,1,'2026-08-25 10:25:57.425030','2026-08-25 10:25:57.425030',NULL,6,'My Fashion Store'),(3,1,'2026-08-30 01:14:36.463059','2026-08-30 01:14:36.463059',NULL,7,'My Fashion Store 1');
/*!40000 ALTER TABLE `store_information` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `system_config`
--

DROP TABLE IF EXISTS `system_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_config` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `config_key` varchar(100) NOT NULL,
  `config_value` varchar(255) NOT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_system_config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `system_config`
--

LOCK TABLES `system_config` WRITE;
/*!40000 ALTER TABLE `system_config` DISABLE KEYS */;
/*!40000 ALTER TABLE `system_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_mappings`
--

DROP TABLE IF EXISTS `user_mappings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_mappings` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `active` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `mapping_type` enum('RETAILER_TO_DISTRIBUTOR','RETAILER_TO_SUB_DISTRIBUTOR') NOT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `parent_user_id` bigint DEFAULT NULL,
  `child_user_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_mappings_child` (`child_user_id`),
  KEY `idx_user_mappings_parent` (`parent_user_id`),
  CONSTRAINT `FK_1720f3df40c1a7bd10d63444087` FOREIGN KEY (`parent_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FK_346342361e1f15c73cf5209676f` FOREIGN KEY (`child_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_mappings`
--

LOCK TABLES `user_mappings` WRITE;
/*!40000 ALTER TABLE `user_mappings` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_mappings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_roles`
--

DROP TABLE IF EXISTS `user_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_roles` (
  `user_id` bigint NOT NULL,
  `role_id` bigint NOT NULL,
  PRIMARY KEY (`user_id`,`role_id`),
  KEY `FK_USER_ROLES_ROLE` (`role_id`),
  CONSTRAINT `FK_USER_ROLES_ROLE` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_USER_ROLES_USER` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_roles`
--

LOCK TABLES `user_roles` WRITE;
/*!40000 ALTER TABLE `user_roles` DISABLE KEYS */;
INSERT INTO `user_roles` VALUES (1,1),(2,2),(3,2),(4,2),(6,2),(7,2),(4,3),(6,3),(9,3),(5,4);
/*!40000 ALTER TABLE `user_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `active` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `uuid` varchar(36) DEFAULT NULL,
  `application_id` varchar(50) DEFAULT NULL,
  `salutation` enum('MR','MRS','MISS','DR') DEFAULT NULL,
  `username` varchar(100) DEFAULT NULL,
  `mobile` varchar(15) DEFAULT NULL,
  `whatsapp_number` varchar(15) DEFAULT NULL,
  `whatsapp_otp` varchar(10) DEFAULT NULL,
  `whatsapp_otp_expiry` datetime DEFAULT NULL,
  `whatsapp_verified` tinyint NOT NULL DEFAULT '0',
  `email_otp` varchar(10) DEFAULT NULL,
  `email_otp_expiry` datetime DEFAULT NULL,
  `email_verified` tinyint NOT NULL DEFAULT '0',
  `email` varchar(255) DEFAULT NULL,
  `password` varchar(100) DEFAULT NULL,
  `firm_name` varchar(100) DEFAULT NULL,
  `private_name` varchar(100) DEFAULT NULL,
  `partner_type` enum('individual','entity') DEFAULT NULL,
  `code` varchar(20) DEFAULT NULL,
  `status` enum('active','inactive','blocked','in_approval','partial_approved','deleted') NOT NULL DEFAULT 'in_approval',
  `flag` tinyint NOT NULL DEFAULT '0',
  `isTestRecord` tinyint NOT NULL DEFAULT '0',
  `points` bigint unsigned NOT NULL DEFAULT '0',
  `image_url` varchar(255) DEFAULT NULL,
  `rating_average` decimal(3,2) NOT NULL DEFAULT '0.00',
  `rating_count` int NOT NULL DEFAULT '0',
  `otp` varchar(255) DEFAULT NULL,
  `otp_expiry` datetime DEFAULT NULL,
  `otp_attempt_count` bigint NOT NULL DEFAULT '0',
  `otp_purpose` enum('login','redemption','beneficiary','password_reset') DEFAULT NULL,
  `isDefaultOtp` tinyint NOT NULL DEFAULT '0',
  `defaultOtp` varchar(6) DEFAULT NULL,
  `otpTrigger` tinyint NOT NULL DEFAULT '1',
  `refresh_token_expiry` timestamp NULL DEFAULT NULL,
  `resetPasswordToken` varchar(255) DEFAULT NULL,
  `resetPasswordTokenExpiry` datetime DEFAULT NULL,
  `refreshToken` text,
  `refferal_code` varchar(20) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `anniversary_date` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_951b8f1dfc94ac1d0301a14b7e` (`uuid`),
  UNIQUE KEY `IDX_b81b1861e793ae1207cc2a074e` (`application_id`),
  UNIQUE KEY `IDX_97672ac88f789774dd47f7c8be` (`email`),
  UNIQUE KEY `UQ_WHATSAPP` (`whatsapp_number`),
  UNIQUE KEY `UQ_MOBILE` (`mobile`),
  KEY `IDX_3676155292d72c67cd4e090514` (`status`),
  KEY `IDX_d376a9f93bba651f32a2c03a7d` (`mobile`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,1,'2026-08-25 02:07:23.828242','2026-08-30 01:04:02.000000',NULL,NULL,NULL,NULL,'superadmin','9000000001',NULL,NULL,NULL,0,NULL,NULL,0,'superadmin@test.com','$2b$10$tengjDEmz9kVeAZTq3pIQuJt1tYcsXuPMdzqOTo42HF28UcWYXAJm',NULL,NULL,NULL,NULL,'active',0,1,0,NULL,0.00,0,NULL,NULL,0,NULL,0,NULL,1,'2026-09-05 19:34:02',NULL,NULL,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiaWQiOiIxIiwidXVpZCI6bnVsbCwibW9iaWxlIjoiOTAwMDAwMDAwMSIsImVtYWlsIjoic3VwZXJhZG1pbkB0ZXN0LmNvbSIsInJvbGUiOlsic3VwZXJfYWRtaW4iXSwidXNlcl90eXBlIjpbIkFETUlOIl0sImlhdCI6MTc4ODAzMjA0MiwiZXhwIjoxNzg4MTE4NDQyfQ.1rdYSAEP2870vMm1P0dLw9oHNkkFAW6f1I5-tzkJkAA',NULL,NULL,NULL),(2,1,'2026-08-25 02:07:23.831645','2026-08-25 02:22:27.780771',NULL,NULL,NULL,NULL,'seller','9000000002',NULL,NULL,NULL,0,NULL,NULL,0,'seller@test.com',NULL,'Sprint Footwear Co',NULL,NULL,NULL,'active',0,1,0,NULL,4.50,12,NULL,NULL,0,NULL,0,NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(3,1,'2026-08-25 02:14:50.775069','2026-08-25 02:14:50.775069',NULL,NULL,NULL,NULL,'seller2','9000000003',NULL,NULL,NULL,0,NULL,NULL,0,'seller2@test.com',NULL,NULL,NULL,NULL,NULL,'active',0,1,0,NULL,0.00,0,NULL,NULL,0,NULL,0,NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(4,1,'2026-08-25 04:03:09.662995','2026-08-25 12:08:20.000000',NULL,NULL,NULL,NULL,'customer1','9000000004',NULL,NULL,NULL,0,NULL,NULL,0,'customer1@test.com',NULL,'Dev Mock Business',NULL,NULL,NULL,'active',0,1,0,NULL,0.00,0,NULL,NULL,0,NULL,0,NULL,1,'2026-09-01 06:24:08',NULL,NULL,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0IiwiaWQiOiI0IiwidXVpZCI6bnVsbCwibW9iaWxlIjoiOTAwMDAwMDAwNCIsImVtYWlsIjoiY3VzdG9tZXIxQHRlc3QuY29tIiwicm9sZSI6WyJzZWxsZXJfYWRtaW4iLCJjdXN0b21lciJdLCJ1c2VyX3R5cGUiOlsiVVNFUiIsIlVTRVIiXSwiaWF0IjoxNzg3NjM5MDQ3LCJleHAiOjE3ODgyNDM4NDd9.bR2y-LBtsDFpiGDx2uuzMFLO89cDscZIJD0HkXfqDQA',NULL,NULL,NULL),(5,1,'2026-08-25 04:04:00.092068','2026-08-25 12:01:23.000000',NULL,NULL,NULL,NULL,'admin1','9000000005',NULL,NULL,NULL,0,NULL,NULL,0,'admin1@test.com','$2b$10$rqNjBmvboJESzxh2druCfeLO.KDX2FZD8eL0.i3yrcEbD2MOGw9Py',NULL,NULL,NULL,NULL,'active',0,1,0,NULL,0.00,0,NULL,NULL,0,NULL,0,NULL,1,'2026-09-01 06:31:23',NULL,NULL,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1IiwiaWQiOiI1IiwidXVpZCI6bnVsbCwibW9iaWxlIjoiOTAwMDAwMDAwNSIsImVtYWlsIjoiYWRtaW4xQHRlc3QuY29tIiwicm9sZSI6WyJhZG1pbiJdLCJ1c2VyX3R5cGUiOlsiQURNSU4iXSwiaWF0IjoxNzg3NjM5NDgzLCJleHAiOjE3ODgyNDQyODN9._DntoXDJ2k66ZREFVQLXpa8FAvK3aTWSS1QRgMKdsz4',NULL,NULL,NULL),(6,1,'2026-08-25 10:13:59.525108','2026-08-30 01:03:01.000000',NULL,'c013a234-9582-4b2f-bed9-fd88e14c97d6',NULL,NULL,'Sprint Footwear Co','9876543210',NULL,NULL,NULL,0,NULL,NULL,0,NULL,'$2b$10$u77SLY/.kcCUqKf2ZtpyGuSzs4oH7J05eAYL3SasCWR70kOV/bnDW','Dev Mock Business',NULL,NULL,NULL,'active',0,0,0,NULL,0.00,0,NULL,NULL,0,NULL,0,NULL,1,'2026-09-05 19:33:02',NULL,NULL,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2IiwiaWQiOiI2IiwidXVpZCI6ImMwMTNhMjM0LTk1ODItNGIyZi1iZWQ5LWZkODhlMTRjOTdkNiIsIm1vYmlsZSI6Ijk4NzY1NDMyMTAiLCJlbWFpbCI6bnVsbCwicm9sZSI6WyJzZWxsZXJfYWRtaW4iLCJjdXN0b21lciJdLCJ1c2VyX3R5cGUiOlsiVVNFUiIsIlVTRVIiXSwiaWF0IjoxNzg4MDMxOTgxLCJleHAiOjE3ODg2MzY3ODF9.z5OhbfrPQLBvmACoVCKCSYHjhceUECaSikAKPBT4WxU',NULL,NULL,NULL),(7,1,'2026-08-25 02:07:23.831645','2026-08-30 01:21:33.000000',NULL,NULL,NULL,NULL,'seller','9000000012',NULL,NULL,NULL,0,NULL,NULL,0,'seller1@test.com','$2b$10$Y3yxX/Dp3FwaNTpEdWBkKuGb8rhtVCAthcf1kemICGv3zKgSCfSIC','Dev Mock Business',NULL,NULL,NULL,'active',0,1,0,NULL,0.00,0,'$2b$10$yGY26ryL40A.iDTi2Hqf3uI9J.ASop35.HBkzaZhVGBrrkW5EJKcC','2026-08-30 01:15:28',0,'password_reset',0,NULL,1,'2026-09-05 19:43:44',NULL,NULL,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3IiwiaWQiOiI3IiwidXVpZCI6bnVsbCwibW9iaWxlIjoiOTAwMDAwMDAxMiIsImVtYWlsIjoic2VsbGVyMUB0ZXN0LmNvbSIsInJvbGUiOltdLCJ1c2VyX3R5cGUiOltdLCJpYXQiOjE3ODgwMzI2MjMsImV4cCI6MTc4ODYzNzQyM30.WjW1SF4GT6-7STbg9tuH8xJkNQ10mroyIXgKSixP7qw',NULL,NULL,NULL),(9,1,'2026-08-30 01:00:30.792250','2026-08-30 01:12:22.000000',NULL,'af4ede6e-8808-459b-9cb1-c52f6190f788',NULL,NULL,NULL,'8273737365',NULL,NULL,NULL,0,NULL,NULL,0,NULL,'$2b$10$Y3yxX/Dp3FwaNTpEdWBkKuGb8rhtVCAthcf1kemICGv3zKgSCfSIC',NULL,NULL,NULL,NULL,'active',0,0,0,NULL,0.00,0,NULL,NULL,0,NULL,0,NULL,1,'2026-09-05 19:42:22',NULL,NULL,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5IiwiaWQiOiI5IiwidXVpZCI6ImFmNGVkZTZlLTg4MDgtNDU5Yi05Y2IxLWM1MmY2MTkwZjc4OCIsIm1vYmlsZSI6IjgyNzM3MzczNjUiLCJlbWFpbCI6bnVsbCwicm9sZSI6WyJjdXN0b21lciJdLCJ1c2VyX3R5cGUiOlsiVVNFUiJdLCJpYXQiOjE3ODgwMzI1NDIsImV4cCI6MTc4ODYzNzM0Mn0.tA_GiX6Q1GSoUY4KCuUmpmhMPBIm5wNn4QqjfbGsxh4',NULL,NULL,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-31  2:11:40
