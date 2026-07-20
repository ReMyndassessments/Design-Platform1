---
name: api-server esbuild externals
description: Which packages must NOT be in the external list for the api-server esbuild bundle.
---

# api-server esbuild external list gotcha

## Rule
Use `"@google-cloud/*"` in `artifacts/api-server/build.mjs` external list — NOT `"@google/*"`.

**Why:** `@google/*` is too broad — it also externalises `@google/genai` (the Gemini SDK), which is a pure JS package that esbuild CAN bundle. When externalised, Node can't find it at runtime and the server crashes with `ERR_MODULE_NOT_FOUND`.

**How to apply:** Any time a new `@google/…` pure-JS SDK is added (e.g. `@google/genai`), confirm it is NOT matched by the external globs. Only `@google-cloud/*` (which uses native .proto file path traversal) needs to be external.
