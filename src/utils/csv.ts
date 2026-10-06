// ─────────────────────────────────────────────────────────────────────────────
// Reading CSV files
//
// In plain words: a CSV file is a spreadsheet saved as plain text — one line
// per row, with the cells separated by commas (some banks use semicolons or
// tabs instead). This turns that text back into rows and cells, including the
// tricky cases: cells in "quotes" that contain commas or line breaks, and
// "" meaning a quote character inside a quoted cell.
//
// For developers: a small RFC 4180 parser with no dependencies, safe to use
// in the browser and on the server. The separator is detected from the
// first line. Completely empty rows are dropped.
// ─────────────────────────────────────────────────────────────────────────────

const DELIMITERS = [",", ";", "\t"] as const;

/** The separator used in the first line: the most common of , ; and tab */
export function detectDelimiter(text: string): string {
  const firstLine = text.slice(0, text.search(/\r?\n|$/));
  let best: string = ",";
  let bestCount = 0;
  for (const delimiter of DELIMITERS) {
    // Ignore separators inside quoted cells, e.g. "Smith, John"
    const count = firstLine
      .replace(/"[^"]*"/g, "")
      .split(delimiter).length - 1;
    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }
  return best;
}

/** CSV text -> rows of cells. Leading/trailing spaces in cells are trimmed. */
export function parseCsv(text: string, delimiter = detectDelimiter(text)): string[][] {
  // Some programs (e.g. Excel) start the file with an invisible marker
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  const endCell = () => {
    row.push(cell.trim());
    cell = "";
  };
  const endRow = () => {
    endCell();
    if (row.some((c) => c !== "")) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"'; // "" inside quotes is one quote character
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      endCell();
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++; // Windows line ending
      endRow();
    } else {
      cell += char;
    }
  }
  endRow();
  return rows;
}
