import React, { useEffect, useState } from "react";
import { request } from "./api/apiClient";
import AppLayout from "./components/layout/AppLayout";
import BrandLogo from "./components/common/BrandLogo";
import LoginPage from "./features/auth/LoginPage";
import DashboardPage from "./features/dashboard/DashboardPage";
import SubscriptionListPage from "./features/subscriptions/SubscriptionListPage";
import PaymentHistoryPage from "./features/payments/PaymentHistoryPage";
import CommunityPage from "./features/community/CommunityPage";
import PaymentCalendarPage from "./features/payments/PaymentCalendarPage";
import SavingsAnalysisPage from "./features/savings/SavingsAnalysisPage";
import BudgetPage from "./features/savings/BudgetPage";
import ProfilePage from "./features/account/ProfilePage";
import SpendingInsightsPage from "./features/reports/SpendingInsightsPage";
import ReminderSettingsPage from "./features/notifications/ReminderSettingsPage";
import FreeTrialPage from "./features/subscriptions/FreeTrialPage";
import MonthlyReportPage from "./features/reports/MonthlyReportPage";
import SubscriptionComparisonPage from "./features/subscriptions/SubscriptionComparisonPage";
import SavingsGoalPage from "./features/savings/SavingsGoalPage";
import CommunityActivityPage from "./features/community/CommunityActivityPage";
import SupportCenterPage from "./features/support/SupportCenterPage";
import NotificationCenterPage from "./features/notifications/NotificationCenterPage";
import SubscriptionDetailPage from "./features/subscriptions/SubscriptionDetailPage";
import AboutPage from "./features/support/AboutPage";
import AccountRecoveryPage from "./features/auth/AccountRecoveryPage";
import AdminPage from "./features/admin/AdminPage";
const keys = new Set([
  "dashboard",
  "subscriptions",
  "savings",
  "payments",
  "calendar",
  "community",
  "insights",
  "budget",
  "reminder-settings",
  "profile",
  "trials",
  "monthly",
  "comparison",
  "goals",
  "activity",
  "support",
  "notifications",
  "subscription-detail",
  "about",
  "recovery",
  "admin",
  "login",
]);
function currentRoute() {
  try {
    const [key, id] = window.location.hash.replace(/^#/, "").split("/");
    return {
      key: keys.has(key) ? key : "dashboard",
      id: id ? decodeURIComponent(id) : null,
    };
  } catch {
    return { key: "dashboard", id: null };
  }
}
export default function App() {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [route, setRoute] = useState(currentRoute),
    [admin, setAdmin] = useState(false),
    [checkingAdmin, setCheckingAdmin] = useState(false),
    [unread, setUnread] = useState(0);
  function navigate(key, id = null) {
    if (!keys.has(key)) key = "dashboard";
    setRoute({ key, id });
    const hash = key + (id ? "/" + encodeURIComponent(id) : "");
    if (window.location.hash.slice(1) !== hash) window.location.hash = hash;
  }
  useEffect(() => {
    let active = true;
    request("/api/me")
      .then((v) => {
        if (active) setUser(v.id);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    function changed() {
      setRoute(currentRoute());
    }
    function expired() {
      setUser(null);
      navigate("login");
    }
    window.addEventListener("hashchange", changed);
    window.addEventListener("routineslim:unauthorized", expired);
    return () => {
      active = false;
      window.removeEventListener("hashchange", changed);
      window.removeEventListener("routineslim:unauthorized", expired);
    };
  }, []);
  useEffect(() => {
    let active = true;
    setAdmin(false);
    if (!user) return;
    setCheckingAdmin(true);
    request("/api/v1/community/moderation")
      .then((v) => {
        if (active) setAdmin(v.admin);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setCheckingAdmin(false);
      });
    return () => {
      active = false;
    };
  }, [user]);
  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }
    let active = true;
    const update = () =>
      request("/api/v1/notifications")
        .then((items) => {
          if (active) setUnread(items.filter((x) => !x.read).length);
        })
        .catch(() => {});
    update();
    const timer = setInterval(update, 60000);
    window.addEventListener("routineslim:notifications", update);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("routineslim:notifications", update);
    };
  }, [user, route.key]);
  async function logout() {
    try {
      await request("/api/logout", { method: "POST" });
      setUser(null);
      setAdmin(false);
      navigate("login");
    } catch (e) {
      alert(e.message);
    }
  }
  if (loading) return <div className="loading">RoutineSlim 불러오는 중...</div>;
  if (!user) {
    if (route.key === "recovery")
      return <AccountRecoveryPage onBack={() => navigate("login")} />;
    if (route.key === "about" || route.key === "support")
      return (
        <div className="public-site">
          <header className="public-site-header">
            <BrandLogo />
            <nav>
              <button className="secondary" onClick={() => navigate("about")}>
                서비스 소개
              </button>
              <button className="secondary" onClick={() => navigate("support")}>
                고객센터
              </button>
              <button className="primary" onClick={() => navigate("login")}>
                로그인
              </button>
            </nav>
          </header>
          <main>
            {route.key === "about" ? (
              <AboutPage navigate={navigate} />
            ) : (
              <SupportCenterPage navigate={navigate} />
            )}
          </main>
        </div>
      );
    return (
      <LoginPage
        onLogin={(id) => {
          setUser(id);
          navigate("dashboard");
        }}
        onRecover={() => navigate("recovery")}
        onAbout={() => navigate("about")}
        onSupport={() => navigate("support")}
      />
    );
  }
  const props = { navigate, user };
  let content;
  switch (route.key) {
    case "dashboard":
      content = <DashboardPage {...props} />;
      break;
    case "subscriptions":
      content = (
        <SubscriptionListPage
          onDetails={(id) => navigate("subscription-detail", id)}
        />
      );
      break;
    case "payments":
      content = <PaymentHistoryPage />;
      break;
    case "community":
      content = <CommunityPage user={user} initialPostId={route.id} />;
      break;
    case "calendar":
      content = <PaymentCalendarPage />;
      break;
    case "savings":
      content = <SavingsAnalysisPage />;
      break;
    case "budget":
      content = <BudgetPage user={user} />;
      break;
    case "profile":
      content = (
        <ProfilePage
          onDeleted={() => {
            setUser(null);
            navigate("login");
          }}
        />
      );
      break;
    case "insights":
      content = <SpendingInsightsPage />;
      break;
    case "reminder-settings":
      content = <ReminderSettingsPage user={user} />;
      break;
    case "trials":
      content = <FreeTrialPage />;
      break;
    case "monthly":
      content = <MonthlyReportPage navigate={navigate} />;
      break;
    case "comparison":
      content = <SubscriptionComparisonPage />;
      break;
    case "goals":
      content = <SavingsGoalPage navigate={navigate} />;
      break;
    case "activity":
      content = <CommunityActivityPage navigate={navigate} />;
      break;
    case "support":
      content = <SupportCenterPage {...props} />;
      break;
    case "notifications":
      content = <NotificationCenterPage navigate={navigate} />;
      break;
    case "subscription-detail":
      content = <SubscriptionDetailPage id={route.id} navigate={navigate} />;
      break;
    case "about":
      content = <AboutPage {...props} />;
      break;
    case "admin":
      content = checkingAdmin ? (
        <p>관리자 권한을 확인하는 중...</p>
      ) : admin ? (
        <AdminPage user={user} />
      ) : (
        <p className="error" role="alert">
          관리자만 사용할 수 있는 페이지입니다.
        </p>
      );
      break;
    default:
      content = <DashboardPage {...props} />;
  }
  return (
    <AppLayout
      unread={unread}
      user={user}
      admin={admin}
      page={route.key}
      setPage={navigate}
      onLogout={logout}
    >
      {content}
    </AppLayout>
  );
}
