ALTER TABLE `sync_log` ADD `trigger` text DEFAULT 'manual' NOT NULL;
--> statement-breakpoint
CREATE TABLE `sync_schedule` (
	`id` integer PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`frequency` text DEFAULT 'weekly' NOT NULL,
	`last_attempt_at` text,
	`last_attempt_status` text,
	`last_success_at` text,
	`attempts_today` integer DEFAULT 0 NOT NULL,
	`attempts_today_date` text,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_lock` (
	`id` integer PRIMARY KEY NOT NULL,
	`claimed_by` text,
	`claimed_at` text
);
