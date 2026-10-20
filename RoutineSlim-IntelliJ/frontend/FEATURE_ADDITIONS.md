# 추가된 추천 기능

- React 결제 캘린더: 기존 `/api/v1/calendar/events` API 사용
- React 절약 분석: 기존 `/api/v1/savings/summary`, `/api/v1/subscriptions` API 사용
- 월 구독 예산 및 초과 경고: 사용자 ID별 브라우저 localStorage 저장 (서버 동기화 없음)
- 구독·결제 내역 CSV 내보내기: UTF-8 BOM, CSV 값 따옴표 이스케이프
- 기존 화면 및 백엔드 유지

## 검증 주의
전체 Maven/React 빌드와 브라우저 기능 검증은 별도 필요합니다. 예산은 서버 DB에 저장되지 않으며 다른 기기로 동기화되지 않습니다.
