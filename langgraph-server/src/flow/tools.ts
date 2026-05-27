/**
 * Evaluate a basic arithmetic expression safely.
 * Only `0-9 . + - * / ( )` and whitespace are permitted (regex-gated), and the
 * value is produced by a recursive-descent parser — never eval/Function/new Function.
 */
export function safeEvalArithmetic(expr: string): number {
  if (typeof expr !== 'string' || !/^[0-9+\-*/().\s]+$/.test(expr)) {
    throw new Error('calculator: only numbers and + - * / ( ) are allowed');
  }
  const tokens = expr.match(/\d+\.?\d*|\.\d+|[+\-*/()]/g);
  if (!tokens) throw new Error('calculator: no tokens');
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  // expr := term (('+'|'-') term)*
  function parseExpr(): number {
    let value = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = next();
      const rhs = parseTerm();
      value = op === '+' ? value + rhs : value - rhs;
    }
    return value;
  }
  // term := factor (('*'|'/') factor)*
  function parseTerm(): number {
    let value = parseFactor();
    while (peek() === '*' || peek() === '/') {
      const op = next();
      const rhs = parseFactor();
      value = op === '*' ? value * rhs : value / rhs;
    }
    return value;
  }
  // factor := '-' factor | '+' factor | '(' expr ')' | number
  function parseFactor(): number {
    const t = peek();
    if (t === '-') { next(); return -parseFactor(); }
    if (t === '+') { next(); return parseFactor(); }
    if (t === '(') {
      next();
      const value = parseExpr();
      if (next() !== ')') throw new Error('calculator: unbalanced parentheses');
      return value;
    }
    const num = Number(next());
    if (Number.isNaN(num)) throw new Error('calculator: expected a number');
    return num;
  }

  const result = parseExpr();
  if (pos !== tokens.length) throw new Error('calculator: unexpected trailing input');
  return result;
}
