// TeX math to Typst math for the article corpus. Anything that cannot be translated
// faithfully throws TypstMathError: wrong math must never reach the PDF.

export class TypstMathError extends Error {
  readonly tex: string

  constructor(tex: string, reason: string) {
    super(`Unsupported TeX math (${reason}): ${tex}`)
    this.name = "TypstMathError"
    this.tex = tex
  }
}

interface Atom {
  readonly out: string
  // Braced groups take scripts through attach(): TeX attaches them to the whole group.
  readonly group: boolean
  // Digit runs: TeX attaches scripts to the last character only (`10^2` is 1 and 0^2).
  readonly digits?: string
}

const TAG = /\\tag\{([^{}]*)\}/g
const COMMAND_NAME = /^\\([A-Za-z]+|[^A-Za-z])/

// Object literals inherit keys such as `constructor`, so every lookup checks ownership.
function lookup(
  table: Record<string, string>,
  key: string
): string | undefined {
  return Object.hasOwn(table, key) ? table[key] : undefined
}

// Typst names differ from TeX where the TeX glyph is a variant: \epsilon is lunate
// (epsilon.alt) and \phi is the stroked form (phi.alt).
const SYMBOLS: Record<string, string> = {
  alpha: "alpha",
  beta: "beta",
  gamma: "gamma",
  delta: "delta",
  epsilon: "epsilon.alt",
  varepsilon: "epsilon",
  zeta: "zeta",
  eta: "eta",
  theta: "theta",
  vartheta: "theta.alt",
  iota: "iota",
  kappa: "kappa",
  lambda: "lambda",
  mu: "mu",
  nu: "nu",
  xi: "xi",
  pi: "pi",
  varpi: "pi.alt",
  rho: "rho",
  varrho: "rho.alt",
  sigma: "sigma",
  varsigma: "sigma.alt",
  tau: "tau",
  upsilon: "upsilon",
  phi: "phi.alt",
  varphi: "phi",
  chi: "chi",
  psi: "psi",
  omega: "omega",
  Gamma: "Gamma",
  Delta: "Delta",
  Theta: "Theta",
  Lambda: "Lambda",
  Xi: "Xi",
  Pi: "Pi",
  Sigma: "Sigma",
  Upsilon: "Upsilon",
  Phi: "Phi",
  Psi: "Psi",
  Omega: "Omega",
  cdot: "dot.op",
  times: "times",
  div: "div",
  pm: "plus.minus",
  mp: "minus.plus",
  circ: "circle.small",
  ast: "ast.op",
  star: "star.op",
  bullet: "bullet",
  leq: "lt.eq",
  le: "lt.eq",
  geq: "gt.eq",
  ge: "gt.eq",
  neq: "#sym.eq.not",
  ne: "#sym.eq.not",
  approx: "approx",
  equiv: "equiv",
  sim: "tilde.op",
  simeq: "tilde.eq",
  propto: "prop",
  ll: "lt.double",
  gg: "gt.double",
  in: "in",
  notin: "in.not",
  subset: "subset",
  subseteq: "subset.eq",
  supset: "supset",
  cup: "union",
  cap: "inter",
  setminus: "without",
  emptyset: "nothing",
  forall: "forall",
  exists: "exists",
  neg: "not",
  land: "and",
  lor: "or",
  to: "arrow.r",
  rightarrow: "arrow.r",
  leftarrow: "arrow.l",
  Rightarrow: "arrow.r.double",
  Leftarrow: "arrow.l.double",
  leftrightarrow: "arrow.l.r",
  Leftrightarrow: "arrow.l.r.double",
  mapsto: "arrow.r.bar",
  uparrow: "arrow.t",
  downarrow: "arrow.b",
  infty: "infinity",
  partial: "partial",
  nabla: "nabla",
  prime: "prime",
  ell: "ell",
  angle: "angle",
  perp: "perp",
  parallel: "parallel",
  mid: "divides",
  cdots: "dots.c",
  ldots: "dots.h",
  dots: "dots.h",
  vdots: "dots.v",
  ddots: "dots.down",
  lfloor: "floor.l",
  rfloor: "floor.r",
  lceil: "ceil.l",
  rceil: "ceil.r",
  langle: "chevron.l",
  rangle: "chevron.r",
  lbrack: "bracket.l",
  rbrack: "bracket.r",
  lbrace: "brace.l",
  rbrace: "brace.r",
  sum: "sum",
  prod: "product",
  int: "integral",
  iint: "integral.double",
  iiint: "integral.triple",
  oint: "integral.cont",
}

// Operators printed upright. Scripts sit beside them, as with TeX's \nolimits.
const OPERATORS: Record<string, true> = {
  sin: true,
  cos: true,
  tan: true,
  cot: true,
  sec: true,
  csc: true,
  arcsin: true,
  arccos: true,
  arctan: true,
  sinh: true,
  cosh: true,
  tanh: true,
  log: true,
  ln: true,
  exp: true,
  dim: true,
  ker: true,
  deg: true,
  arg: true,
  hom: true,
}

// Operators whose scripts go above and below in display style, as with LaTeX's \limits.
const LIMIT_OPERATORS: Record<string, true> = {
  max: true,
  min: true,
  sup: true,
  inf: true,
  limsup: true,
  liminf: true,
  det: true,
  gcd: true,
  Pr: true,
}

const ESCAPES: Record<string, string> = {
  "{": "brace.l",
  "}": "brace.r",
  "|": "bar.v.double",
  "%": "percent",
  "&": "amp",
  "#": "hash",
  $: "dollar",
  _: "underscore",
}

// Explicit TeX math spacing in em: \, \: \; \! and \quad, plus the control space \ .
const SPACING: Record<string, string> = {
  ",": "#h(0.1667em)",
  ":": "#h(0.2222em)",
  ";": "#h(0.2778em)",
  "!": "#h(-0.1667em)",
  " ": "#h(0.3333em)",
  quad: "#h(1em)",
  qquad: "#h(2em)",
}

// `,` and `;` are quoted: unquoted they would separate Typst arguments and matrix cells.
const CHARS: Record<string, string> = {
  "+": "+",
  "-": "-",
  "=": "=",
  "<": "lt",
  ">": "gt",
  "*": "ast.op",
  "/": "slash",
  "|": "bar.v",
  "(": "paren.l",
  ")": "paren.r",
  "[": "bracket.l",
  "]": "bracket.r",
  ":": "colon",
  "!": "excl",
  "'": "prime",
  "?": "quest",
  ".": ".",
  ",": '","',
  ";": '";"',
}

const LEFT_DELIMITERS: Record<string, string> = {
  "(": "paren.l",
  "[": "bracket.l",
  "|": "bar.v",
  "\\{": "brace.l",
  "\\lbrace": "brace.l",
  "\\lbrack": "bracket.l",
  "\\lfloor": "floor.l",
  "\\lceil": "ceil.l",
  "\\langle": "chevron.l",
  "\\lvert": "bar.v",
  "\\lVert": "bar.v.double",
  "\\|": "bar.v.double",
  "\\vert": "bar.v",
  "\\Vert": "bar.v.double",
}

const RIGHT_DELIMITERS: Record<string, string> = {
  ")": "paren.r",
  "]": "bracket.r",
  "|": "bar.v",
  "\\}": "brace.r",
  "\\rbrace": "brace.r",
  "\\rbrack": "bracket.r",
  "\\rfloor": "floor.r",
  "\\rceil": "ceil.r",
  "\\rangle": "chevron.r",
  "\\rvert": "bar.v",
  "\\rVert": "bar.v.double",
  "\\|": "bar.v.double",
  "\\vert": "bar.v",
  "\\Vert": "bar.v.double",
}

function plain(out: string): Atom {
  return { out, group: false }
}

function attached(
  base: Atom,
  sub: string | undefined,
  sup: string | undefined
): string {
  if (base.group) {
    const args = [base.out]
    if (sub !== undefined) args.push(`b: ${sub}`)
    if (sup !== undefined) args.push(`t: ${sup}`)
    return `attach(${args.join(", ")})`
  }
  const lower = sub === undefined ? "" : `_(${sub})`
  const upper = sup === undefined ? "" : `^(${sup})`
  return `${base.out}${lower}${upper}`
}

class MathParser {
  private readonly src: string
  private readonly tex: string
  private readonly display: boolean
  private pos = 0
  private nesting = 0

  constructor(src: string, tex: string, display: boolean) {
    this.src = src
    this.tex = tex
    this.display = display
  }

  parse(): string {
    return this.sequence(() => false).trim()
  }

  private limits(): string {
    return this.display ? "#true" : "#false"
  }

  private error(reason: string): TypstMathError {
    return new TypstMathError(this.tex, reason)
  }

  private peek(): string {
    return this.src.charAt(this.pos)
  }

  private rest(): string {
    return this.src.slice(this.pos)
  }

  private skipSpace(): void {
    while (this.pos < this.src.length && /\s/.test(this.peek())) this.pos += 1
  }

  private sequence(atEnd: () => boolean): string {
    const parts: string[] = []
    for (;;) {
      this.skipSpace()
      if (this.pos >= this.src.length || atEnd()) break
      parts.push(this.scripted())
    }
    return parts.filter((part) => part !== "").join(" ")
  }

  private scripted(): string {
    const base = this.atom()
    let sub: string | undefined
    let sup: string | undefined
    for (;;) {
      this.skipSpace()
      const marker = this.peek()
      if (marker === "'") {
        if (sup !== undefined) throw this.error("double superscript")
        let count = 0
        while (this.peek() === "'") {
          this.pos += 1
          count += 1
        }
        sup = Array.from({ length: count }, () => "prime").join(" ")
        continue
      }
      if (marker !== "_" && marker !== "^") break
      this.pos += 1
      const arg = this.scriptArgument()
      if (marker === "_") {
        if (sub !== undefined) throw this.error("double subscript")
        sub = arg
      } else {
        if (sup !== undefined) throw this.error("double superscript")
        sup = arg
      }
    }
    if (sub === undefined && sup === undefined) return base.out
    if (base.digits !== undefined) {
      const head = base.digits.slice(0, -1)
      const tail = attached(plain(base.digits.slice(-1)), sub, sup)
      return head === "" ? tail : `${head} ${tail}`
    }
    return attached(base, sub, sup)
  }

  private scriptArgument(): string {
    this.skipSpace()
    const c = this.peek()
    if (c === "{") {
      const inner = this.group()
      if (inner === "") throw this.error("empty script")
      return inner
    }
    if (c === "" || c === "_" || c === "^") {
      throw this.error("script without argument")
    }
    return this.atom(true).out
  }

  // A bare script or argument takes one token; `x^10` is x^1 followed by 0.
  private atom(singleDigit = false): Atom {
    const c = this.peek()
    if (c === "") throw this.error("unexpected end of math")
    if (c === "{") {
      const inner = this.group()
      return { out: inner === "" ? '""' : inner, group: true }
    }
    if (c === "_" || c === "^") return plain('""')
    if (c === "\\") return this.command()
    if (c === "}") throw this.error("unbalanced }")
    if (c === "&") throw this.error("alignment outside an environment")
    if (/[A-Za-z]/.test(c)) {
      this.pos += 1
      return plain(c)
    }
    if (/[0-9]/.test(c)) {
      const digits = this.number(singleDigit)
      return { out: digits, group: false, digits }
    }
    const symbol = lookup(CHARS, c)
    if (symbol === undefined) {
      throw this.error(`unsupported character ${JSON.stringify(c)}`)
    }
    this.pos += 1
    return plain(symbol)
  }

  private number(singleDigit: boolean): string {
    const match = (singleDigit ? /^[0-9]/ : /^[0-9]+(?:\.[0-9]+)?/).exec(
      this.rest()
    )
    if (match === null) throw this.error("expected a digit")
    this.pos += match[0].length
    return match[0]
  }

  private group(): string {
    this.pos += 1
    this.nesting += 1
    const inner = this.sequence(() => this.peek() === "}")
    this.nesting -= 1
    if (this.peek() !== "}") throw this.error("unbalanced {")
    this.pos += 1
    return inner
  }

  private rawGroup(): string {
    this.skipSpace()
    if (this.peek() !== "{") throw this.error("expected {")
    let depth = 0
    for (let i = this.pos; i < this.src.length; i += 1) {
      const c = this.src.charAt(i)
      if (c === "{") depth += 1
      if (c === "}") depth -= 1
      if (depth === 0) {
        const raw = this.src.slice(this.pos + 1, i)
        this.pos = i + 1
        return raw
      }
    }
    throw this.error("unbalanced {")
  }

  private argument(): string {
    this.skipSpace()
    if (this.peek() !== "{") return this.atom(true).out
    const inner = this.group()
    return inner === "" ? '""' : inner
  }

  private atCommand(name: string): boolean {
    this.skipSpace()
    return new RegExp(`^\\\\${name}(?![A-Za-z])`).test(this.rest())
  }

  private command(): Atom {
    const match = COMMAND_NAME.exec(this.rest())
    if (match === null) throw this.error("dangling backslash")
    const name = match[1]
    this.pos += match[0].length
    if (name === "\\") throw this.error("row break outside an environment")
    const spacing = lookup(SPACING, name)
    if (spacing !== undefined) return plain(spacing)
    const escaped = lookup(ESCAPES, name)
    if (escaped !== undefined) return plain(escaped)
    if (/^[A-Za-z]+$/.test(name)) return this.named(name)
    throw this.error(`unsupported command \\${name}`)
  }

  private named(name: string): Atom {
    switch (name) {
      case "frac": {
        const numerator = this.argument()
        const denominator = this.argument()
        return plain(`frac(${numerator}, ${denominator})`)
      }
      case "sqrt": {
        this.skipSpace()
        if (this.peek() === "[") throw this.error("\\sqrt with an index")
        return plain(`sqrt(${this.argument()})`)
      }
      case "mathrm":
        return plain(`upright(${this.argument()})`)
      case "mathbb":
        return plain(`bb(${this.argument()})`)
      case "mathbf":
        return plain(`bold(${this.argument()})`)
      case "mathcal":
        return plain(`cal(${this.argument()})`)
      case "overline":
        return plain(`overline(${this.argument()})`)
      case "underline":
        return plain(`underline(${this.argument()})`)
      case "lim":
        return plain(`op("lim", limits: ${this.limits()})`)
      case "liminf":
        return plain(`op("liminf", limits: ${this.limits()})`)
      case "limsup":
        return plain(`op("limsup", limits: ${this.limits()})`)
      case "text": {
        const raw = this.rawGroup()
        if (/[\\{}$%~&_^#]/.test(raw)) {
          throw this.error("\\text containing markup characters")
        }
        return plain(`"${raw.replaceAll('"', '\\"')}"`)
      }
      case "operatorname": {
        const raw = this.rawGroup()
        if (!/^[A-Za-z]+$/.test(raw)) {
          throw this.error("\\operatorname with non-letters")
        }
        return plain(`op("${raw}")`)
      }
      case "left": {
        const open = this.delimiter("left")
        this.nesting += 1
        const body = this.sequence(() => this.atCommand("right"))
        this.nesting -= 1
        if (!this.atCommand("right")) throw this.error("\\left without \\right")
        this.pos += "\\right".length
        const close = this.delimiter("right")
        const parts = [open, body, close].filter(
          (part): part is string => part !== null && part !== ""
        )
        if (parts.length === 0) throw this.error("empty \\left...\\right")
        return plain(`lr(${parts.join(" ")})`)
      }
      case "right":
        throw this.error("\\right without \\left")
      case "begin": {
        const start = this.pos - "\\begin".length
        const envName = this.rawGroup()
        const math = this.environment(envName)
        const whole =
          this.src.slice(0, start).trim() === "" && this.rest().trim() === ""
        if (envName === "aligned" && (this.nesting > 0 || !whole)) {
          throw this.error("aligned must be the whole expression")
        }
        return plain(math)
      }
      default:
        break
    }
    if (LIMIT_OPERATORS[name] === true) {
      return plain(`op("${name}", limits: ${this.limits()})`)
    }
    if (OPERATORS[name] === true) return plain(`op("${name}")`)
    const symbol = lookup(SYMBOLS, name)
    if (symbol !== undefined) return plain(symbol)
    throw this.error(`unsupported command \\${name}`)
  }

  // `\left.` and `\right.` are null delimiters, returned as null.
  private delimiter(side: "left" | "right"): string | null {
    this.skipSpace()
    if (this.peek() === ".") {
      this.pos += 1
      return null
    }
    const match = this.peek() === "\\" ? COMMAND_NAME.exec(this.rest()) : null
    const key = match === null ? this.peek() : match[0]
    const symbol = lookup(
      side === "left" ? LEFT_DELIMITERS : RIGHT_DELIMITERS,
      key
    )
    if (symbol === undefined) {
      throw this.error(`unsupported ${side} delimiter ${key}`)
    }
    this.pos += key.length
    return symbol
  }

  private environment(name: string): string {
    if (name !== "aligned" && name !== "cases" && name !== "matrix") {
      throw this.error(`unsupported environment ${name}`)
    }
    const end = `\\end{${name}}`
    const atEnd = (): boolean => {
      this.skipSpace()
      return this.rest().startsWith(end)
    }
    this.nesting += 1
    const rows = this.rows(atEnd)
    this.nesting -= 1
    this.pos += end.length
    while (
      rows.length > 1 &&
      rows[rows.length - 1].every((cell) => cell === "")
    ) {
      rows.pop()
    }
    if (rows.every((row) => row.every((cell) => cell === ""))) {
      throw this.error("empty environment")
    }
    if (
      name === "matrix" &&
      rows.some((row) => row.length !== rows[0].length)
    ) {
      throw this.error("matrix rows of unequal length")
    }
    if (
      name === "matrix" &&
      rows.some((row) => row.some((cell) => cell === ""))
    ) {
      throw this.error("empty matrix cell")
    }

    if (name === "aligned") {
      return rows.map((row) => row.join(" & ")).join(" \\ ")
    }
    if (name === "matrix") {
      const body = rows.map((row) => row.join(", ")).join("; ")
      return `mat(delim: #none, ${body})`
    }
    const cases = rows.map((row) => {
      if (row.length !== 1) throw this.error("cases row with several columns")
      return row[0]
    })
    return `cases(${cases.join(", ")})`
  }

  private rows(atEnd: () => boolean): string[][] {
    const rows: string[][] = [[]]
    const atSeparator = (): boolean =>
      this.peek() === "&" || this.rest().startsWith("\\\\")
    for (;;) {
      const cell = this.sequence(() => atEnd() || atSeparator())
      rows[rows.length - 1].push(cell)
      this.skipSpace()
      if (atEnd()) break
      if (this.peek() === "&") {
        this.pos += 1
      } else if (this.rest().startsWith("\\\\")) {
        this.pos += 2
        if (/^\s*[[*]/.test(this.rest())) {
          throw this.error("row spacing options are not supported")
        }
        rows.push([])
      } else {
        throw this.error("unterminated environment")
      }
    }
    return rows
  }
}

function splitTag(tex: string): { body: string; tag: string | undefined } {
  const tags = [...tex.matchAll(TAG)]
  if (tags.length > 1) throw new TypstMathError(tex, "more than one \\tag")
  const tag = tags.length === 0 ? undefined : tags[0][1].trim()
  if (tag !== undefined && (tag === "" || /["\\\n]/.test(tag))) {
    throw new TypstMathError(tex, "unusable \\tag value")
  }
  const body = tex.replace(TAG, "")
  if (body.includes("\\tag")) throw new TypstMathError(tex, "malformed \\tag")
  return { body, tag }
}

export function texToTypst(tex: string, display: boolean): string {
  const { body, tag } = splitTag(tex)
  if (!display && tag !== undefined) {
    throw new TypstMathError(tex, "\\tag outside display math")
  }
  if (!display && /\\begin\{aligned\}/.test(body)) {
    throw new TypstMathError(tex, "aligned is display-only")
  }
  const math = new MathParser(body, tex, display).parse()
  if (math === "") throw new TypstMathError(tex, "empty expression")
  if (!display) return `$${math}$`
  if (tag === undefined) return `$ ${math} $`
  return `#eq(tag: "${tag}")[$ ${math} $]`
}
