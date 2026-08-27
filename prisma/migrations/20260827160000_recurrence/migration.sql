-- Redesign Task Frequency Using an Apple Reminders-Inspired Interaction Model
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- Create new table with updated schema
CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "points" INTEGER NOT NULL DEFAULT 10,
    "recurrenceType" TEXT NOT NULL DEFAULT 'NONE',
    "interval" INTEGER NOT NULL DEFAULT 1,
    "unit" TEXT,
    "selectedWeekdays" TEXT,
    "dayOfMonth" INTEGER,
    "startDate" TEXT,
    "endDate" TEXT,
    "dueDate" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Copy data from old table (simple version)
INSERT INTO "new_Task" (
    "id", "title", "description", "category", "points", "recurrenceType", "interval", "unit", 
    "selectedWeekdays", "dayOfMonth", "startDate", "endDate", "dueDate", "active", 
    "createdAt", "updatedAt"
)
SELECT
    "id",
    "title",
    "description",
    "category",
    "points",
    "recurrenceType",
    "interval",
    "unit",
    "selectedWeekdays",
    "dayOfMonth",
    "startDate",
    "endDate",
    "dueDate",
    "active",
    "createdAt",
    "updatedAt"
FROM "Task";

-- Drop old table and rename new one
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";

-- Recreate index
CREATE INDEX "Task_recurrenceType_idx" ON "Task"("recurrenceType");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;