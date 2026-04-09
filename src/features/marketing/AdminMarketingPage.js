import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  createReferralInvite,
  getMarketingDashboardSnapshot,
  listAccessibleBranches,
  listMarketingCampaigns,
  listPromoCodes,
  listReferralInvites,
  listReferralPrograms,
  listTrialPasses,
  saveMarketingCampaign,
  savePromoCode,
  saveReferralProgram,
  saveTrialPass,
} from './marketingClient';
import { formatCurrency, formatDate, formatDateTime, humanizeLabel, safePercent } from './formatters';

const CAMPAIGN_CHANNELS = ['email', 'sms', 'whatsapp', 'push', 'manual'];
const CAMPAIGN_TYPES = ['broadcast', 'renewal', 'winback', 'lead_nurture', 'referral', 'promo'];
const CAMPAIGN_STATUSES = ['draft', 'scheduled', 'running', 'completed', 'paused', 'cancelled'];
const REWARD_TYPES = ['flat_discount', 'percentage_discount', 'credits', 'free_addon'];
const PROMO_TYPES = ['flat', 'percentage'];
const PROMO_APPLIES_TO = ['all', 'membership', 'addon', 'trial', 'pos'];
const TRIAL_SOURCES = ['walk_in', 'instagram', 'referral', 'website', 'whatsapp', 'staff'];
const TRIAL_STATUSES = ['issued', 'booked', 'attended', 'converted', 'expired', 'cancelled'];

const emptyCampaign = {
  title: '',
  channel: 'email',
  campaign_type: 'broadcast',
  status: 'draft',
  scheduled_for: '',
  notes: '',
};

const emptyProgram = {
  name: '',
  code_prefix: 'REFER',
  reward_type: 'flat_discount',
  referrer_reward_value: 500,
  referee_reward_value: 500,
  is_active: true,
  start_date: '',
  end_date: '',
  notes: '',
};

const emptyPromo = {
  code: '',
  label: '',
  discount_type: 'percentage',
  discount_value: 10,
  applies_to: 'membership',
  valid_from: '',
  valid_to: '',
  max_redemptions: '',
  notes: '',
  is_active: true,
};

const emptyInvite = {
  program_id: '',
  referred_name: '',
  referred_email: '',
  referred_phone: '',
  notes: '',
};

const emptyTrial = {
  full_name: '',
  email: '',
  phone: '',
  source: 'walk_in',
  status: 'issued',
  issued_on: new Date().toISOString().slice(0, 10),
  expires_on: '',
  notes: '',
};

function StatCard({ label, value, helper }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h4" sx={{ mt: 1 }}>
          {value}
        </Typography>
        {helper ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {helper}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="h6">{title}</Typography>
      {subtitle ? (
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      ) : null}
    </Box>
  );
}

export default function AdminMarketingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [branchId, setBranchId] = useState('');
  const [branches, setBranches] = useState([]);
  const [snapshot, setSnapshot] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [invites, setInvites] = useState([]);
  const [promoCodes, setPromoCodes] = useState([]);
  const [trials, setTrials] = useState([]);
  const [campaignForm, setCampaignForm] = useState(emptyCampaign);
  const [programForm, setProgramForm] = useState(emptyProgram);
  const [promoForm, setPromoForm] = useState(emptyPromo);
  const [inviteForm, setInviteForm] = useState(emptyInvite);
  const [trialForm, setTrialForm] = useState({
    ...emptyTrial,
    expires_on: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  });

  const selectedProgramOptions = useMemo(
    () => programs.filter((item) => item.is_active),
    [programs]
  );

  const handleFailure = useCallback((err) => {
    setSuccess('');
    setError(err?.message || 'Something went wrong while loading marketing data.');
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [branchRows, snapshotData, campaignRows, programRows, inviteRows, promoRows, trialRows] =
        await Promise.all([
          listAccessibleBranches(),
          getMarketingDashboardSnapshot(branchId || null),
          listMarketingCampaigns(branchId || null),
          listReferralPrograms(branchId || null),
          listReferralInvites(branchId || null),
          listPromoCodes(branchId || null),
          listTrialPasses(branchId || null),
        ]);

      setBranches(branchRows || []);
      setSnapshot(snapshotData || {});
      setCampaigns(campaignRows || []);
      setPrograms(programRows || []);
      setInvites(inviteRows || []);
      setPromoCodes(promoRows || []);
      setTrials(trialRows || []);
    } catch (err) {
      handleFailure(err);
    } finally {
      setLoading(false);
    }
  }, [branchId, handleFailure]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const performSave = useCallback(async (action, successMessage, reset) => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await action();
      if (reset) reset();
      setSuccess(successMessage);
      await loadAll();
    } catch (err) {
      handleFailure(err);
    } finally {
      setSaving(false);
    }
  }, [handleFailure, loadAll]);

  const branchMenuItems = useMemo(() => [{ id: '', branch_name: 'All branches' }, ...branches], [branches]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', lg: 'center' }}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4">Marketing and Growth</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Manage referral programs, promo codes, campaigns, and trial conversions from one place.
          </Typography>
        </Box>
        <TextField
          select
          size="small"
          label="Branch"
          value={branchId}
          onChange={(event) => setBranchId(event.target.value)}
          sx={{ minWidth: 220 }}
        >
          {branchMenuItems.map((branch) => (
            <MenuItem key={branch.id || 'all'} value={branch.id || ''}>
              {branch.branch_name || 'All branches'}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}
      {success ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      ) : null}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            label="Active campaigns"
            value={snapshot?.active_campaigns ?? 0}
            helper={`${snapshot?.scheduled_campaigns ?? 0} scheduled`}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            label="Referral joins"
            value={snapshot?.referral_conversions ?? 0}
            helper={`${snapshot?.open_referrals ?? 0} open invites`}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            label="Promo redemptions"
            value={snapshot?.promo_redemptions ?? 0}
            helper={`${snapshot?.active_promo_codes ?? 0} active codes`}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            label="Trial conversion rate"
            value={safePercent(snapshot?.trial_conversion_rate ?? 0)}
            helper={`${snapshot?.trial_converted ?? 0} converted`}
          />
        </Grid>
      </Grid>

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Overview" />
          <Tab label="Campaigns" />
          <Tab label="Referrals" />
          <Tab label="Promo codes" />
          <Tab label="Trials" />
        </Tabs>
      </Paper>

      {tab === 0 ? (
        <Grid container spacing={2}>
          <Grid item xs={12} lg={7}>
            <Card>
              <CardContent>
                <SectionHeader
                  title="Growth pulse"
                  subtitle="Top level signals the owner can review daily without digging into raw rows."
                />
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                      <Typography variant="subtitle2">Campaign engagement</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Delivery rate: {safePercent(snapshot?.delivery_rate ?? 0)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Open rate: {safePercent(snapshot?.open_rate ?? 0)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Click rate: {safePercent(snapshot?.click_rate ?? 0)}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                      <Typography variant="subtitle2">Revenue influenced</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Promo revenue: {formatCurrency(snapshot?.promo_revenue ?? 0)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Referral revenue: {formatCurrency(snapshot?.referral_revenue ?? 0)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Trial conversions: {snapshot?.trial_converted ?? 0}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} lg={5}>
            <Card>
              <CardContent>
                <SectionHeader
                  title="Next actions"
                  subtitle="Simple actions that usually move revenue fastest."
                />
                <Stack spacing={1.5}>
                  <Chip label={`${snapshot?.expiring_soon_members ?? 0} members expiring in 14 days`} />
                  <Chip label={`${snapshot?.inactive_trials ?? 0} trial passes need follow-up`} />
                  <Chip label={`${snapshot?.stale_referrals ?? 0} referrals untouched for 7+ days`} />
                  <Chip label={`${snapshot?.paused_campaigns ?? 0} campaigns paused or unfinished`} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : null}

      {tab === 1 ? (
        <Grid container spacing={2}>
          <Grid item xs={12} lg={4}>
            <Card>
              <CardContent>
                <SectionHeader title="Create campaign" subtitle="Email, SMS, WhatsApp, or manual growth push." />
                <Stack spacing={2}>
                  <TextField
                    label="Title"
                    value={campaignForm.title}
                    onChange={(event) => setCampaignForm((prev) => ({ ...prev, title: event.target.value }))}
                  />
                  <TextField
                    select
                    label="Channel"
                    value={campaignForm.channel}
                    onChange={(event) => setCampaignForm((prev) => ({ ...prev, channel: event.target.value }))}
                  >
                    {CAMPAIGN_CHANNELS.map((option) => (
                      <MenuItem key={option} value={option}>
                        {humanizeLabel(option)}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Type"
                    value={campaignForm.campaign_type}
                    onChange={(event) => setCampaignForm((prev) => ({ ...prev, campaign_type: event.target.value }))}
                  >
                    {CAMPAIGN_TYPES.map((option) => (
                      <MenuItem key={option} value={option}>
                        {humanizeLabel(option)}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Status"
                    value={campaignForm.status}
                    onChange={(event) => setCampaignForm((prev) => ({ ...prev, status: event.target.value }))}
                  >
                    {CAMPAIGN_STATUSES.map((option) => (
                      <MenuItem key={option} value={option}>
                        {humanizeLabel(option)}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Schedule"
                    type="datetime-local"
                    InputLabelProps={{ shrink: true }}
                    value={campaignForm.scheduled_for}
                    onChange={(event) => setCampaignForm((prev) => ({ ...prev, scheduled_for: event.target.value }))}
                  />
                  <TextField
                    label="Notes"
                    multiline
                    minRows={3}
                    value={campaignForm.notes}
                    onChange={(event) => setCampaignForm((prev) => ({ ...prev, notes: event.target.value }))}
                  />
                  <Button
                    variant="contained"
                    disabled={saving || !campaignForm.title.trim()}
                    onClick={() =>
                      performSave(
                        () => saveMarketingCampaign({ ...campaignForm, branch_id: branchId || null }),
                        'Campaign saved.',
                        () => setCampaignForm(emptyCampaign)
                      )
                    }
                  >
                    {saving ? 'Saving...' : 'Save campaign'}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent>
                <SectionHeader title="Recent campaigns" subtitle="Latest outreach and growth pushes." />
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Title</TableCell>
                      <TableCell>Channel</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Scheduled</TableCell>
                      <TableCell align="right">Sent</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {campaigns.length ? (
                      campaigns.map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell>
                            <Typography variant="body2">{row.title}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {row.notes || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>{humanizeLabel(row.channel)}</TableCell>
                          <TableCell>{humanizeLabel(row.campaign_type)}</TableCell>
                          <TableCell>
                            <Chip size="small" label={humanizeLabel(row.status)} />
                          </TableCell>
                          <TableCell>{formatDateTime(row.scheduled_for)}</TableCell>
                          <TableCell align="right">{row.sent_count || 0}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Typography color="text.secondary">No campaigns yet.</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : null}

      {tab === 2 ? (
        <Grid container spacing={2}>
          <Grid item xs={12} xl={4}>
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <SectionHeader title="Referral program" subtitle="Offer a reward to the referrer and the new joiner." />
                <Stack spacing={2}>
                  <TextField
                    label="Program name"
                    value={programForm.name}
                    onChange={(event) => setProgramForm((prev) => ({ ...prev, name: event.target.value }))}
                  />
                  <TextField
                    label="Code prefix"
                    value={programForm.code_prefix}
                    onChange={(event) => setProgramForm((prev) => ({ ...prev, code_prefix: event.target.value.toUpperCase() }))}
                  />
                  <TextField
                    select
                    label="Reward type"
                    value={programForm.reward_type}
                    onChange={(event) => setProgramForm((prev) => ({ ...prev, reward_type: event.target.value }))}
                  >
                    {REWARD_TYPES.map((option) => (
                      <MenuItem key={option} value={option}>
                        {humanizeLabel(option)}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    type="number"
                    label="Referrer reward"
                    value={programForm.referrer_reward_value}
                    onChange={(event) => setProgramForm((prev) => ({ ...prev, referrer_reward_value: event.target.value }))}
                  />
                  <TextField
                    type="number"
                    label="Referred reward"
                    value={programForm.referee_reward_value}
                    onChange={(event) => setProgramForm((prev) => ({ ...prev, referee_reward_value: event.target.value }))}
                  />
                  <Button
                    variant="contained"
                    disabled={saving || !programForm.name.trim()}
                    onClick={() =>
                      performSave(
                        () => saveReferralProgram({ ...programForm, branch_id: branchId || null }),
                        'Referral program saved.',
                        () => setProgramForm(emptyProgram)
                      )
                    }
                  >
                    {saving ? 'Saving...' : 'Save referral program'}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <SectionHeader title="Create referral invite" subtitle="Give staff a fast way to send or log referrals." />
                <Stack spacing={2}>
                  <TextField
                    select
                    label="Program"
                    value={inviteForm.program_id}
                    onChange={(event) => setInviteForm((prev) => ({ ...prev, program_id: event.target.value }))}
                  >
                    {selectedProgramOptions.map((option) => (
                      <MenuItem key={option.id} value={option.id}>
                        {option.name}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Referred name"
                    value={inviteForm.referred_name}
                    onChange={(event) => setInviteForm((prev) => ({ ...prev, referred_name: event.target.value }))}
                  />
                  <TextField
                    label="Email"
                    value={inviteForm.referred_email}
                    onChange={(event) => setInviteForm((prev) => ({ ...prev, referred_email: event.target.value }))}
                  />
                  <TextField
                    label="Phone"
                    value={inviteForm.referred_phone}
                    onChange={(event) => setInviteForm((prev) => ({ ...prev, referred_phone: event.target.value }))}
                  />
                  <TextField
                    label="Notes"
                    multiline
                    minRows={2}
                    value={inviteForm.notes}
                    onChange={(event) => setInviteForm((prev) => ({ ...prev, notes: event.target.value }))}
                  />
                  <Button
                    variant="contained"
                    disabled={saving || !inviteForm.referred_name.trim() || !inviteForm.program_id}
                    onClick={() =>
                      performSave(
                        () =>
                          createReferralInvite({
                            ...inviteForm,
                            branch_id: branchId || null,
                            invite_code: `${(programs.find((item) => item.id === inviteForm.program_id)?.code_prefix || 'REFER').toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
                          }),
                        'Referral invite created.',
                        () => setInviteForm(emptyInvite)
                      )
                    }
                  >
                    {saving ? 'Saving...' : 'Create invite'}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} xl={8}>
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <SectionHeader title="Programs" subtitle="Active and historical referral programs." />
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Prefix</TableCell>
                      <TableCell>Reward</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Window</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {programs.length ? (
                      programs.map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell>{row.name}</TableCell>
                          <TableCell>{row.code_prefix}</TableCell>
                          <TableCell>
                            {formatCurrency(row.referrer_reward_value)} / {formatCurrency(row.referee_reward_value)}
                          </TableCell>
                          <TableCell>
                            <Chip size="small" label={row.is_active ? 'Active' : 'Inactive'} />
                          </TableCell>
                          <TableCell>
                            {formatDate(row.start_date)} - {formatDate(row.end_date)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5}>No referral programs yet.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <SectionHeader title="Latest invites" subtitle="Track who has been invited and who converted." />
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Invite</TableCell>
                      <TableCell>Program</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Reward</TableCell>
                      <TableCell>Created</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invites.length ? (
                      invites.map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell>
                            <Typography variant="body2">{row.referred_name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {row.invite_code}
                            </Typography>
                          </TableCell>
                          <TableCell>{row.referral_programs?.name || '-'}</TableCell>
                          <TableCell>
                            <Chip size="small" label={humanizeLabel(row.status)} />
                          </TableCell>
                          <TableCell>{humanizeLabel(row.reward_status || 'pending')}</TableCell>
                          <TableCell>{formatDateTime(row.created_at)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5}>No referral invites yet.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : null}

      {tab === 3 ? (
        <Grid container spacing={2}>
          <Grid item xs={12} lg={4}>
            <Card>
              <CardContent>
                <SectionHeader title="Promo code" subtitle="Create an offer for memberships, add-ons, POS, or trials." />
                <Stack spacing={2}>
                  <TextField
                    label="Code"
                    value={promoForm.code}
                    onChange={(event) => setPromoForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
                  />
                  <TextField
                    label="Label"
                    value={promoForm.label}
                    onChange={(event) => setPromoForm((prev) => ({ ...prev, label: event.target.value }))}
                  />
                  <TextField
                    select
                    label="Discount type"
                    value={promoForm.discount_type}
                    onChange={(event) => setPromoForm((prev) => ({ ...prev, discount_type: event.target.value }))}
                  >
                    {PROMO_TYPES.map((option) => (
                      <MenuItem key={option} value={option}>
                        {humanizeLabel(option)}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    type="number"
                    label="Discount value"
                    value={promoForm.discount_value}
                    onChange={(event) => setPromoForm((prev) => ({ ...prev, discount_value: event.target.value }))}
                  />
                  <TextField
                    select
                    label="Applies to"
                    value={promoForm.applies_to}
                    onChange={(event) => setPromoForm((prev) => ({ ...prev, applies_to: event.target.value }))}
                  >
                    {PROMO_APPLIES_TO.map((option) => (
                      <MenuItem key={option} value={option}>
                        {humanizeLabel(option)}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    type="date"
                    label="Valid from"
                    InputLabelProps={{ shrink: true }}
                    value={promoForm.valid_from}
                    onChange={(event) => setPromoForm((prev) => ({ ...prev, valid_from: event.target.value }))}
                  />
                  <TextField
                    type="date"
                    label="Valid to"
                    InputLabelProps={{ shrink: true }}
                    value={promoForm.valid_to}
                    onChange={(event) => setPromoForm((prev) => ({ ...prev, valid_to: event.target.value }))}
                  />
                  <Button
                    variant="contained"
                    disabled={saving || !promoForm.code.trim() || !promoForm.label.trim()}
                    onClick={() =>
                      performSave(
                        () => savePromoCode({ ...promoForm, branch_id: branchId || null }),
                        'Promo code saved.',
                        () => setPromoForm(emptyPromo)
                      )
                    }
                  >
                    {saving ? 'Saving...' : 'Save promo code'}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent>
                <SectionHeader title="Promo codes" subtitle="Quick visibility into active offers and usage." />
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Code</TableCell>
                      <TableCell>Offer</TableCell>
                      <TableCell>Scope</TableCell>
                      <TableCell>Validity</TableCell>
                      <TableCell align="right">Redemptions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {promoCodes.length ? (
                      promoCodes.map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell>
                            <Typography variant="body2">{row.code}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {row.label}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {row.discount_type === 'percentage'
                              ? `${Number(row.discount_value || 0)}%`
                              : formatCurrency(row.discount_value || 0)}
                          </TableCell>
                          <TableCell>{humanizeLabel(row.applies_to)}</TableCell>
                          <TableCell>
                            {formatDate(row.valid_from)} - {formatDate(row.valid_to)}
                          </TableCell>
                          <TableCell align="right">{row.redemptions_count || 0}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5}>No promo codes yet.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : null}

      {tab === 4 ? (
        <Grid container spacing={2}>
          <Grid item xs={12} lg={4}>
            <Card>
              <CardContent>
                <SectionHeader title="Issue trial pass" subtitle="Track short trial windows and source quality." />
                <Stack spacing={2}>
                  <TextField
                    label="Full name"
                    value={trialForm.full_name}
                    onChange={(event) => setTrialForm((prev) => ({ ...prev, full_name: event.target.value }))}
                  />
                  <TextField
                    label="Email"
                    value={trialForm.email}
                    onChange={(event) => setTrialForm((prev) => ({ ...prev, email: event.target.value }))}
                  />
                  <TextField
                    label="Phone"
                    value={trialForm.phone}
                    onChange={(event) => setTrialForm((prev) => ({ ...prev, phone: event.target.value }))}
                  />
                  <TextField
                    select
                    label="Source"
                    value={trialForm.source}
                    onChange={(event) => setTrialForm((prev) => ({ ...prev, source: event.target.value }))}
                  >
                    {TRIAL_SOURCES.map((option) => (
                      <MenuItem key={option} value={option}>
                        {humanizeLabel(option)}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Status"
                    value={trialForm.status}
                    onChange={(event) => setTrialForm((prev) => ({ ...prev, status: event.target.value }))}
                  >
                    {TRIAL_STATUSES.map((option) => (
                      <MenuItem key={option} value={option}>
                        {humanizeLabel(option)}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    type="date"
                    label="Issued on"
                    InputLabelProps={{ shrink: true }}
                    value={trialForm.issued_on}
                    onChange={(event) => setTrialForm((prev) => ({ ...prev, issued_on: event.target.value }))}
                  />
                  <TextField
                    type="date"
                    label="Expires on"
                    InputLabelProps={{ shrink: true }}
                    value={trialForm.expires_on}
                    onChange={(event) => setTrialForm((prev) => ({ ...prev, expires_on: event.target.value }))}
                  />
                  <Button
                    variant="contained"
                    disabled={saving || !trialForm.full_name.trim() || !trialForm.expires_on}
                    onClick={() =>
                      performSave(
                        () => saveTrialPass({ ...trialForm, branch_id: branchId || null }),
                        'Trial pass saved.',
                        () =>
                          setTrialForm({
                            ...emptyTrial,
                            issued_on: new Date().toISOString().slice(0, 10),
                            expires_on: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
                          })
                      )
                    }
                  >
                    {saving ? 'Saving...' : 'Save trial pass'}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent>
                <SectionHeader title="Recent trial passes" subtitle="See which sources convert and which trials are stalling." />
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Source</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Issued</TableCell>
                      <TableCell>Expires</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {trials.length ? (
                      trials.map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell>
                            <Typography variant="body2">{row.full_name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {row.email || row.phone || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>{humanizeLabel(row.source)}</TableCell>
                          <TableCell>
                            <Chip size="small" label={humanizeLabel(row.status)} />
                          </TableCell>
                          <TableCell>{formatDate(row.issued_on)}</TableCell>
                          <TableCell>{formatDate(row.expires_on)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5}>No trial passes yet.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : null}

      <Divider sx={{ my: 3 }} />
      <Typography variant="caption" color="text.secondary">
        Patch 25 is intentionally additive. It creates the marketing data model and admin workspace but does not automatically send campaigns through third-party channels yet.
      </Typography>
    </Box>
  );
}
