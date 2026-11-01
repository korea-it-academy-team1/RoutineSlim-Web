import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import LoginPage from "../domain/auth/LoginPage";
import { apiRequest } from "../global/api/apiClient";
vi.mock("../global/api/apiClient", () => ({ apiRequest: vi.fn() }));
afterEach(() => {
  cleanup();
  apiRequest.mockReset();
  window.history.replaceState({}, "", "/");
});
it("does not expose an unimplemented signup procedure", () => {
  render(<LoginPage onLogin={() => {}} />);
  expect(screen.queryByRole("button", { name: "회원가입", exact: true })).toBeNull();
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.queryByText("서비스 이용약관 동의 (필수)")).toBeNull();
  expect(screen.queryByRole("button", { name: "동의하고 다음" })).toBeNull();
  expect(apiRequest).not.toHaveBeenCalled();
});
it("does not open the old signup flow through a direct query URL", () => {
  window.history.replaceState({}, "", "/?register=1");
  render(<LoginPage onLogin={() => {}} />);
  expect(screen.getByRole("heading", { name: "로그인", exact: true })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "회원가입", exact: true })).toBeNull();
  expect(screen.queryByRole("button", { name: "회원가입 완료" })).toBeNull();
  expect(apiRequest).not.toHaveBeenCalled();
});
it("still performs ordinary login without registration requests", async () => {
  const onLogin = vi.fn();
  apiRequest.mockResolvedValue({ id: "existing-member" });
  render(<LoginPage onLogin={onLogin} />);
  fireEvent.change(screen.getByLabelText("아이디"), { target: { value: "existing-member" } });
  fireEvent.change(screen.getByLabelText("비밀번호"), { target: { value: "test-password" } });
  fireEvent.click(screen.getByRole("button", { name: "로그인", exact: true }));
  await waitFor(() => expect(onLogin).toHaveBeenCalledWith("existing-member"));
  expect(apiRequest).toHaveBeenCalledTimes(1);
  expect(apiRequest).toHaveBeenCalledWith(
    "/api/login",
    expect.objectContaining({ method: "POST" }),
  );
  expect(screen.queryByRole("alert")).toBeNull();
});
it("does not expose account recovery actions absent from the app", () => {
  render(<LoginPage onLogin={() => {}} />);
  expect(screen.queryByRole("button", { name: "비밀번호 찾기", exact: true })).toBeNull();
  expect(screen.queryByRole("button", { name: "아이디 · 비밀번호 찾기", exact: true })).toBeNull();
  expect(apiRequest).not.toHaveBeenCalled();
});
