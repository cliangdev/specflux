-- UP
ALTER TABLE tasks ADD COLUMN github_pr_url TEXT;

-- DOWN
ALTER TABLE tasks DROP COLUMN github_pr_url;
