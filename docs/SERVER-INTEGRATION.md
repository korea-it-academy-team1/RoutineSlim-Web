# 서버 연결 범위

프론트엔드 화면·기능의 원본은 이번에 첨부된 `frontend.zip`입니다. 기본 `server-dev` 모드는 첨부 서버 규격을 따르며 CSRF 사전 요청을 하지 않습니다. 기존 쿠키 서버용 `original` 모드는 명시적으로 선택할 때만 사용합니다. 모드 선택은 `.env.local`의 `VITE_API_MODE`로 합니다. 실행 중 변경했다면 Vite를 재시작합니다.

## 1. original — 기존 쿠키 서버용 선택 모드

현재 포함된 화면과 기능은 다음과 같습니다. 가입·소셜 로그인은 사용자의 요청으로 앱의 현재 가용성에 맞췄습니다.

- 일반 아이디·비밀번호 로그인 (가입·계정 복구·소셜 로그인 절차 제거)
- 대시보드, 구독·고정비 등록/수정/삭제·빠른 서비스 선택·CSV
- 지출 리포트·캘린더·차트·월간 결산·월 예산
- 절감 솔루션·무료체험·요금 비교·절약 목표
- 커뮤니티 글·댓글·좋아요·신고·내 활동
- 프로필·이메일 변경·알림·백업/복원·고객센터·관리자

사용하려면 해당 API가 서버에 구현되어 있어야 합니다. 원본 코드가 호출하는 경로와 소스 위치는 `api-paths.json`에 정리했습니다. 경로의 접두어와 `${...}`는 원본이 실행 중 붙이는 ID·쿼리입니다. 실제 요청/응답 필드는 기록된 컴포넌트와 원본 테스트에서 확인할 수 있습니다.

주요 계약:

| 기능           | 원본 웹의 API                                                                    |
| -------------- | -------------------------------------------------------------------------------- |
| 로그인 세션    | `GET /api/me`, `POST /api/login`, `POST /api/logout`                             |
| CSRF           | `GET /api/csrf` → `{ token, headerName }` (변경 요청 전에 획득)                  |
| 구독 목록/등록 | `GET/POST /api/v1/subscriptions`                                                 |
| 구독 수정/삭제 | `PUT/DELETE /api/v1/subscriptions/{id}`                                          |
| 구독 상세/메모 | `GET .../{id}/detail`, `PUT .../{id}/note`                                       |
| 카탈로그       | `GET /api/v1/catalog`                                                            |
| 홈/월간 결산   | `/api/v1/expenses/summary`, `/api/v1/savings/summary`, `/api/v1/reports/monthly` |
| 캘린더         | `/api/v1/calendar/events?year=...&month=...`                                     |
| 결제 기록      | `/api/v1/payments`                                                               |
| 커뮤니티       | `/api/v1/community/posts` 및 댓글·좋아요·신고 하위 경로                          |
| 회원정보       | `/api/v1/members/me`                                                             |
| 설정           | `/api/data/setting-{name}`                                                       |
| 알림           | `/api/v1/notifications`, `/api/v1/reminders`                                     |

이 모드는 원본 서버 규격을 보존하며, 첨부 `RoutineSlim-Server-dev`와 직접 호환된다는 뜻이 아닙니다.

## 2. server-dev — 첨부 Spring 서버의 부분 연결 어댑터 (기본값)

`.env.server-dev.example`을 `.env.local`로 복사합니다. 기본 백엔드 주소는 `http://localhost:8080`입니다.

| 웹 요청                             | 첨부 서버와의 연결                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------ |
| `POST /api/login`                   | `POST /auth/login`의 `memberName/memberPassword`로 변환, UUID 응답 검증              |
| `GET /api/me`                       | 이미 로그인한 회원 UUID의 브라우저 세션 복원. 서버의 현재 인증/회원 상태 검증은 아님 |
| `POST /api/logout`                  | 브라우저의 UUID 삭제. 서버 로그아웃 API는 없음                                       |
| `GET /api/v1/subscriptions`         | `X-Member-Id` 헤더 추가, ACTIVE 구독을 원본 화면 필드로 변환                         |
| `GET /api/v1/subscriptions/{id}`    | 단일 구독 응답 필드 변환                                                             |
| `POST /api/v1/subscriptions`        | 실제 카테고리 ID·BillingCycle·startDate 규격으로 변환                                |
| `PUT /api/v1/subscriptions/{id}`    | 기존 preset/card/알림/memo 필드를 읽고 보존하여 전체 수정                            |
| `DELETE /api/v1/subscriptions/{id}` | 실제 DELETE API 호출                                                                 |

어댑터 테스트는 **모의 HTTP 응답을 사용하는 프론트 테스트**입니다. 실제 Spring 서버·DB를 실행해 통합 검증한 결과가 아닙니다.

### 서버 담당자가 해결해야 하는 선행 조건

첨부 서버의 `SecurityConfig`는 `/auth/...`만 공개하고 나머지 요청에 `.authenticated()`를 요구합니다. 그런데 `/auth/login`은 회원 UUID만 반환하며 SecurityContext를 생성하는 코드나 `X-Member-Id`를 인증으로 처리하는 필터가 제공 소스에 없습니다. 따라서 UUID 헤더만 붙여도 Spring Security 인증을 통과한다고 볼 수 없습니다. 서버에서 인증 방식을 완성해야 하며, 프론트에서 보안 설정을 우회하거나 성공으로 처리하지 않습니다.

### 원본과 데이터 모델 차이

- 카테고리 이름 대신 숫자 `categoryId`가 필요합니다. 서버 DB의 실제 ID를 확인해 `.env.local`에 `VITE_SERVER_CATEGORY_IDS={"영상":실제숫자ID,...}`를 유효한 JSON으로 입력하세요. 임의의 ID를 가정하지 않습니다.
- 원본의 `review`는 "절약 검토" 표시입니다. 첨부 서버의 `PAUSED`/`CANCELED`와 의미가 다르므로 변환하지 않습니다. 검토 상태 변경에는 서버의 별도 필드/API가 필요합니다.
- 원본의 결제일(day)과 기준일은 별도 필드입니다. 첨부 서버는 startDate에서 billingDay를 계산하므로 매월 등록 시 두 날짜를 맞춰야 합니다. 불일치는 저장 전에 안내합니다.
- 첨부 서버의 다중 결제 간격(cycleInterval > 1), TRIAL/PAUSED/CANCELED 상태를 원본 active/review UI에 임의 대응하지 않습니다. 목록 어댑터는 ACTIVE만 보여주며 다른 상태 관리에는 원본 API 확장이 필요합니다.
- 첨부 서버에는 원본의 커뮤니티·실제 결제내역·월간 리포트·알림·카탈로그·고객센터·회원정보 CRUD·설정 API가 없습니다. 없는 기능은 명확한 오류를 반환하고 샘플 데이터나 임시 브라우저 저장으로 대체하지 않습니다. 원본 대시보드도 월간 리포트 등 여러 API를 함께 사용하므로 서버 확장 전에는 완전한 데이터 화면이 열리지 않습니다.
- 회원가입은 앱에 실제 연결된 절차가 없어 버튼과 화면을 제거했습니다. 웹 전용 약관·이메일 인증 가입 절차를 제거했고 `/auth/signup`으로 직접 우회 가입시키지 않습니다. 소셜 로그인 UI와 OAuth 요청, 앱에 없는 계정 복구 절차도 제거했습니다.
- 첨부 서버의 영수증 OCR API는 원본 웹에서 호출하는 화면이 없어 새 화면을 추가하지 않았습니다.

## 배포

`API_PROXY_TARGET`은 Vite 개발/미리보기 서버의 프록시 대상입니다. `dist/`만 정적 배포하면 프록시 설정은 포함되지 않습니다.

운영에서는 `/api`, `/auth`를 백엔드로 보내는 역방향 프록시를 구성하거나, `VITE_API_BASE_URL`에 API 출처를 넣고 프론트 출처에 대한 서버 CORS·쿠키 정책을 구성해야 합니다. `VITE_` 변수에 비밀키를 넣지 마세요.

백엔드 소스나 Spring 보안 설정은 이 프론트 패키지에서 변경하지 않았습니다.
