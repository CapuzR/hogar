CREATE TABLE `agenda` (
	`id` text PRIMARY KEY NOT NULL,
	`vehicle_id` text,
	`service_type_key` text,
	`title` text NOT NULL,
	`notes` text,
	`scheduled_date` text NOT NULL,
	`scheduled_time` text,
	`estimated_cost` text,
	`service_center` text,
	`status` text DEFAULT 'suggested' NOT NULL,
	`source` text DEFAULT 'auto' NOT NULL,
	`reason` text,
	`dedupe_key` text,
	`google_event_id` text,
	`google_html_link` text,
	`created_at` text NOT NULL,
	`approved_at` text,
	`completed_at` text,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehiculos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`service_type_key`) REFERENCES `tipos_servicio`(`key`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agenda_dedupe_key_unique` ON `agenda` (`dedupe_key`);--> statement-breakpoint
CREATE INDEX `idx_agenda_vehicle` ON `agenda` (`vehicle_id`);--> statement-breakpoint
CREATE INDEX `idx_agenda_status` ON `agenda` (`status`);--> statement-breakpoint
CREATE INDEX `idx_agenda_date` ON `agenda` (`scheduled_date`);--> statement-breakpoint
CREATE TABLE `app_config` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text,
	`updated_at` text NOT NULL
);
