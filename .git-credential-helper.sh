#!/bin/bash
# Git credential helper — reads token from Replit secret at runtime.
# Never stores the token on disk.
echo "username=drdonelson"
echo "password=${GITHUB_PERSONAL_ACCESS_TOKEN}"
