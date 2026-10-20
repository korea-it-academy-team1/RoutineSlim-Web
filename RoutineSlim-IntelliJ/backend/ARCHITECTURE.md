# RoutineSlim Architecture

- `auth/controller`, `auth/service`, `auth/dto`: authentication endpoints and business logic
- `member/repository`: member JDBC access (existing app_users schema)
- `subscription/controller`, `service`, `repository`, `entity`, `dto`: normalized subscription CRUD REST API backed by JPA
- `subscription/controller/SubscriptionDataController`: compatibility JSON API for existing browser client
- `savings/controller`, `service`, `dto`: calculated savings from normalized subscription records
- `community/controller`, `service`, `repository`: legacy community JSON API separated into layers
- `common/security`, `common/exception`, `common/dto`: shared concerns
- `config`: OAuth login integration

## Compatibility and migration
The current frontend continues to call `/api/data/subscriptions` (JSON blob), so its data does **not automatically appear** in the new normalized `subscriptions` table. The new `/api/v1/subscriptions` and `/api/v1/savings/summary` endpoints operate on normalized rows. To migrate, export existing subscriptions and re-import through the new API, or implement a one-time migration and switch the frontend. Do not use both write APIs interchangeably until migration is complete.

## Security
OAuth client credentials require environment variables. Existing legacy session API uses disabled CSRF for local development. Before public deployment, enable CSRF protection, add request-size limits and comprehensive ownership tests, and verify all OAuth provider flows.
