import { supabase } from '../../lib/supabaseClient';

export const listPaymentGatewayConfigs = async () => {
  const { data, error } = await supabase
    .from('payment_gateway_configs')
    .select('*')
    .order('provider', { ascending: true });

  if (error) throw error;
  return data ?? [];
};

export const savePaymentGatewayConfig = async (payload) => {
  const cleaned = {
    provider: payload.provider,
    config_name: payload.config_name || payload.provider,
    is_active: Boolean(payload.is_active),
    public_metadata: payload.public_metadata ?? {},
  };

  const { data, error } = await supabase
    .from('payment_gateway_configs')
    .upsert(cleaned, { onConflict: 'provider' })
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

export const listInvoicePaymentLinks = async () => {
  const { data, error } = await supabase
    .from('invoice_payment_links')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return data ?? [];
};

export const createInvoicePaymentLink = async (payload) => {
  const { data, error } = await supabase.functions.invoke('create-payment-link', {
    body: payload,
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
};

export const syncInvoicePaymentLink = async (payload) => {
  const { data, error } = await supabase.functions.invoke('sync-payment-link', {
    body: payload,
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
};

export const cancelInvoicePaymentLink = async (payload) => {
  const { data, error } = await supabase.functions.invoke('cancel-payment-link', {
    body: payload,
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
};
