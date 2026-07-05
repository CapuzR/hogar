CREATE TABLE `evento_pagos` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`ynab_transaction_id` text,
	`notion_client_id` text,
	`amount` real,
	`currency` text,
	`amount_usdt` real,
	`rate_used` real,
	`rate_source` text,
	`money_source` text,
	`voided` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `eventos_mantenimiento`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_pagos_event` ON `evento_pagos` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_pagos_ynab` ON `evento_pagos` (`ynab_transaction_id`);--> statement-breakpoint
CREATE TABLE `evento_servicios` (
	`event_id` text NOT NULL,
	`service_type_key` text NOT NULL,
	`line_cost` real,
	PRIMARY KEY(`event_id`, `service_type_key`),
	FOREIGN KEY (`event_id`) REFERENCES `eventos_mantenimiento`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`service_type_key`) REFERENCES `tipos_servicio`(`key`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_evserv_type` ON `evento_servicios` (`service_type_key`);--> statement-breakpoint
CREATE TABLE `eventos_mantenimiento` (
	`id` text PRIMARY KEY NOT NULL,
	`vehicle_id` text,
	`service_date` text NOT NULL,
	`odometer` integer,
	`odometer_unit` text DEFAULT 'km' NOT NULL,
	`title` text,
	`description` text,
	`vendor_id` text,
	`vendor_name` text,
	`performed_by` text,
	`source` text,
	`client_id` text NOT NULL,
	`confidence` real,
	`needs_review` integer DEFAULT false NOT NULL,
	`raw_text` text,
	`logged_by` text,
	`approved_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehiculos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`vendor_id`) REFERENCES `talleres`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `eventos_mantenimiento_client_id_unique` ON `eventos_mantenimiento` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_eventos_vehicle` ON `eventos_mantenimiento` (`vehicle_id`);--> statement-breakpoint
CREATE INDEX `idx_eventos_date` ON `eventos_mantenimiento` (`service_date`);--> statement-breakpoint
CREATE INDEX `idx_eventos_needs_review` ON `eventos_mantenimiento` (`needs_review`);--> statement-breakpoint
CREATE TABLE `fuel_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text,
	`vehicle_id` text,
	`fuel_date` text NOT NULL,
	`amount_usdt` real,
	`currency` text DEFAULT 'USD' NOT NULL,
	`liters` real,
	`vendor` text,
	`owner` text,
	`ynab_transaction_id` text,
	`source` text,
	`notes` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehiculos`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fuel_logs_client_id_unique` ON `fuel_logs` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_fuel_date` ON `fuel_logs` (`fuel_date`);--> statement-breakpoint
CREATE INDEX `idx_fuel_vehicle` ON `fuel_logs` (`vehicle_id`);--> statement-breakpoint
CREATE TABLE `lecturas_odometro` (
	`id` text PRIMARY KEY NOT NULL,
	`vehicle_id` text NOT NULL,
	`reading` integer NOT NULL,
	`unit` text DEFAULT 'km' NOT NULL,
	`read_at` text NOT NULL,
	`source` text,
	`event_id` text,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehiculos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`event_id`) REFERENCES `eventos_mantenimiento`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `recordatorios` (
	`id` text PRIMARY KEY NOT NULL,
	`vehicle_id` text NOT NULL,
	`service_type_key` text NOT NULL,
	`interval_distance` integer,
	`interval_months` integer,
	`trigger_mode` text DEFAULT 'whichever_first' NOT NULL,
	`baseline_date` text,
	`baseline_odometer` integer,
	`lead_days` integer,
	`lead_distance` integer,
	`active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehiculos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`service_type_key`) REFERENCES `tipos_servicio`(`key`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `talleres` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`aliases` text,
	`vendor_type` text,
	`default_car_id` text,
	`phone` text,
	`location` text,
	`notes` text,
	FOREIGN KEY (`default_car_id`) REFERENCES `vehiculos`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tipos_servicio` (
	`key` text PRIMARY KEY NOT NULL,
	`label_es` text NOT NULL,
	`system_key` text NOT NULL,
	`nature` text,
	`synonyms` text,
	`default_interval_km` integer,
	`default_interval_months` integer,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_tipos_system` ON `tipos_servicio` (`system_key`);--> statement-breakpoint
CREATE TABLE `vehiculos` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`nickname` text,
	`make` text,
	`model` text,
	`year` integer,
	`trim` text,
	`engine` text,
	`transmission_type` text,
	`oil_spec` text,
	`plate` text,
	`color` text,
	`vin` text,
	`owner_name` text,
	`current_odometer` integer,
	`odometer_unit` text DEFAULT 'km' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vehiculos_slug_unique` ON `vehiculos` (`slug`);