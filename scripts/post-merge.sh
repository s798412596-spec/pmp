#!/bin/bash
set -e

npm install

SUPABASE_ACCESS_TOKEN=sbp_c838df6f8484cc0c36c4c63f100591594117ba0c \
  npx supabase@latest functions deploy ai-proxy \
  --project-ref divinifsucffsxyiyypc || true
