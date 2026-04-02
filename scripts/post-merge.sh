#!/bin/bash
set -e

npm install

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "WARNING: SUPABASE_ACCESS_TOKEN not set — skipping Edge Function deploy"
else
  SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" \
    npx supabase@latest functions deploy ai-proxy \
    --project-ref divinifsucffsxyiyypc || echo "WARNING: Edge Function deploy failed (non-blocking)"
fi
