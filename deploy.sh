#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: ./deploy.sh 'commit message'"
  exit 1
fi

if [ -z "$GITHUB_PERSONAL_ACCESS_TOKEN" ]; then
  echo "Error: GITHUB_PERSONAL_ACCESS_TOKEN secret is not set"
  exit 1
fi

git add .
git commit -m "$1" || echo "Nothing new to commit — pushing existing HEAD"
git push "https://drdonelson:${GITHUB_PERSONAL_ACCESS_TOKEN}@github.com/drdonelson/rippl-web-app.git" main
echo "Pushed to GitHub — Render deploying..."
