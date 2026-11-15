import { routeKeys, currentRoute } from "./navigation";
import { isSocialCallback } from "../features/auth/utils/socialLogin";
import ReceiptScanPage from "../features/receipts/pages/ReceiptScanPage";
import LoginPage from "../features/auth/pages/LoginPage";
import DashboardPage from "../features/dashboard/pages/DashboardPage";
import SubscriptionsPage from "../features/subscriptions/pages/SubscriptionsPage";
import FreeTrialsPage from "../features/subscriptions/pages/FreeTrialsPage";
import SubscriptionComparisonPage from "../features/subscriptions/pages/SubscriptionComparisonPage";
import SubscriptionDetailPage from "../features/subscriptions/pages/SubscriptionDetailPage";
import PaymentHistoryPage from "../features/payments/pages/PaymentHistoryPage";
import PaymentCalendarPage from "../features/payments/pages/PaymentCalendarPage";
import CommunityPage from "../features/community/pages/CommunityPage";
import CommunityActivityPage from "../features/community/pages/CommunityActivityPage";
import SavingsAnalysisPage from "../features/savings/pages/SavingsAnalysisPage";
import BudgetPage from "../features/savings/pages/BudgetPage";
import SavingsGoalPage from "../features/savings/pages/SavingsGoalPage";
import ProfilePage from "../features/account/pages/ProfilePage";
import SpendingByCategoryPage from "../features/reports/pages/SpendingByCategoryPage";
import MonthlyReportPage from "../features/reports/pages/MonthlyReportPage";
import ReminderSettingsPage from "../features/notifications/pages/ReminderSettingsPage";
import NotificationCenterPage from "../features/notifications/pages/NotificationCenterPage";
import SupportCenterPage from "../features/support/pages/SupportCenterPage";
import AboutPage from "../features/support/pages/AboutPage";
import AdminPage from "../features/admin/pages/AdminPage";
import * as authApi from "../features/auth/api/authApi";
import * as adminApi from "../features/admin/api/adminApi";
import * as notificationsApi from "../features/notifications/api/notificationsApi";
import React, { useEffect, useState } from "react";

import AppLayout from "./layout/AppLayout";
import BrandLogo from "../shared/components/BrandLogo";
export default function App() {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [route, setRoute] = useState(currentRoute),
    [admin, setAdmin] = useState(false),
    [checkingAdmin, setCheckingAdmin] = useState(false),
    [unread, setUnread] = useState(0);
  function navigate(key, id = null) {
    if (!routeKeys.has(key)) key = "dashboard";
    setRoute({ key, id });
    const hash = key + (id ? "/" + encodeURIComponent(id) : "");
    if (window.location.hash.slice(1) !== hash) window.location.hash = hash;
  }
  useEffect(() => {
    let active = true;
    if (isSocialCallback()) {
      setUser(null);
      setLoading(false);
      return () => {
        active = false;
      };
    }
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
    case "receipt-scan":
      content = <ReceiptScanPage navigate={navigate} />;
      break;
    case "dashboard":
      content = <DashboardPage {...props} />;
      break;
    case "subscriptions":
      content = <SubscriptionsPage onDetails={(id) => navigate("subscription-detail", id)} />;
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
      content = <SpendingByCategoryPage />;
      break;
    case "reminder-settings":
      content = <ReminderSettingsPage user={user} />;
      break;
    case "trials":
      content = <FreeTrialsPage />;
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
