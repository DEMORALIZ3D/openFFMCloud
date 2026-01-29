export interface ScadVariable {
  name: string;
  value: string | number | boolean;
  type: 'number' | 'string' | 'boolean';
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
}

export const parseScadVariables = (code: string): ScadVariable[] => {
  const lines = code.split('\n');
  const variables: ScadVariable[] = [];
  
  // Regex to match top-level variable assignments
  // Matches: name = value; // comment
  const regex = /^(\$?\w+)\s*=\s*([^;]+);(?:\s*\/\/\s*(.*))?$/;

  for (const line of lines) {
    const match = line.trim().match(regex);
    if (!match) continue;

    const [_, name, rawValue, comment] = match;
    
    // Skip special system variables if needed, though OpenSCAD allows overriding some
    if (name.startsWith('$fa') || name.startsWith('$fs') || name.startsWith('$fn')) continue;

    let value: string | number | boolean = rawValue.trim();
    let type: 'number' | 'string' | 'boolean' = 'string';
    
    // Parse Value Type
    if (value === 'true' || value === 'false') {
        type = 'boolean';
        value = value === 'true';
    } else if (!isNaN(Number(value))) {
        type = 'number';
        value = Number(value);
    } else if (value.startsWith('"') && value.endsWith('"')) {
        type = 'string';
        value = value.slice(1, -1);
    } else {
        // Complex expressions or vectors are skipped for simple customizer
        continue;
    }

    const variable: ScadVariable = { name, value, type };

    // Parse Comment Metadata (Range/Dropdown)
    // Format: [min:max] or [min:step:max] or [val1, val2, val3]
    if (comment) {
        // Range: [0:100] or [0:0.1:100]
        const rangeMatch = comment.match(/[\[]([\d.-]+)\s*:\s*(?:([\d.-]+)\s*:\s*)?([\d.-]+)[\]]/);
        if (rangeMatch && type === 'number') {
            const p1 = Number(rangeMatch[1]);
            const p2 = Number(rangeMatch[2]); // Step (optional)
            const p3 = Number(rangeMatch[3]); // Max
            
            variable.min = p1;
            if (!isNaN(p2)) {
                variable.step = p2;
                variable.max = p3;
            } else {
                variable.max = p3; // if only two numbers, it's min:max
            }
        }
    }

    variables.push(variable);
  }

  return variables;
};

export const updateScadVariable = (code: string, name: string, newValue: string | number | boolean): string => {
    const lines = code.split('\n');
    return lines.map(line => {
        const match = line.trim().match(/^(\$?\w+)\s*=\s*([^;]+);(.*)$/);
        if (match && match[1] === name) {
             let formattedValue = newValue;
             if (typeof newValue === 'string') formattedValue = `"${newValue}"`;
             return `${name} = ${formattedValue};${match[3]}`;
        }
        return line;
    }).join('\n');
}