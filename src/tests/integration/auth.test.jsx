import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import LoginPage from "../../features/auth/pages/LoginPage";
import { apiRequest } from "../../shared/api/apiClient";
vi.mock("../../shared/api/apiClient", () => ({ apiRequest: vi.fn() }));
afterEach(() => {
  cleanup();
  apiRequest.mockReset();
  sessionStorage.clear();
  window.history.replaceState({}, "", "/");
});

function openSignup() {
  render(<LoginPage onLogin={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "회원가입", exact: true }));
  for (const [label, value] of [
    ["아이디", " member "],
    ["비밀번호", "password123"],
    ["비밀번호 확인", "password123"],
    ["이름", " 홍길동 "],
  ]) {
    fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } });
  }
}
it("submits server fields and returns to login without signing in automatically", async () => {
  apiRequest.mockResolvedValue("01900000-0000-7000-8000-000000000001");
  openSignup();
  fireEvent.change(screen.getByLabelText("이메일 (선택)"), {
    target: { value: "test@example.com" },
  });
  fireEvent.click(screen.getByRole("button", { name: "회원가입 완료" }));
  await waitFor(() => expect(screen.getByRole("status").textContent).toContain("회원가입이 완료"));
  expect(apiRequest).toHaveBeenCalledTimes(1);
  expect(apiRequest).toHaveBeenCalledWith("/api/signup", {
    method: "POST",
    body: {
      memberName: "member",
      memberPassword: "password123",
      name: "홍길동",
      email: "test@example.com",
      phone: null,
    },
  });
  expect(screen.getByLabelText("아이디").value).toBe("member");
  expect(screen.getByLabelText("비밀번호").value).toBe("");
});
it("prevents mismatched passwords and whitespace-only required fields", () => {
  openSignup();
  fireEvent.change(screen.getByLabelText("비밀번호 확인"), { target: { value: "different" } });
  fireEvent.click(screen.getByRole("button", { name: "회원가입 완료" }));
  expect(screen.getByRole("alert").textContent).toContain("일치하지");
  expect(apiRequest).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("아이디"), { target: { value: "   " } });
  fireEvent.click(screen.getByRole("button", { name: "회원가입 완료" }));
  expect(screen.getByRole("alert").textContent).toContain("입력해주세요");
});
it("shows server errors and prevents repeated submissions while pending", async () => {
  let reject;
  apiRequest.mockImplementation(
    () =>
      new Promise((_, fail) => {
        reject = fail;
      }),
  );
  openSignup();
  fireEvent.click(screen.getByRole("button", { name: "회원가입 완료" }));
  expect(screen.getByRole("button", { name: "가입 중..." }).disabled).toBe(true);
  expect(apiRequest).toHaveBeenCalledTimes(1);
  reject(new Error("이미 사용 중인 아이디입니다."));
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toBe("이미 사용 중인 아이디입니다."),
  );
  expect(screen.getByRole("button", { name: "회원가입 완료" }).disabled).toBe(false);
});

it("displays all three social providers", () => {
  render(<LoginPage onLogin={() => {}} />);
  for (const provider of ["Google", "네이버", "카카오"])
    expect(screen.getByRole("button", { name: `${provider} 로그인` })).toBeTruthy();
  expect(screen.getByText("또는 간편 로그인")).toBeTruthy();
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

function callback(state = "expected") {
  sessionStorage.setItem(
    "routineslim.social.pending.v1",
    JSON.stringify({ state: "expected", rememberMe: true, expiresAt: Date.now() + 600000 }),
  );
  window.history.replaceState({}, "", `/?code=authorization-code&state=${state}`);
}
it("exchanges a valid callback only once under StrictMode and removes code from the URL", async () => {
  callback();
  apiRequest.mockResolvedValue({ id: "member" });
  const onLogin = vi.fn();
  render(
    <React.StrictMode>
      <LoginPage onLogin={onLogin} />
    </React.StrictMode>,
  );
  await waitFor(() => expect(onLogin).toHaveBeenCalledWith("member"));
  expect(apiRequest).toHaveBeenCalledTimes(1);
  expect(apiRequest).toHaveBeenCalledWith("/api/social/code", {
    method: "POST",
    body: { code: "authorization-code", state: "expected", error: null, rememberMe: true },
  });
  expect(window.location.search).toBe("");
  expect(sessionStorage.getItem("routineslim.social.pending.v1")).toBeNull();
});
it("rejects mismatched callback state without contacting the server", async () => {
  callback("wrong");
  render(<LoginPage onLogin={vi.fn()} />);
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("일치하지"));
  expect(apiRequest).not.toHaveBeenCalled();
});
it("shows provider configuration failures from the server", async () => {
  apiRequest.mockRejectedValue(new Error("해당 소셜 로그인의 서버 설정이 필요합니다."));
  render(<LoginPage onLogin={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "카카오 로그인" }));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("서버 설정"));
  expect(apiRequest).toHaveBeenCalledWith("/api/social/start", {
    method: "POST",
    body: { provider: "KAKAO" },
  });
});
it("checks only the ID format without making a registration or availability request", () => {
  openSignup();
  fireEvent.click(screen.getByRole("button", { name: "아이디 입력 확인" }));
  expect(screen.getByRole("status").textContent).toContain(
    "중복 여부는 가입 시 서버에서 확인합니다",
  );
  expect(screen.queryByText(/사용 가능한 아이디/)).toBeNull();
  expect(apiRequest).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("아이디", { exact: true }), { target: { value: "   " } });
  fireEvent.click(screen.getByRole("button", { name: "아이디 입력 확인" }));
  expect(screen.getByRole("alert").textContent).toContain("아이디를 입력해주세요");
  expect(apiRequest).not.toHaveBeenCalled();
});
it("highlights a server-reported duplicate and clears it when the ID changes", async () => {
  apiRequest
    .mockRejectedValueOnce(new Error("이미 사용 중인 아이디입니다."))
    .mockResolvedValueOnce("01900000-0000-7000-8000-000000000001");
  openSignup();
  fireEvent.click(screen.getByRole("button", { name: "회원가입 완료" }));
  await screen.findByRole("alert");
  const input = screen.getByLabelText("아이디", { exact: true });
  expect(input.getAttribute("aria-invalid")).toBe("true");
  expect(document.activeElement).toBe(input);
  fireEvent.click(screen.getByRole("button", { name: "회원가입 완료" }));
  expect(apiRequest).toHaveBeenCalledTimes(1);
  fireEvent.change(input, { target: { value: "another-member" } });
  expect(screen.queryByRole("alert")).toBeNull();
  expect(input.getAttribute("aria-invalid")).toBe("false");
  fireEvent.click(screen.getByRole("button", { name: "회원가입 완료" }));
  await waitFor(() => expect(screen.getByRole("status").textContent).toContain("회원가입이 완료"));
  expect(apiRequest).toHaveBeenCalledTimes(2);
});
