# RoutineSlim 검증 및 남은 작업

## 이번 수정
- JUnit 테스트를 `src/main/java/kr/test/...`에서 `src/test/java/...`로 이동했습니다. 테스트 의존성이 main compile classpath에 없어서 컴파일이 실패할 수 있던 구조 오류입니다.
- 주간/연간 구독은 결제 기준일(billingAnchorDate)을 반드시 입력하도록 REST API 및 기존 JSON 저장 경로에서 검증합니다.
- 비정상 결제일은 캘린더에서 제외합니다.

## 실제 확인
- ZIP 구조와 JavaScript 구문 검사를 확인했습니다.
- Maven 실행 파일이 이 환경에 없어 `mvn test`와 서버 실행은 검증하지 못했습니다.

## 미완료
- 구독 CRUD API와 기존 JSON 화면 저장 API를 단일 저장 경로로 완전히 통합
- 커뮤니티 게시글/댓글/좋아요를 독립 JPA 엔티티로 이관
- 결제 확정 내역(예상 일정과 별개) 저장 기능
- 기존 브라우저 화면과 API 간 종단 간 테스트
- Gmail OAuth 권한 승인 및 실제 영수증 수집
- 금융 데이터 연동(별도 제휴/권한 필요)

## IntelliJ 테스트
1. JDK 17 이상으로 Maven 프로젝트를 엽니다.
2. Maven `test` 실행 후 실패 로그를 확인합니다.
3. `RoutineSlimApplication` 실행 후 각 메뉴에서 데이터 등록/수정/삭제를 확인합니다.
