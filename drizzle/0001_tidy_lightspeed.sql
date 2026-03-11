CREATE TABLE `data_sync_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source` varchar(100) NOT NULL,
	`action` varchar(100) NOT NULL,
	`status` enum('success','error','partial') NOT NULL,
	`recordsAffected` int DEFAULT 0,
	`message` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` varchar(64),
	CONSTRAINT `data_sync_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `politician_affiliation_overrides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sequencial` varchar(20) NOT NULL,
	`candidateName` varchar(255),
	`uf` varchar(2),
	`status` enum('psb_current','left_psb','joined_psb') NOT NULL,
	`currentParty` varchar(20),
	`previousParty` varchar(20),
	`notes` text,
	`verifiedAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` varchar(64),
	CONSTRAINT `politician_affiliation_overrides_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `psb_municipal_directories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`uf` varchar(2) NOT NULL,
	`municipalityCode` varchar(10) NOT NULL,
	`municipalityName` varchar(255),
	`presidentName` varchar(255),
	`presidentSequencial` varchar(20),
	`address` text,
	`phone` varchar(100),
	`email` varchar(255),
	`source` varchar(50) DEFAULT 'manual',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` varchar(64),
	CONSTRAINT `psb_municipal_directories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `psb_state_directories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`uf` varchar(2) NOT NULL,
	`presidentName` varchar(255),
	`presidentSequencial` varchar(20),
	`address` text,
	`phone` varchar(100),
	`email` varchar(255),
	`facebook` varchar(255),
	`instagram` varchar(255),
	`website` varchar(255),
	`source` varchar(50) DEFAULT 'psb40.org.br',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` varchar(64),
	CONSTRAINT `psb_state_directories_id` PRIMARY KEY(`id`),
	CONSTRAINT `psb_state_directories_uf_unique` UNIQUE(`uf`)
);
