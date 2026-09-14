// Supabase client + typed wrappers for the admin RPCs. The client uses the
// ANON key only; every privileged call is a SECURITY DEFINER RPC that re-checks
// admin_users server-side, so the browser never holds real power.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}
export const signOut = () => supabase.auth.signOut();
export const getSession = async () => (await supabase.auth.getSession()).data.session;

/** The signed-in user's admin role, or null if not an admin. */
export async function myAdminRole() {
  const { data, error } = await supabase.rpc('my_admin_role');
  if (error) return null;
  return data || null;
}

/** { all, coaches, trainees } real-user counts (excludes test accounts). */
export async function audienceCounts() {
  const { data, error } = await supabase.rpc('admin_audience_counts');
  if (error) throw error;
  return data;
}

/** Send a push broadcast. Returns the number of users notified. */
export async function broadcast({ title, body, audience, type, includeTest }) {
  const { data, error } = await supabase.rpc('admin_broadcast', {
    p_title: title, p_body: body, p_audience: audience, p_type: type || 'info',
    p_include_test: !!includeTest,
  });
  if (error) throw error;
  return data;
}

/** Overview metrics for the dashboard (headcounts, growth, activity, subs). */
export async function stats(includeTest = false) {
  const { data, error } = await supabase.rpc('admin_stats', { p_include_test: !!includeTest });
  if (error) throw error;
  return data;
}

/** Users list, newest first. { search, role: all|coach|trainee, limit, includeTest }. */
export async function listUsers({ search = '', role = 'all', limit = 50, includeTest = false } = {}) {
  const { data, error } = await supabase.rpc('admin_list_users', {
    p_search: search || null, p_role: role, p_limit: limit, p_include_test: !!includeTest,
  });
  if (error) throw error;
  return data || [];
}

/** Audit log entries (admin only), newest first. */
export async function auditLog(limit = 50) {
  const { data, error } = await supabase.rpc('admin_audit_log', { p_limit: limit });
  if (error) throw error;
  return data || [];
}
