import { supabase } from '../../lib/supabaseClient';

export async function getPaymentAutomationSnapshot() {
  const { data, error } = await supabase.rpc('get_payment_automation_snapshot');
  if (error) throw error;
  return data;
}

export async function listRenewalQueue() {
  const { data, error } = await supabase.rpc('list_membership_renewal_queue');
  if (error) throw error;
  return data ?? [];
}

export async function listRetryQueue() {
  const { data, error } = await supabase.rpc('list_payment_retry_queue');
  if (error) throw error;
  return data ?? [];
}

export async function listRefundRequests() {
  const { data, error } = await supabase.rpc('list_refund_requests_admin');
  if (error) throw error;
  return data ?? [];
}

export async function updateAutoRenewPreference(enabled) {
  const { data, error } = await supabase.rpc('set_my_auto_renew_preference', {
    p_enabled: !!enabled,
  });
  if (error) throw error;
  return data;
}

export async function submitRefundRequest(invoiceId, reason) {
  const { data, error } = await supabase.rpc('request_invoice_refund', {
    p_invoice_id: invoiceId,
    p_reason: reason ?? null,
  });
  if (error) throw error;
  return data;
}

export async function resolveRefundRequest(refundRequestId, action, note) {
  const { data, error } = await supabase.rpc('resolve_refund_request', {
    p_refund_request_id: refundRequestId,
    p_action: action,
    p_note: note ?? null,
  });
  if (error) throw error;
  return data;
}
