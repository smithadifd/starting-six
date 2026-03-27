PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_team_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`playthrough_id` integer NOT NULL,
	`pokemon_id` integer NOT NULL,
	`slot` integer,
	`nickname` text,
	`ability_id` integer,
	`tera_type` text,
	`move_one_id` integer,
	`move_two_id` integer,
	`move_three_id` integer,
	`move_four_id` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`playthrough_id`) REFERENCES `playthroughs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`pokemon_id`) REFERENCES `pokemon`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ability_id`) REFERENCES `abilities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`move_one_id`) REFERENCES `moves`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`move_two_id`) REFERENCES `moves`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`move_three_id`) REFERENCES `moves`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`move_four_id`) REFERENCES `moves`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_team_members`("id", "playthrough_id", "pokemon_id", "slot", "nickname", "ability_id", "tera_type", "move_one_id", "move_two_id", "move_three_id", "move_four_id", "created_at", "updated_at") SELECT "id", "playthrough_id", "pokemon_id", "slot", "nickname", "ability_id", "tera_type", "move_one_id", "move_two_id", "move_three_id", "move_four_id", "created_at", "updated_at" FROM `team_members`;--> statement-breakpoint
DROP TABLE `team_members`;--> statement-breakpoint
ALTER TABLE `__new_team_members` RENAME TO `team_members`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `playthrough_slot_idx` ON `team_members` (`playthrough_id`,`slot`);