# RoutineSlim 통합 점검 기록

## 이번 수정
- 중복 Spring MVC 매핑을 발생시키는 루트 패키지의 AccountController, CommunityController, OAuthProviderController, SubscriptionDataController를 제거하고 기능별 패키지 Controller만 유지.
- 중복 SecurityFilterChain 정의를 제거하고 CSRF가 활성화된 config/OAuthSecurityConfig만 유지.
- 회원 탈퇴 시 본인 구독, 결제 이력, 본인이 작성한 게시글과 연결된 댓글/좋아요, 본인이 다른 게시글에 남긴 댓글/좋아요를 제거한 후 회원을 삭제하도록 처리. AuthService.delete의 @Transactional 적용.
- 기존 화면의 /api/data/{key}, /api/community/posts 호환 엔드포인트는 유지.

## 아직 완료되지 않은 작업
- 기존 커뮤니티 JSON 데이터의 독립 테이블 이전 및 기존 화면을 /api/v1/community/posts로 전환하는 작업은 미완료.
- 구독 JSON 저장 API와 /api/v1/subscriptions 양방향 일원화는 미완료. 새 API와 레거시 API 혼용 시 데이터 불일치 가능.
- 실제 결제 내역을 화면에서 입력·조회하도록 연결하는 작업은 미완료.
- Maven 빌드, JUnit 실행, 실제 브라우저 E2E 및 OAuth 제공자 인증은 미검증.
- 기존 회원 탈퇴에 연결된 외부 OAuth 토큰 폐기 여부는 검증되지 않음.

## 실행
IntelliJ에서 pom.xml을 Maven 프로젝트로 열고, JDK 17 이상으로 RoutineSlimApplication을 실행하세요.
`./mvnw test`는 Maven Wrapper가 포함된 경우에만 사용 가능하며, 그 외에는 `mvn test`를 실행합니다.
