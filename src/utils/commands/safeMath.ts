class MathParser {
  private readonly input: string;
  private index = 0;

  constructor(input: string) {
    this.input = input;
  }

  parse(): number {
    const value = this.parseExpression();
    this.skipWhitespace();
    if (!this.isAtEnd()) {
      throw new Error('Unexpected token');
    }
    if (!Number.isFinite(value)) {
      throw new Error('Non-finite result');
    }
    return value;
  }

  private parseExpression(): number {
    let value = this.parseTerm();
    while (true) {
      this.skipWhitespace();
      const operator = this.peek();
      if (operator !== '+' && operator !== '-') {
        return value;
      }
      this.index++;
      const right = this.parseTerm();
      value = operator === '+' ? value + right : value - right;
    }
  }

  private parseTerm(): number {
    let value = this.parseFactor();
    while (true) {
      this.skipWhitespace();
      const operator = this.peek();
      if (operator !== '*' && operator !== '/' && operator !== '%') {
        return value;
      }
      this.index++;
      const right = this.parseFactor();
      if ((operator === '/' || operator === '%') && right === 0) {
        throw new Error('Division by zero');
      }
      if (operator === '*') value *= right;
      if (operator === '/') value /= right;
      if (operator === '%') value %= right;
    }
  }

  private parseFactor(): number {
    this.skipWhitespace();
    const operator = this.peek();
    if (operator === '+' || operator === '-') {
      this.index++;
      const value = this.parseFactor();
      return operator === '-' ? -value : value;
    }

    if (operator === '(') {
      this.index++;
      const value = this.parseExpression();
      this.skipWhitespace();
      if (this.peek() !== ')') {
        throw new Error('Unclosed parenthesis');
      }
      this.index++;
      return value;
    }

    return this.parseNumber();
  }

  private parseNumber(): number {
    this.skipWhitespace();
    const start = this.index;
    let hasDecimal = false;

    while (!this.isAtEnd()) {
      const char = this.peek();
      if (char >= '0' && char <= '9') {
        this.index++;
        continue;
      }
      if (char === '.' && !hasDecimal) {
        hasDecimal = true;
        this.index++;
        continue;
      }
      break;
    }

    if (start === this.index) {
      throw new Error('Expected number');
    }

    const parsed = Number(this.input.slice(start, this.index));
    if (!Number.isFinite(parsed)) {
      throw new Error('Invalid number');
    }
    return parsed;
  }

  private skipWhitespace(): void {
    while (!this.isAtEnd() && /\s/.test(this.input[this.index])) {
      this.index++;
    }
  }

  private isAtEnd(): boolean {
    return this.index >= this.input.length;
  }

  private peek(): string {
    return this.input[this.index] ?? '';
  }
}

export const evaluateMathExpression = (expression: string): number => {
  const parser = new MathParser(expression);
  return parser.parse();
};

