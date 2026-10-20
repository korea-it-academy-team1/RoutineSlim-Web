import React from 'react';

const navigation = [
  {key:'dashboard',label:'대시보드',icon:'grid'},
  {key:'subscriptions',label:'구독 · 고정비',icon:'wallet'},
  {key:'savings',label:'맞춤 절감 솔루션',icon:'spark'},
  {key:'payments',label:'지출 리포트',icon:'chart'},
  {key:'calendar',label:'캘린더',icon:'calendar'},
  {key:'community',label:'커뮤니티',icon:'message'},
  {key:'insights',label:'지출 차트',icon:'bars'},
  {key:'budget',label:'월 예산',icon:'coins'},
  {key:'reminder-settings',label:'결제 알림 설정',icon:'bell'},
  {key:'profile',label:'마이페이지',icon:'user'}
];
const paths = {
  grid:<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
  wallet:<><rect x="3" y="6" width="18" height="15" rx="2"/><path d="M3 9V5a2 2 0 0 1 2-2h13"/><path d="M16 13h5v5h-5a2.5 2.5 0 0 1 0-5Z"/></>,
  spark:<><path d="m12 2 1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9L12 2Z"/><path d="m19 17 .8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8L19 17Z"/></>,
  chart:<><path d="M3 3v18h18"/><path d="m7 15 4-5 4 3 5-7"/></>,
  bars:<><rect x="4" y="11" width="4" height="9" rx="1"/><rect x="10" y="6" width="4" height="14" rx="1"/><rect x="16" y="3" width="4" height="17" rx="1"/></>,
  calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></>,
  message:<><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 3v-7a7.5 7.5 0 1 1 17-3.5Z"/><path d="M8 11h8M8 15h5"/></>,
  coins:<><circle cx="12" cy="12" r="9"/><path d="M15 9c-1-2-6-2-6 1 0 3 6 1 6 4s-5 4-6 1M12 6v12"/></>,
  bell:<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/></>,
  user:<><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.5 3.5-7 8-7s8 2.5 8 7"/></>,
  home:<><path d="m3 11 9-8 9 8v10h-6v-7H9v7H3V11Z"/></>,
  crown:<><path d="m2 8 5 4 5-7 5 7 5-4-2 11H4L2 8Z"/></>,
  settings:<><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/></>
};
function Icon({name,size=17}) {return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]||paths.grid}</svg>}
export default function Layout({page,setPage,user,onLogout,children}) {
  const current=navigation.find(n=>n.key===page);
  const displayName=user||'회원';
  return <div className="layout">
    <aside className="sidebar">
      <button className="logo" onClick={()=>setPage('dashboard')} aria-label="루틴슬림 대시보드"><span className="brand-mark"><span>◉</span></span><span>루틴슬림</span></button>
      <div className="side-section-label">MAIN MENU</div>
      <nav aria-label="메인 메뉴">{navigation.slice(0,6).map(n=><button key={n.key} className={page===n.key?'active':''} onClick={()=>setPage(n.key)}><Icon name={n.icon}/><span>{n.label}</span>{n.key==='savings'&&<span className="nav-spark">✦</span>}</button>)}</nav>
      <div className="side-section-label side-section-gap">MY TOOLS</div>
      <nav aria-label="추가 메뉴">{navigation.slice(6,8).map(n=><button key={n.key} className={page===n.key?'active':''} onClick={()=>setPage(n.key)}><Icon name={n.icon}/><span>{n.label}</span></button>)}</nav>
      <div className="side-spacer"/>
      <div className="promo"><Icon name="crown" size={23}/><strong>가벼운 고정비의 시작</strong><p>지금 루틴슬림과 구독 서비스를 관리해보세요.</p><button onClick={()=>setPage('savings')}>무료로 절약하기 →</button></div>
      <nav className="sidebar-bottom" aria-label="설정"><button className={page==='reminder-settings'?'active':''} onClick={()=>setPage('reminder-settings')}><Icon name="settings"/> 설정 및 도움말</button></nav>
      <button className={'user-tile'+(page==='profile'?' active':'')} onClick={()=>setPage('profile')}><span className="avatar">{displayName.charAt(0).toUpperCase()}</span><span className="user-details"><strong>{displayName} 님</strong><small>내 계정 관리</small></span><span className="user-chevron">›</span></button>
    </aside>
    <main className="content"><header className="topbar"><div className="breadcrumbs"><button onClick={()=>setPage('dashboard')} aria-label="홈"><Icon name="home" size={14}/></button><span>›</span><span>{current?.label||'대시보드'}</span></div><div className="top-actions"><span className="status-dot"/><span className="status-text">안정적인 절약 습관</span><button className="top-icon" onClick={()=>setPage('reminder-settings')} aria-label="결제 알림 설정"><Icon name="bell" size={17}/></button><button className="top-avatar" onClick={()=>setPage('profile')} aria-label="마이페이지">{displayName.charAt(0).toUpperCase()}</button><button className="logout-top" onClick={onLogout}>로그아웃</button></div></header><div className="main-body">{children}</div></main>
  </div>;
}
