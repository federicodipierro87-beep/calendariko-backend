-- Add security fields for login attempts tracking
ALTER TABLE "users" ADD COLUMN "failed_login_attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "last_failed_attempt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "account_locked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "locked_at" TIMESTAMP(3);