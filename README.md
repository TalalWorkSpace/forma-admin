# FORMA Admin

Static admin panel (no build step) for GitHub Pages, extended from the
forma-landing-v5 design system. Dark, RTL, lime.

## Security
- Ships the **anon** key only (public/safe). No service-role key, ever.
- Admin access lives in `admin_users(user_id, role)` - granted ONLY from SQL.
- Every privileged action is a SECURITY DEFINER RPC that re-checks the caller's
  admin role server-side (`require_admin`). Non-admins are refused.
- The page renders nothing privileged until login succeeds AND `my_admin_role()`
  returns a role; a signed-in non-admin sees a "no access" screen.

## Structure (modular)
- `index.html`            - shell
- `assets/admin.css`      - design tokens + components (button/field/card/table/toast/nav)
- `assets/js/config.js`   - Supabase URL + anon key
- `assets/js/api.js`      - client + typed RPC wrappers
- `assets/js/ui.js`       - reusable UI primitives (el/card/field/button/segmented/toast…)
- `assets/js/app.js`      - auth gate, admin check, sidebar routing (ROUTES = pages)
- `assets/js/pages/*.js`  - one file per feature (add a page → register in ROUTES)

## Add a feature
Create `assets/js/pages/<name>.js` exporting `meta = {id,label,icon,minRole}` and
`render()`, then add it to `ROUTES` in `app.js`. The sidebar + role guard update.

## Pages
- `overview`      - live headcounts, growth, activity, subscription mix (viewer+)
- `users`         - searchable users list, filter by role (viewer+)
- `notifications` - broadcast a push to an audience (editor+)
- `audit`         - admin action log (admin only)

## Backend
- `supabase/migrations/20260915_admin.sql` (admin_users, my_admin_role,
  require_admin, admin_audit, admin_broadcast, admin_audience_counts).
- `supabase/migrations/20260915b_admin_reporting.sql` (admin_stats,
  admin_list_users, admin_audit_log - all read-only, require_admin gated).

## Deploy (after review)
GitHub Pages from this folder. Custom domain later: admin.forma-app.sa.
