-- Simplify Frequency System to 4 types: DAILY, SPECIFIC_DAYS, WEEKLY, ONE_TIME
-- Migration: drops intervalDays, intervalWeeks, dayOfMonth, startDate columns.
-- Backfills old recurrence types to new set:
--   DAILY -> DAILY
--   WEEKDAYS -> SPECIFIC_DAYS
--   WEEKLY -> WEEKLY
--   EVERY_N_DAYS -> DAILY
--   EVERY_N_WEEKS -> WEEKLY
--   MONTHLY -> ONE_TIME (dueDate set to next month 1st; if already past today keep as is for manual edit)
--   ONE_TIME -> ONE_TIME
-- Historical TaskCompletion rows preserved verbatim.

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "points" INTEGER NOT NULL DEFAULT 10,
    "recurrenceType" TEXT NOT NULL DEFAULT 'DAILY',
    "daysOfWeek" TEXT NOT NULL DEFAULT '0,1,2,3,4,5,6',
    "dueDate" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Task" ("active", "category", "createdAt", "daysOfWeek", "description", "dueDate", "id", "points", "recurrenceType", "title", "updatedAt")
SELECT
    "active", "category", "createdAt", "daysOfWeek", "description",
    CASE WHEN "recurrenceType" = 'MONTHLY' AND "dueDate" IS NULL THEN date('now','start of month','+1 month') ELSE "dueDate" END,
    "id", "points",
    CASE "recurrenceType"
        WHEN 'WEEKDAYS' THEN 'SPECIFIC_DAYS'
        WHEN 'EVERY_N_DAYS' THEN 'DAILY'
        WHEN 'EVERY_N_WEEKS' THEN 'WEEKLY'
        WHEN 'MONTHLY' THEN 'ONE_TIME'
        ELSE "recurrenceType"
    END,
    "title", "updatedAt"
FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE INDEX "Task_recurrenceType_idx" ON "Task"("recurrenceType");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
