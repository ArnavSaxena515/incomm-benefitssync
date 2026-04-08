import { NextResponse } from 'next/server'
import { redis, KEYS } from '@/app/lib/redis'
import { CensusRecord, ContributionRecord, ReconciliationRecord } from '@/app/lib/types'

function sortRecords<T extends { _is_new?: boolean; _is_updated?: boolean; employee_id?: string }>(records: T[]): T[] {
  return records.sort((a, b) => {
    if (a._is_new && !b._is_new) return -1
    if (!a._is_new && b._is_new) return 1
    if (a._is_updated && !b._is_updated) return -1
    if (!a._is_updated && b._is_updated) return 1
    return (a.employee_id || '').localeCompare(b.employee_id || '')
  })
}

export async function GET() {
  const [census, contributions, reconciliation] = await Promise.all([
    redis.get<CensusRecord[]>(KEYS.CENSUS),
    redis.get<ContributionRecord[]>(KEYS.CONTRIBUTIONS),
    redis.get<ReconciliationRecord[]>(KEYS.RECONCILIATION),
  ])

  return NextResponse.json({
    census: sortRecords((census || []).filter(r => r.employee_id != null)),
    contributions: sortRecords((contributions || []).filter(r => r.employee_id != null)),
    reconciliation: (reconciliation || []).sort((a, b) => {
      if (a._is_new && !b._is_new) return -1
      if (!a._is_new && b._is_new) return 1
      return 0
    }),
  })
}
