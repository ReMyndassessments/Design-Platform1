---
name: BEHAVOBS Chinese string escaping
description: Lesson from BEHAVOBS upgrade — Unicode curly quotes in Chinese/Korean note strings break esbuild build
---

## Rule
When writing `noteChinese` / `noteKorean` strings inside double-quoted JS string literals, do **not** use Unicode curly quotes `"…"` (U+201C/U+201D) to quote sub-terms. They are written back as bare ASCII `"` by the Edit tool, which terminates the string literal and breaks the esbuild compile.

**Why:** The Edit tool normalizes or the file system stores them as ASCII `"`, so esbuild sees an unescaped double-quote mid-string → parse error `Expected } but found N`.

**How to apply:** Use `\"N/O\"` (escaped ASCII quotes), plain text without quotes, or `N/O` without surrounding quotes. This applies to any Chinese/Korean string in `index.ts` that embeds a quoted sub-term.
