import { NextRequest, NextResponse } from 'next/server'
import { redis, KEYS } from '@/app/lib/redis'
import { ContributionRecord } from '@/app/lib/types'

const IGNORE_FIELDS = new Set(['sync_timestamp', '_created_at', '_updated_at', '_is_new', '_is_updated'])

function compositeKey(r: ContributionRecord) {
  return `${r.employee_id}::${r.benefits_account_type}::${r.payroll_run_id}`
}

function hasChanges(existing: ContributionRecord, incoming: ContributionRecord): boolean {
  for (const key of Object.keys(incoming)) {
    if (IGNORE_FIELDS.has(key)) continue
    if ((existing as unknown as Record<string, unknown>)[key] !== (incoming as unknown as Record<string, unknown>)[key]) return true
  }
  return false
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  let records: ContributionRecord[]
  if (Array.isArray(body.bulk_records)) {
    records = body.bulk_records
  } else if (Array.isArray(body)) {
    records = body
  } else if (body.employee_id != null) {
    records = [body]
  } else {
    return NextResponse.json({ success: false, message: 'No valid records found' }, { status: 400 })
  }

  const now = new Date().toISOString()
  let created = 0, updated = 0, unchanged = 0

  const existing: ContributionRecord[] = (await redis.get(KEYS.CONTRIBUTIONS)) || []

  for (const record of records) {
    const key = compositeKey(record)
    const idx = existing.findIndex(r => compositeKey(r) === key)
    if (idx >= 0) {
      if (hasChanges(existing[idx], record)) {
        existing[idx] = { ...record, _is_new: false, _is_updated: true, _created_at: existing[idx]._created_at, _updated_at: now }
        updated++
      } else {
        existing[idx] = { ...existing[idx], _is_new: false, _is_updated: false }
        unchanged++
      }
    } else {
      existing.push({ ...record, _is_new: true, _is_updated: false, _created_at: now, _updated_at: now })
      created++
    }
  }

  await redis.set(KEYS.CONTRIBUTIONS, existing)
  return NextResponse.json({ success: true, total: records.length, created, updated, unchanged })
}
