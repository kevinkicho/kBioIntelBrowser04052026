'use client'

import { useMemo } from 'react'
import type { DrugPrice } from '@/lib/types'

interface Props {
  prices: DrugPrice[]
}

export function PricingChart({ prices }: Props) {
  const chartData = useMemo(() => {
    if (prices.length === 0) return []
    return prices
      .filter(p => p.nadacPerUnit > 0)
      .sort((a, b) => b.nadacPerUnit - a.nadacPerUnit)
      .slice(0, 12)
  }, [prices])

  if (chartData.length === 0) return null

  const maxPrice = Math.max(...chartData.map(p => p.nadacPerUnit))

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">NADAC Pricing</h3>
      <p className="text-[10px] text-slate-600 mb-4">National Average Drug Acquisition Cost per unit</p>

      <div className="space-y-2">
        {chartData.map((price, i) => {
          const pct = (price.nadacPerUnit / maxPrice) * 100
          const label = price.ndcDescription?.length > 40
            ? price.ndcDescription.slice(0, 38) + '…'
            : price.ndcDescription

          return (
            <div key={i} className="group">
              <div className="flex items-center justify-between text-[10px] mb-0.5">
                <span className="text-slate-400 truncate flex-1 mr-2" title={price.ndcDescription}>
                  {label}
                </span>
                <span className="text-emerald-400 font-mono font-medium">
                  ${price.nadacPerUnit.toFixed(4)}
                  <span className="text-slate-600 ml-0.5">/{price.pricingUnit || 'unit'}</span>
                </span>
              </div>
              <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              {price.pharmacyType && (
                <p className="text-[9px] text-slate-600 mt-0.5">{price.pharmacyType} · {price.effectiveDate}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
