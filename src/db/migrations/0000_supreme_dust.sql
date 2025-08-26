CREATE TABLE "api_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"endpoint" varchar(255) NOT NULL,
	"method" varchar(10) NOT NULL,
	"user_agent" varchar(500),
	"ip_address" varchar(45),
	"request_payload" jsonb,
	"response_payload" jsonb,
	"request_size" integer,
	"response_size" integer,
	"duration" integer,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"status_code" integer NOT NULL,
	"success" boolean NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" varchar(255) NOT NULL,
	"type" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb,
	"research_results" jsonb,
	"session_id" varchar(255),
	"user_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "messages_message_id_unique" UNIQUE("message_id")
);
