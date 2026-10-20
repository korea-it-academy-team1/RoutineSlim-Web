# RoutineSlim React migration

## Architecture
- `backend/`: Spring Boot 3.5.6 API, Java 17, Maven, H2/MySQL
- `frontend/`: React 18 + Vite SPA. React-native login, dashboard, subscriptions, payments, community.
- `/legacy/index.html`: previous UI preserved for calendar, savings and profile while these are migrated.

## Run
1. IntelliJ: open `backend/pom.xml`, run `RoutineSlimApplication` (port 8080).
2. Terminal: `cd frontend && npm install && npm run dev` (port 5173).
3. Visit `http://localhost:5173`.

## Important
- Frontend Vite proxies `/api`, `/oauth2`, `/login/oauth2` to localhost:8080.
- Auth uses backend HTTP session and CSRF tokens. Keep the dev ports as configured.
- The original legacy page remains accessible. This is a partial React migration, **not** a fully converted React application.
- OAuth providers require developer credentials and redirect URL configuration.
- Run Maven and browser integration tests before deployment.
