#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: ./deploy.sh 'commit message'"
  exit 1
fi

git add .
git commit -m "$1" || echo "Nothing new to commit — pushing existing HEAD"
git push git@github.com:drdonelson/rippl-web-app.git main
echo "Pushed to GitHub — Render deploying..."
