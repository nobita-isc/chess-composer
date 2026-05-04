# UC-LSN-010: Authorization — Non-Admin Cannot Mutate

**Module:** lessons | **Actor:** Student / Unauthenticated | **Priority:** P0

## Description
Write operations (create, update, delete lesson/content) are restricted to admin role; non-admin requests rejected.

## Preconditions
- User authenticated as student OR unauthenticated

## Main Flow
1. Actor sends mutating request (POST/PUT/DELETE) to any admin lesson/content endpoint
2. `requireRole('admin')` middleware checks JWT role claim
3. Role != 'admin' → 403 Forbidden returned
4. No data modified

## Alternate Flows
- 1a. No JWT present → 401 Unauthorized
- 1b. Expired JWT → 401

## Postconditions
- DB unchanged
- No sensitive data leaked in error response

## Related
- Middleware: `roleMiddleware.js`
- APIs: `POST /api/courses/:id/lessons`, `PUT /api/lessons/:id`, `DELETE /api/lessons/:id`, `POST /api/lessons/:id/content`, `PUT /api/content/:id`, `DELETE /api/content/:id`
- TCs: TC-LSN-010-01..03
