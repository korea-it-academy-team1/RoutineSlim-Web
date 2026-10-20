# RoutineSlim integration handoff (2026-10-18)

## Implemented in this revision
- Community screen uses `/api/v1/community/posts` and per-post comment/like endpoints backed by JPA tables.
- Legacy community JSON is imported once at startup into posts/comments/likes. The old JSON is retained as a backup; HTML formatting, image attachments and tag arrays are not imported into the new schema.
- Legacy community bulk-write endpoint now returns HTTP 410 to avoid divergent data stores.
- Added an actual-payment screen and API calls for create/list/delete; these are separate from predicted subscription charges.
- Existing subscription UI writes through `/api/data/subscriptions`, but its reads are now sourced from the JPA `subscriptions` table. The first read imports legacy JSON once, and subsequent updates preserve existing numeric JPA IDs. Other user_data keys still use JSON.
- Added JPA integration test source for community and subscription storage.

## Not yet externally verified
- Maven is not installed in this execution environment. Full `mvn test` and application startup have NOT been run. JavaScript passed `node --check` and ZIP integrity was checked.
- Browser end-to-end interactions have NOT been run.
- Google, Kakao, Naver OAuth cannot be verified without real app registrations, client credentials, redirect URLs and interactive consent. OAuth provider code/config exists but is not production certified.
- Legacy rich-text posts, image attachments and tags are preserved in the backup JSON but not carried over to the normalized post entity.
- Payment records are manually entered, not verified bank/card transactions.

## Local verification commands
```bash
mvn clean test
mvn spring-boot:run
```
Open http://localhost:8080. Use a fresh copy of the H2 database or back up `data/` before migration. Set GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET, KAKAO_CLIENT_ID/KAKAO_CLIENT_SECRET, NAVER_CLIENT_ID/NAVER_CLIENT_SECRET as environment variables for live OAuth verification, and register each `/login/oauth2/code/{registrationId}` callback with the corresponding provider.
