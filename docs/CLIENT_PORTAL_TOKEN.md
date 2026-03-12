# Client Portal: Token-based Access (Anonymous)

## Overview

External clients can access the Client Portal **without signing in** using a magic link with a token.  
Team members generate tokens and share links with clients. Clients open the link and can view deliverables, files, messages, versions, invoices — and submit feedback (approve, request changes, rate, send messages, mark deliverables).

---

## Flow

1. **Team member** opens Client Portal widget, selects a project, clicks **"Copy Client Link"**.
2. Backend creates a `project_access_tokens` record and returns a token (valid 30 days by default).
3. Link is copied to clipboard: `https://app.example.com/client/{slug-or-uuid}?token={token}`.
4. **Client** opens the link in browser — no login required.
5. Data is fetched via RPC `get_client_portal_by_token` (SECURITY DEFINER, bypasses RLS).
6. Client can: approve/request changes, rate, send messages, mark deliverables as done.

---

## Backend (Supabase)

### Tables

| Table | Description |
|-------|-------------|
| `project_access_tokens` | `project_id`, `token`, `expires_at`, `created_by` |

### RPC Functions

| Function | Args | Callable by | Description |
|----------|------|-------------|-------------|
| `get_client_portal_by_token` | `p_identifier text`, `p_token text` | anon, authenticated | Fetch project + deliverables, messages, versions, invoices, files. `p_identifier` = UUID or slug. |
| `create_project_access_token` | `p_project_id uuid`, `p_expires_days int` (default 30) | authenticated | Create token for project. Returns `{ok, token, expires_at}`. |
| `client_submit_feedback_by_token` | `p_project_id`, `p_token`, `p_message`, `p_handoff_status`, `p_handoff_rating`, `p_sender_name` | anon, authenticated | Update handoff_status, handoff_rating, insert message. |
| `client_update_deliverable_by_token` | `p_project_id`, `p_token`, `p_deliverable_id`, `p_completed` | anon, authenticated | Mark deliverable done/undone. |

---

## API (Client)

- `src/api/clientPortalToken.ts` — `fetchClientPortalByToken`, `createProjectAccessToken`, `submitClientFeedbackByToken`, `updateDeliverableByToken`
- `src/hooks/useClientPortalToken.ts` — `useClientPortalByToken`, `useCreateProjectAccessToken`, `useSubmitClientFeedbackByToken`, `useUpdateDeliverableByToken`

---

## Limitations

- **File upload** — not available for token-based access (storage requires auth). Client sees no upload button.
- **File download** — signed URLs require auth; download may fail for token-only clients until a token-based signed-URL RPC is added.

---

## Migrations

- `20260310220000_project_files_update_policy.sql` — Added UPDATE policy for `project_files`.
- `20260310220001_project_access_tokens.sql` — `project_access_tokens`, RPCs, GRANTs.

---

## Changelog

- [2026-03-11] Added project access tokens for anonymous client portal.
- [2026-03-11] Added RPCs: get_client_portal_by_token, create_project_access_token, client_submit_feedback_by_token, client_update_deliverable_by_token.
- [2026-03-11] Updated ClientExternalPage to support `?token=` URL param; uses token flow when token present.
- [2026-03-11] Updated ClientPortalWidget "Copy Client Link" to generate token and copy link with `?token=`.
