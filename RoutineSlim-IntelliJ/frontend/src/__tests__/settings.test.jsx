import { act, renderHook, waitFor, cleanup } from "@testing-library/react";
import { useAccountSetting } from "../hooks/useAccountSetting";
import { request } from "../api/apiClient";
vi.mock("../api/apiClient", () => ({ request: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  request.mockReset();
});
it("account settings still load and save when browser storage is blocked", async () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw Error("blocked");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw Error("blocked");
  });
  request.mockResolvedValue({ json: '"12000"' });
  const { result } = renderHook(() => useAccountSetting("user", "budget", ""));
  await waitFor(() => expect(result.current.ready).toBe(true));
  expect(result.current.value).toBe("12000");
  await act(async () => {
    await result.current.save("24000");
  });
  expect(result.current.value).toBe("24000");
  expect(result.current.error).toBe("");
  expect(request).toHaveBeenCalledWith("/api/data/setting-budget", {
    method: "PUT",
    body: { json: '"24000"' },
  });
});
it("invalid legacy reminder periods fall back to a supported value", async () => {
  request.mockResolvedValue({ json: "999" });
  const { result } = renderHook(() =>
    useAccountSetting("user", "reminder-days", 7),
  );
  await waitFor(() => expect(result.current.ready).toBe(true));
  expect(result.current.value).toBe(7);
});
it("a late response from the previous account cannot replace the new account setting", async () => {
  let complete;
  request.mockImplementation(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  const { result, rerender } = renderHook(
    ({ user }) => useAccountSetting(user, "budget", ""),
    { initialProps: { user: "first" } },
  );
  const first = complete;
  rerender({ user: "second" });
  const second = complete;
  await act(async () => second({ json: '"200"' }));
  await act(async () => first({ json: '"100"' }));
  expect(result.current.value).toBe("200");
});
