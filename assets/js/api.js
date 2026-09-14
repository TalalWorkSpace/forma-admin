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

/** Daily new-signup series for the growth chart. */
export async function growth(days = 30, includeTest = false) {
  const { data, error } = await supabase.rpc('admin_growth', { p_days: days, p_include_test: !!includeTest });
  if (error) throw error;
  return data || [];
}

/** Full read-only detail for one user (profile, role stats, recent payments). */
export async function userDetail(userId) {
  const { data, error } = await supabase.rpc('admin_user_detail', { p_user_id: userId });
  if (error) throw error;
  return data;
}

/** FORMA-revenue events (coaches paying FORMA), newest first. */
export async function payments(limit = 50, includeTest = false) {
  const { data, error } = await supabase.rpc('admin_payments', { p_limit: limit, p_include_test: !!includeTest });
  if (error) throw error;
  return data || [];
}

/** Revenue overview counters. */
export async function paymentStats() {
  const { data, error } = await supabase.rpc('admin_payment_stats');
  if (error) throw error;
  return data;
}

// == billing writes (admin only; server re-checks require_admin('admin')) =====

/** Add days to a coach's trial / subscription window. */
export async function extendTrial(userId, days) {
  const { data, error } = await supabase.rpc('admin_extend_trial', { p_user_id: userId, p_days: days });
  if (error) throw error;
  return data;
}

/** Manually set a coach's tier (+ optional expiry in days; null = no expiry). */
export async function setTier(userId, tier, days = null) {
  const { data, error } = await supabase.rpc('admin_set_tier', { p_user_id: userId, p_tier: tier, p_days: days });
  if (error) throw error;
  return data;
}

/** Record (or clear, price=null) a custom agreed price for one coach. */
export async function setCustomPrice(userId, price, currency = 'SAR', note = null) {
  const { data, error } = await supabase.rpc('admin_set_custom_price', {
    p_user_id: userId, p_price: price, p_currency: currency, p_note: note,
  });
  if (error) throw error;
  return data;
}

/** Create a discount code. */
export async function createDiscount({ code, kind, value, tier, durationDays, maxUses, expiresAt, note }) {
  const { data, error } = await supabase.rpc('admin_create_discount', {
    p_code: code, p_kind: kind, p_value: value, p_tier: tier || null,
    p_duration_days: durationDays || null, p_max_uses: maxUses || null,
    p_expires_at: expiresAt || null, p_note: note || null,
  });
  if (error) throw error;
  return data;
}

/** All discount codes, newest first. */
export async function listDiscounts() {
  const { data, error } = await supabase.rpc('admin_list_discounts');
  if (error) throw error;
  return data || [];
}

/** Activate / deactivate a discount code. */
export async function toggleDiscount(code, active) {
  const { data, error } = await supabase.rpc('admin_toggle_discount', { p_code: code, p_active: active });
  if (error) throw error;
  return data;
}

/** Permanently delete a discount code. */
export async function deleteDiscount(code) {
  const { data, error } = await supabase.rpc('admin_delete_discount', { p_code: code });
  if (error) throw error;
  return data;
}
