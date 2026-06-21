CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "Task_title_trgm_idx" ON "Task" USING gin (title gin_trgm_ops);
CREATE INDEX "Task_description_trgm_idx" ON "Task" USING gin (description gin_trgm_ops);
CREATE INDEX "Project_name_trgm_idx" ON "Project" USING gin (name gin_trgm_ops);
CREATE INDEX "Project_description_trgm_idx" ON "Project" USING gin (description gin_trgm_ops);
