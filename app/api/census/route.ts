import { NextResponse } from 'next/server'
import { redis } from '@/app/lib/redis'

const CENSUS_KEY = 'census:latest'

export async function GET() {
  const data = await redis.get<Record<string, unknown>[]>(CENSUS_KEY)
  return NextResponse.json(data || [])
}
