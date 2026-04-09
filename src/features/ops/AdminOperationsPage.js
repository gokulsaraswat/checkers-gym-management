import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
  Switch,
  Typography,
} from '@mui/material'
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded'
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded'
import MetricCard from './components/MetricCard'
import SectionCard from './components/SectionCard'
import StatusChip from './components/StatusChip'
import AsyncScreenState from '../../components/common/AsyncScreenState'
import {
  getAdminOperationsSnapshot,
  listOpenOpsIncidents,
  listOpsChecklist,
  listReleaseNotes,
  toggleOpsChecklistItem,
} from './opsClient'
import { dashboardGridColumns, layoutGutters } from '../../theme/responsiveTokens'

const fallbackLinks = [
  { href: '/admin/security', label: 'Security center' },
  { href: '/admin/finance', label: 'Finance exports' },
  { href: '/admin/crm', label: 'Lead pipeline' },
  { href: '/admin/branches', label: 'Branch operations' },
]

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch (error) {
    return value
  }
}

export default function AdminOperationsPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [snapshot, setSnapshot] = useState(null)
  const [checklist, setChecklist] = useState([])
  const [incidents, setIncidents] = useState([])
  const [releaseNotes, setReleaseNotes] = useState([])

  const hydrate = useCallback(async ({ background = false } = {}) => {
    if (background) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError('')

    try {
      const [snapshotData, checklistData, incidentData, releaseData] = await Promise.all([
        getAdminOperationsSnapshot(),
        listOpsChecklist(),
        listOpenOpsIncidents(),
        listReleaseNotes(8),
      ])

      setSnapshot(snapshotData)
      setChecklist(checklistData || [])
      setIncidents(incidentData || [])
      setReleaseNotes(releaseData || [])
    } catch (fetchError) {
      setError(fetchError.message || 'Unable to load operations workspace.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    hydrate()
  }, [hydrate])

  const completionRate = useMemo(() => {
    if (!checklist.length) return 0
    const complete = checklist.filter((item) => item.completed).length
    return Math.round((complete / checklist.length) * 100)
  }, [checklist])

  const handleChecklistToggle = async (itemId, completed) => {
    const previous = checklist
    setChecklist((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, completed } : item
      )
    )

    try {
      await toggleOpsChecklistItem(itemId, completed)
    } catch (toggleError) {
      setChecklist(previous)
      setError(toggleError.message || 'Unable to update checklist item.')
    }
  }

  return (
    <Stack spacing={3} sx={{ px: layoutGutters, py: { xs: 2, md: 3 } }}>
      <Stack
        alignItems={{ xs: 'flex-start', md: 'center' }}
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        spacing={2}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Operations & launch readiness
          </Typography>
          <Typography color="text.secondary" variant="body1">
            Final-polish workspace for daily ops, readiness checks, incidents, and release visibility.
          </Typography>
        </Box>
        <Button
          onClick={() => hydrate({ background: true })}
          startIcon={<AutorenewRoundedIcon />}
          variant="outlined"
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </Button>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <AsyncScreenState
        empty={!loading && !snapshot}
        error=""
        loading={loading}
        loadingLabel="Loading operations workspace…"
        title="No operations data yet"
        description="Run the Patch 21 migration first, then refresh this page."
      >
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: dashboardGridColumns,
          }}
        >
          <MetricCard label="Total members" value={snapshot?.total_members ?? 0} helper="All member profiles" />
          <MetricCard label="Active members" value={snapshot?.active_members ?? 0} helper="Eligible memberships" />
          <MetricCard label="Unpaid invoices" value={snapshot?.unpaid_invoices ?? 0} helper="Issued / overdue invoices" />
          <MetricCard label="Checklist complete" value={`${completionRate}%`} helper={`${checklist.filter((item) => item.completed).length}/${checklist.length || 0} items`} />
        </Box>

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', xl: '1.4fr 1fr' },
          }}
        >
          <SectionCard
            title="Launch checklist"
            subtitle="Track the final tasks that must be green before you go fully live."
            actions={<StatusChip status={completionRate === 100 ? 'completed' : 'running'} size="medium" />}
          >
            <List disablePadding>
              {checklist.length ? (
                checklist.map((item, index) => (
                  <Box key={item.id}>
                    <ListItem
                      disableGutters
                      secondaryAction={(
                        <Switch
                          checked={Boolean(item.completed)}
                          edge="end"
                          onChange={(event) => handleChecklistToggle(item.id, event.target.checked)}
                        />
                      )}
                    >
                      <ListItemText
                        primary={item.title}
                        secondary={item.description || `Priority: ${item.priority || 'normal'}`}
                        primaryTypographyProps={{
                          sx: item.completed ? { textDecoration: 'line-through', color: 'text.secondary' } : undefined,
                        }}
                      />
                    </ListItem>
                    {index < checklist.length - 1 ? <Divider component="li" /> : null}
                  </Box>
                ))
              ) : (
                <Typography color="text.secondary" variant="body2">
                  No checklist items found. Seed data from the migration should create the first launch checklist.
                </Typography>
              )}
            </List>
          </SectionCard>

          <Stack spacing={2}>
            <SectionCard
              title="Open incidents"
              subtitle="Keep operational issues visible for admins and staff leads."
              actions={<StatusChip status={incidents.length ? 'open' : 'healthy'} size="medium" />}
            >
              <Stack spacing={1.5}>
                {incidents.length ? (
                  incidents.map((incident) => (
                    <Box key={incident.id}>
                      <Stack direction="row" justifyContent="space-between" spacing={2}>
                        <Typography sx={{ fontWeight: 600 }}>{incident.title}</Typography>
                        <StatusChip status={incident.status} />
                      </Stack>
                      <Typography color="text.secondary" variant="body2">
                        {incident.summary || 'No summary provided.'}
                      </Typography>
                      <Typography color="text.secondary" variant="caption">
                        Updated {formatDate(incident.updated_at)}
                      </Typography>
                    </Box>
                  ))
                ) : (
                  <Alert severity="success" variant="outlined">
                    No active incidents. Your operations board is clear.
                  </Alert>
                )}
              </Stack>
            </SectionCard>

            <SectionCard title="Quick links" subtitle="Jump into the admin surfaces most likely to need attention.">
              <Stack spacing={1.25}>
                {fallbackLinks.map((link) => (
                  <Button
                    component="a"
                    endIcon={<LaunchRoundedIcon />}
                    href={link.href}
                    key={link.href}
                    sx={{ justifyContent: 'space-between' }}
                    variant="outlined"
                  >
                    {link.label}
                  </Button>
                ))}
              </Stack>
            </SectionCard>
          </Stack>
        </Box>

        <SectionCard
          title="Release notes"
          subtitle="Use this to surface recent launches, fixes, and operator-facing changes."
        >
          <List disablePadding>
            {releaseNotes.length ? (
              releaseNotes.map((note, index) => (
                <Box key={note.id}>
                  <ListItem disableGutters>
                    <ListItemText
                      primary={note.title}
                      secondary={
                        <>
                          <Typography component="span" display="block" variant="body2" color="text.secondary">
                            {note.summary || 'No summary provided.'}
                          </Typography>
                          <Typography component="span" variant="caption" color="text.secondary">
                            Published {formatDate(note.published_at)}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                  {index < releaseNotes.length - 1 ? <Divider component="li" /> : null}
                </Box>
              ))
            ) : (
              <Typography color="text.secondary" variant="body2">
                No release notes yet. Add the first note directly in Supabase or through a future admin editor.
              </Typography>
            )}
          </List>
        </SectionCard>
      </AsyncScreenState>
    </Stack>
  )
}
