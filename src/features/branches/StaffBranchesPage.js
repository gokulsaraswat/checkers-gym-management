import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';

import LoadingScreen from '../../components/common/LoadingScreen';
import SetupNotice from '../../components/common/SetupNotice';
import EmptyStateCard from '../../components/common/EmptyStateCard';
import BranchSummaryCards from './BranchSummaryCards';
import {
  fetchAccessibleBranches,
  fetchBranchStaffAssignments,
  fetchBranchSummary,
} from './branchClient';

const StaffBranchesPage = () => {
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [summary, setSummary] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [feedback, setFeedback] = useState('');

  const selectedBranch = useMemo(
    () => branches.find((branch) => branch.id === selectedBranchId) || null,
    [branches, selectedBranchId],
  );

  const loadBranchWorkspace = useCallback(async (branchId) => {
    if (!branchId) {
      setSummary(null);
      setAssignments([]);
      return;
    }

    const [nextSummary, nextAssignments] = await Promise.all([
      fetchBranchSummary(branchId),
      fetchBranchStaffAssignments(branchId),
    ]);

    setSummary(nextSummary);
    setAssignments(nextAssignments);
  }, []);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const nextBranches = await fetchAccessibleBranches();
        setBranches(nextBranches);
        const defaultBranchId = nextBranches[0]?.id || '';
        setSelectedBranchId(defaultBranchId);

        if (defaultBranchId) {
          await loadBranchWorkspace(defaultBranchId);
        }
      } catch (error) {
        setFeedback(error.message || 'Unable to load branch workspace.');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [loadBranchWorkspace]);

  useEffect(() => {
    if (!selectedBranchId) {
      return;
    }

    loadBranchWorkspace(selectedBranchId).catch((error) => {
      setFeedback(error.message || 'Unable to refresh the selected branch.');
    });
  }, [loadBranchWorkspace, selectedBranchId]);

  if (loading) {
    return <LoadingScreen message="Loading your branch workspace..." />;
  }

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 4 }}>
      <SetupNotice title="Branch workspace needs Supabase setup" />

      <Stack spacing={1} mb={3}>
        <Typography variant="h4" fontWeight={800}>Staff branch workspace</Typography>
        <Typography color="text.secondary" maxWidth="860px">
          Review the branches you can work from, see the local operational summary, and confirm who is assigned to the location.
          This page is designed for branch managers, coaches, and front-desk staff who operate across multiple sites.
        </Typography>
      </Stack>

      {feedback ? (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 3 }}>{feedback}</Alert>
      ) : null}

      <Grid container spacing={3}>
        <Grid xs={12} lg={3.5}>
          <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, height: '100%' }}>
            <Typography variant="h6" fontWeight={800} mb={2}>Accessible branches</Typography>
            {!branches.length ? (
              <EmptyStateCard
                title="No branch assignments"
                description="Ask an admin to add you to at least one branch. Once assigned, your local summaries and branch tools will appear here."
              />
            ) : (
              <Stack spacing={1.25}>
                {branches.map((branch) => (
                  <Paper
                    key={branch.id}
                    variant={branch.id === selectedBranchId ? 'outlined' : 'elevation'}
                    onClick={() => setSelectedBranchId(branch.id)}
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      cursor: 'pointer',
                      borderColor: branch.id === selectedBranchId ? '#ff2625' : 'divider',
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" spacing={1.5}>
                      <Box>
                        <Typography fontWeight={800}>{branch.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {branch.city || 'City pending'}{branch.state ? `, ${branch.state}` : ''}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">Access: {branch.access_role}</Typography>
                      </Box>
                      {branch.is_primary ? <Chip label="Primary" size="small" color="error" /> : null}
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>

        <Grid xs={12} lg={8.5}>
          <BranchSummaryCards summary={summary} />

          <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, mt: 3 }}>
            <Typography variant="h6" fontWeight={800}>Selected branch roster</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Staff currently assigned to {selectedBranch?.name || 'the selected branch'}.
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {!assignments.length ? (
              <EmptyStateCard
                title="No roster data yet"
                description="Once staff assignments are saved for this branch, the roster will appear here with roles and dates."
              />
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Staff member</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Primary</TableCell>
                    <TableCell>Window</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {assignments.map((assignment) => (
                    <TableRow key={assignment.assignment_id} hover>
                      <TableCell>
                        <Typography fontWeight={700}>{assignment.full_name || assignment.email}</Typography>
                        <Typography variant="caption" color="text.secondary">{assignment.email}</Typography>
                      </TableCell>
                      <TableCell>{assignment.assignment_role}</TableCell>
                      <TableCell>{assignment.is_primary ? 'Yes' : 'No'}</TableCell>
                      <TableCell>
                        {assignment.starts_on || 'Today'}
                        {assignment.ends_on ? ` → ${assignment.ends_on}` : ''}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default StaffBranchesPage;
