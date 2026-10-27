/** Tiny CSV builder + browser download helper. */

const escapeCell = (value) => {
  if (value == null) return ''
  const s = String(value)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * @param {Array<object>} rows
 * @param {Array<{ key: string, label: string, format?: (v, row) => any }>} columns
 */
export function toCSV(rows, columns) {
  const header = columns.map((c) => escapeCell(c.label)).join(',')
  const body = rows.map((row) =>
    columns.map((c) => escapeCell(c.format ? c.format(row[c.key], row) : row[c.key])).join(','),
  )
  return [header, ...body].join('\r\n')
}

export function downloadCSV(filename, csv) {
  // BOM so Excel opens UTF-8 correctly
  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
