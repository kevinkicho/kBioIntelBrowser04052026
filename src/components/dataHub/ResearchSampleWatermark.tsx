'use client'

import Link from 'next/link'
import { HelperTip } from '@/components/ui/HelperTip'

export interface ResearchSampleWatermarkProps {
  factCount: number
  sourceCount: number
  className?: string
  testId?: string
}

/**
 * Always-visible honesty: session samples, not universe counts.
 */
export function ResearchSampleWatermark({
  factCount,
  sourceCount,
  className = '',
  testId = 'research-sample-watermark',
}: ResearchSampleWatermarkProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 rounded-lg border border-amber-900/40 bg-amber-950/20 px-2.5 py-1 text-[10px] text-amber-200/90 ${className}`}
      data-testid={testId}
      role="note"
    >
      <span className="font-semibold tabular-nums">
        Session sample · {factCount} facts · {sourceCount} sources
      </span>
      <span className="text-amber-200/60">— not a universe count</span>
      <HelperTip
        content="Counts and sample titles reflect free public API rows loaded in this browser session. Refresh re-queries. Do not cite as complete literature or trial universe totals. See methodology for honesty rules."
        label="About session samples"
        testId={`${testId}-help`}
      />
      <Link
        href="/methodology#honesty"
        className="text-amber-100/80 underline-offset-2 hover:underline"
      >
        Why empty / honesty →
      </Link>
    </div>
  )
}
