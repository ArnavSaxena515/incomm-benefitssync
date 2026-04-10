import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/app/lib/redis'

const CENSUS_KEY = 'census:latest'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const records: Record<string, unknown>[] = Array.isArray(body) ? body : Array.isArray(body.bulk_records) ? body.bulk_records : [body]

  await redis.set(CENSUS_KEY, records)

  return NextResponse.json({ success: true, count: records.length })
}
