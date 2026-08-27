-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "points" INTEGER NOT NULL DEFAULT 10,
    "frequency" TEXT NOT NULL DEFAULT 'DAILY',
    "daysOfWeek" TEXT NOT NULL DEFAULT '0,1,2,3,4,5,6',
    "intervalDays" INTEGER NOT NULL DEFAULT 2,
    "dueDate" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Task" ("active", "category", "createdAt", "daysOfWeek", "description", "frequency", "id", "points", "title", "updatedAt") SELECT "active", "category", "createdAt", "daysOfWeek", "description", "frequency", "id", "points", "title", "updatedAt" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
