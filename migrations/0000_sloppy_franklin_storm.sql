CREATE TABLE "applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"park_id" integer NOT NULL,
	"permit_type_id" integer,
	"location_id" integer,
	"event_date" timestamp,
	"applicant_type" text,
	"organization_name" text,
	"first_name" text,
	"last_name" text,
	"email" text,
	"phone" text,
	"address" text,
	"city" text,
	"state" text,
	"zip_code" text,
	"event_title" text,
	"event_description" text,
	"attendees" integer,
	"setup_time" text,
	"start_time" text,
	"end_time" text,
	"additional_requirements" json,
	"special_requests" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"total_fee" numeric(10, 2),
	"application_fee" numeric(10, 2),
	"permit_fee" numeric(10, 2),
	"application_fee_stripe_product_id" text,
	"permit_fee_stripe_product_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"agreed_to_terms" boolean DEFAULT false,
	"is_paid" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_number" text NOT NULL,
	"permit_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"due_date" date NOT NULL,
	"issue_date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "parks" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"location" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'active'
);
--> statement-breakpoint
CREATE TABLE "permits" (
	"id" serial PRIMARY KEY NOT NULL,
	"permit_number" text NOT NULL,
	"permit_type" text NOT NULL,
	"park_id" integer NOT NULL,
	"location" text NOT NULL,
	"permittee_name" text NOT NULL,
	"permittee_email" text NOT NULL,
	"permittee_phone" text,
	"activity" text NOT NULL,
	"description" text,
	"participant_count" integer,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"special_conditions" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"issue_date" date,
	"is_template" boolean DEFAULT false,
	"template_data" json,
	"application_fee" numeric(10, 2),
	"permit_fee" numeric(10, 2),
	"application_fee_stripe_product_id" text,
	"permit_fee_stripe_product_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" integer,
	CONSTRAINT "permits_permit_number_unique" UNIQUE("permit_number")
);
--> statement-breakpoint
CREATE TABLE "user_park_assignments" (
	"user_id" integer NOT NULL,
	"park_id" integer NOT NULL,
	CONSTRAINT "user_park_assignments_user_id_park_id_pk" PRIMARY KEY("user_id","park_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"role" text DEFAULT 'staff' NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_park_id_parks_id_fk" FOREIGN KEY ("park_id") REFERENCES "public"."parks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_park_assignments" ADD CONSTRAINT "user_park_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_park_assignments" ADD CONSTRAINT "user_park_assignments_park_id_parks_id_fk" FOREIGN KEY ("park_id") REFERENCES "public"."parks"("id") ON DELETE cascade ON UPDATE no action;