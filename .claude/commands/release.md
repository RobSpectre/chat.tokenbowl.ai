# Release Command

Run the complete release process:

1. **Run all tests** using `npm test -- --run`
2. **If tests pass**, proceed with:
   - Read `package.json` to get current version
   - Bump version (minor version increment: e.g., 1.2.0 -> 1.3.0)
   - Update version in `package.json`
   - Run `git status` and `git diff --stat` to see what changed
   - Commit all changes with a descriptive commit message that:
     - Lists the version number
     - Summarizes the key changes from git diff
     - Includes the standard footer with Claude Code attribution
   - Create an annotated git tag for the new version (e.g., `v1.3.0`)
   - Display summary of what was done
3. **If tests fail**, stop and report which tests failed

Do not push to remote - just prepare the release locally.

Use the TodoWrite tool to track progress through these steps.
