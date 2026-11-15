# 코드 구조와 책임

## 기능별 코드

`features/<기능>` 안에서 역할을 분리합니다. 화면은 `pages`, 재사용 화면 조각은 `components`, 서버 호출 입구는 `api`, 상태와 부수 효과는 `hooks`, 순수 계산은 `utils`, 기능 전용 CSS는 `styles`에 둡니다.

사용량 점검은 `features/usage`에 모았습니다. `UsageCheckPanel`은 표시와 필터를, `useUsageChecks`는 조회·저장·중복 클릭 방지와 오류 처리를 맡습니다. 최근 30일 판정은 `utils/usageReview`, 버튼 문구는 `utils/usageLevels`, 스타일은 `styles/usageReview.css`에서 관리합니다.

회원정보에는 `AccountDataTools`를 두어 CSV 내보내기와 브라우저 백업·복원을 한곳에 제공합니다. `SubscriptionBackup`은 별도 원본 서버 모드에서만 사용하는 구독 일괄 복원 화면으로, 현재 서버 모드의 알림 설정 화면에는 표시하지 않습니다.

## API 연결

화면 → 기능별 api → `shared/api/apiClient` → 설정에 맞는 요청 처리.

- `server/serverAdapter`: 요청을 해당 처리기로 전달합니다.
- `server/routes/accountRoutes`: 인증, 회원정보, 예산·알림 설정.
- `server/routes/subscriptionRoutes`: 구독, 무료체험, 메모, 사용량.
- `server/routes/financeRoutes`: 청구, 월간 리포트, 예상 일정.
- `server/routes/browserRoutes`: 브라우저 기록, 비교, 알림 확인 상태.
- `server/memberSession`: 로그인 UUID의 저장·복원·폐기.
- `server/serverConnection`: 같은 세션을 사용하는 서버 연결 객체.
- `server/subscriptionMapping`: 서버 DTO와 화면 모델 사이의 변환.
- `server/*Queries`: 구독·청구·알림 조회와 화면용 집계.

공개 API 경로와 브라우저 저장 키는 유지합니다. 지원하지 않는 기능은 `API_NOT_AVAILABLE` 오류로 안내하며, 실패를 가짜 성공으로 바꾸지 않습니다.

## 공통 로직

- `shared/storage/browserDataStore`: 회원별 저장, 입력 검사, 원자적인 백업 복원.
- `shared/lib/billingCalendar`: 주기·월말·윤년을 반영한 예상 결제일.
- `shared/lib/monthlyAmount`: 월 환산 금액.
- `shared/lib/subscriptionRules`: 공통 구독 상태·사용량 판정.
- `shared/lib/downloadFile`, `csvExport`: 다운로드와 CSV 이스케이프.

`shared`에서는 `features`나 `app`을 참조하지 않습니다. 기능 코드는 공통 계층을 가져오며, 이름만 전달하는 호환용 재수출 파일은 추가하지 않습니다. 서비스 카탈로그 조회는 `useServiceCatalog`에서 공유합니다.

## 변경 후 확인

기존 기능 테스트, 빌드, 구조·포맷 검사를 실행합니다. 원본 서버 모드와 현재 서버 모드의 서로 다른 동작은 해당 테스트를 유지해 검증합니다. 최신 서버 파일은 변경하지 않습니다.
