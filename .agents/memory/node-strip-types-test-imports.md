---
name: Node strip-types test imports
description: Import resolution limits when running TypeScript tests directly under Node's strip-types mode.
---

When API tests run with `node --experimental-strip-types`, imports from test files should reference source `.ts` files explicitly. Existing `.js` specifiers can fail because Node looks for a physical `.js` file rather than mapping it to `.ts`; directory imports are unsupported too.

**Why:** The package test command runs TypeScript source directly, while much of the application source uses `.js` specifiers intended for the build output.

**How to apply:** When adding a direct Node test, use `.ts` for its local source import. If the full test command fails on unrelated imports, distinguish runner resolution failures from behavioral test failures.
