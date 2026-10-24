import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import RegistrationPage from "../features/auth/RegistrationPage";
import { request } from "../api/apiClient";
vi.mock("../api/apiClient", () => ({ request: vi.fn() }));
const policy = {
  termsVersion: "2026-10-24",
  privacyVersion: "2026-10-24",
  mailAvailable: true,
  terms: "서비스 이용 안내",
  privacy: "개인정보 수집 안내",
};
afterEach(() => {
  cleanup();
  request.mockReset();
});
async function consent() {
  await screen.findByText("서비스 이용약관 동의 (필수)");
  for (const label of [
    "서비스 이용약관 동의 (필수)",
    "개인정보 수집·이용 동의 (필수)",
    "만 14세 이상입니다 (필수)",
  ])
    fireEvent.click(screen.getByLabelText(label));
  fireEvent.click(screen.getByRole("button", { name: "동의하고 다음" }));
}
function configure() {
  request.mockImplementation(async (path) => {
    if (path.endsWith("/policy")) return policy;
    if (path.includes("id-availability")) return { available: true };
    if (path.endsWith("/send"))
      return {
        verificationId: "proof",
        expiresInSeconds: 600,
        resendAfterSeconds: 60,
      };
    if (path.endsWith("/verify")) return { verified: true };
    return { id: "newmember" };
  });
}
it("requires each mandatory agreement before proceeding", async () => {
  configure();
  render(<RegistrationPage onBack={() => {}} />);
  await screen.findByText("서비스 이용약관 동의 (필수)");
  expect(screen.getByRole("button", { name: "동의하고 다음" }).disabled).toBe(
    true,
  );
  fireEvent.click(screen.getByLabelText("서비스 이용약관 동의 (필수)"));
  expect(screen.getByRole("button", { name: "동의하고 다음" }).disabled).toBe(
    true,
  );
});
it("completes agreement, duplicate check and email verification before submitting signup", async () => {
  configure();
  render(<RegistrationPage onBack={() => {}} />);
  await consent();
  fireEvent.change(screen.getByLabelText("아이디"), {
    target: { value: "newmember" },
  });
  fireEvent.click(screen.getByRole("button", { name: "아이디 중복 확인" }));
  await screen.findByText("사용 가능한 아이디입니다.");
  fireEvent.change(screen.getByLabelText("이름"), {
    target: { value: "홍길동" },
  });
  fireEvent.change(screen.getByLabelText("이메일"), {
    target: { value: "user@example.com" },
  });
  fireEvent.click(screen.getByRole("button", { name: "인증번호 발송" }));
  await screen.findByLabelText("이메일 인증번호");
  fireEvent.change(screen.getByLabelText("이메일 인증번호"), {
    target: { value: "123456" },
  });
  fireEvent.click(screen.getByRole("button", { name: "인증번호 확인" }));
  await screen.findByText("이메일 인증이 완료되었습니다.");
  fireEvent.change(screen.getByLabelText("비밀번호", { exact: true }), {
    target: { value: "Password123!" },
  });
  fireEvent.change(screen.getByLabelText("비밀번호 확인"), {
    target: { value: "Password123!" },
  });
  fireEvent.click(screen.getByRole("button", { name: "회원가입 완료" }));
  await screen.findByRole("heading", { name: "회원가입이 완료되었습니다." });
  expect(request).toHaveBeenCalledWith("/api/register", {
    method: "POST",
    body: {
      id: "newmember",
      name: "홍길동",
      email: "user@example.com",
      password: "Password123!",
      confirmPassword: "Password123!",
      verificationId: "proof",
      agreeTerms: true,
      agreePrivacy: true,
      ageOver14: true,
      termsVersion: policy.termsVersion,
      privacyVersion: policy.privacyVersion,
    },
  });
});
it("changing the email discards its previous verification", async () => {
  configure();
  render(<RegistrationPage onBack={() => {}} />);
  await consent();
  fireEvent.change(screen.getByLabelText("이메일"), {
    target: { value: "first@example.com" },
  });
  fireEvent.click(screen.getByRole("button", { name: "인증번호 발송" }));
  await screen.findByLabelText("이메일 인증번호");
  fireEvent.change(screen.getByLabelText("이메일 인증번호"), {
    target: { value: "123456" },
  });
  fireEvent.click(screen.getByRole("button", { name: "인증번호 확인" }));
  await screen.findByText("이메일 인증이 완료되었습니다.");
  fireEvent.change(screen.getByLabelText("이메일"), {
    target: { value: "second@example.com" },
  });
  expect(screen.queryByLabelText("이메일 인증번호")).toBeNull();
  expect(screen.getByRole("button", { name: "회원가입 완료" }).disabled).toBe(
    true,
  );
});
it("SMTP errors remain visible and do not allow signup", async () => {
  configure();
  request.mockImplementation(async (path) => {
    if (path.endsWith("/policy")) return policy;
    if (path.endsWith("/send")) throw Error("메일 발송 서버를 확인해주세요.");
    return { available: true };
  });
  render(<RegistrationPage onBack={() => {}} />);
  await consent();
  fireEvent.change(screen.getByLabelText("이메일"), {
    target: { value: "user@example.com" },
  });
  fireEvent.click(screen.getByRole("button", { name: "인증번호 발송" }));
  await screen.findByRole("alert");
  expect(screen.getByRole("alert").textContent).toContain("메일 발송 서버");
  expect(screen.getByRole("button", { name: "회원가입 완료" }).disabled).toBe(
    true,
  );
});
