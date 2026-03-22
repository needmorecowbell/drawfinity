# RELEASE-02: Trigger Draft Release

After the PR from RELEASE-01 is merged to main, create the version tag to trigger the release build.

**Prerequisites**: The `release-setup` PR must be merged to `main` first.

## Tasks

- [ ] **Verify PR is merged**: Run `gh pr list --state merged --search "Release v0.0.1"` to confirm the release-setup PR was merged. If not merged yet, report this and stop — do not proceed until it's merged.

- [ ] **Create and push the version tag**: Switch to main and pull latest: `git checkout main && git pull origin main`. Create an annotated tag: `git tag -a v0.0.1 -m "Drawfinity v0.0.1 — initial release"`. Push the tag: `git push origin v0.0.1`. Verify the tag exists on remote: `git ls-remote --tags origin v0.0.1`.

- [ ] **Verify release workflow triggered**: Run `gh run list --workflow=release.yml --limit=1` to confirm the release workflow was triggered by the tag push. Report the run URL and status. If it hasn't started within 30 seconds, check with `gh run list` again.

- [ ] **Monitor build progress**: Use `gh run watch` on the release workflow run to monitor progress. Report when each platform job (linux, macos, windows) completes. If any job fails, report the failure logs using `gh run view --log-failed`.
