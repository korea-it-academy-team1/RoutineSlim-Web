/** Shared with Expo/React Native; these types mirror the supplied Java DTOs. */
export type BillingCycle = "WEEKLY" | "MONTHLY" | "YEARLY";
export type SubscriptionStatus = "TRIAL" | "ACTIVE" | "PAUSED" | "CANCELED";
export type MemberId = string;
export type LoginRequest = { memberName: string; memberPassword: string };
export type SignupRequest = LoginRequest & { name: string; email: string; phone?: string };
export type SubscriptionResponse = {
  id: string;
  name: string;
  categoryId: number;
  presetId: number | null;
  cardId: number | null;
  amount: number;
  currency: string;
  billingCycle: BillingCycle;
  cycleInterval: number;
  monthlyAmount: number;
  startDate: string;
  billingDay: number;
  nextBillingDate: string;
  status: SubscriptionStatus;
  trialEndDate: string | null;
  notifyEnabled: boolean;
  notifyDaysBefore: number | null;
  memo: string | null;
  canceledAt: string | null;
  createdAt: string;
  updatedAt: string;
};
export type SubscriptionWrite = {
  name: string;
  categoryId: number;
  presetId?: number | null;
  cardId?: number | null;
  amount: number;
  currency?: string;
  billingCycle: BillingCycle;
  cycleInterval?: number;
  startDate: string;
  trialEndDate?: string | null;
  notifyEnabled?: boolean;
  notifyDaysBefore?: number | null;
  memo?: string | null;
};
export type SubscriptionCreate = SubscriptionWrite & {
  id?: string;
  status?: "TRIAL" | "ACTIVE" | "PAUSED";
};
export type SubscriptionStatusRequest = {
  status: SubscriptionStatus;
  trialEndDate?: string | null;
};
export type ScanResponse = {
  fileName: string;
  name: string | null;
  presetId: number | null;
  categoryId: number | null;
  amount: number | null;
  billingCycle: BillingCycle;
  startDate: string | null;
  nextBillingDate: string | null;
  presetMatched: boolean;
  recognized: { storeName: string | null; itemNames: string[] } | null;
};
export type ClientOptions = {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  getMemberId?: () => MemberId | null;
  onUnauthorized?: (status: number) => void;
};
export type RequestOptions = {
  method?: string;
  body?: unknown;
  member?: boolean;
  headers?: Record<string, string>;
};
export class RoutineSlimApiError extends Error {
  status: number;
  code: string;
  constructor(message: string, status?: number, code?: string);
}
export function createRoutineSlimApiClient(options?: ClientOptions): {
  request<T = unknown>(path: string, options?: RequestOptions): Promise<T>;
  login(credentials: LoginRequest): Promise<MemberId>;
  signup(body: SignupRequest): Promise<MemberId>;
  listSubscriptions(status?: SubscriptionStatus): Promise<SubscriptionResponse[]>;
  getSubscription(id: string): Promise<SubscriptionResponse>;
  createSubscription(body: SubscriptionCreate): Promise<SubscriptionResponse>;
  updateSubscription(id: string, body: SubscriptionWrite): Promise<SubscriptionResponse>;
  changeSubscriptionStatus(
    id: string,
    body: SubscriptionStatusRequest,
  ): Promise<SubscriptionResponse>;
  deleteSubscription(id: string): Promise<null>;
  scanReceipt(body: FormData): Promise<ScanResponse>;
};
