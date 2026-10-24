import React from 'react';
import BrandLogo from './BrandLogo';

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
  {key:'profile',label:'마이페이지',icon:'user'},
  {key:'trials',label:'무료체험 관리',icon:'clock'},
  {key:'monthly',label:'월간 결산',icon:'chart'},
  {key:'comparison',label:'구독 비교',icon:'compare'},
  {key:'goals',label:'절약 목표 · 챌린지',icon:'target'},
  {key:'activity',label:'내 활동',icon:'message'},
  {key:'notifications',label:'알림센터',icon:'bell'},
  {key:'support',label:'고객센터',icon:'help'},
  {key:'about',label:'서비스 소개',icon:'info'},
  {key:'admin',label:'관리자 대시보드',icon:'shield'}
];
const paths = {
  clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  compare:<><rect x="3" y="4" width="7" height="16" rx="1"/><rect x="14" y="4" width="7" height="16" rx="1"/><path d="M6 8h1M17 8h1M6 12h1M17 12h1"/></>,
  target:<><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
  help:<><path d="M4 14v-3a8 8 0 0 1 16 0v3M4 13H2v6h4v-6H4ZM20 13h2v6h-4v-6h2ZM18 19c0 3-2 3-6 3"/></>,
  info:<><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>,
  shield:<><path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6l8-4Z"/><path d="m8 12 3 3 5-6"/></>,
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
export default function Layout({page,setPage,user,onLogout,children,admin=false,unread=0}) {
  const current=navigation.find(n=>n.key===page)||(page==='subscription-detail'?{label:'구독 상세'}:null);
  const displayName=user||'회원';
  return <div className="layout">
    <aside className="sidebar">
      <button className="logo" onClick={()=>setPage('dashboard')} aria-label="루틴슬림 대시보드"><BrandLogo/></button>
      <div className="side-section-label">MAIN MENU</div>
      <nav aria-label="메인 메뉴">{navigation.slice(0,6).map(n=><button key={n.key} className={page===n.key?'active':''} onClick={()=>setPage(n.key)}><Icon name={n.icon}/><span>{n.label}</span>{n.key==='savings'&&<span className="nav-spark">✦</span>}</button>)}</nav>
      <div className="side-section-label side-section-gap">MY TOOLS</div>
      <nav aria-label="추가 메뉴">{navigation.filter(n=>['insights','budget','trials','monthly','comparison','goals','notifications'].includes(n.key)).map(n=><button key={n.key} className={page===n.key?'active':''} onClick={()=>setPage(n.key)}><Icon name={n.icon}/><span>{n.label}</span></button>)}</nav>
      <div className="side-section-label side-section-gap">SUPPORT</div>
      <nav aria-label="지원 메뉴">{navigation.filter(n=>['activity','support','about'].includes(n.key)||(admin&&n.key==='admin')).map(n=><button key={n.key} className={page===n.key?'active':''} onClick={()=>setPage(n.key)}><Icon name={n.icon}/><span>{n.label}</span></button>)}</nav>
      <div className="side-spacer"/>
      <div className="promo"><Icon name="crown" size={23}/><strong>가벼운 고정비의 시작</strong><p>지금 루틴슬림과 구독 서비스를 관리해보세요.</p><button onClick={()=>setPage('savings')}>무료로 절약하기 →</button></div>
      <nav className="sidebar-bottom" aria-label="설정"><button className={page==='reminder-settings'?'active':''} onClick={()=>setPage('reminder-settings')}><Icon name="settings"/> 설정 및 도움말</button></nav>
      <button className={'user-tile'+(page==='profile'?' active':'')} onClick={()=>setPage('profile')}><span className="avatar">{displayName.charAt(0).toUpperCase()}</span><span className="user-details"><strong>{displayName} 님</strong><small>내 계정 관리</small></span><span className="user-chevron">›</span></button>
    </aside>
    <main className="content"><header className="topbar"><div className="breadcrumbs"><button onClick={()=>setPage('dashboard')} aria-label="홈"><Icon name="home" size={14}/></button><span>›</span><span>{current?.label||'대시보드'}</span></div><div className="top-actions"><span className="status-dot"/><span className="status-text">안정적인 절약 습관</span><button className="top-icon" onClick={()=>setPage('notifications')} aria-label="알림센터"><Icon name="bell" size={17}/>{unread>0&&<span className="feature-unread-badge">{unread>99?'99+':unread}</span>}</button><button className="top-avatar" onClick={()=>setPage('profile')} aria-label="마이페이지">{displayName.charAt(0).toUpperCase()}</button><button className="logout-top" onClick={onLogout}>로그아웃</button></div></header><div className="main-body">{children}</div></main>
  </div>;
}
