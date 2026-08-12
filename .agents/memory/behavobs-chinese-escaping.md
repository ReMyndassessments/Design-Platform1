---
name: BEHAVOBS Chinese string escaping
description: Lesson from BEHAVOBS upgrade — Unicode curly quotes in Chinese/Korean note strings break esbuild build
---

## Rule
When writing Chinese or Korean strings inside double-quoted JS/TS string literals anywhere in the codebase (including `index.ts` and `i18n.tsx`), do **not** use Unicode curly quotes `"…"` (U+201C/U+201D) to quote sub-terms. They are written back as bare ASCII `"` by the Edit tool, which terminates the string literal and causes parse errors.

**Why:** The Edit tool normalizes or the file system stores them as ASCII `"`, so the parser sees an unescaped double-quote mid-string → parse error (`Expected } but found N` in esbuild; `Unexpected token, expected ","` in Babel/Vite).

**How to apply:** Use `\"term\"` (escaped ASCII quotes), plain text without quotes, or paraphrase to avoid needing inline quotes. Affects any Chinese/Korean string in any `.ts` or `.tsx` file. The Korean section in `i18n.tsx` must also use `\"` escaping for inline quotation marks.
