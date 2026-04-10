import { NextResponse } from 'next/server'

export async function POST() {
  const triggerUrl = process.env.REFOLD_TRIGGER_URL
  const apiKey = process.env.REFOLD_API_KEY

  if (!triggerUrl || !apiKey) {
    return NextResponse.json({ success: false, message: 'Trigger URL not configured' }, { status: 400 })
  }

  try {
    const res = await fetch(triggerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'linked_account_id': 'cobalt_test_user',
        'slug': 'workday',
        'config_id': 'cobalt_test_user',
        'sync_execution': 'false',
      },
      body: JSON.stringify({}),
    })

    const data = await res.json().catch(() => ({}))
    return NextResponse.json({ success: true, ...data })
  } catch (err) {
    return NextResponse.json({ success: false, message: String(err) }, { status: 500 })
  }
}
