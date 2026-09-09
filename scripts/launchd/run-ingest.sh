#!/bin/bash
# Statement-sync runner — used by launchd for scheduled execution.
# Calls the app's own /api/statements/sync route, so the Next server
# (npm run dev, or eventually a persistent npm start) must be running.
cd /Users/prathik/Codes/chaiCoffeeFund
npx tsx scripts/ingestStatements.ts
