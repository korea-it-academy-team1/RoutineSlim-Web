# RoutineSlim

구독과 고정비를 관리하는 Spring Boot + React 프로젝트입니다.

- 백엔드: Java 17, Spring Boot 3.5.6, JPA, Maven
- 프론트엔드: React 18, Vite
- 기본 DB: H2 파일 DB / 선택 DB: MySQL
- 로그인: 일반 아이디·비밀번호 및 Google·Kakao·Naver OAuth2

## IntelliJ 실행

1. 압축을 해제하고 `RoutineSlim-IntelliJ` 폴더를 엽니다.
2. **`backend/pom.xml`**을 Maven 프로젝트로 등록하고 JDK 17을 선택합니다. 루트 폴더에는 `pom.xml`이 없습니다.
3. 실행 구성에서 **RoutineSlim - 실행**을 선택합니다.
4. 서버 시작 후 [http://localhost:8080](http://localhost:8080)에 접속합니다.

실행 구성이 보이지 않으면 IntelliJ Maven 창에서 backend 프로젝트에 아래 goals를 실행합니다.

```text
process-classes spring-boot:run
```

Maven이 Node/npm을 준비하고 React를 빌드해 Spring Boot에 포함합니다. 이 방식은 별도 Vite 서버 없이 8080 포트에서 사용합니다. 최초 실행에는 의존성 다운로드를 위한 인터넷 연결이 필요합니다. 단순히 Java main 클래스만 실행하면 React 빌드가 생략될 수 있으므로 위 실행 구성을 사용하세요.

프론트엔드를 별도로 개발할 때는 backend에서 `mvn spring-boot:run`, frontend에서 `npm ci` 후 `npm run dev`를 실행하고 [http://localhost:5173](http://localhost:5173)에 접속합니다. Windows에서는 기존 `실행.bat`도 사용할 수 있습니다.

일반 로그인에는 소셜 키가 필요하지 않습니다. 신규 일반 회원가입에는 이메일 인증용 SMTP 설정이 필요합니다. 기본 H2 DB는 서버 작업 디렉터리의 `data/routineslim` 파일에 저장됩니다.

## 폴더 구조

| 경로 | 역할 |
|---|---|
| `backend/src/main/java/kr/routineslim/controller` | HTTP API |
| `backend/src/main/java/kr/routineslim/dto` | 요청·응답 데이터 |
| `backend/src/main/java/kr/routineslim/service` | 기능 처리 |
| `backend/src/main/java/kr/routineslim/repository` | DB 접근 |
| `backend/src/main/java/kr/routineslim/entity` | JPA 엔티티 |
| `backend/src/main/java/kr/routineslim/config` | 보안·OAuth·MVC 설정 |
| `backend/src/main/java/kr/routineslim/security`, `exception` | 세션 사용자·예외 처리 |
| `frontend/src/pages`, `components` | 화면·공통 컴포넌트 |
| `frontend/src/api`, `hooks`, `utils` | API 통신·공통 훅·유틸리티 |
| `frontend/public/legacy` | 현재 링크로 연결된 원본 화면 |
| `backend/src/test`, `frontend/src/__tests__` | 자동 테스트 |

`node_modules`, `target`, `dist`는 실행·빌드 시 생성되므로 ZIP에 포함하지 않습니다. 원본의 보라색·흰색 카드 디자인을 유지하고 새 페이지와 메뉴를 확장했습니다. 로그인·회원가입·사이드바에는 원본과 같은 사각형 R 로고를 사용합니다.

## 소셜 로그인 설정

IntelliJ에서 **실제로 사용하는 실행 구성**의 환경 변수에 다음 값을 설정하고 서버를 다시 시작합니다. 또는 `backend/application-local.properties.example`을 `backend/application-local.properties`로 복사한 뒤 사용할 공급자의 두 항목만 주석을 해제하고 실제 값을 입력하세요. backend 작업 디렉터리에서 실행하면 이 로컬 설정을 자동으로 읽습니다. 두 방식 중 하나만 사용하면 됩니다.

| 제공자 | 환경 변수 | 로컬 callback URL |
|---|---|---|
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | `http://localhost:8080/login/oauth2/code/google` |
| Kakao | `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET` | `http://localhost:8080/login/oauth2/code/kakao` |
| Naver | `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` | `http://localhost:8080/login/oauth2/code/naver` |

각 공급자 앱에 callback URL을 등록하고 프로젝트가 요청하는 동의 범위를 설정해야 합니다. 현재 요청 범위는 Google `openid,profile,email`, Kakao `profile_nickname,account_email`, Naver `name,email`입니다. Kakao는 REST API 키와 Client Secret을 사용하는 구성입니다. 배포 주소나 로그인 시작 주소를 변경한다면 공급자에 등록한 callback도 맞춰야 합니다.

소셜 로그인 버튼은 서버의 실제 OAuth 등록 설정을 확인한 뒤 인증을 시작합니다. ID나 Secret이 빠진 경우 필요한 설정을 화면에 표시합니다. 환경 변수와 로컬 properties 설정을 모두 지원합니다. 실제 인증·동의 과정은 발급한 앱과 계정으로 별도 확인해야 합니다. 키를 Git이나 ZIP에 넣지 마세요.

소셜 회원은 `oauth_google_...`, `oauth_kakao_...`, `oauth_naver_...` 형식으로 생성되고 일반 로그인과 동일한 `user` 세션을 사용합니다. 같은 이메일의 일반 계정과 자동 병합하지 않습니다.

## 데이터와 API

- 구독 관리: `/api/v1/subscriptions`. 호환 경로 `/api/data/subscriptions`도 같은 JPA 구독 데이터를 조회·수정합니다. 기존 JSON은 구독 조회·변경 전에 필요한 경우 이전됩니다.
- 커뮤니티: `/api/v1/community/posts` 및 댓글·좋아요·신고 API를 사용합니다. 구형 `/api/community/posts` 일괄 저장은 HTTP 410을 반환합니다.
- 게시글 제목 최대 120자, 본문 5,000자, 이미지 JPG/PNG/GIF 각 3MB 이하 최대 3장, 태그 최대 10개를 저장합니다. 원본 글쓰기 화면의 제목 입력 한도는 100자입니다. 이미지·태그는 개별 게시글에 저장하며 구형 전체 JSON 1MB 제한 설명은 더 이상 적용되지 않습니다.
- React 게시글 임시저장은 사용자별 브라우저에 텍스트·카테고리·태그를 저장합니다. 첨부 이미지는 다시 선택해야 합니다. 원본 화면의 임시저장은 기존 브라우저 저장 방식을 유지합니다.
- React와 원본 화면의 회원정보는 같은 서버 프로필을 사용합니다. 예산·알림 표시 설정도 사용자별 서버 저장을 지원합니다.
- React 설정의 JSON 백업·복원은 **구독 목록만** 대상으로 합니다. 결제 기록·프로필까지 포함하는 전체 DB 백업이 아닙니다.
- 원본 지출 리포트의 과거 월 그래프는 브라우저에 저장한 월별 스냅샷 기준입니다. 기록이 없는 과거 월을 가짜 데이터로 생성하지 않으며 다른 기기와 동기화되지 않습니다.

기존 H2 DB를 옮길 때는 서버를 종료한 상태에서 `data/` 폴더를 백업해 사용하세요. 이미 이전 완료 처리된 구형 커뮤니티 백업의 미반영 이미지·서식을 자동 재병합하지는 않습니다.

## 일반 회원가입과 이메일 인증

가입 절차는 **약관·개인정보 수집 동의 및 만 14세 이상 확인 → 아이디 중복 확인·이름·이메일·비밀번호 확인 → 이메일 인증 → 가입 완료 → 로그인**입니다. 기존 원본 화면의 회원가입 버튼도 같은 절차로 이동합니다.

- 아이디: 영문으로 시작하는 4~20자의 영문·숫자·밑줄. 관리자 및 소셜 계정 예약 아이디는 일반 가입에 사용할 수 없습니다.
- 비밀번호: 공백 없이 영문·숫자를 포함한 8자 이상, UTF-8 기준 72바이트 이하. 확인 값도 서버에서 비교합니다.
- 인증 메일: 6자리 난수, 유효시간 10분, 기본 재발송 간격 60초, 오입력 최대 5회. 세션·이메일에 묶인 단일 사용 인증이며 요청 횟수도 제한합니다. 코드 원문을 API나 콘솔로 반환하지 않습니다.
- 인증 완료 여부, 필수 동의, 약관 버전과 비밀번호 일치 여부를 서버에서 다시 검사합니다. 아이디·비밀번호만 보내는 이전 가입 요청으로 우회할 수 없습니다.
- 가입 시 인증한 이메일과 동의 버전·시각·만 14세 이상 확인을 저장합니다. 인증 가입 계정은 마이페이지에서 현재 비밀번호 확인과 새 이메일 인증을 거쳐 이메일을 변경할 수 있습니다. 소셜 계정 이메일은 로그인 제공자에서 관리합니다.
- 기존 회원과 소셜 로그인 계정을 소급 차단하지 않습니다. 신규 일반 회원가입에 인증 절차가 적용됩니다.

### SMTP 설정

`backend/application-local.properties.example`의 SMTP 항목을 실제 발송 제공자의 값으로 채우거나, 실행 구성에 아래 환경 변수를 설정하세요.

| 환경 변수 | 값 |
|---|---|
| `MAIL_HOST` | 발송 제공자의 SMTP 호스트 |
| `MAIL_PORT` | 일반적인 STARTTLS 설정 기본값 587 |
| `MAIL_USERNAME` | SMTP 사용자 이름 |
| `MAIL_PASSWORD` | SMTP 비밀번호 또는 제공자가 발급한 앱 비밀번호 |
| `MAIL_FROM` | 제공자가 허용한 발신 이메일 주소 |
| `MAIL_AUTH`, `MAIL_STARTTLS` | 기본값 `true` |

465 포트의 암시적 TLS가 필요한 경우 로컬 예제의 `spring.mail.properties.mail.smtp.ssl.enable` 항목을 참고하세요. 실제 인증 정보를 입력한 `application-local.properties`와 DB·초기 관리자 비밀번호 파일은 Git/공유 ZIP에서 제외하세요.

SMTP가 미설정이거나 발송에 실패하면 명확한 오류를 반환하며 인증을 완료한 것으로 처리하지 않습니다. 테스트 SMTP 서버에 실제 메일을 전달하고 그 번호를 사용한 가입, 미인증·다른 세션·만료·재사용·오입력 제한·재발송 제한·메일 오류를 자동 검사했습니다. 사용자의 실제 SMTP 제공자를 통한 외부 메일 수신은 별도 설정 후 확인해야 합니다.

화면의 약관·수집 안내는 현재 개발 프로젝트 범위에 맞춘 기본 문구입니다. 공개 운영 시 운영자 정보와 실제 보유·처리 정책을 반영해 확정하세요.

## 관리자와 MySQL

- 기본 관리자 아이디는 **`routinslim`**, 초기 비밀번호는 **`admin123`**입니다. 최초 실행에 계정과 관리자 권한을 생성합니다.
- 요청한 초기 로그인 정보는 서버 작업 디렉터리의 **`data/admin-initial-password.txt`**에 기록합니다. 권장 Maven 실행 방식에서는 `backend/data/admin-initial-password.txt`입니다. DB에는 BCrypt 해시로 저장합니다.
- 기존 기본 관리자 `routineslim_admin`이 있으면 계정 데이터는 보존하고 관리자 권한을 새 아이디로 이전합니다. 요청한 기본 비밀번호 적용은 한 번만 수행하며, 이후 마이페이지에서 변경한 비밀번호는 재시작해도 유지합니다.
- `ROUTINESLIM_ADMIN_ID`로 다른 아이디를 지정할 수 있습니다. `ROUTINESLIM_ADMIN_PASSWORD`를 지정하려면 8자 이상, UTF-8 72바이트 이하를 사용합니다. 로컬 설정 파일의 같은 항목도 지원합니다. 기존 일반 계정을 기본 관리자 계정으로 자동 승격하지 않습니다.
- 관리자로 로그인하면 설정 화면에 신고 관리가 표시됩니다. 일반 사용자는 관리자 처리 API를 사용할 수 없습니다.
- MySQL: DB를 미리 생성한 뒤 `SPRING_PROFILES_ACTIVE=mysql`, `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`를 설정합니다. MySQL 전용 초기화 SQL이 적용됩니다.

## 검증

```text
# backend 폴더
mvn test

# frontend 폴더
npm ci
npm test
npm run build
```

- Java 17에서 백엔드 테스트 **77개 통과**, 실패·오류 0.
- Vitest/jsdom에서 화면 동작 테스트 **32개 통과**.
- React 프로덕션 빌드 및 원본 JavaScript 문법 검사 통과.
- Spring Boot 실제 기동 후 HTTP로 회원가입, 프로필 공유, 주간 구독·지출, 결제 수정, 댓글 수정, 관리자 권한 응답, 탈퇴 및 정적 화면 제공 검사 통과.
- 실제 서버 기동으로 키 미설정 오류, 로컬 properties 파일 로딩, 세 공급자의 인가 URL·callback 생성도 확인했습니다.
- MySQL 초기화 SQL은 H2 MySQL 호환 모드에서 검사했으며 실제 MySQL 서버 연결 검사는 수행하지 않았습니다.
- 로컬 OAuth 제공 서버로 Google OIDC의 서명·nonce 검증, 카카오 사용자 정보, 네이버 토큰 요청의 state 및 중첩 프로필 처리, 회원 저장·반복 로그인·세션 생성, state 위조 거부, 사용자 동의 취소를 HTTP 왕복 검사했습니다. 환경 변수 없이 Spring properties로 설정한 공급자 인식과 callback 템플릿도 검사했습니다.
- 실제 Chrome 화면 조작, Windows IntelliJ 자체 조작 및 실제 Google/Kakao/Naver 계정의 동의·인증 왕복은 수행하지 않았습니다. 로컬 테스트는 실제 공급자 검증과 구분합니다.

## 현재 제한

CSRF 보호, 세션 갱신, 데이터 소유권 검사, 회원 탈퇴 시 데이터 정리 및 탈퇴 계정의 다른 세션 차단은 구현되어 있습니다. 이는 전체 보안 감사나 운영 배포 인증을 의미하지 않습니다.

다음 기능은 구현되지 않았거나 외부 설정·검증이 남아 있습니다.

- 금융기관 자동 거래 수집, 실제 구독 해지, 실제 사용량 자동 수집
- 결제 안내 이메일·문자·원격 푸시 발송: 현재 결제 알림은 앱 내 표시입니다. 회원가입 이메일 인증 발송은 별도로 구현되어 있습니다.
- 소셜 앱의 실제 키·callback 등록 및 실계정 인증 검증

외부 기능을 추가하려면 제공 업체·API 명세·자격 증명이 필요합니다.

소셜 로그인 실패 시 로그인 화면에 동의 취소, 만료된 요청, 잘못된 앱 설정 등 구분된 안내를 표시합니다. 네이버 토큰 교환은 공식 API 예제에 맞춰 state를 전달합니다. 로컬 설정 파일과 실제 비밀키는 Git/공유 ZIP에 포함하지 마세요.

## 추가 페이지와 기능

- 서비스 소개, 구독 요금 비교(최대 3개), 절약 목표·체크리스트·절약 기록, 무료체험 관리
- 실제 결제 기준 월간 결산·카테고리 분석·CSV, 구독별 결제 내역·변경 이력·메모
- 내 게시글·댓글·좋아요, 알림센터의 읽음·삭제 및 결제·무료체험·예산·답변 알림
- 고객센터 FAQ·공지·내 문의, 관리자 문의 답변 및 FAQ·공지·비교 요금 관리
- 관리자 통계·회원 검색·이용 정지, 이메일 인증으로 아이디 찾기·비밀번호 재설정

비교 요금은 관리자가 출처 URL과 함께 등록합니다. 임의 가격이나 과거 지출을 생성하지 않습니다. 월간 결산은 사용자가 기록한 실제 결제 기준이며 구독과 연결하면 카테고리·구독별 내역에도 반영됩니다. 변경 이력은 이 버전에서 기록한 변경부터 표시됩니다. 새 데이터는 사용자별 서버 DB에 저장하며 앱 내 알림은 외부 문자·푸시 발송과 다릅니다.

비밀번호 재설정은 인증 완료 후 한 번만 가능하며 기존 로그인 세션을 해제합니다. 실제 이메일 수신에는 위 SMTP 설정이 필요합니다.

실제 HTTP 서버와 로컬 SMTP 수신 서버로 이메일 인증 가입·문의 답변·알림·비밀번호 재설정을 확인했고, 서버 재시작 후 데이터·변경 비밀번호·비교 선택·FAQ 수정 보존도 확인했습니다.

## 통합 점검 보완

- 이메일 변경: 현재 비밀번호 확인 → 새 이메일 인증번호 발송 → 인증 후 변경. 중복 이메일·다른 세션·잘못된 코드·재사용 요청을 거부하며 계정 복구에도 변경된 이메일을 적용합니다.
- 현재 비밀번호 오입력 시 로그인 상태가 해제되던 동작을 수정했습니다.
- 구독 비교 선택을 불러오기 전에 저장해 기존 선택이 지워질 수 있던 동작을 수정했습니다.
- 백엔드 77개, 화면 32개 테스트 및 프로덕션 빌드 통과. 실제 HTTP·로컬 SMTP로 가입·이메일 변경·복구·데이터 저장을 확인했으며 재시작 후에도 변경 이메일과 데이터가 유지됩니다.
