# RoutineSlim-Frontend

공통 코드는 `global`, 기능 코드는 `domain`에 둡니다. 기능 안에 `pages`, `api`, `components`, `hooks`, `utils` 하위 폴더를 만들지 않고 파일 이름으로 역할을 구분합니다.

## 폴더 구조

```text
RoutineSlim-Frontend/
├─ package.json                 # 실행·빌드·테스트 명령
├─ vite.config.js               # 개발 서버·백엔드 8080 프록시
├─ index.html                   # 브라우저 진입점
├─ 실행.bat                     # 개발 미리보기 실행
├─ 8080용-빌드.bat               # Spring 배치용 빌드
├─ public/
│  └─ fonts/                    # 글꼴·라이선스
├─ src/
│  ├─ main.jsx                  # React 실행
│  ├─ App.jsx                   # 로그인 상태·화면 이동
│  ├─ global/                   # 여러 기능이 함께 사용하는 코드
│  │  ├─ api/                   # 연결 설정·공통 요청·서버 DTO 변환·타입
│  │  ├─ components/            # 공용 레이아웃·모달·폼·차트
│  │  ├─ styles/                # 공통·기능별 CSS
│  │  ├─ useApiResource.js      # 조회·로딩·오류·재시도·중복 저장 제어
│  │  └─ csvExport.js           # CSV 다운로드
│  ├─ domain/                   # 기능별 코드, 하위 폴더 없이 파일 배치
│  │  ├─ auth/                  # 일반 로그인
│  │  ├─ user/                  # 회원정보·설정·알림·백업·복원
│  │  ├─ subscription/          # 구독·고정비·무료체험·요금 비교
│  │  ├─ payment/               # 결제 내역·결제 캘린더
│  │  ├─ stats/                 # 대시보드·통계·절약·예산·목표
│  │  ├─ community/             # 게시글·댓글·좋아요·신고
│  │  ├─ support/               # 소개·공지·FAQ·문의
│  │  └─ admin/                 # 관리자·신고 처리
│  └─ __tests__/                # 화면·API·입력 검증 테스트
├─ docs/                        # 구조·서버 연동·배포·검증 문서
└─ dist/                        # 빌드 결과, 직접 수정하지 않음
```

`src` 하위 폴더는 53개에서 14개로 줄였습니다. 프론트에는 Java용 `main/java`, `resources` 계층이 필요하지 않으므로 추가하지 않았습니다.

## 기능 내부 예시

```text
src/domain/subscription/
├─ SubscriptionListPage.jsx          # 구독 목록 화면
├─ SubscriptionDetailPage.jsx        # 구독 상세 화면
├─ FreeTrialPage.jsx                 # 무료체험 화면
├─ SubscriptionComparisonPage.jsx    # 요금 비교 화면
├─ SubscriptionEditor.jsx            # 등록·수정 창
├─ subscriptionsApi.js               # 구독 API 요청
├─ useServiceCatalog.js              # 카탈로그 조회 훅
├─ validateSubscription.js           # 입력 검증
└─ subscriptionCalculations.js       # 금액·절약 계산
```

## 파일 배치 원칙

- `*Page.jsx`: 화면 상태·사용자 조작·표시
- `*Api.js`: 해당 기능의 API 경로·메서드·요청 데이터
- `use*.js`: 데이터 조회·상태 관리 훅
- 나머지 JSX: 기능 전용 화면 조각
- 계산·검증 함수: 해당 기능 폴더에 함께 배치
- 공용 코드: `global`에 배치

공통 요청은 `global/api/apiClient.js`, 서버 모델 변환은 `global/api/serverApiAdapter.js`, 플랫폼 독립 통신과 타입은 `global/api/routineSlimApiClient.js`와 `.d.ts`에 있습니다. 앱 진입점은 화면 파일을 직접 가져오며 별도의 `index.js` 중계 파일을 두지 않습니다.

## 요청 흐름

```text
기능 화면(domain)
  → 기능 API(domain/*/*Api.js)
  → 공통 요청(global/api/apiClient.js)
  → 서버 DTO 변환·서버 통신(global/api)
  → Spring API(localhost:8080)
```

화면 배치·색상·기능·인증 정책·백엔드 주소는 이번 폴더 정리로 바꾸지 않았습니다. 기본 서버 어댑터의 지원 범위와 실제 서버 통합 상태는 BACKEND-TODO.md를 확인하세요.

## 실행

```sh
npm ci
npm run dev
npm test
npm run build
npm run format:check
```

개발 미리보기는 5173, Spring API는 8080입니다. 최종 화면을 8080에서 제공하는 방법은 LOCALHOST-8080.md에 있습니다.
