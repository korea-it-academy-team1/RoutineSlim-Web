# 구독핏 — IntelliJ IDEA 실행 프로젝트

## 준비물
- IntelliJ IDEA
- JDK 17 이상
- 인터넷 연결(최초 Maven 의존성 다운로드 시)

## 실행 방법
1. ZIP 파일을 원하는 폴더에 압축 해제합니다.
2. IntelliJ IDEA에서 `gudokfit-intellij` 폴더를 `Open`으로 엽니다.
3. `pom.xml`을 Maven 프로젝트로 불러오라는 안내가 나오면 `Load` 또는 `Load Maven Project`를 누릅니다.
4. Project SDK를 JDK 17 이상으로 설정합니다.
   - `File > Project Structure > Project > SDK`
5. `src/main/java/kr/gudokfit/GudokFitApplication.java`를 엽니다.
6. `main` 메서드 옆 초록색 실행 버튼을 누릅니다.
7. 콘솔에 Spring Boot가 시작되었다고 나오면 브라우저에서 아래 주소로 접속합니다.
   - http://localhost:8080

## 포함된 기능
- 대시보드와 월별 고정비 현황
- 고정비 추가/수정/삭제 및 검색/필터
- 결제 캘린더
- 절약 리포트
- CSV 내보내기, JSON 백업/복원
- 브라우저 localStorage 기반 데이터 저장

## 데이터 저장 참고
현재 버전은 브라우저의 `localStorage`에 데이터를 저장합니다. 같은 브라우저에서 `http://localhost:8080`으로 접속하면 데이터가 유지되지만, 브라우저/주소가 바뀌면 데이터가 공유되지 않습니다. 서버 DB, 회원가입, 실제 금융 계좌 연동, 이메일/SMS 알림은 아직 연결되어 있지 않습니다.

## 포트가 이미 사용 중일 때
`src/main/resources/application.properties`에서 `server.port=8080`을 `8081` 등으로 변경한 뒤 다시 실행하세요.
