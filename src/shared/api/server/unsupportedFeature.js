export const unsupported = (path) => {
  const error = new Error("현재 서버에서는 이 기능을 사용할 수 없습니다.");
  error.code = "API_NOT_AVAILABLE";
  error.endpoint = path;
  throw error;
};
