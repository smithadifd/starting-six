CREATE TABLE `abilities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pokeapi_id` integer NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`effect_short` text,
	`effect_full` text,
	`is_notable` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `abilities_pokeapi_id_unique` ON `abilities` (`pokeapi_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `abilities_slug_unique` ON `abilities` (`slug`);--> statement-breakpoint
CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`id_token` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `game_pokemon` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`version_group_id` integer NOT NULL,
	`species_id` integer NOT NULL,
	`dex_number` integer NOT NULL,
	FOREIGN KEY (`version_group_id`) REFERENCES `version_groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `version_species_idx` ON `game_pokemon` (`version_group_id`,`species_id`);--> statement-breakpoint
CREATE TABLE `moves` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pokeapi_id` integer NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`damage_class` text NOT NULL,
	`power` integer,
	`accuracy` integer,
	`pp` integer DEFAULT 0 NOT NULL,
	`effect_short` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `moves_pokeapi_id_unique` ON `moves` (`pokeapi_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `moves_slug_unique` ON `moves` (`slug`);--> statement-breakpoint
CREATE TABLE `playthroughs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`version_group_id` integer NOT NULL,
	`notes` text,
	`is_completed` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`version_group_id`) REFERENCES `version_groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pokemon` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pokeapi_id` integer NOT NULL,
	`species_id` integer NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`species_name` text NOT NULL,
	`form_name` text,
	`is_default` integer DEFAULT true NOT NULL,
	`type_one` text NOT NULL,
	`type_two` text,
	`stat_hp` integer DEFAULT 0 NOT NULL,
	`stat_atk` integer DEFAULT 0 NOT NULL,
	`stat_def` integer DEFAULT 0 NOT NULL,
	`stat_sp_atk` integer DEFAULT 0 NOT NULL,
	`stat_sp_def` integer DEFAULT 0 NOT NULL,
	`stat_spd` integer DEFAULT 0 NOT NULL,
	`bst` integer DEFAULT 0 NOT NULL,
	`sprite_default` text,
	`sprite_shiny` text,
	`generation` integer DEFAULT 1 NOT NULL,
	`is_legendary` integer DEFAULT false NOT NULL,
	`is_mythical` integer DEFAULT false NOT NULL,
	`is_baby` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pokemon_pokeapi_id_unique` ON `pokemon` (`pokeapi_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `pokemon_slug_unique` ON `pokemon` (`slug`);--> statement-breakpoint
CREATE TABLE `pokemon_abilities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pokemon_id` integer NOT NULL,
	`ability_id` integer NOT NULL,
	`slot` integer NOT NULL,
	`is_hidden` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`pokemon_id`) REFERENCES `pokemon`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ability_id`) REFERENCES `abilities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pokemon_ability_slot_idx` ON `pokemon_abilities` (`pokemon_id`,`slot`);--> statement-breakpoint
CREATE TABLE `pokemon_moves` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pokemon_id` integer NOT NULL,
	`move_id` integer NOT NULL,
	FOREIGN KEY (`pokemon_id`) REFERENCES `pokemon`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`move_id`) REFERENCES `moves`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pokemon_move_idx` ON `pokemon_moves` (`pokemon_id`,`move_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text NOT NULL,
	`status` text NOT NULL,
	`items_processed` integer DEFAULT 0,
	`items_attempted` integer DEFAULT 0,
	`items_failed` integer DEFAULT 0,
	`error_message` text,
	`started_at` text DEFAULT (datetime('now')) NOT NULL,
	`completed_at` text
);
--> statement-breakpoint
CREATE TABLE `team_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`playthrough_id` integer NOT NULL,
	`pokemon_id` integer NOT NULL,
	`slot` integer NOT NULL,
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
CREATE UNIQUE INDEX `playthrough_slot_idx` ON `team_members` (`playthrough_id`,`slot`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `version_groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pokeapi_id` integer NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`generation` integer NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `version_groups_pokeapi_id_unique` ON `version_groups` (`pokeapi_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `version_groups_slug_unique` ON `version_groups` (`slug`);