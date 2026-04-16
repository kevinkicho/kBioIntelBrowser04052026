import { buildExportSections } from './exportData'
import { buildStructuredBrief } from './aiSummarizer'
import { escapeHtml } from './sanitize'

function safeLen(val: unknown): number {
  return Array.isArray(val) ? val.length : 0
}

function openPrintWindow(html: string): boolean {
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    return false
  }
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  try { printWindow.print() } catch {}
  return true
}

function buildTableHtml(headers: string[], rows: Record<string, unknown>[]): string {
  const thead = '<thead><tr>' + headers.map(h => `<th>${escapeHtml(h)}</th>`).join('') + '</tr></thead>'
  const tbody = '<tbody>' + rows.map(row =>
    '<tr>' + headers.map(h => `<td>${escapeHtml(String(row[h] ?? ''))}</td>`).join('') + '</tr>'
  ).join('') + '</tbody>'
  return `<table>${thead}${tbody}</table>`
}

function buildMetricsGridHtml(metrics: { label: string; value: number; color: string }[]): string {
  return '<div class="metrics-grid">' +
    metrics.map(m =>
      `<div class="metric-card"><p class="metric-value" style="color: ${m.color}">${m.value}</p><p class="metric-label">${m.label}</p></div>`
    ).join('') +
    '</div>'
}

function getMetrics(data: Record<string, unknown>): { label: string; value: number; color: string }[] {
  return [
    { label: 'Products', value: safeLen(data.companies), color: '#10b981' },
    { label: 'Trials', value: safeLen(data.clinicalTrials), color: '#3b82f6' },
    { label: 'Adverse Events', value: safeLen(data.adverseEvents), color: '#ef4444' },
    { label: 'Publications', value: Math.max(safeLen(data.literature), safeLen(data.semanticPapers)), color: '#f59e0b' },
    { label: 'Targets', value: new Set(Array.isArray(data.chemblActivities) ? (data.chemblActivities as { targetName?: string }[]).map(a => a?.targetName).filter(Boolean) : []).size, color: '#8b5cf6' },
    { label: '3D Structures', value: safeLen(data.pdbStructures), color: '#06b6d4' },
  ]
}

const REPORT_STYLES = `
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 850px; margin: 0 auto; padding: 32px; color: #1e293b; line-height: 1.5; }
    .header { display: flex; align-items: flex-start; gap: 24px; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 3px solid #6366f1; }
    .header-text h1 { font-size: 28px; margin: 0 0 4px 0; color: #0f172a; }
    .header-text .subtitle { font-size: 13px; color: #64748b; margin: 0; }
    .header-text .headline { font-size: 14px; color: #334155; margin: 8px 0 0 0; font-style: italic; }
    .structure-img { width: 120px; height: 120px; object-fit: contain; border: 1px solid #e2e8f0; border-radius: 8px; background: white; flex-shrink: 0; }
    .metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
    .metric-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; text-align: center; }
    .metric-value { font-size: 28px; font-weight: 700; margin: 0; }
    .metric-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin: 2px 0 0 0; }
    .brief-section { margin-bottom: 24px; padding: 16px; background: #f1f5f9; border-radius: 8px; border-left: 4px solid #6366f1; }
    .brief-title { font-size: 12px; color: #6366f1; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; margin: 0 0 8px 0; }
    .brief-bullet { font-size: 13px; color: #334155; margin: 4px 0; padding-left: 12px; }
    h2 { font-size: 18px; color: #0f172a; margin-top: 32px; margin-bottom: 4px; border-bottom: 2px solid #6366f1; padding-bottom: 4px; page-break-after: avoid; }
    h3 { font-size: 14px; color: #475569; margin-top: 16px; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; page-break-after: avoid; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; page-break-inside: auto; }
    th { text-align: left; background: #eef2ff; padding: 6px 10px; border: 1px solid #e2e8f0; font-weight: 600; color: #4338ca; font-size: 11px; text-transform: uppercase; letter-spacing: 0.03em; }
    td { padding: 6px 10px; border: 1px solid #e2e8f0; vertical-align: top; word-break: break-word; }
    tr:nth-child(even) td { background: #f8fafc; }
    tr { page-break-inside: avoid; }
    .footer { margin-top: 40px; padding-top: 12px; border-top: 2px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
    .empty { color: #94a3b8; font-style: italic; font-size: 13px; }
    @media print {
      body { padding: 16px; }
      .metrics-grid { break-inside: avoid; }
      h2 { break-after: avoid; }
    }`

export function printReport(data: Record<string, unknown>, moleculeName: string, cid?: number): boolean {
  const sections = buildExportSections(data)
  const brief = buildStructuredBrief(data, moleculeName)
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const metrics = getMetrics(data)
  const structureImgUrl = cid ? `https://pubchem.ncbi.nlm.nih.gov/image/imgsrv.fcgi?cid=${cid}&t=l` : ''

  const headerHtml = '<div class="header">' +
    (structureImgUrl ? `<img src="${escapeHtml(structureImgUrl)}" class="structure-img" alt="${escapeHtml(moleculeName)} structure" />` : '') +
    '<div class="header-text">' +
    `<h1>${escapeHtml(moleculeName)}</h1>` +
    `<p class="subtitle">BioIntel Explorer Research Report — ${escapeHtml(dateStr)}</p>` +
    `<p class="headline">${escapeHtml(brief.headline)}</p>` +
    '</div></div>'

  const metricsHtml = buildMetricsGridHtml(metrics)

  let briefHtml = ''
  if (brief.sections.length > 0) {
    const bulletsHtml = brief.sections.map(s =>
      s.bullets.map(b => `<p class="brief-bullet">• ${escapeHtml(b)}</p>`).join('')
    ).join('')
    briefHtml = '<div class="brief-section"><p class="brief-title">Executive Summary</p>' + bulletsHtml + '</div>'
  }

  const sectionsHtml = sections.map(section => {
    if (section.panels.length === 0) {
      return `<h2>${escapeHtml(section.category)}</h2><p class="empty">No data available</p>`
    }
    const panelsHtml = section.panels.map(panel => {
      const dataArr = Array.isArray(panel.data) ? panel.data : (panel.data ? [panel.data] : [])
      if (dataArr.length === 0) {
        return `<h3>${escapeHtml(panel.title)}</h3><p class="empty">No data available</p>`
      }
      const headers = Array.from(new Set(dataArr.flatMap(item => Object.keys(item as Record<string, unknown>))))
      const displayed = dataArr.slice(0, 20) as Record<string, unknown>[]
      let tableHtml = `<h3>${escapeHtml(panel.title)} (${dataArr.length})</h3>` +
        buildTableHtml(headers, displayed)
      if (dataArr.length > 20) {
        tableHtml += '<p style="color:#94a3b8;font-size:12px;">Showing 20 of ' + dataArr.length + ' entries</p>'
      }
      return tableHtml
    }).join('')
    return `<h2>${escapeHtml(section.category)}</h2>${panelsHtml}`
  }).join('')

  const footerHtml = '<div class="footer">' +
    '<p>BioIntel Explorer — Data sourced from PubChem, openFDA, ChEMBL, UniProt, and other public databases.</p>' +
    '<p>For research purposes only. Not for clinical use.</p>' +
    '</div>'

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>${escapeHtml(moleculeName)} — BioIntel Explorer Report</title>
  <style>${REPORT_STYLES}</style>
</head>
<body>
  ${headerHtml}
  ${metricsHtml}
  ${briefHtml}
  ${sectionsHtml}
  ${footerHtml}
</body>
</html>`

  return openPrintWindow(html)
}

const SUMMARY_STYLES = `
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 700px; margin: 0 auto; padding: 32px; color: #1e293b; line-height: 1.6; }
    .header { display: flex; align-items: flex-start; gap: 24px; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 3px solid #6366f1; }
    .header-text h1 { font-size: 26px; margin: 0 0 4px 0; }
    .header-text .subtitle { font-size: 12px; color: #64748b; margin: 0; }
    .structure-img { width: 100px; height: 100px; object-fit: contain; border: 1px solid #e2e8f0; border-radius: 8px; background: white; }
    .metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 28px; }
    .metric-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
    .metric-value { font-size: 32px; font-weight: 700; margin: 0; }
    .metric-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
    .section-card { border-left: 4px solid #6366f1; background: #f8fafc; padding: 14px 18px; border-radius: 0 8px 8px 0; margin-bottom: 12px; }
    .section-title { font-size: 13px; font-weight: 600; color: #334155; margin: 0 0 6px 0; }
    .section-bullet { font-size: 12px; color: #475569; margin: 3px 0; padding-left: 14px; }
    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }`

const sentimentBorder: Record<string, string> = {
  positive: '#10b981', neutral: '#64748b', caution: '#f59e0b', warning: '#ef4444',
}

export function printSummaryReport(data: Record<string, unknown>, moleculeName: string, cid?: number): boolean {
  const brief = buildStructuredBrief(data, moleculeName)
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const metrics = getMetrics(data)
  const structureImgUrl = cid ? `https://pubchem.ncbi.nlm.nih.gov/image/imgsrv.fcgi?cid=${cid}&t=l` : ''

  const headerHtml = '<div class="header">' +
    (structureImgUrl ? `<img src="${escapeHtml(structureImgUrl)}" class="structure-img" />` : '') +
    '<div class="header-text">' +
    `<h1>${escapeHtml(moleculeName)}</h1>` +
    `<p class="subtitle">Executive Summary — ${escapeHtml(dateStr)}</p>` +
    '</div></div>'

  const metricsHtml = buildMetricsGridHtml(metrics)

  const sectionsHtml = brief.sections.map(s => {
    const borderColor = sentimentBorder[s.sentiment] || '#6366f1'
    const bulletsHtml = s.bullets.map(b => `<p class="section-bullet">• ${escapeHtml(b)}</p>`).join('')
    return `<div class="section-card" style="border-left-color: ${borderColor}">` +
      `<p class="section-title">${escapeHtml(s.emoji)} ${escapeHtml(s.title)}</p>` +
      bulletsHtml +
      '</div>'
  }).join('')

  const footerHtml = '<div class="footer"><p>BioIntel Explorer — For research purposes only.</p></div>'

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>${escapeHtml(moleculeName)} — Executive Summary</title>
  <style>${SUMMARY_STYLES}</style>
</head>
<body>
  ${headerHtml}
  ${metricsHtml}
  ${sectionsHtml}
  ${footerHtml}
</body>
</html>`

  return openPrintWindow(html)
}