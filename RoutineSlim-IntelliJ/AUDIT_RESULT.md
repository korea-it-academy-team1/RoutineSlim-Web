# RoutineSlim 통합 정적 점검 결과

- 기존 백엔드·프론트엔드 구조 유지, React API client 예외 처리 개선
- React 마이페이지에 비밀번호 변경/회원 탈퇴 연결; 구형 화면 의존도 감소
- IntelliJ Maven 실행 구성의 `-DskipTests` 제거
- 날짜 생성에서 UTC 기준 `toISOString` 사용을 제거해 로컬 날짜 오차 방지
- 미사용 Java import 제거 및 React 미구현 화면 안내 문구 수정
- 기존 legacy 자산은 OAuth 로그인 등 호환성을 위해 삭제하지 않음

## 확인 필요
- `npm install --offline` 실패: npm 캐시에 React 패키지가 없음. 온라인 환경에서 `npm install && npm run build` 실행 필요
- 현재 환경에 `mvn` 실행 파일이 없어 Maven 컴파일/테스트를 완료하지 못함
- 실제 브라우저, H2/MySQL, OAuth 외부 계정 테스트 미수행
- 전체 기능이 오류 없이 실행된다고 보증하지 않음
