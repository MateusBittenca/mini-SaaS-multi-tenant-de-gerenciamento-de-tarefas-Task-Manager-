ALTER TABLE "Project" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Task" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "Project_deletedAt_idx" ON "Project"("deletedAt");
CREATE INDEX "Task_deletedAt_idx" ON "Task"("deletedAt");
