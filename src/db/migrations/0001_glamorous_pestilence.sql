CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "research_results" SET DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "session_id" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "user_id" SET DEFAULT '';