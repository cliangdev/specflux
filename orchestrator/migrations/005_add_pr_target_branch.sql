-- UP
ALTER TABLE project_config ADD COLUMN default_pr_target_branch TEXT DEFAULT 'main';

-- DOWN
ALTER TABLE project_config DROP COLUMN default_pr_target_branch;
