import { NextResponse } from 'next/server'
import { redis } from '@/app/lib/redis'

export async function GET() {
  const data = await redis.get<Record<string, unknown>[]>('reconciliation:latest')
  return NextResponse.json(data || [])
}
