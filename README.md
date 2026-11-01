RoutineSlim-Frontend/
├─ index.html                       # 브라우저 진입 HTML
├─ package.json                     # 의존성·실행·빌드 명령
├─ package-lock.json                # 의존성 버전 고정
├─ vite.config.js                   # 개발 서버·백엔드 프록시 설정
├─ .env.example                     # 서버 연결 설정 예시
├─ .nvmrc                           # Node.js 버전
├─ .prettierrc.json                  # 코드 서식 규칙
├─ 실행.bat                         # 개발 서버 실행
├─ 8080용-빌드.bat                   # Spring 배치용 빌드
├─ public/
│  └─ fonts/                        # 글꼴·라이선스
├─ src/
│  ├─ main.jsx                      # React 실행
│  ├─ App.jsx                       # 로그인 상태·화면 이동
│  ├─ global/                       # 여러 기능이 함께 쓰는 코드
│  │  ├─ api/                       # 공통 통신·설정·서버 데이터 변환
│  │  ├─ components/                # 공용 레이아웃·모달·폼·차트
│  │  ├─ styles/                    # 공통·기능별 CSS
│  │  ├─ useApiResource.js          # 조회·로딩·오류·재시도 처리
│  │  └─ csvExport.js               # CSV 다운로드
│  ├─ domain/                       # 기능별 코드
│  │  ├─ auth/                      # 일반 로그인
│  │  ├─ user/                      # 회원정보·설정·알림·백업·복원
│  │  ├─ subscription/              # 구독·고정비·무료체험·요금 비교
│  │  ├─ payment/                   # 결제 내역·결제 캘린더
│  │  ├─ stats/                     # 대시보드·통계·절약·예산·목표
│  │  ├─ community/                 # 게시글·댓글·좋아요·신고
│  │  ├─ support/                   # 소개·공지·FAQ·문의
│  │  └─ admin/                     # 관리자·신고 처리
│  └─ __tests__/                    # 화면·API·입력 검증 테스트
├─ docs/                            # 구조·서버 연동·배포·검증 문서
└─ dist/                            # 빌드 결과물, 빌드 시 생성
