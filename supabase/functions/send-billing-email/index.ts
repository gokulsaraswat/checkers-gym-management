import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { Resend } from 'npm:resend@2.0.0';

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    ...corsHeaders,
    'Content-Type': 'application/json',
  },
});

const safeTrim = (value?: string | null) => (typeof value === 'string' ? value.trim() : '');

const formatCurrency = (value: number | string | null | undefined, currencyCode = 'INR') => {
  const amount = Number(value || 0);

  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currencyCode || 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (_error) {
    return `${currencyCode || 'INR'} ${amount.toFixed(2)}`;
  }
};

const recordEmailLog = async (
  adminClient: ReturnType<typeof createClient>,
  payload: Record<string, unknown>,
) => {
  try {
    await adminClient
      .from('billing_email_log')
      .insert([payload]);
  } catch (error) {
    console.error('Unable to record billing email log', error);
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const billingFromEmail = Deno.env.get('BILLING_FROM_EMAIL');
    const authHeader = req.headers.get('Authorization');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return json({ error: 'Supabase function secrets are missing.' }, 500);
    }

    if (!authHeader) {
      return json({ error: 'Missing authorization header.' }, 401);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: authData, error: authError } = await userClient.auth.getUser();

    if (authError || !authData.user) {
      return json({ error: authError?.message || 'Unauthorized request.' }, 401);
    }

    const callerId = authData.user.id;

    const { data: callerProfile, error: callerProfileError } = await adminClient
      .from('profiles')
      .select('id, role, is_active, email, full_name')
      .eq('id', callerId)
      .maybeSingle();

    if (callerProfileError) {
      return json({ error: callerProfileError.message }, 500);
    }

    if (!callerProfile || !callerProfile.is_active || !['staff', 'admin'].includes(callerProfile.role)) {
      return json({ error: 'Staff access required.' }, 403);
    }

    const body = await req.json();
    const invoiceId = body?.invoiceId;
    const triggerSource = safeTrim(body?.triggerSource) || 'manual';
    const overrideEmail = safeTrim(body?.recipientEmail);

    if (!invoiceId) {
      return json({ error: 'invoiceId is required.' }, 400);
    }

    const { data: invoiceRow, error: invoiceError } = await adminClient
      .from('billing_invoices')
      .select(`
        id,
        member_id,
        invoice_number,
        invoice_type,
        status,
        issue_date,
        due_date,
        billing_period_start,
        billing_period_end,
        currency_code,
        subtotal_amount,
        tax_amount,
        discount_amount,
        total_amount,
        amount_paid,
        balance_due,
        notes,
        member:profiles!billing_invoices_member_id_fkey (
          id,
          email,
          full_name,
          phone
        ),
        items:billing_invoice_items (
          id,
          line_index,
          description,
          quantity,
          unit_price,
          line_total
        )
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoiceRow) {
      return json({ error: invoiceError?.message || 'Invoice not found.' }, 404);
    }

    const { data: billingProfile } = await adminClient
      .from('billing_profiles')
      .select('billing_email')
      .eq('user_id', invoiceRow.member_id)
      .maybeSingle();

    const recipientEmail = overrideEmail || safeTrim(billingProfile?.billing_email) || safeTrim(invoiceRow.member?.email);

    if (!recipientEmail) {
      await recordEmailLog(adminClient, {
        invoice_id: invoiceRow.id,
        member_id: invoiceRow.member_id,
        recipient_email: 'missing-email@example.invalid',
        trigger_source: triggerSource,
        delivery_status: 'skipped',
        provider_name: 'resend',
        subject: `Invoice ${invoiceRow.invoice_number || 'pending'}`,
        error_message: 'No billing email or member email is available for this account.',
      });
      return json({ error: 'This member does not have an email address for billing.' }, 400);
    }

    if (!resendApiKey || !billingFromEmail) {
      await recordEmailLog(adminClient, {
        invoice_id: invoiceRow.id,
        member_id: invoiceRow.member_id,
        recipient_email: recipientEmail,
        trigger_source: triggerSource,
        delivery_status: 'failed',
        provider_name: 'resend',
        subject: `Invoice ${invoiceRow.invoice_number || 'pending'}`,
        error_message: 'RESEND_API_KEY or BILLING_FROM_EMAIL is missing from function secrets.',
      });
      return json({ error: 'Email delivery secrets are not configured.' }, 500);
    }

    const resend = new Resend(resendApiKey);
    const subject = `Your gym invoice ${invoiceRow.invoice_number || ''}`.trim();

    const lineItemsHtml = (invoiceRow.items || [])
      .sort((left: { line_index?: number }, right: { line_index?: number }) => Number(left?.line_index || 0) - Number(right?.line_index || 0))
      .map((item: { description?: string; quantity?: number; unit_price?: number; line_total?: number }) => `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${item.description || 'Line item'}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity || 1}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.unit_price, invoiceRow.currency_code || 'INR')}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.line_total, invoiceRow.currency_code || 'INR')}</td>
        </tr>
      `)
      .join('');

    const html = `
      <div style="font-family: Arial, sans-serif; background: #f8fafc; padding: 24px; color: #111827;">
        <div style="max-width: 720px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; border: 1px solid #e5e7eb;">
          <div style="padding: 24px 28px; background: linear-gradient(135deg, #ff2625, #ff7043); color: white;">
            <div style="font-size: 12px; letter-spacing: 1px; text-transform: uppercase; opacity: 0.85;">Gym invoice</div>
            <h1 style="margin: 10px 0 0; font-size: 28px;">${invoiceRow.invoice_number || 'Pending invoice number'}</h1>
          </div>
          <div style="padding: 24px 28px;">
            <p style="margin-top: 0; font-size: 16px;">Hello ${invoiceRow.member?.full_name || 'member'},</p>
            <p style="line-height: 1.6; color: #374151;">
              Your latest gym invoice is ready. Below is the breakdown for your membership plan or renewal.
            </p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 18px; margin-bottom: 24px;">
              <tbody>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280;">Issue date</td>
                  <td style="padding: 6px 0; text-align: right; font-weight: 700;">${invoiceRow.issue_date || '—'}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280;">Due date</td>
                  <td style="padding: 6px 0; text-align: right; font-weight: 700;">${invoiceRow.due_date || '—'}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280;">Billing period</td>
                  <td style="padding: 6px 0; text-align: right; font-weight: 700;">${invoiceRow.billing_period_start || '—'} to ${invoiceRow.billing_period_end || '—'}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280;">Status</td>
                  <td style="padding: 6px 0; text-align: right; font-weight: 700;">${invoiceRow.status || 'open'}</td>
                </tr>
              </tbody>
            </table>
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
              <thead>
                <tr style="background: #fff7ed;">
                  <th style="text-align: left; padding: 12px;">Description</th>
                  <th style="text-align: center; padding: 12px;">Qty</th>
                  <th style="text-align: right; padding: 12px;">Rate</th>
                  <th style="text-align: right; padding: 12px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${lineItemsHtml}
              </tbody>
            </table>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <tbody>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280;">Subtotal</td>
                  <td style="padding: 6px 0; text-align: right; font-weight: 700;">${formatCurrency(invoiceRow.subtotal_amount, invoiceRow.currency_code || 'INR')}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280;">Discount</td>
                  <td style="padding: 6px 0; text-align: right; font-weight: 700;">${formatCurrency(invoiceRow.discount_amount, invoiceRow.currency_code || 'INR')}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280;">Total</td>
                  <td style="padding: 6px 0; text-align: right; font-size: 18px; font-weight: 800;">${formatCurrency(invoiceRow.total_amount, invoiceRow.currency_code || 'INR')}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280;">Balance due</td>
                  <td style="padding: 6px 0; text-align: right; font-size: 18px; font-weight: 800;">${formatCurrency(invoiceRow.balance_due, invoiceRow.currency_code || 'INR')}</td>
                </tr>
              </tbody>
            </table>
            ${invoiceRow.notes ? `<p style="line-height: 1.6; color: #374151;"><strong>Note:</strong> ${invoiceRow.notes}</p>` : ''}
            <p style="margin-bottom: 0; line-height: 1.6; color: #374151;">
              Please contact the gym desk if you need help with payment, add-ons, or plan changes.
            </p>
          </div>
        </div>
      </div>
    `;

    try {
      const response = await resend.emails.send({
        from: billingFromEmail,
        to: recipientEmail,
        subject,
        html,
      });

      await recordEmailLog(adminClient, {
        invoice_id: invoiceRow.id,
        member_id: invoiceRow.member_id,
        recipient_email: recipientEmail,
        trigger_source: triggerSource,
        delivery_status: 'sent',
        provider_name: 'resend',
        provider_message_id: response.data?.id || null,
        subject,
        sent_at: new Date().toISOString(),
      });

      return json({
        success: true,
        invoiceId: invoiceRow.id,
        recipientEmail,
        providerMessageId: response.data?.id || null,
      });
    } catch (emailError) {
      const message = emailError instanceof Error ? emailError.message : 'Unable to send the billing email.';
      await recordEmailLog(adminClient, {
        invoice_id: invoiceRow.id,
        member_id: invoiceRow.member_id,
        recipient_email: recipientEmail,
        trigger_source: triggerSource,
        delivery_status: 'failed',
        provider_name: 'resend',
        subject,
        error_message: message,
      });
      return json({ error: message }, 500);
    }
  } catch (error) {
    console.error('Unhandled send-billing-email error', error);
    return json({ error: error instanceof Error ? error.message : 'Unexpected function error.' }, 500);
  }
});
