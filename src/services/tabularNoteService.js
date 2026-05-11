import ExcelJS from 'exceljs'

export const NOTE_CONTENT_TYPES = Object.freeze({
  PCN: 'text/pcn',
  CSV: 'text/csv',
  TSV: 'text/tab-separated-values',
  XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
})

const DEFAULT_COLUMNS_COUNT = 3

function sanitizeFieldName(value, index, usedFields) {
  const normalized = String(value ?? '').trim() || `Column ${index + 1}`
  const base = normalized
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || `column_${index + 1}`

  let candidate = base
  let suffix = 1

  while (usedFields.has(candidate)) {
    candidate = `${base}_${suffix++}`
  }

  usedFields.add(candidate)
  return candidate
}

function createColumnsFromHeaders(headers = []) {
  const usedFields = new Set()
  return headers.map((header, index) => ({
    label: String(header ?? '').trim() || `Column ${index + 1}`,
    field: sanitizeFieldName(header, index, usedFields)
  }))
}

function mapRowsToObjects(columns, rows = []) {
  return rows.map((row = []) => columns.reduce((acc, column, index) => {
    acc[column.field] = row[index] == null ? '' : String(row[index])
    return acc
  }, {}))
}

function parseDelimitedLine(line, delimiter) {
  const cells = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index++) {
    const character = line[index]
    const nextCharacter = line[index + 1]

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        current += '"'
        index++
      } else {
        inQuotes = !inQuotes
      }
    } else if (character === delimiter && !inQuotes) {
      cells.push(current)
      current = ''
    } else {
      current += character
    }
  }

  cells.push(current)
  return cells
}

function parseDelimitedContent(content, delimiter) {
  const normalizedContent = String(content ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  if (normalizedContent.trim() === '') {
    return createEmptyTabularState()
  }

  const rows = []
  let currentLine = ''
  let inQuotes = false

  for (let index = 0; index < normalizedContent.length; index++) {
    const character = normalizedContent[index]
    const nextCharacter = normalizedContent[index + 1]

    currentLine += character

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        currentLine += nextCharacter
        index++
      } else {
        inQuotes = !inQuotes
      }
    } else if (character === '\n' && !inQuotes) {
      rows.push(currentLine.slice(0, -1))
      currentLine = ''
    }
  }

  if (currentLine !== '') {
    rows.push(currentLine)
  }

  const parsedRows = rows.map((row) => parseDelimitedLine(row, delimiter))
  const headers = parsedRows.shift() ?? []
  const columns = createColumnsFromHeaders(headers)

  return {
    columns,
    rows: mapRowsToObjects(columns, parsedRows)
  }
}

function escapeDelimitedCell(value, delimiter) {
  const normalized = value == null ? '' : String(value)
  if (normalized.includes('"') || normalized.includes('\n') || normalized.includes('\r') || normalized.includes(delimiter)) {
    return `"${normalized.replace(/"/g, '""')}"`
  }
  return normalized
}

function sanitizeTabularState(state) {
  const inputColumns = Array.isArray(state?.columns) ? state.columns : []
  const columns = inputColumns.length > 0
    ? inputColumns.map((column, index) => ({
      label: String(column?.label ?? '').trim() || `Column ${index + 1}`,
      field: String(column?.field ?? '').trim() || `column_${index + 1}`
    }))
    : createDefaultColumns()

  const rows = Array.isArray(state?.rows) ? state.rows : []

  return {
    columns,
    rows: rows.map((row) => columns.reduce((acc, column) => {
      acc[column.field] = row?.[column.field] == null ? '' : String(row[column.field])
      return acc
    }, {}))
  }
}

function rowsToTable(state) {
  const normalized = sanitizeTabularState(state)
  return normalized.rows
    .map((row) => normalized.columns.map((column) => row[column.field] ?? ''))
    .filter((row) => row.some((value) => String(value).trim() !== ''))
}

export function createDefaultColumns() {
  return Array.from({ length: DEFAULT_COLUMNS_COUNT }, (_, index) => ({
    field: `column_${index + 1}`,
    label: `Column ${index + 1}`
  }))
}

export function createEmptyTabularState() {
  return {
    columns: createDefaultColumns(),
    rows: []
  }
}

export function cloneTabularState(state) {
  const normalized = sanitizeTabularState(state)
  return {
    columns: normalized.columns.map((column) => ({ ...column })),
    rows: normalized.rows.map((row) => ({ ...row }))
  }
}

export function isTabularContentType(contentType) {
  return [
    NOTE_CONTENT_TYPES.CSV,
    NOTE_CONTENT_TYPES.TSV,
    NOTE_CONTENT_TYPES.XLSX
  ].includes(contentType)
}

export function estimateTabularCharacters(state) {
  const normalized = sanitizeTabularState(state)
  const headerSize = normalized.columns.reduce((total, column) => total + column.label.length, 0)
  const rowSize = normalized.rows.reduce((total, row) => total + normalized.columns.reduce((rowTotal, column) => {
    return rowTotal + String(row[column.field] ?? '').length
  }, 0), 0)

  return headerSize + rowSize
}

export function serializeDelimited(state, delimiter) {
  const normalized = sanitizeTabularState(state)
  const lines = [
    normalized.columns.map((column) => escapeDelimitedCell(column.label, delimiter)).join(delimiter)
  ]

  rowsToTable(normalized).forEach((row) => {
    lines.push(row.map((value) => escapeDelimitedCell(value, delimiter)).join(delimiter))
  })

  return lines.join('\n')
}

function decodeBase64Content(content) {
  const sanitized = String(content ?? '').replace(/^data:.*;base64,/, '').replace(/\s/g, '')
  return Uint8Array.from(atob(sanitized), (character) => character.charCodeAt(0))
}

function encodeBase64Content(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 0x8000

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }

  return btoa(binary)
}

export async function deserializeTabularContent(contentType, content) {
  if (contentType === NOTE_CONTENT_TYPES.CSV) {
    return parseDelimitedContent(content, ',')
  }

  if (contentType === NOTE_CONTENT_TYPES.TSV) {
    return parseDelimitedContent(content, '\t')
  }

  if (contentType === NOTE_CONTENT_TYPES.XLSX) {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(decodeBase64Content(content))

    const worksheet = workbook.worksheets[0]
    if (!worksheet) {
      return createEmptyTabularState()
    }

    const matrix = []
    worksheet.eachRow({ includeEmpty: true }, (row) => {
      const values = row.values.slice(1).map((value) => value == null ? '' : String(value))
      matrix.push(values)
    })

    if (matrix.length === 0) {
      return createEmptyTabularState()
    }

    const headers = matrix.shift() ?? []
    const columns = createColumnsFromHeaders(headers)

    return {
      columns,
      rows: mapRowsToObjects(columns, matrix)
    }
  }

  return createEmptyTabularState()
}

export async function serializeTabularContent(contentType, state) {
  if (contentType === NOTE_CONTENT_TYPES.CSV) {
    return serializeDelimited(state, ',')
  }

  if (contentType === NOTE_CONTENT_TYPES.TSV) {
    return serializeDelimited(state, '\t')
  }

  if (contentType === NOTE_CONTENT_TYPES.XLSX) {
    const normalized = sanitizeTabularState(state)
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Sheet1')

    worksheet.addRow(normalized.columns.map((column) => column.label))
    rowsToTable(normalized).forEach((row) => {
      worksheet.addRow(row)
    })

    const buffer = await workbook.xlsx.writeBuffer()
    return encodeBase64Content(buffer)
  }

  return ''
}
