#!/bin/bash
set -e

npm install

if [ -n "$SUPABASE_ACCESS_TOKEN" ]; then
  SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" \
    npx supabase@latest functions deploy ai-proxy \
    --project-ref divinifsucffsxyiyypc || true
else
  echo "SUPABASE_ACCESS_TOKEN not set, skipping Edge Function deploy"
fi
