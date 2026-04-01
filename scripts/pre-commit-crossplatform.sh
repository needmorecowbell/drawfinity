#!/usr/bin/env bash
# Pre-commit hook: runs cross-platform guard tests before each commit.
# Install: cp scripts/pre-commit-crossplatform.sh .git/hooks/pre-commit
# Or:      ln -sf ../../scripts/pre-commit-crossplatform.sh .git/hooks/pre-commit
#
# Runs only the CrossPlatform.test.ts file — typically completes in <1s.

set -e

echo "Running cross-platform guard tests..."

npx vitest run src/__tests__/CrossPlatform.test.ts --reporter=dot 2>&1

if [ $? -ne 0 ]; then
  echo ""
  echo "Cross-platform guard tests FAILED — commit blocked."
  echo "Fix the violations above, then try again."
  echo ""
  echo "Hint: run 'npx vitest run src/__tests__/CrossPlatform.test.ts' for details."
  exit 1
fi

echo "Cross-platform guards passed."
