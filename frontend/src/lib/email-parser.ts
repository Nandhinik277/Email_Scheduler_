const SAFE_EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

export function extractEmailAddresses(input: string): string[] {
  const matches = input.match(SAFE_EMAIL_REGEX) ?? [];
  const normalized = matches.map((email) => email.toLowerCase());
  return Array.from(new Set(normalized));
}

export async function parseEmailFile(file: File): Promise<string[]> {
  const text = await file.text();

  if (!text.trim()) {
    return [];
  }

  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith(".csv")) {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const extracted: string[] = [];

    for (const line of lines) {
      const values = parseCsvLine(line);
      const emailCandidates = values
        .map((value) => value.trim())
        .filter(Boolean)
        .flatMap((value) => extractEmailAddresses(value));

      if (emailCandidates.length > 0) {
        extracted.push(...emailCandidates);
      }
    }

    return Array.from(new Set(extracted.map((email) => email.toLowerCase())));
  }

  return extractEmailAddresses(text);
}
