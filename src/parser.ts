import fs from 'fs/promises';

export interface ScadVar {
  name: string;
  value: string | number | boolean;
  comment?: string;
  type: 'number' | 'string' | 'boolean';
}

export async function parseScadVariables(filePath: string): Promise<ScadVar[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  const variables: ScadVar[] = [];

  // Regex to find top-level variables: name = value; // comment
  const regex = /^(\w+)\s*=\s*([^;]+);(?:\s*\/\/\s*(.*))?/;

  for (const line of lines) {
    const match = line.match(regex);
    if (match) {
      const name = match[1];
      let rawValue = match[2].trim();
      const comment = match[3];

      // Ignore special variables like $fn
      if (name.startsWith('$')) continue;

      let value: string | number | boolean;
      let type: ScadVar['type'];

      if (!isNaN(Number(rawValue))) {
        // It is a number
        value = Number(rawValue);
        type = 'number';
      } else if (rawValue === 'true' || rawValue === 'false') {
        // It is a boolean
        value = rawValue === 'true';
        type = 'boolean';
      } else if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
        // It is a strictly quoted string literal
        value = rawValue.slice(1, -1); // Remove outer quotes
        type = 'string';
      } else {
        // It is likely an expression (e.g., h + 10), a variable reference,
        // or a vector/array (which we don't support in the UI yet).
        // We skip these to prevent overwriting logic with raw strings.
        continue;
      }

      variables.push({ name, value, type, comment });
    }
  }
  return variables;
}