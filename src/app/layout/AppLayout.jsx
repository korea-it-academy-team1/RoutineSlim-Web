import { navigation } from "../navigation";
import NavigationIcon from "./NavigationIcon";
import { isUuid } from "../../shared/lib/identifiers";
import CommunitySidebar from "../../features/community/components/CommunitySidebar";
import React from "react";
import SpendingSummaryPanel from "./SpendingSummaryPanel";
import BrandLogo from "../../shared/components/BrandLogo";

export default function AppLayout({
  page,
  setPage,
  user,
  onLogout,
  children,
  admin = false,
  unread = 0,
}) {
  const current =
    navigation.find((n) => n.key === page) ||
    (page === "subscription-detail" ? { label: "구독 상세" } : null);
  const isMemberUuid = isUuid(user);
  const displayName = isMemberUuid ? "회원" : user || "회원";
  return (
    <div className="layout">
      <aside className="sidebar">
        <button
          className="logo"
          onClick={() => setPage("dashboard")}
          aria-label="루틴슬림 대시보드"
        >
          <BrandLogo />
        </button>
        <div className="side-section-label">MAIN MENU</div>
        <nav aria-label="메인 메뉴">
          {navigation.slice(0, 6).map((n) => (
            <button
              key={n.key}
              className={page === n.key ? "active" : ""}
              onClick={() => setPage(n.key)}
            >
              <NavigationIcon name={n.icon} />
              <span>{n.label}</span>
              {n.key === "savings" && <span className="nav-spark">✦</span>}
            </button>
          ))}
        </nav>
        <div className="side-section-label side-section-gap">MY TOOLS</div>
        <nav aria-label="추가 메뉴">
          {navigation
            .filter((n) =>
              [
                "receipt-scan",
                "insights",
                "budget",
                "trials",
                "monthly",
                "comparison",
                "goals",
                "notifications",
              ].includes(n.key),
            )
            .map((n) => (
              <button
                key={n.key}
                className={page === n.key ? "active" : ""}
                onClick={() => setPage(n.key)}
              >
                <NavigationIcon name={n.icon} />
                <span>{n.label}</span>
              </button>
            ))}
        </nav>
        <div className="side-section-label side-section-gap">SUPPORT</div>
        <nav aria-label="지원 메뉴">
          {navigation
            .filter(
              (n) =>
                ["activity", "support", "about"].includes(n.key) || (admin && n.key === "admin"),
            )
            .map((n) => (
              <button
                key={n.key}
                className={page === n.key ? "active" : ""}
                onClick={() => setPage(n.key)}
              >
                <NavigationIcon name={n.icon} />
                <span>{n.label}</span>
              </button>
            ))}
        </nav>
        <div className="side-spacer" />
        <div className="promo">
          <NavigationIcon name="crown" size={23} />
          <strong>가벼운 고정비의 시작</strong>
          <p>지금 루틴슬림과 구독 서비스를 관리해보세요.</p>
          <button onClick={() => setPage("savings")}>무료로 절약하기 →</button>
        </div>
        <nav className="sidebar-bottom" aria-label="설정">
          <button
            className={page === "reminder-settings" ? "active" : ""}
            onClick={() => setPage("reminder-settings")}
          >
            <NavigationIcon name="settings" /> 설정 및 도움말
          </button>
        </nav>
        <button
          className={"user-tile" + (page === "profile" ? " active" : "")}
          onClick={() => setPage("profile")}
        >
          <span className="avatar">{displayName.charAt(0).toUpperCase()}</span>
          <span className="user-details">
            <strong>{displayName} 님</strong>
            <small>내 계정 관리</small>
          </span>
          <span className="user-chevron">›</span>
        </button>
      </aside>
      <main className="content">
        <header className="topbar">
          <div className="breadcrumbs">
            <button onClick={() => setPage("dashboard")} aria-label="홈">
              <NavigationIcon name="home" size={14} />
            </button>
            <span>›</span>
            <span>{current?.label || "대시보드"}</span>
          </div>
          <div className="top-actions">
            <span className="status-dot" />
            <span className="status-text">안정적인 절약 습관</span>
            <button
              className="top-icon"
              onClick={() => setPage("notifications")}
              aria-label="알림센터"
            >
              <NavigationIcon name="bell" size={17} />
              {unread > 0 && (
                <span className="feature-unread-badge">{unread > 99 ? "99+" : unread}</span>
              )}
            </button>
            <button
              className="top-avatar"
              onClick={() => setPage("profile")}
              aria-label="마이페이지"
            >
              {displayName.charAt(0).toUpperCase()}
            </button>
            <button className="logout-top" onClick={onLogout}>
              로그아웃
            </button>
          </div>
        </header>
        <div
          className={
            "main-body workspace-body" +
            (["admin", "savings"].includes(page) ? " workspace-wide" : "")
          }
        >
          <div className="workspace-main">{children}</div>
          {!["admin", "savings"].includes(page) &&
            (page === "community" ? (
              <CommunitySidebar navigate={setPage} />
            ) : (
              <SpendingSummaryPanel page={page} user={user} navigate={setPage} />
            ))}
        </div>
      </main>
    </div>
  );
}
