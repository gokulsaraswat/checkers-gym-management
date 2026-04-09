import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import PlaceIcon from '@mui/icons-material/Place';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

import LoadingScreen from '../../components/common/LoadingScreen';
import SetupNotice from '../../components/common/SetupNotice';
import EmptyStateCard from '../../components/common/EmptyStateCard';
import MetricCard from '../../components/common/MetricCard';
import { useAuth } from '../../context/AuthContext';
import { fetchAccessibleBranches, fetchOwnBranchAffiliations } from './branchClient';

const formatDate = (value) => {
  if (!value) {
    return 'Open-ended';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
  }).format(date);
};

const MemberBranchesPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [affiliations, setAffiliations] = useState([]);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const [nextBranches, nextAffiliations] = await Promise.all([
          fetchAccessibleBranches(),
          fetchOwnBranchAffiliations(user?.id),
        ]);
        setBranches(nextBranches);
        setAffiliations(nextAffiliations);
      } catch (error) {
        setFeedback(error.message || 'Unable to load your branch access.');
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      run();
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  const primaryAffiliation = useMemo(
    () => affiliations.find((affiliation) => affiliation.is_primary) || affiliations[0] || null,
    [affiliations],
  );

  if (loading) {
    return <LoadingScreen message="Loading your branch access..." />;
  }

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 4 }}>
      <SetupNotice title="Branch access needs Supabase setup" />

      <Stack spacing={1} mb={3}>
        <Typography variant="h4" fontWeight={800}>My branches</Typography>
        <Typography color="text.secondary" maxWidth="860px">
          See your home branch, any additional training or visiting branch access, and where your membership can currently be used.
        </Typography>
      </Stack>

      {feedback ? (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 3 }}>{feedback}</Alert>
      ) : null}

      <Grid container spacing={2.25} mb={3}>
        <Grid xs={12} md={4}>
          <MetricCard
            title="Primary branch"
            value={primaryAffiliation?.branch?.name || 'Not assigned'}
            caption={primaryAffiliation?.affiliation_type || 'Ask admin to assign your home branch.'}
            icon={PlaceIcon}
          />
        </Grid>
        <Grid xs={12} md={4}>
          <MetricCard
            title="Accessible branches"
            value={branches.length}
            caption="Locations you can currently view or use in the app."
            icon={PlaceIcon}
          />
        </Grid>
        <Grid xs={12} md={4}>
          <MetricCard
            title="Active affiliations"
            value={affiliations.filter((item) => !item.ends_on || new Date(item.ends_on) >= new Date()).length}
            caption="Home, training, or visiting branch links currently active."
            icon={AccessTimeIcon}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid xs={12} lg={6}>
          <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, height: '100%' }}>
            <Typography variant="h6" fontWeight={800}>Your branch affiliations</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              These records control which locations appear for your schedule, attendance, and access control flows.
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {!affiliations.length ? (
              <EmptyStateCard
                title="No branch affiliation yet"
                description="Your gym can assign a home branch and optional training or visiting branches here."
              />
            ) : (
              <Stack spacing={1.5}>
                {affiliations.map((affiliation) => (
                  <Paper key={affiliation.id} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5}>
                      <Box>
                        <Typography fontWeight={800}>{affiliation.branch?.name || 'Unknown branch'}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {affiliation.branch?.city || 'City pending'}{affiliation.branch?.state ? `, ${affiliation.branch.state}` : ''}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(affiliation.starts_on)} → {formatDate(affiliation.ends_on)}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Chip label={affiliation.affiliation_type} size="small" />
                        {affiliation.is_primary ? <Chip label="Primary" size="small" color="error" /> : null}
                        {!affiliation.branch?.is_active ? <Chip label="Inactive branch" size="small" color="warning" /> : null}
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>

        <Grid xs={12} lg={6}>
          <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, height: '100%' }}>
            <Typography variant="h6" fontWeight={800}>Branch directory available to you</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              These are the branches returned by your current staff/member access rules.
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {!branches.length ? (
              <EmptyStateCard
                title="No accessible branches"
                description="Once your account is linked to a branch, it will appear here with the location summary."
              />
            ) : (
              <Stack spacing={1.5}>
                {branches.map((branch) => (
                  <Paper key={branch.id} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5}>
                      <Box>
                        <Typography fontWeight={800}>{branch.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {branch.city || 'City pending'}{branch.state ? `, ${branch.state}` : ''}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {branch.member_count ?? 0} members · {branch.active_staff_count ?? 0} staff linked
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Chip label={branch.access_role || 'member'} size="small" />
                        {branch.is_primary ? <Chip label="Primary" size="small" color="error" /> : null}
                        {!branch.is_active ? <Chip label="Inactive" size="small" color="warning" /> : null}
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MemberBranchesPage;
