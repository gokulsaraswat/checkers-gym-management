import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Add your project URL and publishable key first.');
  }
  return supabase;
}

export async function fetchBranchOptions() {
  const client = requireSupabase();
  const { data, error } = await client.rpc('list_accessible_branches');
  if (error) throw error;
  return data || [];
}

export async function fetchTrainerOptions() {
  const client = requireSupabase();
  const { data, error } = await client
    .from('profiles')
    .select('id, full_name, email, role, home_branch_id')
    .in('role', ['staff', 'admin'])
    .eq('is_active', true)
    .order('full_name', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function fetchAnalyticsSnapshot(branchId) {
  const client = requireSupabase();
  const { data, error } = await client.rpc('get_advanced_analytics_snapshot', {
    p_branch_id: branchId || null,
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] || null : null;
}

export async function fetchMembersAtRisk(branchId, limit = 15) {
  const client = requireSupabase();
  const { data, error } = await client.rpc('list_members_at_risk', {
    p_branch_id: branchId || null,
    p_limit: limit,
  });
  if (error) throw error;
  return data || [];
}

export async function fetchRevenueForecasts(branchId, limit = 6) {
  const client = requireSupabase();
  const { data, error } = await client.rpc('list_revenue_forecasts', {
    p_branch_id: branchId || null,
    p_limit: limit,
  });
  if (error) throw error;
  return data || [];
}

export async function fetchTrainerPerformance(branchId, snapshotMonth, limit = 10) {
  const client = requireSupabase();
  const { data, error } = await client.rpc('list_trainer_performance_rankings', {
    p_branch_id: branchId || null,
    p_snapshot_month: snapshotMonth,
    p_limit: limit,
  });
  if (error) throw error;
  return data || [];
}

export async function fetchRetentionCohorts(branchId, limit = 6) {
  const client = requireSupabase();
  const { data, error } = await client.rpc('list_member_retention_cohorts', {
    p_branch_id: branchId || null,
    p_limit: limit,
  });
  if (error) throw error;
  return data || [];
}

export async function fetchRecentModelRuns(branchId, limit = 8) {
  const client = requireSupabase();
  const { data, error } = await client.rpc('list_recent_analytics_model_runs', {
    p_branch_id: branchId || null,
    p_limit: limit,
  });
  if (error) throw error;
  return data || [];
}

export async function refreshMemberRiskScores(branchId) {
  const client = requireSupabase();
  const { data, error } = await client.rpc('refresh_member_risk_scores', {
    p_branch_id: branchId || null,
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] || null : null;
}

export async function saveRevenueForecast(payload) {
  const client = requireSupabase();
  const { data, error } = await client.rpc('upsert_revenue_forecast', {
    p_branch_id: payload.branchId,
    p_forecast_month: payload.forecastMonth,
    p_forecast_period: payload.forecastPeriod || 'monthly',
    p_projected_revenue: Number(payload.projectedRevenue || 0),
    p_confirmed_revenue: Number(payload.confirmedRevenue || 0),
    p_confidence_score: Number(payload.confidenceScore || 70),
    p_assumptions: payload.assumptions || {},
  });
  if (error) throw error;
  return data;
}

export async function saveTrainerSnapshot(payload) {
  const client = requireSupabase();
  const { data, error } = await client.rpc('upsert_trainer_performance_snapshot', {
    p_trainer_id: payload.trainerId,
    p_branch_id: payload.branchId,
    p_snapshot_month: payload.snapshotMonth,
    p_sessions_completed: Number(payload.sessionsCompleted || 0),
    p_unique_members: Number(payload.uniqueMembers || 0),
    p_avg_attendance: Number(payload.avgAttendance || 0),
    p_member_retention_score: Number(payload.memberRetentionScore || 0),
    p_pt_revenue: Number(payload.ptRevenue || 0),
    p_commission_generated: Number(payload.commissionGenerated || 0),
    p_notes: payload.notes || null,
  });
  if (error) throw error;
  return data;
}
