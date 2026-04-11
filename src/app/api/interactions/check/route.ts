import { NextResponse } from 'next/server'
import { getMultiDrugInteractions } from '@/lib/api/rxnorm-interactions'

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const drugs = body.drugs

    if (!Array.isArray(drugs)) {
      return NextResponse.json({ error: 'drugs must be an array' }, { status: 400 })
    }

    const validDrugs = drugs.filter(
      (d): d is string => typeof d === 'string' && d.trim().length > 0
    )

    if (validDrugs.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 drug names are required' },
        { status: 400 }
      )
    }

    if (validDrugs.length > 8) {
      return NextResponse.json(
        { error: 'Maximum of 8 drugs allowed' },
        { status: 400 }
      )
    }

    const result = await getMultiDrugInteractions(validDrugs)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
