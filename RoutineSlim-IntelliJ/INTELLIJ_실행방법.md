# IntelliJ에서 한 번에 실행하기

1. IntelliJ IDEA에서 **Open**을 누르고 이 폴더(`RoutineSlim-React-Refactored`)를 엽니다.
2. Maven 프로젝트 가져오기 알림이 나오면 승인합니다. Project SDK는 **JDK 17 이상**으로 지정합니다.
3. 상단 실행 구성에서 **RoutineSlim - 실행**을 선택하고 ▶ Run을 누릅니다.
4. 최초 실행은 Maven이 Node.js/npm을 다운로드하고 React를 빌드하므로 인터넷이 필요하고 시간이 걸릴 수 있습니다.
5. 로그에 `Started RoutineSlimApplication`이 나오면 **http://localhost:8080** 으로 접속합니다.

## 실행 구성이 보이지 않을 때
Maven 도구 창에서 `backend/pom.xml`을 열고 다음 Maven goals를 실행합니다.

`process-classes spring-boot:run -DskipTests`

**별도로 npm run dev를 실행하지 않아도 됩니다.** React 빌드 결과가 Spring Boot에 포함되어 단일 포트(8080)에서 서비스됩니다.

## 주의사항
- 최초 실행에 인터넷이 필요합니다 (Maven 라이브러리, Node/npm, React 패키지 다운로드).
- 프론트엔드를 변경한 후에는 서버를 재실행해야 새 React 빌드가 반영됩니다.
- 이 프로젝트는 개발용 H2 설정을 기본 사용합니다. 기존 DB 데이터는 변경 전 백업하세요.
- Google/Kakao/Naver 실제 로그인은 별도의 OAuth 발급 키와 공급자 설정이 필요합니다.
- 이 환경에서는 Maven 전체 빌드 및 Windows IntelliJ 실행까지 검증하지 못했습니다.
