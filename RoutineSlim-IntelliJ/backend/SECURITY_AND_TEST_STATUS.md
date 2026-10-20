# RoutineSlim security and test status

## Updated in this revision
- Spring Security CSRF enabled with a cookie token repository.
- `/api/csrf` endpoint exposes the request token to the same-origin UI.
- Frontend automatically attaches CSRF token to POST, PUT, PATCH, and DELETE fetch requests.
- Added a Spring Boot MockMvc smoke test for the CSRF endpoint.
- Existing purple design HTML and CSS are unchanged.

## Remaining work / limitations
- Maven and browser end-to-end tests have not been executed in this environment.
- Legacy JSON-based user and community data should be migrated to normalized entities.
- Actual OAuth login requires provider credentials and authorized redirect URIs.
- Gmail and financial transaction ingestion are not implemented.
- Session cookie should use Secure=true under HTTPS in production.
- Verify CSRF token behavior during OAuth login and logout in deployed environment.
