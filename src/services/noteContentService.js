const DEFAULT_NOTE_TYPE = 'note';

export function normalizeNoteType(noteType) {
  return noteType === 'sheet' ? 'sheet' : DEFAULT_NOTE_TYPE;
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

export function extractSheetRows(rawContent) {
  const sheetPayload = extractSheetPayload(rawContent);

  if (Array.isArray(sheetPayload)) {
    return normalizeSheetRows(sheetPayload);
  }

  if (typeof sheetPayload === 'string') {
    return parseCsvText(sheetPayload);
  }

  return [];
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

function normalizeSheetRows(rows) {
  if (rows.length === 0) {
    return [];
  }

  if (rows.every(row => row && typeof row === 'object' && !Array.isArray(row))) {
    return rows;
  }

  if (rows.every(Array.isArray)) {
    const [headerRow = [], ...dataRows] = rows;
    const headers = buildHeaders(headerRow, getTableWidth(headerRow, dataRows));

    return dataRows
      .filter(row => row.some(cell => `${cell}`.trim() !== ''))
      .map(row => headers.reduce((record, header, index) => {
        record[header] = row[index] ?? '';
        return record;
      }, {}));
  }

  return [];
}

function parseCsvText(rawText) {
  if (typeof rawText !== 'string' || rawText.trim() === '') {
    return [];
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
    return [];
  }

  const [headerRow = [], ...dataRows] = records;
  const headers = buildHeaders(headerRow, getTableWidth(headerRow, dataRows));

  return dataRows
    .filter(row => row.some(cell => `${cell}`.trim() !== ''))
    .map(row => headers.reduce((record, header, index) => {
      record[header] = row[index] ?? '';
      return record;
    }, {}));
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
