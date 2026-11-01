import LoginPage from "./domain/auth/LoginPage";
import DashboardPage from "./domain/stats/DashboardPage";
import SubscriptionListPage from "./domain/subscription/SubscriptionListPage";
import FreeTrialPage from "./domain/subscription/FreeTrialPage";
import SubscriptionComparisonPage from "./domain/subscription/SubscriptionComparisonPage";
import SubscriptionDetailPage from "./domain/subscription/SubscriptionDetailPage";
import PaymentHistoryPage from "./domain/payment/PaymentHistoryPage";
import PaymentCalendarPage from "./domain/payment/PaymentCalendarPage";
import CommunityPage from "./domain/community/CommunityPage";
import CommunityActivityPage from "./domain/community/CommunityActivityPage";
import SavingsAnalysisPage from "./domain/stats/SavingsAnalysisPage";
import BudgetPage from "./domain/stats/BudgetPage";
import SavingsGoalPage from "./domain/stats/SavingsGoalPage";
import ProfilePage from "./domain/user/ProfilePage";
import SpendingInsightsPage from "./domain/stats/SpendingInsightsPage";
import MonthlyReportPage from "./domain/stats/MonthlyReportPage";
import ReminderSettingsPage from "./domain/user/ReminderSettingsPage";
import NotificationCenterPage from "./domain/user/NotificationCenterPage";
import SupportCenterPage from "./domain/support/SupportCenterPage";
import AboutPage from "./domain/support/AboutPage";
import AdminPage from "./domain/admin/AdminPage";
import * as authApi from "./domain/auth/authApi";
import * as adminApi from "./domain/admin/adminApi";
import * as notificationsApi from "./domain/user/notificationsApi";
import React, { useEffect, useState } from "react";

import AppLayout from "./global/components/AppLayout";
import BrandLogo from "./global/components/BrandLogo";
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
    authApi
      .getSession()
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
    adminApi
      .getModerationAccess()
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
      notificationsApi
        .getNotifications()
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
      await authApi.logout();
      setUser(null);
      setAdmin(false);
      navigate("login");
    } catch (e) {
      alert(e.message);
    }
  }
  if (loading) return <div className="loading">RoutineSlim 불러오는 중...</div>;
  if (!user) {
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
      content = <SubscriptionListPage onDetails={(id) => navigate("subscription-detail", id)} />;
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
