import React,{useEffect,useState} from 'react';
import {useAccountSetting} from '../hooks/useAccountSetting';
import {request,money} from '../api/client';
export default function Budget({user}){
  const setting=useAccountSetting(user,'budget','');const budget=setting.value,setBudget=setting.setValue;
  const [expense,setExpense]=useState(null),[error,setError]=useState(''),[saved,setSaved]=useState(false);
  useEffect(()=>{request('/api/v1/expenses/summary').then(setExpense).catch(e=>setError(e.message))},[]);
  const limit=Number(budget)||0,spent=Number(expense?.monthlyTotal||0),remaining=limit-spent;
  async function save(e){e.preventDefault();if(!setting.ready||budget!==''&&(!Number.isFinite(limit)||limit<0))return;try{await setting.save();setSaved(true);setError('')}catch(e){setError(e.message)}}
  return <section><div className="heading"><h1>월 지출 예산</h1><p>월간 구독 예상 지출을 목표 예산과 비교합니다.</p></div>{(error||setting.error)&&<p className="error" role="alert">{error||setting.error}</p>}<div className="panel"><h2>나의 월 구독 예산</h2><form className="budget-form" onSubmit={save}><label>예산 금액 (원)<input aria-label="월 구독 예산" type="number" min="0" step="1" value={budget} onChange={e=>{setBudget(e.target.value);setSaved(false)}} placeholder="예: 100000"/></label><button className="primary" disabled={!setting.ready}>예산 저장</button></form>{saved&&<p role="status">계정에 예산을 저장했습니다.</p>}<p className="muted">예산은 계정에 저장되어 다른 기기에서도 확인할 수 있습니다.</p></div>{expense&&<div className="panel"><h2>이번 달 예산 현황</h2><div className="stats budget-stats"><article className="stat"><span>월 예상 구독료</span><strong>{money(spent)}</strong></article><article className="stat"><span>설정 예산</span><strong>{budget!==''?money(limit):'미설정'}</strong></article><article className="stat"><span>남은 예산</span><strong>{budget!==''?money(Math.max(0,remaining)):'-'}</strong></article></div>{budget!==''&&<><progress className="budget-progress" max={Math.max(limit,1)} value={Math.min(spent,Math.max(limit,1))}/>{spent>limit?<p className="error" role="alert">예산을 {money(spent-limit)} 초과했습니다. 불필요한 구독을 검토해 보세요.</p>:<p className="muted">예산 내에서 구독을 관리하고 있습니다.</p>}</>}</div>}</section>
}
