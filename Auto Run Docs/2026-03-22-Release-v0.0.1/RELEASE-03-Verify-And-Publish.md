# RELEASE-03: Verify Artifacts and Publish Release

After all three platform builds complete, verify the draft release has the expected artifacts, then publish.

**Prerequisites**: All three build jobs from RELEASE-02 must have completed successfully.

## Tasks

- [ ] **List draft release artifacts**: Run `gh release view v0.0.1 --json assets --jq '.assets[].name'` to list all uploaded artifacts. Verify we have at minimum: a `.deb` file (Linux), a `.dmg` file (macOS), and an `.msi` or `.exe` file (Windows). Report the full list of artifacts with their sizes using `gh release view v0.0.1 --json assets --jq '.assets[] | "\(.name) (\(.size / 1048576 | floor)MB)"'`.

- [ ] **Download Linux artifact for local testing**: Use `gh release download v0.0.1 --pattern '*.deb' --dir /tmp/drawfinity-release` to download the Linux .deb package. Report the file name and size. Verify it's a valid deb package with `dpkg-deb --info /tmp/drawfinity-release/*.deb`.

- Manually test the downloaded artifacts on each platform before publishing. Verify the app launches, you can draw strokes, and the UI renders correctly.

- When ready to publish, run: `gh release edit v0.0.1 --draft=false`
