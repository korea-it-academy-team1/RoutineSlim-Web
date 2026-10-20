# RoutineSlim 구조 보완 내역

- 회원 프로필을 `member/controller`, `member/dto`, `member/service`, `member/repository`로 분리했습니다.
- 추가 REST API: `GET /api/v1/members/me`, `PUT /api/v1/members/me`.
- 기존 `/api/me`, `/api/password` 및 정적 화면은 유지합니다.
- 프로필 API는 기존 `app_users` 테이블의 `display_name`, `email` 컬럼을 사용합니다.
- 회원 ID는 세션에서 읽으며 요청 본문으로 다른 사용자의 ID를 지정할 수 없습니다.
- `@Valid`로 이름 길이 및 이메일 형식을 검사합니다.

## 아직 필요한 작업
- 기존 프론트엔드 프로필 화면을 신규 API로 완전히 전환
- 커뮤니티 게시글/댓글/좋아요 독립 테이블 전환 및 마이그레이션
- JSON 사용자 데이터와 JPA 구독 데이터의 단일화
- 실제 결제 이력 테이블과 저장 API
- Maven 빌드, JUnit, 실제 브라우저 검증 및 OAuth 실제 인증

## 실행
IntelliJ에서 pom.xml을 Maven 프로젝트로 열고 `RoutineSlimApplication`을 실행합니다.
