import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import ProfilePage from "../features/account/ProfilePage";
import { request } from "../api/apiClient";
vi.mock("../api/apiClient", () => ({ request: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it("verifies the new email before replacing the profile email", async () => {
  const profile = {
    id: "member",
    displayName: "회원",
    email: "old@example.test",
    emailVerified: true,
  };
  request.mockImplementation(async (path, options) => {
    if (path.endsWith("/email/send")) return { verificationId: "proof" };
    if (path.endsWith("/email"))
      return { ...profile, email: options.body.email };
    return profile;
  });
  render(<ProfilePage />);
  await screen.findByText("이메일 변경");
  fireEvent.change(screen.getByLabelText("현재 비밀번호 확인"), {
    target: { value: "Password123" },
  });
  fireEvent.change(screen.getByLabelText("새 이메일"), {
    target: { value: "new@example.test" },
  });
  fireEvent.click(screen.getByText("인증번호 발송"));
  fireEvent.change(await screen.findByLabelText("이메일 인증번호"), {
    target: { value: "123456" },
  });
  fireEvent.click(screen.getByText("이메일 변경 완료"));
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith("/api/v1/members/me/email", {
      method: "PUT",
      body: {
        email: "new@example.test",
        currentPassword: "Password123",
        verificationId: "proof",
        code: "123456",
      },
    }),
  );
  await screen.findByText(
    "이메일을 변경했습니다. 앞으로 계정 복구에 새 이메일을 사용하세요.",
  );
  expect(screen.getByLabelText("이메일").value).toBe("new@example.test");
});
it("changing the recipient clears the previous verification challenge", async () => {
  request
    .mockResolvedValueOnce({
      id: "member",
      emailVerified: true,
      email: "old@example.test",
    })
    .mockResolvedValue({ verificationId: "proof" });
  render(<ProfilePage />);
  await screen.findByText("이메일 변경");
  fireEvent.change(screen.getByLabelText("현재 비밀번호 확인"), {
    target: { value: "Password123" },
  });
  fireEvent.change(screen.getByLabelText("새 이메일"), {
    target: { value: "new@example.test" },
  });
  fireEvent.click(screen.getByText("인증번호 발송"));
  await screen.findByLabelText("이메일 인증번호");
  fireEvent.change(screen.getByLabelText("새 이메일"), {
    target: { value: "other@example.test" },
  });
  expect(screen.queryByText("이메일 변경 완료")).toBeNull();
});
