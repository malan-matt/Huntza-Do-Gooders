/**
 * RFC 5321 / RFC 5322 compliant email address ("addr-spec") validator.
 *
 * This is a hand-written recursive-descent parser implementing the formal
 * ABNF grammar for `addr-spec` from RFC 5322 §3.4.1, combined with the
 * stricter `Domain` grammar, address-literal forms, and length limits from
 * RFC 5321 (§4.1.2, §4.1.3, §4.5.3.1). A regex alone cannot correctly
 * express this grammar (nested comments, escaped quoted-pairs, and IPv6
 * domain literals are not regular languages in the relevant sense), so this
 * walks the string character-by-character against the grammar productions
 * below.
 *
 * Grammar implemented (RFC 5322 §3.2.2, §3.2.3, §3.2.4, §3.4.1):
 *
 *   addr-spec       = local-part "@" domain
 *   local-part      = dot-atom / quoted-string
 *   domain          = dot-atom / domain-literal
 *
 *   dot-atom        = [CFWS] dot-atom-text [CFWS]
 *   dot-atom-text   = 1*atext *("." 1*atext)
 *   atext           = ALPHA / DIGIT / "!" / "#" / "$" / "%" / "&" / "'" /
 *                      "*" / "+" / "-" / "/" / "=" / "?" / "^" / "_" / "`" /
 *                      "{" / "|" / "}" / "~"
 *
 *   quoted-string   = [CFWS] DQUOTE *([FWS] qcontent) [FWS] DQUOTE [CFWS]
 *   qcontent        = qtext / quoted-pair
 *   qtext           = %d33 / %d35-91 / %d93-126            ; printable, no " or \
 *   quoted-pair     = "\" (VCHAR / WSP)
 *
 *   domain-literal  = [CFWS] "[" *([FWS] dtext) [FWS] "]" [CFWS]
 *   dtext           = %d33-90 / %d94-126                   ; printable, no [ ] or \
 *
 *   CFWS            = (1*([FWS] comment) [FWS]) / FWS
 *   comment         = "(" *([FWS] ccontent) [FWS] ")"
 *   ccontent        = ctext / quoted-pair / comment         ; comments nest
 *   ctext           = %d33-39 / %d42-91 / %d93-126          ; printable, no ( ) or \
 *   FWS             = ([*WSP CRLF] 1*WSP)                   ; folding whitespace
 *
 * Deliberate scope decisions (so behaviour is predictable, not "magic"):
 *
 *  1. Obsolete syntax (RFC 5322 §4: obs-local-part, obs-domain, obs-qtext,
 *     obs-FWS, bare control characters, etc.) is NOT accepted. RFC 5322
 *     itself says obsolete productions exist only to parse legacy mail
 *     already in transit and "MUST NOT be used" to construct new
 *     addresses. Accepting them would mean treating strings containing
 *     raw control characters as "valid" email addresses.
 *
 *  2. For the domain half, RFC 5322's own `dot-atom` grammar is very
 *     permissive (it would allow labels like `!#$`), but no such address
 *     can ever actually be delivered. Real delivery is governed by
 *     RFC 5321 §4.1.2 / RFC 1035, which restricts each domain label to
 *     letters, digits and hyphens (LDH), 1-63 octets, and forbids a label
 *     starting or ending with a hyphen. This validator enforces the
 *     RFC 5321 LDH rule for the dot-atom domain form, because that's what
 *     "RFC compliant" means in practice for a deliverable address.
 *
 *  3. `domain-literal` (e.g. `[192.0.2.1]` or `[IPv6:2001:db8::1]`) is
 *     validated against the specific forms RFC 5321 §4.1.3 defines:
 *     IPv4-address-literal, "IPv6:" + IPv6-address-literal, and the
 *     General-address-literal fallback for other address standards.
 *
 *  4. CFWS (comments and folding whitespace) is supported around both the
 *     local-part and the domain, including nested comments, because it is
 *     literally part of the `dot-atom`, `quoted-string`, and
 *     `domain-literal` productions. This means, perhaps surprisingly,
 *     that leading/trailing whitespace and parenthesized comments such as
 *     `john.smith(comment)@example.com` are syntactically valid per the
 *     grammar, and so are accepted here.
 *
 *  5. Internationalized email (RFC 6531/6532, "SMTPUTF8") is out of
 *     scope. This validator covers the US-ASCII `addr-spec` grammar only;
 *     internationalized domain names must be supplied in their ASCII
 *     ("xn--..." Punycode) form, which is already handled correctly since
 *     Punycode labels are plain LDH labels.
 *
 * Length limits enforced (RFC 5321):
 *   - local-part  <= 64 octets   (§4.5.3.1.1)
 *   - domain      <= 255 octets  (§4.5.3.1.2)
 *   - addr-spec   <= 254 octets  (derived from §4.5.3.1.3: the 256-octet
 *     limit on a Path includes the enclosing "<" and ">", so the bare
 *     addr-spec itself is limited to 254 octets)
 */

class AddrSpecParseError extends Error {}

class Rfc5322Parser {
  private pos = 0;

  constructor(private readonly src: string) {}

  /** Parses the entire input as a single addr-spec; throws on any violation. */
  parse(): void {
    const localPart = this.parseLocalPart();
    this.expect('@');
    const domain = this.parseDomain();

    if (this.pos !== this.src.length) {
      this.fail('unexpected trailing characters after domain');
    }

    const localLength = localPart.end - localPart.start;
    const domainLength = domain.end - domain.start;

    if (localLength === 0) this.fail('local-part must not be empty');
    if (domainLength === 0) this.fail('domain must not be empty');
    if (localLength > 64) this.fail('local-part exceeds 64 octets (RFC 5321 4.5.3.1.1)');
    if (domainLength > 255) this.fail('domain exceeds 255 octets (RFC 5321 4.5.3.1.2)');
    if (this.src.length > 254) this.fail('addr-spec exceeds 254 octets (RFC 5321 4.5.3.1.3)');
  }

  // ---- local-part = dot-atom / quoted-string -----------------------------

  private parseLocalPart(): { start: number; end: number } {
    this.skipCFWS();
    const start = this.pos;
    if (this.peek() === '"') {
      this.parseQuotedString();
    } else {
      this.parseDotAtomText();
    }
    const end = this.pos;
    this.skipCFWS();
    return { start, end };
  }

  private parseDotAtomText(): void {
    if (!this.isAtext(this.peek())) this.fail('expected atext at start of dot-atom');
    this.consumeWhile((c) => this.isAtext(c));

    while (this.peek() === '.') {
      const save = this.pos;
      this.advance(); // tentatively consume '.'
      if (!this.isAtext(this.peek())) {
        this.pos = save; // not a label-separating dot (e.g. trailing dot) - back off
        break;
      }
      this.consumeWhile((c) => this.isAtext(c));
    }
  }

  private parseQuotedString(): void {
    this.expect('"');
    while (true) {
      this.skipFWS();
      const c = this.peek();
      if (c === '"') {
        this.advance();
        return;
      }
      if (c === undefined) this.fail('unterminated quoted-string');
      if (c === '\\') {
        this.advance();
        const n = this.peek();
        if (n === undefined || !(this.isVCHAR(n) || this.isWSP(n))) {
          this.fail('invalid quoted-pair in quoted-string');
        }
        this.advance();
        continue;
      }
      if (this.isQtext(c)) {
        this.advance();
        continue;
      }
      this.fail(`invalid character '${c}' in quoted-string`);
    }
  }

  // ---- domain = dot-atom (LDH form) / domain-literal ---------------------

  private parseDomain(): { start: number; end: number } {
    this.skipCFWS();
    const start = this.pos;
    if (this.peek() === '[') {
      this.parseDomainLiteral();
    } else {
      this.parseDomainDotAtom();
    }
    const end = this.pos;
    this.skipCFWS();
    return { start, end };
  }

  /** RFC 5321 4.1.2: Domain = sub-domain *("." sub-domain). */
  private parseDomainDotAtom(): void {
    this.parseDomainLabel();
    while (this.peek() === '.') {
      const save = this.pos;
      this.advance();
      if (!this.isLetterOrDigit(this.peek())) {
        this.pos = save;
        break;
      }
      this.parseDomainLabel();
    }
  }

  /** sub-domain = Let-dig [Ldh-str]; label <= 63 octets, no leading/trailing hyphen. */
  private parseDomainLabel(): void {
    const start = this.pos;
    if (!this.isLetterOrDigit(this.peek())) {
      this.fail('domain label must start with a letter or digit');
    }
    this.advance();
    this.consumeWhile((c) => this.isLdh(c));
    if (this.src[this.pos - 1] === '-') {
      this.fail('domain label must not end with a hyphen');
    }
    if (this.pos - start > 63) {
      this.fail('domain label exceeds 63 octets (RFC 1035 / RFC 5321 4.1.2)');
    }
  }

  private parseDomainLiteral(): void {
    this.expect('[');
    const contentStart = this.pos;
    while (true) {
      this.skipFWS();
      const c = this.peek();
      if (c === ']') break;
      if (c === undefined) this.fail('unterminated domain-literal');
      if (this.isDtext(c)) {
        this.advance();
      } else {
        this.fail(`invalid character '${c}' in domain-literal`);
      }
    }
    const rawContent = this.src.slice(contentStart, this.pos);
    this.expect(']');
    this.validateAddressLiteral(rawContent.replace(/[ \t\r\n]+/g, ''));
  }

  /**
   * RFC 5321 4.1.3: General-address-literal / IPv4-address-literal /
   * IPv6-address-literal. Anything else inside "[...]" is rejected, even
   * though it may be lexically valid `dtext`, because it can't possibly
   * be a deliverable address.
   */
  private validateAddressLiteral(content: string): void {
    if (content.length === 0) this.fail('empty address literal');

    if (this.isIPv4Literal(content)) return;

    const ipv6Match = /^IPv6:(.+)$/i.exec(content);
    if (ipv6Match) {
      if (this.isIPv6Literal(ipv6Match[1])) return;
      this.fail('invalid IPv6 address literal');
    }

    // General-address-literal = Standardized-tag ":" 1*dcontent
    if (/^[A-Za-z0-9-]+:.+$/.test(content)) return;

    this.fail('unrecognized address literal (expected IPv4, "IPv6:...", or tag:content)');
  }

  private isIPv4Literal(s: string): boolean {
    const parts = s.split('.');
    if (parts.length !== 4) return false;
    return parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255);
  }

  /** RFC 4291 textual representation, including "::" compression and an
   *  optional embedded IPv4 address in the low 32 bits. */
  private isIPv6Literal(addrIn: string): boolean {
    let addr = addrIn;
    if (addr.length === 0) return false;
    if (addr.indexOf(':::') !== -1) return false; // triple colon is never valid

    let groupsNeeded = 8;

    const lastColon = addr.lastIndexOf(':');
    if (lastColon !== -1) {
      const tail = addr.slice(lastColon + 1);
      if (tail.indexOf('.') !== -1) {
        if (!this.isIPv4Literal(tail)) return false;
        addr = addr.slice(0, lastColon); // drop ":a.b.c.d"; the embedded
        groupsNeeded = 6; // IPv4 occupies the space of 2 hextets
      }
    }

    if (addr.length === 0) return false; // e.g. input was only an IPv4 literal

    const doubleColonCount = (addr.match(/::/g) || []).length;
    if (doubleColonCount > 1) return false;

    if (doubleColonCount === 1) {
      const idx = addr.indexOf('::');
      const head = addr.slice(0, idx);
      const tail = addr.slice(idx + 2);
      const headGroups = head === '' ? [] : head.split(':');
      const tailGroups = tail === '' ? [] : tail.split(':');
      if (headGroups.some((g) => !this.isHexGroup(g))) return false;
      if (tailGroups.some((g) => !this.isHexGroup(g))) return false;
      // "::" must stand in for at least one elided group of zeros.
      return headGroups.length + tailGroups.length < groupsNeeded;
    }

    const groups = addr.split(':');
    if (groups.length !== groupsNeeded) return false;
    return groups.every((g) => this.isHexGroup(g));
  }

  private isHexGroup(g: string): boolean {
    return /^[0-9A-Fa-f]{1,4}$/.test(g);
  }

  // ---- CFWS = comments and folding whitespace ----------------------------

  private skipCFWS(): void {
    while (true) {
      const before = this.pos;
      this.skipFWS();
      if (this.peek() === '(') {
        this.parseComment();
        continue;
      }
      if (this.pos === before) break;
    }
  }

  private parseComment(): void {
    this.expect('(');
    while (true) {
      this.skipFWS();
      const c = this.peek();
      if (c === ')') {
        this.advance();
        return;
      }
      if (c === undefined) this.fail('unterminated comment');
      if (c === '(') {
        this.parseComment(); // comments nest
        continue;
      }
      if (c === '\\') {
        this.advance();
        const n = this.peek();
        if (n === undefined || !(this.isVCHAR(n) || this.isWSP(n))) {
          this.fail('invalid quoted-pair in comment');
        }
        this.advance();
        continue;
      }
      if (this.isCtext(c)) {
        this.advance();
        continue;
      }
      this.fail(`invalid character '${c}' in comment`);
    }
  }

  /** FWS = ([*WSP CRLF] 1*WSP) repeated; also tolerates plain runs of WSP. */
  private skipFWS(): void {
    while (true) {
      let p = this.pos;
      while (this.isWSP(this.src[p])) p++;
      if (this.src[p] === '\r' && this.src[p + 1] === '\n' && this.isWSP(this.src[p + 2])) {
        p += 2;
        while (this.isWSP(this.src[p])) p++;
        this.pos = p;
        continue;
      }
      if (p > this.pos) {
        this.pos = p;
        continue;
      }
      break;
    }
  }

  // ---- character classes --------------------------------------------------

  private isAtext(c: string | undefined): boolean {
    if (c === undefined) return false;
    return /[A-Za-z0-9!#$%&'*+\-/=?^_`{|}~]/.test(c);
  }

  private isQtext(c: string | undefined): boolean {
    if (c === undefined) return false;
    const code = c.charCodeAt(0);
    return code === 33 || (code >= 35 && code <= 91) || (code >= 93 && code <= 126);
  }

  private isCtext(c: string | undefined): boolean {
    if (c === undefined) return false;
    const code = c.charCodeAt(0);
    return (code >= 33 && code <= 39) || (code >= 42 && code <= 91) || (code >= 93 && code <= 126);
  }

  private isDtext(c: string | undefined): boolean {
    if (c === undefined) return false;
    const code = c.charCodeAt(0);
    return (code >= 33 && code <= 90) || (code >= 94 && code <= 126);
  }

  private isVCHAR(c: string | undefined): boolean {
    if (c === undefined) return false;
    const code = c.charCodeAt(0);
    return code >= 33 && code <= 126;
  }

  private isWSP(c: string | undefined): boolean {
    return c === ' ' || c === '\t';
  }

  private isLetterOrDigit(c: string | undefined): boolean {
    if (c === undefined) return false;
    return /[A-Za-z0-9]/.test(c);
  }

  private isLdh(c: string | undefined): boolean {
    if (c === undefined) return false;
    return /[A-Za-z0-9-]/.test(c);
  }

  // ---- low-level scanning helpers -----------------------------------------

  private peek(): string | undefined {
    return this.src[this.pos];
  }

  private advance(): void {
    this.pos++;
  }

  private expect(ch: string): void {
    if (this.peek() !== ch) this.fail(`expected '${ch}'`);
    this.advance();
  }

  private consumeWhile(pred: (c: string | undefined) => boolean): void {
    while (pred(this.peek())) this.advance();
  }

  private fail(message: string): never {
    throw new AddrSpecParseError(message);
  }
}

/**
 * Validates `email` against the RFC 5321 / RFC 5322 `addr-spec` grammar.
 *
 * @param email - the candidate address (e.g. "user@example.com")
 * @returns true if `email` is a syntactically valid, length-compliant
 *          addr-spec; false otherwise. Never throws.
 */
export function isValid(email: string): boolean {
  if (typeof email !== 'string' || email.length === 0) return false;
  try {
    new Rfc5322Parser(email).parse();
    return true;
  } catch {
    return false;
  }
}
