import { NextResponse } from 'next/server'
import { redis, KEYS } from '@/app/lib/redis'
import { CensusRecord, ContributionRecord, ReconciliationRecord } from '@/app/lib/types'

export async function GET() {
  const [census, contributions, reconciliation] = await Promise.all([
    redis.get<CensusRecord[]>(KEYS.CENSUS),
    redis.get<ContributionRecord[]>(KEYS.CONTRIBUTIONS),
    redis.get<ReconciliationRecord[]>(KEYS.RECONCILIATION),
  ])

  const c = census || []
  const cont = contributions || []
  const recon = reconciliation || []

  const allTimestamps = [
    ...c.map(r => r.sync_timestamp),
    ...cont.map(r => r.sync_timestamp),
    ...recon.map(r => r.sync_timestamp),
  ].filter(Boolean)

  const lastSync = allTimestamps.length
    ? allTimestamps.sort().reverse()[0]
    : ''

  return NextResponse.json({
    total_employees: c.length,
    active: c.filter(r => r.employment_status === 'Active').length,
    terminated: c.filter(r => r.employment_status === 'Terminated').length,
    new_census: c.filter(r => r._is_new).length,
    updated_census: c.filter(r => r._is_updated).length,
    total_contributions: cont.length,
    new_contributions: cont.filter(r => r._is_new).length,
    reconciliation_runs: recon.length,
    last_sync: lastSync,
    recon_status: recon.length ? recon[recon.length - 1].status : 'N/A',
    total_ee: cont.reduce((sum, r) => sum + (r.employee_contribution || 0), 0),
    total_er: cont.reduce((sum, r) => sum + (r.employer_contribution || 0), 0),
  })
}
