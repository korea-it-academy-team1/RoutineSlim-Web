# RoutineSlim

구독·고정비 관리 서비스입니다. Java 17, Spring Boot 3.5.6, React 18, Vite를 사용합니다. 기본 DB는 별도 설치가 필요 없는 H2 파일 DB입니다.

## IntelliJ 실행

1. ZIP을 **새 폴더**에 압축 해제합니다. 이전 파일이 남지 않도록 기존 프로젝트에 덮어쓰지 마세요.
2. 최상위 `pom.xml`을 Maven 프로젝트로 열고 **JDK 17**을 선택합니다. backend 모듈이 함께 등록됩니다.
3. 실행 구성 **RoutineSlim - H2 실행**을 선택합니다.
4. 서버가 시작되면 http://localhost:8080 에 접속합니다.

실행 구성이 보이지 않으면 backend 모듈의 Maven goals에 다음을 입력합니다.

```text
process-classes spring-boot:run -Dspring-boot.run.profiles=h2
```

빌드된 React 화면이 backend/src/main/resources/static에 포함되어 있어 **IntelliJ 기본 실행에는 Node/npm 설치가 필요 없습니다.** Maven 의존성을 받는 첫 실행에는 인터넷 연결이 필요합니다. `RoutineSlimApplication` main 실행도 가능하며 작업 디렉터리는 backend, 프로필은 h2로 설정하세요.

Windows에서는 Java 17 이상과 Node.js LTS를 설치하고 루트의 `실행.bat`을 실행할 수도 있습니다. 이 방식은 backend(8080)와 Vite(5173)를 각각 실행하며 브라우저에서 http://localhost:5173 을 엽니다. 실행 창을 닫으면 서버가 종료됩니다.

기본 관리자: **아이디 `routinslim` / 비밀번호 `admin123`**. 최초 생성 후 변경한 비밀번호는 재시작해도 유지됩니다.

## DB와 데이터

기본 H2 주소는 `jdbc:h2:file:./data/routineslim;DB_CLOSE_ON_EXIT=FALSE`입니다. 제공된 실행 구성에서는 backend/data에 저장됩니다. 기존 데이터를 옮길 때는 서버를 종료하고 data 폴더를 백업한 뒤 새 backend/data에 복사하세요.

MySQL을 사용할 때는 서버에서 먼저 DB를 생성합니다.

```sql
CREATE DATABASE IF NOT EXISTS routineslim
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

기존 MySQL 계정을 사용하거나 관리 권한 계정으로 전용 사용자를 만드세요. 아래 비밀번호는 실제 사용할 값으로 바꾸고 로컬 설정 파일에도 같은 값을 입력합니다.

```sql
CREATE USER 'routineslim'@'localhost' IDENTIFIED BY 'CHANGE_ME';
GRANT ALL PRIVILEGES ON routineslim.* TO 'routineslim'@'localhost';
```

1. `backend/application-mysql-local.properties.example`을 같은 폴더의 `application-mysql-local.properties`로 복사합니다.
2. URL·사용자명·비밀번호를 실제 MySQL 계정으로 수정합니다.
3. IntelliJ 실행 구성 **RoutineSlim - MySQL 실행**을 선택합니다.

대신 환경변수 `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`로 지정할 수도 있습니다. 기본 URL을 사용할 경우 `DB_HOST`, `DB_PORT`, `DB_NAME`도 지원합니다. 둘 중 한 방식으로 설정하세요. MySQL 전용 로컬 설정 파일은 mysql 프로필에서만 로딩되므로 H2 시험 설정과 섞이지 않습니다.

초기 로컬 MySQL 실행은 Hibernate update로 테이블을 생성·갱신합니다. 관리된 스키마를 사용할 때는 파일의 ddl-auto 또는 환경변수 `DB_DDL_AUTO`를 validate로 바꿀 수 있습니다. 원격 운영 서버의 TLS 설정은 실제 접속 URL에 지정하세요.

**H2와 MySQL은 별도 DB입니다. 프로필 변경만으로 시험 데이터가 자동 이전되지는 않습니다.** H2 파일은 그대로 보존됩니다.

구독·결제·목표·문의 등은 사용자별 서버 DB에 저장됩니다. 게시글 임시저장은 사용자별 브라우저에 저장되며 첨부 이미지는 다시 선택해야 합니다. 원본 화면의 과거 월 그래프는 브라우저 스냅샷 기준입니다. 실제 결제 기반 월간 결산은 사용자가 기록한 결제를 사용하며 과거 데이터를 임의로 생성하지 않습니다.

## 이메일·소셜 로그인 설정

`backend/application-local.properties.example`을 같은 폴더의 `application-local.properties`로 복사하고 필요한 설정의 주석을 해제해 입력하세요. 실제 키와 이 파일은 Git·공유 ZIP에 포함하지 마세요. backend를 작업 디렉터리로 실행하면 자동 로딩됩니다.

일반 로그인에는 소셜 키가 필요 없습니다. 신규 가입·계정 복구·이메일 변경에는 SMTP 설정이 필요합니다.

| 환경변수 | 용도 |
|---|---|
| MAIL_HOST, MAIL_PORT | SMTP 서버와 포트 |
| MAIL_USERNAME, MAIL_PASSWORD | SMTP 계정 |
| MAIL_FROM | 인증된 발신 이메일 |
| MAIL_AUTH, MAIL_STARTTLS | 기본 true. 공급자 요구에 맞게 설정 |

465 포트의 암시적 TLS 등 추가 설정은 example 파일을 참고하세요. SMTP 인증정보가 없으면 실제 인증 메일을 발송할 수 없습니다.

| 공급자 | 환경변수 | 로컬 Callback URL |
|---|---|---|
| Google | GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET | http://localhost:8080/login/oauth2/code/google |
| Kakao | KAKAO_CLIENT_ID, KAKAO_CLIENT_SECRET | http://localhost:8080/login/oauth2/code/kakao |
| Naver | NAVER_CLIENT_ID, NAVER_CLIENT_SECRET | http://localhost:8080/login/oauth2/code/naver |

각 개발자 콘솔에서 웹 앱과 Callback URL을 등록하세요. Google 요청 범위는 openid/profile/email, Kakao는 profile_nickname/account_email, Naver는 name/email입니다. Kakao는 REST API 키와 Client Secret을 사용합니다. 앱에서 허용된 동의항목을 확인하고 배포 시 Callback을 HTTPS 도메인에 맞추세요. 일반 계정과 같은 이메일의 소셜 계정은 자동 병합하지 않습니다.

## 코드 구조

| 경로 | 역할 |
|---|---|
| backend/src/main/java/kr/routineslim/controller | HTTP 컨트롤러 |
| backend/src/main/java/kr/routineslim/service | 서비스·메일 발송 |
| backend/src/main/java/kr/routineslim/dto | 개별 요청·응답 |
| backend/src/main/java/kr/routineslim/repository | DB 접근 |
| backend/src/main/java/kr/routineslim/entity | JPA 엔티티 |
| backend/src/main/resources/static | Node 없이 실행하기 위한 React 화면 번들 |
| backend/src/main/java/kr/routineslim/config | 보안·MVC·초기화 설정 |
| backend/src/main/java/kr/routineslim/security, exception | 세션 사용자·예외 처리 |
| frontend/src/features | 기능별 화면·전용 컴포넌트 |
| frontend/src/components | 공통 UI·레이아웃 |
| frontend/src/api, hooks, utils, styles | API·훅·유틸리티·스타일 |
| frontend/public/legacy | 로그인 화면에서 연결된 원본 화면 |
| backend/src/test, frontend/src/__tests__ | 자동 테스트 |

features는 auth, account, dashboard, subscriptions, payments, reports, savings, community, notifications, support, admin으로 구분합니다. 페이지는 파일명과 컴포넌트 이름을 맞추고 Page 접미사를 사용합니다. 공통 API는 apiClient.js, CSV 내보내기는 csvExport.js, API 상태 관리는 useApiResource.js에 있습니다.

## 기능과 외부 연동 범위

이메일 인증 가입, 로그인·복구·탈퇴, 구독·결제·캘린더, 예산·리포트·절약 목표, 무료체험, 요금 비교, 커뮤니티, 알림, 고객센터, 관리자 기능을 제공합니다. 요금 비교는 관리자가 실제 요금과 출처를 등록해야 표시됩니다. 변경 이력은 해당 기록 기능 적용 이후부터 남습니다.

앱 내 알림은 구현되어 있으며 외부 문자·원격 푸시·결제 안내 메일 발송, 금융기관 자동 거래 수집, 실제 구독 해지·사용량 수집은 제공하지 않습니다. 실제 OAuth와 SMTP에는 사용자 자격 증명이 필요합니다.

## 검증

```text
# 루트: 백엔드 검사
mvn test

# frontend: 화면 검사와 빌드
npm ci
npm test
npm run build
```

백엔드 83개·화면 40개 테스트와 프로덕션 빌드가 통과했습니다. DB 환경변수 없이 H2 서버를 기동해 관리자 로그인, 정적 React 제공, 결제 수정 및 재시작 후 데이터 유지를 확인했습니다. 인증 API는 세션·CSRF·소유권·권한 검사를 포함합니다. 이는 전체 보안 감사나 운영 배포 인증을 의미하지 않습니다.

로컬 SMTP·OAuth 모의 서버 검사는 수행했으며 실제 공급자 계정의 인증 왕복, Windows/IntelliJ 자체 조작, 실제 MySQL 서버 연결은 별도 검증이 필요합니다.

## React 화면을 수정했을 때

IntelliJ 기본 실행은 동봉된 화면을 사용합니다. React 소스를 변경한 뒤에는 frontend에서 다음을 실행하세요. Node.js가 필요한 작업입니다.

```text
npm ci
npm run build:backend
```

이 명령은 화면을 빌드하고 backend/src/main/resources/static의 이전 번들을 새 결과로 교체합니다. 서버를 다시 실행하면 반영됩니다. Maven으로 Node 설치부터 자동 처리하려면 루트에서 `mvn -Pfrontend-build package`를 실행하세요. 평상시 `mvn test`, `mvn package`, IntelliJ H2/MySQL 실행은 Node 다운로드를 하지 않습니다.

DB 프로필 분리 테스트 2개로 기본 H2가 MySQL 접속값을 사용하지 않는지, mysql 프로필이 MySQL 드라이버·SQL·외부 자격 증명을 선택하는지 확인했습니다. 실제 MySQL 서버 접속 검사는 별도입니다.

## 화면과 코드 구성

첨부된 참고 화면을 바탕으로 연보라색 작업 영역, 상단 요약 카드, 구독 표, 월별 막대 차트, 카테고리 도넛, 우측 정보 패널을 구성했습니다. 로그인은 소개 영역과 흰색 폼이 나뉜 2단 배치를 참고해 반응형으로 재구성했고 회원가입은 기존 약관·아이디 확인·이메일 인증 절차를 유지합니다.

- 구독 목록: 서비스 검색·카테고리 필터·상세·수정·삭제·CSV
- 결제 캘린더: 월간 달력·이전/다음 월·날짜별 실제 예정 일정 필터
- 커뮤니티: 글쓰기 전환·기본 서식·본문 미리보기·이미지·태그·좋아요·댓글·신고. 서식은 텍스트 마커로 저장하고 React 요소로 안전하게 표시합니다. 구형 원본 화면에서는 해당 마커가 일반 텍스트로 보일 수 있습니다.
- 우측 패널: 지출·예정 결제·절약 목표 바로가기. 커뮤니티에서는 최근 글·태그 필터·작성 안내로 전환합니다.
- 이메일 또는 아이디 로그인: 일반 인증 계정의 이메일로 로그인해도 실제 아이디로 세션을 생성합니다. 로그인 유지 선택 시 브라우저 쿠키와 세션 유효기간을 14일로 설정하며, 서버 재시작 시에는 다시 로그인이 필요할 수 있습니다.

공통 로고는 components/common/BrandLogo, 서비스 아이콘은 ServiceBadge, 카테고리 도넛과 월별 그래프는 components/charts의 개별 파일에 모았습니다. 공통 지출 패널은 components/layout, 커뮤니티 전용 패널은 features/community/components에 둡니다. 이전 클래스명과 LAPTOP 동기화 복사본은 포함하지 않습니다.

스타일은 기본(base), 기능 공통(features), 로그인 후 화면(dashboard), 로그인(login), 글꼴(typography)로 구분합니다. 로그인 후 화면 CSS는 .layout 아래에만 적용합니다. 한글 글꼴 Noto Sans KR을 로컬 번들로 제공하며 fonts/OFL.txt의 라이선스를 함께 배포합니다.

차트·합계·게시글 등은 실제 API 데이터로 표시합니다. 로그인 미리보기만 명시적으로 표시한 화면 예시입니다. 검증용 브라우저 테스트에 넣은 서비스·금액·게시글은 임시 DB에서만 사용하고 배포 ZIP에는 넣지 않습니다.

검증 결과: 백엔드 83개·화면 40개 테스트, 프로덕션 번들 및 Maven 패키징 통과. 실제 Chromium으로 로그인·개선된 가입 진입·대시보드·구독 표·캘린더·월간 결산·커뮤니티·프로필·서식 입력과 모바일 화면을 확인했습니다. 검증 중 브라우저 예외와 화면 전체의 가로 넘침이 없었습니다. 실제 소셜 공급자 계정 인증은 자격 증명 설정 후 별도로 확인해야 합니다.

## 고정비 빠른 등록 및 절감 시뮬레이션

- 구독 관리·절약 분석의 고정비 추가/수정은 features/subscriptions/components/SubscriptionEditor를 공통 사용합니다. 서비스 빠른 선택으로 이름·아이콘·카테고리를 설정하고, 실제 금액은 사용자가 입력합니다. 직접 입력도 가능합니다.
- 기본 서비스 목록은 /api/v1/catalog에서 제공합니다. 최신 가격을 추정하거나 자동 적용하지 않습니다.
- 구독 관리에는 검색·카테고리·상태 필터, 월 환산 금액, 상세·수정·삭제·CSV를 제공합니다.
- 절약 분석에는 전체 추천·절약 검토·중복 카테고리·이용 중 탭, 요금 정보 수정, 월/연간 절감 후보액, 지출 도넛과 현재/검토 제외 비교 그래프를 제공합니다. 영상과 OTT/영상은 중복 분석에서 같은 분류로 취급합니다.
- 월 환산은 연간 금액/12, 주간 금액×52/12이며 각 항목을 원 단위 반올림한 뒤 합산합니다. 계산은 utils/subscriptionCalculations.js에서 공통 사용합니다.
- 중복 분류는 확인할 후보이며 실제 중복 결제라고 단정하지 않습니다. 검토 표시는 저장되지만 실제 서비스 해지·자동 결제 중단 기능은 아닙니다. 비교 그래프는 예상 후보액이지 이미 절약한 실적이 아닙니다.

이번 검증: 백엔드 83개·화면 40개 테스트 통과. 실제 Chromium에서 서비스 빠른 선택·모달 저장·저장값 API 조회·새로고침 유지와 절약 필터를 확인했습니다. 로그인·회원가입·기존 추가 페이지와 H2/MySQL 설정도 유지합니다.
