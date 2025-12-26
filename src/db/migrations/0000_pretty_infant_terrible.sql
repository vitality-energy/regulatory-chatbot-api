CREATE TABLE `api_calls` (
	`id` varchar(36) NOT NULL DEFAULT (UUID()),
	`endpoint` varchar(255) NOT NULL,
	`method` varchar(10) NOT NULL,
	`user_agent` varchar(500),
	`ip_address` varchar(45),
	`request_payload` json,
	`response_payload` json,
	`request_size` int,
	`response_size` int,
	`duration` int,
	`timestamp` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`status_code` int NOT NULL,
	`success` boolean NOT NULL,
	`error_message` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `api_calls_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` varchar(36) NOT NULL DEFAULT (UUID()),
	`message_id` varchar(255) NOT NULL,
	`type` varchar(20) NOT NULL,
	`content` text NOT NULL,
	`metadata` json DEFAULT ('{}'),
	`research_results` json DEFAULT ('{}'),
	`session_id` varchar(255) DEFAULT '',
	`user_id` varchar(255) DEFAULT '',
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `messages_id` PRIMARY KEY(`id`),
	CONSTRAINT `messages_message_id_unique` UNIQUE(`message_id`)
);
