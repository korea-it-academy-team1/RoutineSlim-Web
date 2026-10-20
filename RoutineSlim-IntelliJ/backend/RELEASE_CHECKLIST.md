# RoutineSlim release verification checklist

## Confirmed static checks
- JavaScript syntax: run `node --check src/main/resources/static/js/app.js`
- ZIP integrity: run `unzip -t`

## Required before claiming production readiness
1. Run `./mvnw test` or `mvn test` with JDK 17+ and Maven installed.
2. Run Spring Boot; register two different users and confirm private subscription access.
3. Verify register/login/logout/password change/account deletion.
4. Create/update/delete subscriptions and compare legacy `/api/data/subscriptions` with `/api/v1/subscriptions`.
5. Test report and savings values against weekly/monthly/yearly subscriptions.
6. Verify calendar edge cases (29/30/31st; weekly and yearly billing). Current model lacks a billing start date: yearly and weekly dates are estimates, not verified invoices.
7. Test community post/comment/like/delete across two users, including forged authors and oversized input.
8. Test browser layouts against screenshots.
9. Configure and test each OAuth provider with valid developer credentials; disabled placeholders are not live logins.
10. Re-enable CSRF protection and apply deployment hardening before public exposure.

## Outstanding architecture work
- Frontend still uses legacy JSON API for subscriptions. JPA sync is one-way; direct v1 API writes do not refresh the legacy JSON document.
- Community persists as a shared JSON document, not normalized relational entities.
- No real payment ledger, bank sync, Gmail consent flow, or live pricing data.
- Yearly/weekly calendar calculations are not exact without a subscription start date.

This archive is an incremental hardening update, not a fully tested production release.
