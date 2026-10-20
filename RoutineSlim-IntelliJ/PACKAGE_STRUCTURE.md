# RoutineSlim 패키지 구조 정리

기존 기능별 하위 패키지를 **계층별 단일 패키지**로 모았습니다. API URL, DTO 필드, DB 테이블, React 컴포넌트 경로는 변경하지 않았습니다.

```text
backend/src/main/java/kr/routineslim/
├── RoutineSlimApplication.java
├── controller/   # HTTP API 컨트롤러
├── dto/          # 요청/응답 DTO
├── service/      # 비즈니스 로직
├── repository/   # JPA 데이터 접근
├── entity/       # JPA 엔티티
├── config/       # 보안/OAuth/CSRF 설정
├── security/     # 세션 사용자
└── exception/    # 예외 처리

frontend/src/
├── api/          # API 통신
├── components/   # 공통 UI
├── pages/        # 페이지
└── utils/        # 유틸리티
```

기존 Java 패키지 참조 및 테스트 import를 새 경로로 수정했습니다. IntelliJ에서 Maven Reload 후 재빌드하세요.
