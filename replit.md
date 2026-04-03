# PMP — 新媒体运营管理系统

React + Vite SPA for 第二座山集团. Manages social media projects, recurring tasks, deliverables, staff, risk registers, and Gantt charts, backed by Supabase for auth, realtime sync, and file storage.

## Tech Stack
- **Frontend**: React 18, Vite 8, Recharts, lucide-react
- **Backend**: Supabase (auth, Postgres via `app_data` table, Edge Functions)
- **AI**: Gemini (default) + Qwen (DashScope), via `supabase/functions/ai-proxy` edge function

## Key Files
- `src/App.jsx` — entire frontend (single file, ~4200 lines)
- `src/supabase.js` — Supabase client + TABLE constant
- `vite.config.js` — Vite config with host allowances
- `supabase/functions/ai-proxy/index.ts` — AI proxy edge function

## Data Storage
- `localStorage` key: `sm-ops-v6` (SK) — offline/fast cache
- Supabase table: `app_data` with `id="main"` row containing full data JSON
- `DEFAULT_DATA` shape: `{ projects, staff, weekSchedules, customTags, ... }`

## AI Agent Pipeline
Three-stage: Commander → Architect → 工时分析者
- Commander: routes long inputs to per-project buckets
- Architect: maps text → 4-layer structure (Project→Category→Resource→Action)
- 工时分析者: estimates hours for new actions
- Timeouts: ARCHITECT=45s, COMMANDER=10s, ANALYST=20s
- Auth: edge function always uses `AI_ANON_KEY`, never user JWT

## Custom Tag System (Task #13)
- `customTags: [{id, name, color}]` stored in top-level data
- `INITIAL_TAGS` (15 tags) seeded via `DEFAULT_DATA` for new/existing users
- `getCatColor(cat, customTags)` helper — falls back to hardcoded CAT_COLORS
- Tag management UI in ProjectsView (collapsible section, inline edit, color picker)
- `CatForm` uses dynamic customTags list instead of hardcoded CAT_COLORS
- AI system prompt dynamically injects current tag names list
- `RES_TYPES` expanded: 5→11 (added: ad_account, kol, creative, document, data, event)
- `PLATFORMS` expanded: 8→14

## LocalStorage Keys
- `sm-ai-config` — AI provider/model config
- `sm-agent-mode` — Commander agent toggle
- `sm-hours-analyst` — hours analyst toggle
- `sm-ai-chat` — chat messages
- `sm-ai-history` — chat history

## Supabase Project
- Project ref: `divinifsucffsxyiyypc`
- Auth: phone@pmp.local fake email pattern
- `OPENAI_API_KEY` env var used by both GPT and Qwen (DashScope)
