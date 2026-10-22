---
name: Express route parameter typings
description: Compatibility note for Express 5 route parameter types in the API server.
---

Keep `@types/express-serve-static-core` at 5.0.7 with the current API route handling. Version 5.1.1 widened route parameter types to include arrays, producing hundreds of false-positive type errors across code that treats validated path values as scalar strings.

**Why:** A type-package update changed `req.params` types without changing the runtime routing behavior, making unrelated query and database calls appear invalid.

**How to apply:** Before upgrading the Express core typings, explicitly normalize and validate route parameters and run the API server type check. Only then remove the pin.
