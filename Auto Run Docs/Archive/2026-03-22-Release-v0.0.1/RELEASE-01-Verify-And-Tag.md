# RELEASE-01: Verify Build and Create Tag

Pre-release verification: ensure the codebase is clean, tests pass, and the version tag is created.

## Tasks

- [ ] **Verify version consistency**: Check that all four version files (`package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `server/Cargo.toml`) all contain `"0.0.1"` or `version = "0.0.1"`. If any mismatch, fix it. Run `npx vitest run` to confirm tests pass (ignore pre-existing errors in `CanvasApp.test.ts`). Run `npx tsc --noEmit` and confirm no new type errors were introduced.

- [ ] **Verify GitHub Actions workflows exist**: Confirm `.github/workflows/release.yml` and `.github/workflows/ci.yml` exist and are valid YAML. Run `cat .github/workflows/release.yml | head -5` and `cat .github/workflows/ci.yml | head -5` to confirm they're present. Verify the release workflow has three jobs: `build-linux`, `build-macos`, `build-windows`.

- [ ] **Commit and push the release-setup branch**: Stage all changes (version bumps in the 4 config files, both workflow files under `.github/workflows/`). Create a commit with message: "chore: prepare v0.0.1 release — version bump, CI/CD workflows". Push the `release-setup` branch to origin.

- [ ] **Create PR for release-setup → main**: Use `gh pr create` targeting `main` with title "Release v0.0.1 — CI/CD and version setup". Body should describe: version alignment to 0.0.1, new CI workflow for PRs, new release workflow for tagged builds. Wait for CI checks if they run, then note the PR URL.
