CREATE TABLE `hidden_dates` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`rev` integer DEFAULT 1 NOT NULL,
	`pattern` integer NOT NULL,
	`annual` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `note_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`rev` integer DEFAULT 1 NOT NULL,
	`name` text NOT NULL,
	`body` text NOT NULL,
	`position` integer NOT NULL,
	`archived_at` integer,
	`use_by_default` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`rev` integer DEFAULT 1 NOT NULL,
	`kind` text NOT NULL,
	`minutes_of_day` integer NOT NULL,
	`days_mask` integer DEFAULT 127 NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`skip_if_logged` integer DEFAULT true NOT NULL,
	`message` text,
	`goal_id` text,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_ops` (
	`local_seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`row_key` text NOT NULL,
	`rev` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`payload` text NOT NULL,
	`pushed_at` integer
);
--> statement-breakpoint
CREATE TABLE `sync_state` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `day_stats` (
	`local_date` integer PRIMARY KEY NOT NULL,
	`entry_count` integer NOT NULL,
	`avg_mood` real NOT NULL,
	`dominant_mood_id` text
);
--> statement-breakpoint
CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`rev` integer DEFAULT 1 NOT NULL,
	`mood_id` text NOT NULL,
	`happened_at` integer NOT NULL,
	`local_date` integer NOT NULL,
	`tz_offset_minutes` integer NOT NULL,
	`title` text,
	`note` text,
	FOREIGN KEY (`mood_id`) REFERENCES `moods`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_entries_date` ON `entries` (`local_date`);--> statement-breakpoint
CREATE INDEX `idx_entries_mood` ON `entries` (`mood_id`);--> statement-breakpoint
CREATE TABLE `entry_activities` (
	`entry_id` text NOT NULL,
	`activity_id` text NOT NULL,
	PRIMARY KEY(`entry_id`, `activity_id`),
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_ea_activity` ON `entry_activities` (`activity_id`);--> statement-breakpoint
CREATE TABLE `entry_scales` (
	`entry_id` text NOT NULL,
	`scale_id` text NOT NULL,
	`value` real NOT NULL,
	PRIMARY KEY(`entry_id`, `scale_id`),
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`scale_id`) REFERENCES `scales`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`rev` integer DEFAULT 1 NOT NULL,
	`entry_id` text NOT NULL,
	`kind` text NOT NULL,
	`rel_path` text NOT NULL,
	`mime` text NOT NULL,
	`byte_size` integer NOT NULL,
	`width` integer,
	`height` integer,
	`duration_ms` integer,
	`transcript` text,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_media_entry` ON `media` (`entry_id`,`position`);--> statement-breakpoint
CREATE TABLE `achievements` (
	`code` text PRIMARY KEY NOT NULL,
	`level` integer DEFAULT 0 NOT NULL,
	`progress` real DEFAULT 0 NOT NULL,
	`unlocked_at` integer,
	`seen_at` integer,
	`updated_at` integer NOT NULL,
	`rev` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `goal_checkins` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`rev` integer DEFAULT 1 NOT NULL,
	`goal_id` text NOT NULL,
	`local_date` integer NOT NULL,
	`amount` real DEFAULT 1 NOT NULL,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_checkin_unique` ON `goal_checkins` (`goal_id`,`local_date`);--> statement-breakpoint
CREATE TABLE `goal_pauses` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`rev` integer DEFAULT 1 NOT NULL,
	`goal_id` text NOT NULL,
	`from_date` integer NOT NULL,
	`to_date` integer NOT NULL,
	`reason` text,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`rev` integer DEFAULT 1 NOT NULL,
	`name` text NOT NULL,
	`activity_id` text,
	`icon_id` text NOT NULL,
	`target_type` text NOT NULL,
	`target_count` integer DEFAULT 1 NOT NULL,
	`interval_days` integer,
	`started_on` integer NOT NULL,
	`ended_on` integer,
	`archived_at` integer,
	`template_key` text,
	`anchor` text,
	`ladder_level` integer DEFAULT 1 NOT NULL,
	`evidence` text,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `important_days` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`rev` integer DEFAULT 1 NOT NULL,
	`name` text NOT NULL,
	`icon_id` text NOT NULL,
	`color` text,
	`date` integer NOT NULL,
	`kind` text NOT NULL,
	`repeat_yearly` integer DEFAULT false NOT NULL,
	`pinned` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `quit_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`rev` integer DEFAULT 1 NOT NULL,
	`tracker_id` text NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`note` text,
	FOREIGN KEY (`tracker_id`) REFERENCES `quit_trackers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_attempts_tracker` ON `quit_attempts` (`tracker_id`,`started_at`);--> statement-breakpoint
CREATE TABLE `quit_trackers` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`rev` integer DEFAULT 1 NOT NULL,
	`preset_key` text,
	`milestone_set` text,
	`name` text NOT NULL,
	`icon_id` text NOT NULL,
	`color` text,
	`unit_cost` real,
	`units_per_day` real,
	`hours_per_day` real
);
--> statement-breakpoint
CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`rev` integer DEFAULT 1 NOT NULL,
	`archived_at` integer,
	`group_id` text,
	`name` text NOT NULL,
	`icon_id` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `activity_groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_activities_group` ON `activities` (`group_id`,`position`);--> statement-breakpoint
CREATE TABLE `activity_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`rev` integer DEFAULT 1 NOT NULL,
	`archived_at` integer,
	`name` text NOT NULL,
	`position` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `mood_groups` (
	`id` integer PRIMARY KEY NOT NULL,
	`score` integer NOT NULL,
	`name_key` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `moods` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`rev` integer DEFAULT 1 NOT NULL,
	`archived_at` integer,
	`group_id` integer NOT NULL,
	`name` text NOT NULL,
	`icon_id` text NOT NULL,
	`position` integer NOT NULL,
	`is_predefined` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `mood_groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_moods_group` ON `moods` (`group_id`,`position`);--> statement-breakpoint
CREATE TABLE `scales` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`rev` integer DEFAULT 1 NOT NULL,
	`archived_at` integer,
	`name` text NOT NULL,
	`icon_id` text NOT NULL,
	`min_value` integer DEFAULT 1 NOT NULL,
	`max_value` integer DEFAULT 5 NOT NULL,
	`step` integer DEFAULT 1 NOT NULL,
	`min_label` text,
	`max_label` text,
	`unit` text,
	`higher_is_better` integer DEFAULT true NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`position` integer NOT NULL
);
