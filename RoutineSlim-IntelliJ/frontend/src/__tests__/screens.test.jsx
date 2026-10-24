import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import SpendingInsightsPage from "../features/reports/SpendingInsightsPage";
import CommunityPage from "../features/community/CommunityPage";
import PaymentHistoryPage from "../features/payments/PaymentHistoryPage";
import { request } from "../api/apiClient";
vi.mock("../api/apiClient", () => ({
  request: vi.fn(),
  money: (n) => Number(n || 0).toLocaleString("ko-KR") + "원",
  today: () => "2026-10-24",
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  request.mockReset();
});
it("weekly expenses use the same monthly conversion as the backend", async () => {
  request.mockResolvedValue([
    { amount: 1200, cycle: "weekly", category: "음악", status: "active" },
    { amount: 12000, cycle: "yearly", category: "영상", status: "active" },
    { amount: 999, cycle: "monthly", category: "기타", status: "review" },
  ]);
  render(<SpendingInsightsPage />);
  await screen.findByRole("heading", {
    name: "카테고리별 월 예상 지출 · 6,200원",
  });
  expect(screen.queryByText("기타")).toBeNull();
});
it("a new post draft survives viewing and editing an existing post", async () => {
  let post = {
    id: 1,
    authorId: "user",
    title: "Existing",
    category: "자유",
    content: "body",
    images: [],
    tags: [],
  };
  request.mockImplementation(async (path, options) => {
    if (path === "/api/v1/community/posts") return [post];
    if (path.endsWith("/comments")) return [];
    if (path.endsWith("/likes/count")) return { likes: 0, liked: false };
    if (options?.method === "PUT") post = { ...post, ...options.body };
    return post;
  });
  render(<CommunityPage user="user" />);
  fireEvent.click(screen.getByRole("button", { name: /글쓰기/ }));
  await screen.findByRole("button", { name: /Existing/ });
  fireEvent.change(screen.getByPlaceholderText("제목"), {
    target: { value: "My draft" },
  });
  fireEvent.change(screen.getByPlaceholderText("내용을 입력하세요"), {
    target: { value: "Draft body" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Existing/ }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "수정" }).disabled).toBe(false),
  );
  fireEvent.click(screen.getByRole("button", { name: "수정" }));
  fireEvent.change(screen.getByLabelText("수정 제목"), {
    target: { value: "Updated" },
  });
  fireEvent.click(screen.getByRole("button", { name: "수정 저장" }));
  await screen.findByRole("heading", { name: "Updated" });
  fireEvent.click(screen.getByRole("button", { name: "← 목록으로" }));
  expect(screen.getByPlaceholderText("제목").value).toBe("My draft");
  expect(screen.getByPlaceholderText("내용을 입력하세요").value).toBe(
    "Draft body",
  );
});
it("successful post creation is not reported as a failure when draft cache removal fails", async () => {
  vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
    throw Error("blocked");
  });
  request.mockResolvedValue([]);
  render(<CommunityPage user="user" />);
  fireEvent.click(screen.getByRole("button", { name: /글쓰기/ }));
  fireEvent.change(screen.getByPlaceholderText("제목"), {
    target: { value: "New" },
  });
  fireEvent.change(screen.getByPlaceholderText("내용을 입력하세요"), {
    target: { value: "Body" },
  });
  fireEvent.click(screen.getByRole("button", { name: "글 작성" }));
  await waitFor(() => expect(screen.queryByPlaceholderText("제목")).toBeNull());
  fireEvent.click(screen.getByRole("button", { name: /글쓰기/ }));
  expect(screen.getByPlaceholderText("제목").value).toBe("");
  expect(screen.queryByRole("alert")).toBeNull();
});
it("new payments in a different month become visible after saving", async () => {
  let saved = false;
  request.mockImplementation(async (path, options) => {
    if (options?.method === "POST") {
      saved = true;
      return { id: 1 };
    }
    return path.endsWith("2026-01") && saved
      ? [
          {
            id: 1,
            description: "January bill",
            amount: 1000,
            paidOn: "2026-01-05",
          },
        ]
      : [];
  });
  render(<PaymentHistoryPage />);
  fireEvent.change(screen.getByLabelText("결제 항목"), {
    target: { value: "January bill" },
  });
  fireEvent.change(screen.getByLabelText("금액"), {
    target: { value: "1000" },
  });
  fireEvent.change(screen.getByLabelText("결제 날짜"), {
    target: { value: "2026-01-05" },
  });
  fireEvent.click(screen.getByRole("button", { name: "등록" }));
  await screen.findByText("January bill");
  expect(request).toHaveBeenCalledWith("/api/v1/payments?month=2026-01");
});
it("profile updates include detailed fields from the shared profile API", async () => {
  const { default: ProfilePage } = await import(
    "../features/account/ProfilePage"
  );
  request.mockImplementation(async (path, options) =>
    options?.method === "PUT"
      ? { id: "user", ...options.body }
      : {
          id: "user",
          displayName: "Name",
          email: "a@example.com",
          phone: "010",
          birth: "2000-01-01",
          address: "Seoul",
          addressDetail: "101",
          photo: "",
        },
  );
  render(<ProfilePage />);
  await screen.findByLabelText("연락처");
  fireEvent.change(screen.getByLabelText("연락처"), {
    target: { value: "010-1234" },
  });
  fireEvent.click(screen.getByRole("button", { name: "변경사항 저장" }));
  await screen.findByText("회원정보를 저장했습니다.");
  expect(request).toHaveBeenCalledWith("/api/v1/members/me", {
    method: "PUT",
    body: {
      displayName: "Name",
      email: "a@example.com",
      phone: "010-1234",
      birth: "2000-01-01",
      address: "Seoul",
      addressDetail: "101",
      photo: "",
    },
  });
});
it("operator reports can be marked resolved from settings", async () => {
  const { default: CommunityReportModeration } = await import(
    "../features/admin/components/CommunityReportModeration"
  );
  let resolved = false;
  request.mockImplementation(async (path, options) => {
    if (path.endsWith("/moderation")) return { admin: true };
    if (options?.method === "POST") {
      resolved = true;
      return { status: "resolved" };
    }
    return resolved
      ? []
      : [{ id: 3, postId: 1, reporterId: "reporter", reason: "spam" }];
  });
  render(<CommunityReportModeration />);
  await screen.findByText("spam");
  fireEvent.click(screen.getByRole("button", { name: "처리 완료" }));
  await screen.findByText("처리할 신고가 없습니다.");
  expect(request).toHaveBeenCalledWith("/api/v1/community/reports/3/resolve", {
    method: "POST",
  });
});
