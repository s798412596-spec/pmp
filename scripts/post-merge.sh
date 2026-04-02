#!/bin/bash
set -e

npm install

SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" \
  npx supabase@latest functions deploy ai-proxy \
  --project-ref divinifsucffsxyiyypc || true
