// Safe arithmetic evaluator for amount inputs. Supports +, -, *, /, parentheses,
// decimal numbers and unary +/-. Implemented as a small recursive-descent parser
// so we never touch eval / the Function constructor.

type Token = { type: "num"; value: number } | { type: "op"; value: string };

function tokenize(input: string): Token[] | null {
  const tokens: Token[] = [];
  const s = input.trim();
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === " ") {
      i++;
      continue;
    }
    if ("+-*/()".includes(c)) {
      tokens.push({ type: "op", value: c });
      i++;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      let num = "";
      while (i < s.length && /[0-9.]/.test(s[i])) {
        num += s[i];
        i++;
      }
      if ((num.match(/\./g) ?? []).length > 1) return null; // e.g. "1.2.3"
      const v = Number(num);
      if (!Number.isFinite(v)) return null;
      tokens.push({ type: "num", value: v });
      continue;
    }
    return null; // unsupported character
  }
  return tokens;
}

function parse(tokens: Token[]): number | null {
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  function parseFactor(): number | null {
    const tok = peek();
    if (tok?.type === "op" && (tok.value === "+" || tok.value === "-")) {
      next();
      const val = parseFactor();
      if (val === null) return null;
      return tok.value === "-" ? -val : val;
    }
    if (tok?.type === "num") {
      next();
      return tok.value;
    }
    if (tok?.type === "op" && tok.value === "(") {
      next();
      const val = parseExpr();
      if (val === null) return null;
      const close = next();
      if (close?.type !== "op" || close.value !== ")") return null;
      return val;
    }
    return null;
  }

  function parseTerm(): number | null {
    let left = parseFactor();
    if (left === null) return null;
    let op = peek();
    while (op?.type === "op" && (op.value === "*" || op.value === "/")) {
      next();
      const right = parseFactor();
      if (right === null) return null;
      if (op.value === "/") {
        if (right === 0) return null;
        left = left / right;
      } else {
        left = left * right;
      }
      op = peek();
    }
    return left;
  }

  function parseExpr(): number | null {
    let left = parseTerm();
    if (left === null) return null;
    let op = peek();
    while (op?.type === "op" && (op.value === "+" || op.value === "-")) {
      next();
      const right = parseTerm();
      if (right === null) return null;
      left = op.value === "+" ? left + right : left - right;
      op = peek();
    }
    return left;
  }

  const result = parseExpr();
  if (result === null || pos !== tokens.length) return null; // leftover tokens => invalid
  return Number.isFinite(result) ? result : null;
}

/**
 * Evaluate an arithmetic expression like "100+50", "200-30*2" or "(10+5)/3".
 * Commas are accepted as decimal separators ("100,50"), matching the app's
 * Swedish locale. Returns the numeric result, or null if the input is empty
 * or invalid.
 */
export function evaluateExpression(input: string): number | null {
  if (!input.trim()) return null;
  const tokens = tokenize(input.replace(/,/g, "."));
  if (!tokens || tokens.length === 0) return null;
  return parse(tokens);
}
