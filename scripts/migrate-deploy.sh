#!/usr/bin/env bash
# Applies pending Prisma migrations during the Netlify build.
# Neon's free databases sleep when idle and can take a few seconds to wake, so retry a few times.
set -u
for attempt in 1 2 3 4 5; do
  if npx prisma migrate deploy; then
    exit 0
  fi
  echo "prisma migrate deploy failed (attempt ${attempt}/5), retrying in $((attempt * 4))s..."
  sleep $((attempt * 4))
done
echo "prisma migrate deploy failed after 5 attempts"
exit 1
