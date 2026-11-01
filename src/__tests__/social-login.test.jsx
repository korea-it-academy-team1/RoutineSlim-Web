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
it("does not display social login actions that the app has not connected", () => {
  render(<LoginPage onLogin={() => {}} />);
  for (const provider of ["Google", "네이버", "카카오"])
    expect(screen.queryByRole("button", { name: `${provider} 로그인` })).toBeNull();
  expect(screen.queryByText("또는 간편 로그인")).toBeNull();
  expect(apiRequest).not.toHaveBeenCalled();
});
it("does not call old OAuth endpoints even when a legacy callback query is present", () => {
  window.history.replaceState({}, "", "/?oauth_error=1");
  render(<LoginPage onLogin={() => {}} />);
  expect(apiRequest).not.toHaveBeenCalled();
  expect(screen.queryByRole("alert")).toBeNull();
});
it("normal login still uses the normalized server identity", async () => {
  const onLogin = vi.fn();
  apiRequest.mockResolvedValue({ id: "normalized" });
  render(<LoginPage onLogin={onLogin} />);
  fireEvent.change(screen.getByLabelText("아이디"), { target: { value: " normalized " } });
  fireEvent.change(screen.getByLabelText("비밀번호"), { target: { value: "password123" } });
  fireEvent.click(screen.getByRole("button", { name: "로그인", exact: true }));
  await waitFor(() => expect(onLogin).toHaveBeenCalledWith("normalized"));
  expect(apiRequest).toHaveBeenCalledTimes(1);
  expect(apiRequest.mock.calls[0][0]).toBe("/api/login");
});
