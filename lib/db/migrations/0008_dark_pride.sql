DO $$ BEGIN
 CREATE TYPE "public"."direction" AS ENUM('up', 'down', 'parallel');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."output_type" AS ENUM('director', 'copywriter');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."project_stage" AS ENUM('mining', 'analysis', 'director', 'copywriter', 'planning', 'completed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Analysis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topicId" uuid NOT NULL,
	"coreArgument" text NOT NULL,
	"cognitiveContrast" json NOT NULL,
	"logicChain" json NOT NULL,
	"spreadElements" json NOT NULL,
	"audienceQuestions" json NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "NewTopic" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"outputId" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"direction" "direction" NOT NULL,
	"directionLabel" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"potentialAngle" text,
	"isUsed" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Output" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysisId" uuid NOT NULL,
	"type" "output_type" NOT NULL,
	"directorContent" json,
	"copywriterContent" json,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Project" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"originalText" text NOT NULL,
	"currentStage" "project_stage" DEFAULT 'mining' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Topic" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"projectId" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"coreIdea" text NOT NULL,
	"emotionLevel" integer DEFAULT 3 NOT NULL,
	"supportMaterials" json NOT NULL,
	"highlightedText" json NOT NULL,
	"reason" text,
	"isSelected" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_topicId_Topic_id_fk" FOREIGN KEY ("topicId") REFERENCES "public"."Topic"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "NewTopic" ADD CONSTRAINT "NewTopic_outputId_Output_id_fk" FOREIGN KEY ("outputId") REFERENCES "public"."Output"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Output" ADD CONSTRAINT "Output_analysisId_Analysis_id_fk" FOREIGN KEY ("analysisId") REFERENCES "public"."Analysis"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Topic" ADD CONSTRAINT "Topic_projectId_Project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "Chat" DROP COLUMN IF EXISTS "lastContext";