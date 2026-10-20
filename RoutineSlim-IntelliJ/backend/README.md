# RoutineSlim — H2 + Google / Kakao / Naver OAuth2

## IntelliJ 실행
1. IntelliJ에서 이 폴더의 `pom.xml`을 Maven 프로젝트로 열고 JDK 17 이상을 선택합니다.
2. `kr.routineslim.RoutineSlimApplication` 실행 → http://localhost:8080
3. 기존 이메일/아이디 로그인은 키 없이 사용할 수 있습니다. H2 파일 DB도 유지됩니다.

## 소셜 로그인 활성화
각 플랫폼 개발자 콘솔에서 **웹 애플리케이션**을 등록하고, IntelliJ **Run > Edit Configurations > Environment variables**에 다음 환경변수를 입력합니다. 키는 Git/ZIP에 넣지 마세요.

| 제공자 | 환경변수 | 개발자 콘솔에 등록할 로컬 Redirect URI |
|---|---|---|
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | `http://localhost:8080/login/oauth2/code/google` |
| Kakao | `KAKAO_CLIENT_ID` (REST API 키), `KAKAO_CLIENT_SECRET` (활성화 시 발급된 값) | `http://localhost:8080/login/oauth2/code/kakao` |
| Naver | `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` | `http://localhost:8080/login/oauth2/code/naver` |

- Google Cloud Console: OAuth 동의 화면 구성, 테스트 사용자 추가, 승인된 리디렉션 URI 등록. Google API의 `openid`, `profile`, `email` 범위 사용.
- Kakao Developers: 카카오 로그인 활성화, Redirect URI 등록, 동의항목 `profile_nickname`, `account_email` 설정. **Client Secret 기능을 켜고 발급받은 값**을 사용하도록 구성되어 있습니다. 해당 동의항목을 사용할 수 없는 앱은 범위 설정을 조정해야 합니다.
- NAVER Developers: 네이버 로그인 API 사용 신청, 서비스 URL 및 Callback URL 등록, 이름/이메일 정보 제공 동의항목 확인.
- 로컬 테스트는 일반적으로 `localhost`로 가능하지만, 배포할 때는 HTTPS 도메인에 맞춰 각 콘솔 Redirect URI를 다시 등록해야 합니다.
- 소셜 회원은 `oauth_google_...` / `oauth_kakao_...` / `oauth_naver_...` ID로 H2 `app_users`에 생성되며, 기존 API 세션(`user`)을 공유합니다. **같은 이메일의 일반 계정과 자동 병합하지 않습니다.**
- 등록되지 않은 제공자 버튼은 안내 메시지를 표시합니다.

## 공개 배포 전 반드시 보완할 사항
이 프로젝트는 **개인 테스트용**입니다. 기존 JSON API의 CSRF 보호 비활성화, 공개 커뮤니티 JSON 구조 및 권한 검증, 계정 연결/탈퇴 처리, 로그인 시 세션 고정 방어, 오류/로그 기록, 비밀번호 재설정, 개인정보 처리방침을 별도 점검해야 합니다. OAuth 공급자와의 실제 인증 왕복 테스트는 키가 없으므로 수행하지 못했습니다.


## 검토 사항
- 이 패키지는 기존 OAuth 개발 버전을 바탕으로 정리한 로컬 테스트 프로젝트입니다.
- OAuth는 Google/Kakao/Naver 개발자 인증키와 리디렉션 설정이 있어야 동작합니다.
- Maven 전체 빌드 및 실제 브라우저 테스트는 이 환경에서 완료하지 못했습니다.
- 운영 공개 전에 CSRF, 접근 권한, 커뮤니티 데이터 모델 및 사용자별 데이터 검증을 보강해야 합니다.

## 2026-10-18 화면 개선: 지출 리포트 / 커뮤니티 글쓰기

- **지출 리포트**: 기준 월 선택, 월 총 지출, 구독/고정비 구분, 카테고리 도넛 차트, 6개월/1년/전체 지출 그래프, 서비스별 상세표, 절약 검토 예상액을 표시합니다.
- **과거 데이터 주의**: 구독 정보를 저장할 때 브라우저의 로컬 저장소에 월별 스냅샷을 기록합니다. 기록이 없는 과거 월의 지출을 가짜 데이터로 생성하지 않습니다. 월별 그래프는 사용 중인 브라우저에 기록된 스냅샷 기준이며 다른 기기와 동기화되지 않습니다.
- **커뮤니티 글쓰기**: 카테고리, 제목(100자), 서식 있는 내용(5,000자), 이미지 첨부(JPG/PNG/GIF, 3MB 이하 최대 3장), 태그, 임시저장, 게시글 등록 기능을 제공합니다.
- **게시글 저장**: 기존 `/api/community/posts`를 이용합니다. 이미지 데이터는 게시글 JSON에 포함되므로 전체 게시글 JSON 1MB 제한 내에서만 저장할 수 있습니다. 큰 이미지는 압축 후 올려 주세요. 임시저장은 현재 브라우저에만 보관됩니다.
- **실행**: IntelliJ IDEA에서 `pom.xml`을 Maven 프로젝트로 열고 `RoutineSlimApplication`을 실행합니다. 기본 주소는 `http://localhost:8080`입니다. 실제 소셜 로그인은 별도 제공자 인증키 설정이 필요합니다.


See [ARCHITECTURE.md](ARCHITECTURE.md) for the separated frontend/backend structure and limitations.


## Backend refactor (2026-10-18)

DTO / Service / Repository / Entity layers are added. Existing `/api/data/subscriptions` writes also synchronize normalized `subscriptions` rows for savings calculations. Previously stored data is synchronized on the next subscription save; new `/api/v1/subscriptions` CRUD does not yet update the old JSON blob read by the browser. Avoid mixing the two write paths until the frontend migration is completed. See ARCHITECTURE.md.
