//! Git Operations Module
//!
//! Provides git operations via shell commands for managing workspace repositories.

use std::path::{Path, PathBuf};
use std::process::Command;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitStatus {
    pub branch: String,
    pub has_changes: bool,
    pub staged_files: Vec<String>,
    pub unstaged_files: Vec<String>,
    pub untracked_files: Vec<String>,
}

#[derive(Debug)]
pub enum GitError {
    CommandFailed(String),
    InvalidPath,
    NotARepository,
}

impl std::fmt::Display for GitError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            GitError::CommandFailed(msg) => write!(f, "Git command failed: {}", msg),
            GitError::InvalidPath => write!(f, "Invalid path"),
            GitError::NotARepository => write!(f, "Not a git repository"),
        }
    }
}

impl std::error::Error for GitError {}

type Result<T> = std::result::Result<T, GitError>;

/// Clone a repository to a target directory
pub fn git_clone(repo_url: &str, target_dir: &Path) -> Result<()> {
    let output = Command::new("git")
        .arg("clone")
        .arg(repo_url)
        .arg(target_dir)
        .output()
        .map_err(|e| GitError::CommandFailed(e.to_string()))?;

    if !output.status.success() {
        return Err(GitError::CommandFailed(
            String::from_utf8_lossy(&output.stderr).to_string(),
        ));
    }

    Ok(())
}

/// Add files to the staging area
pub fn git_add(repo_dir: &Path, files: &[&str]) -> Result<()> {
    if !repo_dir.exists() {
        return Err(GitError::InvalidPath);
    }

    let mut cmd = Command::new("git");
    cmd.arg("-C").arg(repo_dir).arg("add");

    for file in files {
        cmd.arg(file);
    }

    let output = cmd
        .output()
        .map_err(|e| GitError::CommandFailed(e.to_string()))?;

    if !output.status.success() {
        return Err(GitError::CommandFailed(
            String::from_utf8_lossy(&output.stderr).to_string(),
        ));
    }

    Ok(())
}

/// Commit staged changes with a message
pub fn git_commit(repo_dir: &Path, message: &str) -> Result<()> {
    if !repo_dir.exists() {
        return Err(GitError::InvalidPath);
    }

    let output = Command::new("git")
        .arg("-C")
        .arg(repo_dir)
        .arg("commit")
        .arg("-m")
        .arg(message)
        .output()
        .map_err(|e| GitError::CommandFailed(e.to_string()))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        // Check if it's just "nothing to commit"
        if stderr.contains("nothing to commit") || stderr.contains("no changes added") {
            return Ok(()); // Not an error, just nothing to commit
        }
        return Err(GitError::CommandFailed(stderr));
    }

    Ok(())
}

/// Push commits to remote
pub fn git_push(repo_dir: &Path) -> Result<()> {
    if !repo_dir.exists() {
        return Err(GitError::InvalidPath);
    }

    let output = Command::new("git")
        .arg("-C")
        .arg(repo_dir)
        .arg("push")
        .output()
        .map_err(|e| GitError::CommandFailed(e.to_string()))?;

    if !output.status.success() {
        return Err(GitError::CommandFailed(
            String::from_utf8_lossy(&output.stderr).to_string(),
        ));
    }

    Ok(())
}

/// Pull commits from remote
pub fn git_pull(repo_dir: &Path) -> Result<()> {
    if !repo_dir.exists() {
        return Err(GitError::InvalidPath);
    }

    let output = Command::new("git")
        .arg("-C")
        .arg(repo_dir)
        .arg("pull")
        .output()
        .map_err(|e| GitError::CommandFailed(e.to_string()))?;

    if !output.status.success() {
        return Err(GitError::CommandFailed(
            String::from_utf8_lossy(&output.stderr).to_string(),
        ));
    }

    Ok(())
}

/// Fetch from remote
pub fn git_fetch(repo_dir: &Path) -> Result<()> {
    if !repo_dir.exists() {
        return Err(GitError::InvalidPath);
    }

    let output = Command::new("git")
        .arg("-C")
        .arg(repo_dir)
        .arg("fetch")
        .output()
        .map_err(|e| GitError::CommandFailed(e.to_string()))?;

    if !output.status.success() {
        return Err(GitError::CommandFailed(
            String::from_utf8_lossy(&output.stderr).to_string(),
        ));
    }

    Ok(())
}

/// Get the current repository status
pub fn git_status(repo_dir: &Path) -> Result<GitStatus> {
    if !repo_dir.exists() {
        return Err(GitError::InvalidPath);
    }

    // Get current branch
    let branch_output = Command::new("git")
        .arg("-C")
        .arg(repo_dir)
        .arg("rev-parse")
        .arg("--abbrev-ref")
        .arg("HEAD")
        .output()
        .map_err(|e| GitError::CommandFailed(e.to_string()))?;

    if !branch_output.status.success() {
        return Err(GitError::NotARepository);
    }

    let branch = String::from_utf8_lossy(&branch_output.stdout)
        .trim()
        .to_string();

    // Get status in porcelain format
    let status_output = Command::new("git")
        .arg("-C")
        .arg(repo_dir)
        .arg("status")
        .arg("--porcelain")
        .output()
        .map_err(|e| GitError::CommandFailed(e.to_string()))?;

    if !status_output.status.success() {
        return Err(GitError::NotARepository);
    }

    let status_text = String::from_utf8_lossy(&status_output.stdout);
    let mut staged_files = Vec::new();
    let mut unstaged_files = Vec::new();
    let mut untracked_files = Vec::new();

    for line in status_text.lines() {
        if line.len() < 3 {
            continue;
        }

        let status_code = &line[..2];
        let file_path = line[3..].to_string();

        match status_code {
            "??" => untracked_files.push(file_path),
            s if s.chars().next() != Some(' ') && s.chars().next() != Some('?') => {
                staged_files.push(file_path)
            }
            s if s.chars().nth(1) != Some(' ') && s.chars().nth(1) != Some('?') => {
                unstaged_files.push(file_path)
            }
            _ => {}
        }
    }

    let has_changes = !staged_files.is_empty()
        || !unstaged_files.is_empty()
        || !untracked_files.is_empty();

    Ok(GitStatus {
        branch,
        has_changes,
        staged_files,
        unstaged_files,
        untracked_files,
    })
}

// ============================================================================
// Tauri Command Wrappers
// ============================================================================

/// Clone a repository to a target directory (Tauri command)
#[tauri::command]
pub async fn git_clone_repo(repo_url: String, target_dir: String) -> std::result::Result<(), String> {
    let path = PathBuf::from(target_dir);
    git_clone(&repo_url, &path).map_err(|e| e.to_string())
}

/// Add files to the staging area (Tauri command)
#[tauri::command]
pub async fn git_add_files(repo_dir: String, files: Vec<String>) -> std::result::Result<(), String> {
    let path = PathBuf::from(repo_dir);
    let file_refs: Vec<&str> = files.iter().map(|s| s.as_str()).collect();
    git_add(&path, &file_refs).map_err(|e| e.to_string())
}

/// Auto-commit: add all changes and commit with a message (Tauri command)
#[tauri::command]
pub async fn git_auto_commit(repo_dir: String, message: String) -> std::result::Result<(), String> {
    let path = PathBuf::from(repo_dir);

    // Add all changes (.)
    git_add(&path, &["."]).map_err(|e| e.to_string())?;

    // Commit with message
    git_commit(&path, &message).map_err(|e| e.to_string())
}

/// Commit staged changes with a message (Tauri command)
#[tauri::command]
pub async fn git_commit_changes(repo_dir: String, message: String) -> std::result::Result<(), String> {
    let path = PathBuf::from(repo_dir);
    git_commit(&path, &message).map_err(|e| e.to_string())
}

/// Push commits to remote (Tauri command)
#[tauri::command]
pub async fn git_push_changes(repo_dir: String) -> std::result::Result<(), String> {
    let path = PathBuf::from(repo_dir);
    git_push(&path).map_err(|e| e.to_string())
}

/// Pull commits from remote (Tauri command)
#[tauri::command]
pub async fn git_pull_changes(repo_dir: String) -> std::result::Result<(), String> {
    let path = PathBuf::from(repo_dir);
    git_pull(&path).map_err(|e| e.to_string())
}

/// Fetch from remote (Tauri command)
#[tauri::command]
pub async fn git_fetch_remote(repo_dir: String) -> std::result::Result<(), String> {
    let path = PathBuf::from(repo_dir);
    git_fetch(&path).map_err(|e| e.to_string())
}

/// Get repository status (Tauri command)
#[tauri::command]
pub async fn git_get_status(repo_dir: String) -> std::result::Result<GitStatus, String> {
    let path = PathBuf::from(repo_dir);
    git_status(&path).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::PathBuf;

    fn create_temp_repo() -> PathBuf {
        let temp_dir = std::env::temp_dir().join(format!("test_repo_{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&temp_dir).unwrap();

        // Initialize git repo
        Command::new("git")
            .arg("init")
            .arg(&temp_dir)
            .output()
            .unwrap();

        // Configure git user for tests
        Command::new("git")
            .arg("-C")
            .arg(&temp_dir)
            .arg("config")
            .arg("user.email")
            .arg("test@example.com")
            .output()
            .unwrap();

        Command::new("git")
            .arg("-C")
            .arg(&temp_dir)
            .arg("config")
            .arg("user.name")
            .arg("Test User")
            .output()
            .unwrap();

        temp_dir
    }

    #[test]
    fn test_git_status_empty_repo() {
        let repo_dir = create_temp_repo();
        let status = git_status(&repo_dir).unwrap();

        assert_eq!(status.branch, "master".to_string());
        assert!(!status.has_changes);

        fs::remove_dir_all(repo_dir).unwrap();
    }

    #[test]
    fn test_git_add_and_commit() {
        let repo_dir = create_temp_repo();

        // Create a test file
        let test_file = repo_dir.join("test.txt");
        fs::write(&test_file, "test content").unwrap();

        // Add file
        git_add(&repo_dir, &["test.txt"]).unwrap();

        // Commit
        git_commit(&repo_dir, "Initial commit").unwrap();

        // Check status
        let status = git_status(&repo_dir).unwrap();
        assert!(!status.has_changes);

        fs::remove_dir_all(repo_dir).unwrap();
    }

    #[test]
    fn test_git_status_with_changes() {
        let repo_dir = create_temp_repo();

        // Create and commit initial file
        let test_file = repo_dir.join("test.txt");
        fs::write(&test_file, "initial content").unwrap();
        git_add(&repo_dir, &["test.txt"]).unwrap();
        git_commit(&repo_dir, "Initial commit").unwrap();

        // Modify file
        fs::write(&test_file, "modified content").unwrap();

        // Check status
        let status = git_status(&repo_dir).unwrap();
        assert!(status.has_changes);
        assert_eq!(status.unstaged_files.len(), 1);

        fs::remove_dir_all(repo_dir).unwrap();
    }
}
