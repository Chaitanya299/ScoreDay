-- Recurrence & Scoring Engine v2
-- - Task.frequency -> Task.recurrenceType with value backfill
-- - New scheduling fields: startDate / intervalWeeks / dayOfMonth
-- - TaskCompletion.date -> occurrenceDate (+ completedOn), preserving history

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
    "startDate" TEXT,
    "dueDate" TEXT,
    "intervalDays" INTEGER NOT NULL DEFAULT 2,
    "intervalWeeks" INTEGER NOT NULL DEFAULT 2,
    "dayOfMonth" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Backfill recurrenceType from the legacy `frequency` column:
--   INTERVAL (partial legacy type)      -> EVERY_N_DAYS, anchored at creation date
--   ONCE                                -> ONE_TIME
--   WEEKLY                              -> WEEKLY
--   DAILY with full week selected       -> DAILY
--   DAILY with a subset of days        -> WEEKDAYS
INSERT INTO "new_Task" (
    "id", "title", "description", "category", "points", "recurrenceType",
    "daysOfWeek", "startDate", "dueDate", "intervalDays", "intervalWeeks",
    "dayOfMonth", "active", "createdAt", "updatedAt"
)
SELECT
    "id", "title", "description", "category", "points",
    CASE "frequency"
        WHEN 'INTERVAL' THEN 'EVERY_N_DAYS'
        WHEN 'ONCE'     THEN 'ONE_TIME'
        WHEN 'WEEKLY'   THEN 'WEEKLY'
        ELSE CASE WHEN "daysOfWeek" = '0,1,2,3,4,5,6' THEN 'DAILY' ELSE 'WEEKDAYS' END
    END,
    "daysOfWeek",
    CASE WHEN "frequency" = 'INTERVAL' THEN substr("createdAt", 1, 10) END,
    "dueDate",
    "intervalDays",
    2,
    NULL,
    "active",
    "createdAt",
    "updatedAt"
FROM "Task";

DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE INDEX "Task_recurrenceType_idx" ON "Task"("recurrenceType");

CREATE TABLE "new_TaskCompletion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "occurrenceDate" TEXT NOT NULL,
    "completedOn" TEXT NOT NULL,
    "pointsEarned" INTEGER NOT NULL,
    CONSTRAINT "TaskCompletion_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Preserve every historical completion verbatim: occurrence identity and the
-- local completion date both start as the original calendar date.
INSERT INTO "new_TaskCompletion" ("id", "taskId", "completedAt", "occurrenceDate", "completedOn", "pointsEarned")
SELECT "id", "taskId", "completedAt", "date", "date", "pointsEarned" FROM "TaskCompletion";

DROP TABLE "TaskCompletion";
ALTER TABLE "new_TaskCompletion" RENAME TO "TaskCompletion";
CREATE INDEX "TaskCompletion_completedOn_idx" ON "TaskCompletion"("completedOn");
CREATE UNIQUE INDEX "TaskCompletion_taskId_occurrenceDate_key" ON "TaskCompletion"("taskId", "occurrenceDate");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
