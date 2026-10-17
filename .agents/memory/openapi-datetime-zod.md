---
name: OpenAPI date-time response validation
description: How generated Zod schemas treat date-time fields before Express serializes JSON responses.
---

Pass native JavaScript `Date` instances to generated Zod response schemas for OpenAPI `format: date-time` fields. Express will serialize the validated `Date` as an ISO string in the HTTP JSON response. Validate the complete response before committing related database writes where possible.

**Why:** A generated comparison report was saved, then the route returned a 500 because it passed an ISO string to a generated schema expecting a `Date`. The false failure encouraged users to repeat a paid AI request.

**How to apply:** When a route calls a generated response schema's `.parse`, inspect the generated runtime schema for `date-time` fields, pass `Date` objects, and keep validation before persistence so a serialization contract error cannot save data and report failure.
