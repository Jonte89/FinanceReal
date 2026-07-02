-- CreateTable
CREATE TABLE "AppSetting" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'main',
    "cutoffDay" INTEGER NOT NULL DEFAULT 25,
    "updatedAt" DATETIME NOT NULL
);
