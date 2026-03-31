#!/bin/bash
set -e
pnpm install --frozen-lockfile

# Safe schema sync — adds new tables/columns only.
# Does NOT use --force, so destructive changes (drop/recreate tables)
# will fail rather than silently delete data.
# NEVER run "push-force" against the production database.
pnpm --filter db push
