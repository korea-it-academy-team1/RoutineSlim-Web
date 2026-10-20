# RoutineSlim integration / verification status

## Changes in this iteration
- Account login and registration invalidate the previous session before creating a new session, reducing session fixation risk.
- Account deletion now removes JPA subscriptions in the same transaction as user and legacy user-data deletion.
- The JPA bulk delete is explicitly declared as a modifying query.
- Malformed community JSON is handled as a client error (HTTP 400).
- Profile JSON requests over 1.5 million characters are rejected; photos are still stored as JSON and should eventually move to file/object storage.
- Session cookie `Secure` flag can be enabled with `SESSION_COOKIE_SECURE=true` in HTTPS deployments.

## Verified
- Source archive extracts and re-compresses successfully.
- JavaScript syntax passes `node --check`.
- HTML/CSS/JS files are byte-for-byte unchanged from the prior Profile-Integrated ZIP.
- Static review of affected Java files completed.

## Not verified / not complete
- Maven compile, JUnit and browser end-to-end tests (Maven not installed in this environment).
- CSRF defense: the app still disables CSRF for its legacy session APIs. **Do not publicly deploy as-is.**
- Legacy JSON subscription endpoint and JPA API still coexist; they are not fully unified.
- Community posts/comments/likes are still stored in a shared JSON document rather than normalized tables.
- Gmail OAuth email receipt access, bank connections, and production-grade social OAuth validation remain unimplemented/unverified.
- Financial transaction history is not implemented; report figures are based on subscription records, not verified payments.

## Suggested local verification
1. `mvn clean test`
2. `mvn spring-boot:run`
3. Test register/login/logout, profile edits, password change, subscription CRUD, reports, calendar, community posts/comments/likes, and account deletion with a fresh H2 DB.
4. Set `SESSION_COOKIE_SECURE=true` behind HTTPS; enable CSRF protection and configure OAuth credentials before public deployment.
