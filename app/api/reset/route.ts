import { NextResponse } from 'next/server'
import { redis, KEYS } from '@/app/lib/redis'

export async function POST() {
  await Promise.all([
    redis.del(KEYS.CENSUS),
    redis.del(KEYS.CONTRIBUTIONS),
    redis.del(KEYS.RECONCILIATION),
    redis.del('census:latest'),
    redis.del('contributions:latest'),
    redis.del('reconciliation:latest'),
  ])
  return NextResponse.json({ success: true, message: 'All data cleared' })
}
