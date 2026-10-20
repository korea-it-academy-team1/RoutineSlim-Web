# RoutineSlim — 추가 계층 개편 내역

## 추가 구현
- `payment`: 실제 결제 기록 엔티티/리포지토리/DTO/서비스/컨트롤러. 구독 예상 결제 일정과 실제 결제 내역을 분리합니다.
- `community`: 게시글/댓글/좋아요 개별 JPA 엔티티, 리포지토리, DTO, 서비스, REST API 추가. 작성자 권한 검사 및 입력 검증을 적용합니다.
- 기존 `/api/community/posts` JSON API와 `/api/data/*` API는 기존 UI 호환을 위해 유지했습니다.

## 신규 API
- `GET /api/v1/payments?month=YYYY-MM`, `GET /api/v1/payments/summary?month=YYYY-MM`
- `POST /api/v1/payments`, `DELETE /api/v1/payments/{id}`
- `GET /api/v1/community/posts`, `GET /api/v1/community/posts/{id}`
- `POST /api/v1/community/posts`, `PUT /api/v1/community/posts/{id}`, `DELETE /api/v1/community/posts/{id}`
- `GET /api/v1/community/posts/{id}/comments`, `POST /api/v1/community/posts/{id}/comments`
- `POST /api/v1/community/posts/{id}/likes/toggle`

## 중요한 미완료 항목
- 기존 화면은 여전히 JSON 기반 구독/커뮤니티 API를 사용합니다. 신규 JPA API를 호출하도록 프론트엔드를 전환해야 합니다.
- 기존 커뮤니티 JSON 데이터를 신규 테이블로 이관하는 마이그레이션은 수행되지 않았습니다.
- 회원 탈퇴 시 신규 결제/게시글/댓글/좋아요 데이터를 정리하는 절차를 구현해야 합니다.
- 실제 결제 기록은 수동 등록만 지원하며 카드/은행에서 자동으로 수집하지 않습니다.
- Gmail API 및 OAuth 공급자 실계정 검증은 별도로 필요합니다.
- Maven 빌드/JUnit/브라우저 E2E 테스트는 이 환경에서 수행되지 않았습니다.

## 테스트 및 실행
IntelliJ에서 Maven 프로젝트를 열고 `mvn test`, `mvn spring-boot:run` 실행 후 API와 기존 UI를 검증하세요. 운영 배포 전 보안/데이터 이관 테스트가 필요합니다.
