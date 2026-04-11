'use client'

import { useState, useRef, useEffect } from 'react'
import { buildExportSections, exportToCsv, exportToJson, downloadFile } from '@/lib/exportData'
import { printReport, printSummaryReport } from '@/lib/printReport'

interface ExportButtonProps {
  data: Record<string, unknown>
  moleculeName: string
  cid?: number
}

export function ExportButton({ data, moleculeName, cid }: ExportButtonProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const sections = buildExportSections(data)
  const slug = moleculeName.toLowerCase().replace(/\s+/g, '-')

  function handleCsv() {
    downloadFile(exportToCsv(sections), `${slug}-profile.csv`, 'text/csv')
    setOpen(false)
  }

  function handleJson() {
    downloadFile(exportToJson(sections), `${slug}-profile.json`, 'application/json')
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-1.5 text-sm text-slate-300 hover:text-slate-100 transition-colors"
      >
        Export ▼
      </button>
      {open && (
        <div className="absolute right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 min-w-[200px]">
          <button onClick={handleCsv} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded-t-lg">
            📄 Export as CSV
          </button>
          <button onClick={handleJson} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700">
            📋 Export as JSON
          </button>
          <div className="border-t border-slate-700" />
          <button
            onClick={() => { printReport(data, moleculeName, cid); setOpen(false) }}
            className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
          >
            🖨️ Full PDF Report
          </button>
          <button
            onClick={() => { printSummaryReport(data, moleculeName, cid); setOpen(false) }}
            className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded-b-lg"
          >
            📊 Executive Summary
          </button>
        </div>
      )}
    </div>
  )
}

