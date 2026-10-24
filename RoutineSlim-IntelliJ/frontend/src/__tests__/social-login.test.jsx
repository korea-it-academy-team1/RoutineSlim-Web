import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import LoginPage from "../features/auth/LoginPage";
import { request } from "../api/apiClient";
vi.mock("../api/apiClient", () => ({ request: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  request.mockReset();
  window.history.replaceState({}, "", "/");
});
it("an unconfigured social button explains the missing setup instead of silently doing nothing", async () => {
  request.mockImplementation(async (path) => {
    if (path.endsWith("/providers"))
      return { google: false, kakao: false, naver: false };
    throw Error(
      "Google 로그인이 아직 설정되지 않았습니다. GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET을 확인해주세요.",
    );
  });
  render(<LoginPage onLogin={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "Google 로그인" }));
  await screen.findByRole("alert");
  expect(screen.getByRole("alert").textContent).toContain("GOOGLE_CLIENT_ID");
  expect(screen.getByRole("button", { name: "Google 로그인" }).disabled).toBe(
    false,
  );
});
it("a callback failure displays the server explanation", async () => {
  window.history.replaceState({}, "", "/?oauth_error=1");
  request.mockImplementation(async (path) =>
    path.endsWith("/providers")
      ? { google: true }
      : { message: "로그인 동의가 취소되었습니다." },
  );
  render(<LoginPage onLogin={() => {}} />);
  await screen.findByText("로그인 동의가 취소되었습니다.");
});
it("normal login still uses the normalized server identity", async () => {
  const onLogin = vi.fn();
  request.mockImplementation(async (path) =>
    path.endsWith("/providers") ? {} : { id: "normalized" },
  );
  render(<LoginPage onLogin={onLogin} />);
  fireEvent.change(screen.getByLabelText("아이디"), {
    target: { value: " normalized " },
  });
  fireEvent.change(screen.getByLabelText("비밀번호"), {
    target: { value: "password123" },
  });
  fireEvent.click(screen.getByRole("button", { name: "로그인", exact: true }));
  await waitFor(() => expect(onLogin).toHaveBeenCalledWith("normalized"));
});
