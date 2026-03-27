CREATE TABLE `inviteBindings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`inviterUserId` int NOT NULL,
	`inviteCode` varchar(32) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inviteBindings_id` PRIMARY KEY(`id`),
	CONSTRAINT `inviteBindings_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `referralRewards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inviterUserId` int NOT NULL,
	`inviteeUserId` int NOT NULL,
	`source` varchar(64) NOT NULL DEFAULT 'team_profit',
	`rateBps` int NOT NULL DEFAULT 500,
	`baseAmount` decimal(18,2) NOT NULL DEFAULT '0.00',
	`rewardAmount` decimal(18,2) NOT NULL DEFAULT '0.00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `referralRewards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `inviteCode` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_inviteCode_unique` UNIQUE(`inviteCode`);