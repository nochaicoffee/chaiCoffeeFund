#!/bin/bash
# Statement-sync runner — used by launchd for scheduled execution on a Mac.
# Calls the app's own /api/statements/sync route, so the Next server
# (npm run dev, or a persistent npm start) must be running.
# On Vercel use the daily cron instead (docs/setup.md, "The daily sync").
cd "$(dirname "$0")/../.." || exit 1
npx tsx scripts/ingestStatements.ts
