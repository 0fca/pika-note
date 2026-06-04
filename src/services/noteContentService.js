export const DEFAULT_NOTE_TYPE = 'note';
export const SHEET_NOTE_TYPE = 'sheet';

const DEFAULT_SHEET_COLUMN_LABELS = ['Column 1', 'Column 2', 'Column 3'];
const SAFE_SHEET_FIELD_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function normalizeNoteType(noteType) {
  return noteType === SHEET_NOTE_TYPE ? SHEET_NOTE_TYPE : DEFAULT_NOTE_TYPE;
}

export function createDefaultSheetColumns() {
  return DEFAULT_SHEET_COLUMN_LABELS.map((label, index) => ({
    field: buildSheetFieldName(index + 1),
    label
  }));
}

export function createEmptySheetRows(columnDefinitions = createDefaultSheetColumns()) {
  const columns = normalizeSheetColumnsInput(columnDefinitions);
  return [createEmptySheetRow(columns)];
}

export function createEmptySheetState(columnDefinitions = createDefaultSheetColumns()) {
  const columns = normalizeSheetColumnsInput(columnDefinitions);
  return {
    columns,
    rows: [createEmptySheetRow(columns)]
  };
}

export function extractNoteTextContent(rawContent) {
  if (typeof rawContent !== 'string') {
    return '';
  }

  const parsedContent = safeJsonParse(rawContent);
  if (parsedContent && typeof parsedContent.content === 'string') {
    return parsedContent.content;
  }

  return rawContent;
}

export function extractSheetState(rawContent) {
  const parsedContent = typeof rawContent === 'string' ? safeJsonParse(rawContent) : null;

  if (parsedContent && Array.isArray(parsedContent.columns) && Array.isArray(parsedContent.rows)) {
    return normalizeStructuredSheetState(parsedContent.columns, parsedContent.rows);
  }

  const sheetPayload = extractSheetPayload(rawContent);

  if (Array.isArray(sheetPayload)) {
    return normalizeArraySheetState(sheetPayload);
  }

  if (typeof sheetPayload === 'string') {
    return parseCsvText(sheetPayload);
  }

  return {
    columns: createDefaultSheetColumns(),
    rows: []
  };
}

export function extractSheetRows(rawContent) {
  return extractSheetState(rawContent).rows;
}

export function hasSheetContent(rows, columns = null) {
  return sanitizeSheetRows(rows, columns).some(row =>
    Object.values(row).some(cell => `${cell ?? ''}`.trim() !== '')
  );
}

export function countSheetCellCharacters(rows, columns = null) {
  return sanitizeSheetRows(rows, columns).reduce((total, row) => {
    return total + Object.values(row).reduce((rowTotal, cell) => rowTotal + `${cell ?? ''}`.length, 0);
  }, 0);
}

export function serializeSheetRows(rows, columns = null) {
  const normalizedColumns = columns ? normalizeSheetColumnsInput(columns) : deriveSheetColumns(rows);
  const sanitizedRows = sanitizeSheetRows(rows, normalizedColumns);

  return JSON.stringify({
    columns: normalizedColumns,
    rows: sanitizedRows.length > 0 ? sanitizedRows : [createEmptySheetRow(normalizedColumns)]
  });
}

export function stringifySheetRows(rows, columns = null) {
  const normalizedColumns = columns ? normalizeSheetColumnsInput(columns) : deriveSheetColumns(rows);
  const sanitizedRows = sanitizeSheetRows(rows, normalizedColumns);

  if (normalizedColumns.length === 0) {
    return '';
  }

  const csvRows = [
    normalizedColumns.map(column => column.label),
    ...sanitizedRows.map(row => normalizedColumns.map(column => `${row?.[column.field] ?? ''}`))
  ];

  return csvRows.map(row => row.join('\t')).join('\n');
}

export function sanitizeSheetRows(rows, columns = null) {
  const normalizedColumns = columns ? normalizeSheetColumnsInput(columns) : deriveSheetColumns(rows);

  return (Array.isArray(rows) ? rows : []).map(row => normalizedColumns.reduce((record, column) => {
    record[column.field] = row?.[column.field] ?? '';
    return record;
  }, {}));
}

function createEmptySheetRow(columns) {
  return columns.reduce((record, column) => {
    record[column.field] = '';
    return record;
  }, {});
}

function extractSheetPayload(rawContent) {
  if (Array.isArray(rawContent)) {
    return rawContent;
  }

  if (typeof rawContent !== 'string') {
    return [];
  }

  const parsedContent = safeJsonParse(rawContent);
  if (Array.isArray(parsedContent)) {
    return parsedContent;
  }

  if (parsedContent && Array.isArray(parsedContent.rows)) {
    return parsedContent.rows;
  }

  if (parsedContent && typeof parsedContent.content === 'string') {
    return parsedContent.content;
  }

  if (parsedContent && typeof parsedContent.csv === 'string') {
    return parsedContent.csv;
  }

  return rawContent;
}

function normalizeStructuredSheetState(columnDefinitions, rows) {
  const normalizedColumns = normalizeStructuredColumns(columnDefinitions);

  return {
    columns: normalizedColumns,
    rows: (Array.isArray(rows) ? rows : []).map(row => normalizedColumns.reduce((record, column) => {
      const sourceLabel = `${column.sourceLabel ?? ''}`.trim();
      const sourceField = `${column.sourceField ?? ''}`.trim();
      let value = row?.[column.field];

      if (typeof value === 'undefined' && sourceField) {
        value = row?.[sourceField];
      }
      if (typeof value === 'undefined' && sourceLabel) {
        value = row?.[sourceLabel];
      }

      record[column.field] = value ?? '';
      return record;
    }, {}))
  };
}

function normalizeArraySheetState(rows) {
  if (rows.length === 0) {
    return {
      columns: createDefaultSheetColumns(),
      rows: []
    };
  }

  if (rows.every(row => row && typeof row === 'object' && !Array.isArray(row))) {
    const headers = collectRowHeaders(rows);
    return buildSheetStateFromMatrix(headers, rows.map(row => headers.map(header => row?.[header] ?? '')));
  }

  if (rows.every(Array.isArray)) {
    const [headerRow = [], ...dataRows] = rows;
    const headers = buildHeaders(headerRow, getTableWidth(headerRow, dataRows));
    return buildSheetStateFromMatrix(headers, dataRows);
  }

  return {
    columns: createDefaultSheetColumns(),
    rows: []
  };
}

function parseCsvText(rawText) {
  if (typeof rawText !== 'string' || rawText.trim() === '') {
    return {
      columns: createDefaultSheetColumns(),
      rows: []
    };
  }

  const records = [];
  const text = rawText.charCodeAt(0) === 0xfeff ? rawText.slice(1) : rawText;
  const delimiter = detectDelimiter(text);
  let currentField = '';
  let currentRow = [];
  let insideQuotes = false;

  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === '"') {
      if (insideQuotes && nextCharacter === '"') {
        currentField += '"';
        index++;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (!insideQuotes && character === delimiter) {
      currentRow.push(currentField);
      currentField = '';
      continue;
    }

    if (!insideQuotes && (character === '\n' || character === '\r')) {
      if (character === '\r' && nextCharacter === '\n') {
        index++;
      }
      currentRow.push(currentField);
      records.push(currentRow);
      currentField = '';
      currentRow = [];
      continue;
    }

    currentField += character;
  }

  currentRow.push(currentField);
  if (currentRow.some(cell => `${cell}`.trim() !== '')) {
    records.push(currentRow);
  }

  if (records.length === 0) {
    return {
      columns: createDefaultSheetColumns(),
      rows: []
    };
  }

  const [headerRow = [], ...dataRows] = records;
  const headers = buildHeaders(headerRow, getTableWidth(headerRow, dataRows));
  return buildSheetStateFromMatrix(headers, dataRows);
}

function buildSheetStateFromMatrix(headers, dataRows) {
  const normalizedLabels = deduplicateLabels(headers);
  const columns = normalizedLabels.map((label, index) => ({
    field: buildSheetFieldName(index + 1),
    label
  }));

  return {
    columns,
    rows: dataRows
      .filter(row => row.some(cell => `${cell ?? ''}`.trim() !== ''))
      .map(row => columns.reduce((record, column, index) => {
        record[column.field] = row[index] ?? '';
        return record;
      }, {}))
  };
}

function deriveSheetColumns(rows) {
  const headers = collectRowHeaders(rows);
  if (headers.length === 0) {
    return createDefaultSheetColumns();
  }

  return headers.map((header, index) => ({
    field: buildSheetFieldName(index + 1),
    label: header || `Column ${index + 1}`
  }));
}

function collectRowHeaders(rows) {
  const headers = [];

  (Array.isArray(rows) ? rows : []).forEach(row => {
    Object.keys(row || {})
      // VueExcelEditor injects internal keys like `$id`; keep them out of user-facing columns.
      .filter(key => !key.startsWith('$'))
      .forEach(key => {
        if (!headers.includes(key)) {
          headers.push(key);
        }
      });
  });

  return headers;
}

function normalizeSheetColumnsInput(columnDefinitions) {
  const input = Array.isArray(columnDefinitions) && columnDefinitions.length > 0
    ? columnDefinitions
    : createDefaultSheetColumns();
  const usedFields = new Set();
  const usedLabels = new Set();

  return input.map((column, index) => {
    const rawLabel = typeof column === 'string'
      ? column
      : column?.label ?? column?.name ?? column?.field ?? '';
    const label = makeUniqueLabel(rawLabel, index, usedLabels);
    const rawField = typeof column === 'string' ? '' : column?.field ?? '';
    const field = makeUniqueField(rawField, index, usedFields);

    return { field, label };
  });
}

function normalizeStructuredColumns(columnDefinitions) {
  const usedFields = new Set();
  const usedLabels = new Set();

  return (Array.isArray(columnDefinitions) && columnDefinitions.length > 0
    ? columnDefinitions
    : createDefaultSheetColumns()).map((column, index) => {
    const rawLabel = column?.label ?? column?.name ?? column?.field ?? '';
    const label = makeUniqueLabel(rawLabel, index, usedLabels);
    const sourceField = column?.field ?? '';
    const sourceLabel = rawLabel;
    const field = makeUniqueField(sourceField, index, usedFields);

    return {
      field,
      label,
      sourceField,
      sourceLabel
    };
  });
}

function buildHeaders(headerRow, width) {
  const usedHeaders = new Set();

  return Array.from({ length: width }, (_, index) => {
    const rawHeader = `${headerRow[index] ?? ''}`.trim();
    const baseHeader = rawHeader || `Column ${index + 1}`;
    let header = baseHeader;
    let duplicateIndex = 2;

    while (usedHeaders.has(header)) {
      header = `${baseHeader} ${duplicateIndex}`;
      duplicateIndex++;
    }

    usedHeaders.add(header);
    return header;
  });
}

function deduplicateLabels(labels) {
  const usedLabels = new Set();
  return labels.map((label, index) => makeUniqueLabel(label, index, usedLabels));
}

function makeUniqueLabel(label, index, usedLabels) {
  const baseLabel = `${label ?? ''}`.trim() || `Column ${index + 1}`;
  let nextLabel = baseLabel;
  let duplicateIndex = 2;

  while (usedLabels.has(nextLabel)) {
    nextLabel = `${baseLabel} ${duplicateIndex}`;
    duplicateIndex++;
  }

  usedLabels.add(nextLabel);
  return nextLabel;
}

function makeUniqueField(field, index, usedFields) {
  const baseField = SAFE_SHEET_FIELD_PATTERN.test(`${field ?? ''}`)
    ? `${field}`
    : buildSheetFieldName(index + 1);
  let nextField = baseField;
  let duplicateIndex = 2;

  while (usedFields.has(nextField)) {
    nextField = `${baseField}_${duplicateIndex}`;
    duplicateIndex++;
  }

  usedFields.add(nextField);
  return nextField;
}

function buildSheetFieldName(index) {
  return `column_${index}`;
}

function getTableWidth(headerRow, dataRows) {
  return [headerRow.length, ...dataRows.map(row => row.length), 0]
    .reduce((maxWidth, currentWidth) => Math.max(maxWidth, currentWidth), 0);
}

function detectDelimiter(text) {
  const sample = text.split(/\r?\n/).slice(0, 5).join('\n');
  const candidates = [',', ';', '\t'];

  return candidates.reduce((selectedDelimiter, candidate) => {
    const selectedCount = countDelimiter(sample, selectedDelimiter);
    const candidateCount = countDelimiter(sample, candidate);
    return candidateCount > selectedCount ? candidate : selectedDelimiter;
  }, ',');
}

function countDelimiter(text, delimiter) {
  let count = 0;
  let insideQuotes = false;

  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === '"') {
      if (insideQuotes && nextCharacter === '"') {
        index++;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (!insideQuotes && character === delimiter) {
      count++;
    }
  }

  return count;
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}
