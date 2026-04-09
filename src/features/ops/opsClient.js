import { supabase } from '../../lib/supabaseClient'

async function rpc(fnName, params = {}) {
  const { data, error } = await supabase.rpc(fnName, params)
  if (error) {
    throw error
  }
  return data
}

export async function getAdminOperationsSnapshot() {
  const result = await rpc('get_admin_operations_snapshot')
  return Array.isArray(result) ? result[0] ?? null : result
}

export async function listOpsChecklist() {
  return rpc('list_ops_checklist')
}

export async function toggleOpsChecklistItem(itemId, completed) {
  return rpc('toggle_ops_checklist_item', {
    p_completed: completed,
    p_id: itemId,
  })
}

export async function listOpenOpsIncidents() {
  return rpc('list_open_ops_incidents')
}

export async function listReleaseNotes(limit = 10) {
  return rpc('list_release_notes', {
    p_limit: limit,
  })
}
