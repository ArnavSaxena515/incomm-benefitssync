import { NextRequest, NextResponse } from 'next/server'
import { redis, KEYS } from '@/app/lib/redis'
import { ReconciliationRecord } from '@/app/lib/types'

const IGNORE_FIELDS = new Set(['sync_timestamp', '_created_at', '_updated_at', '_is_new', '_is_updated'])

function hasChanges(existing: ReconciliationRecord, incoming: ReconciliationRecord): boolean {
  for (const key of Object.keys(incoming)) {
    if (IGNORE_FIELDS.has(key)) continue
    if ((existing as unknown as Record<string, unknown>)[key] !== (incoming as unknown as Record<string, unknown>)[key]) return true
  }
  return false
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const records: ReconciliationRecord[] = Array.isArray(body) ? body : [body]
  const results = []
  const now = new Date().toISOString()

  const existing: ReconciliationRecord[] = (await redis.get(KEYS.RECONCILIATION)) || []

  for (const record of records) {
    const idx = existing.findIndex(r => r.payroll_run_id === record.payroll_run_id)
    if (idx >= 0) {
      if (hasChanges(existing[idx], record)) {
        existing[idx] = { ...record, _is_new: false, _is_updated: true, _created_at: existing[idx]._created_at, _updated_at: now }
        results.push({ success: true, action: 'updated', payroll_run_id: record.payroll_run_id })
      } else {
        existing[idx] = { ...existing[idx], _is_new: false, _is_updated: false }
        results.push({ success: true, action: 'unchanged', payroll_run_id: record.payroll_run_id })
      }
    } else {
      existing.push({ ...record, _is_new: true, _is_updated: false, _created_at: now, _updated_at: now })
      results.push({ success: true, action: 'created', payroll_run_id: record.payroll_run_id })
    }
  }

  await redis.set(KEYS.RECONCILIATION, existing)
  return NextResponse.json(results.length === 1 ? results[0] : results)
}
