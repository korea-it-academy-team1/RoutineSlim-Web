import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { apiRequest } from "../global/api/apiClient";
import PaymentCalendarPage from "../domain/payment/PaymentCalendarPage";
import SubscriptionListPage from "../domain/subscription/SubscriptionListPage";
import LoginPage from "../domain/auth/LoginPage";
import CommunityPage from "../domain/community/CommunityPage";
vi.mock("../global/api/apiClient", () => ({
  apiRequest: vi.fn(),
  formatWon: (n) => Number(n || 0).toLocaleString("ko-KR") + "원",
  getTodayDate: () => "2026-10-24",
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  apiRequest.mockReset();
});
it("calendar date selection filters real events and month navigation reloads data", async () => {
  apiRequest.mockResolvedValue([
    {
      subscriptionId: 1,
      name: "Music",
      date: "2026-10-24",
      amount: 1000,
      category: "음악",
    },
  ]);
  render(<PaymentCalendarPage />);
  await screen.findByRole("button", { name: "10월 24일 결제 1건" });
  fireEvent.click(screen.getByRole("button", { name: "10월 25일 결제 0건" }));
  await screen.findByText("선택한 날짜의 결제 예정 항목이 없습니다.");
  fireEvent.click(screen.getByText("전체 일정"));
  await screen.findByRole("heading", { name: "결제 예정 목록" });
  fireEvent.click(screen.getByRole("button", { name: "다음 달" }));
  await waitFor(() =>
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/calendar/events?year=2026&month=11"),
  );
});
it("subscription table searches and opens details without changing records", async () => {
  apiRequest.mockResolvedValue([
    {
      id: 1,
      name: "Music",
      category: "음악",
      amount: 1000,
      cycle: "monthly",
      day: 1,
      status: "active",
    },
    {
      id: 2,
      name: "Video",
      category: "영상",
      amount: 2000,
      cycle: "monthly",
      day: 2,
      status: "active",
    },
  ]);
  const open = vi.fn();
  render(<SubscriptionListPage onDetails={open} />);
  await screen.findByText("Music");
  fireEvent.change(screen.getByLabelText("구독 검색"), {
    target: { value: "Music" },
  });
  expect(screen.queryByText("Video")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "상세" }));
  expect(open).toHaveBeenCalledWith(1);
});
it("reference-inspired login preserves the desktop layout and omits unimplemented auth", () => {
  render(<LoginPage onLogin={() => {}} />);
  expect(screen.getByRole("heading", { name: /구독, 고정비를/ })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "회원가입", exact: true })).toBeNull();
  expect(screen.queryByText("또는 간편 로그인")).toBeNull();
  expect(apiRequest).not.toHaveBeenCalled();
});
it("composer persists toolbar formatting through the existing post API", async () => {
  apiRequest.mockResolvedValue([]);
  render(<CommunityPage user="user" />);
  fireEvent.click(screen.getByRole("button", { name: /글쓰기/ }));
  fireEvent.change(screen.getByPlaceholderText("제목"), {
    target: { value: "Formatted post" },
  });
  const area = screen.getByPlaceholderText("내용을 입력하세요");
  fireEvent.change(area, { target: { value: "Text" } });
  area.setSelectionRange(0, 4);
  fireEvent.click(screen.getByRole("button", { name: "굵게" }));
  expect(area.value).toBe("**Text**");
  fireEvent.click(screen.getByRole("button", { name: "글 작성" }));
  await waitFor(() =>
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/community/posts", {
      method: "POST",
      body: {
        title: "Formatted post",
        content: "**Text**",
        category: "자유",
        images: [],
        tags: [],
      },
    }),
  );
});
