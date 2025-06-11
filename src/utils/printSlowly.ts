export async function printSlowly(lines: string[], printFn: (line: string) => void, delay = 80) {
    for (const line of lines) {
      await new Promise((res) => setTimeout(res, delay));
      printFn(line);
    }
  }
