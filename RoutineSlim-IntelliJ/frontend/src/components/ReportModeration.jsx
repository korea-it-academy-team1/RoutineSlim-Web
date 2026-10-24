import React,{useEffect,useState} from 'react';
import {request} from '../api/client';
export default function ReportModeration(){
 const [admin,setAdmin]=useState(false),[items,setItems]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function load(){setItems(await request('/api/v1/community/reports'))}
 useEffect(()=>{let active=true;request('/api/v1/community/moderation').then(async value=>{if(active&&value.admin){setAdmin(true);try{const reports=await request('/api/v1/community/reports');if(active)setItems(reports)}catch(e){if(active)setError(e.message)}}}).catch(()=>{});return()=>{active=false}},[]);
 async function resolve(report){setBusy(true);setError('');try{await request(`/api/v1/community/reports/${report.id}/resolve`,{method:'POST'});await load()}catch(e){setError(e.message)}finally{setBusy(false)}}
 async function remove(report){if(!confirm('신고된 게시글과 댓글을 삭제할까요?'))return;setBusy(true);setError('');try{await request(`/api/v1/community/moderation/posts/${report.postId}`,{method:'DELETE'});await load()}catch(e){setError(e.message)}finally{setBusy(false)}}
 if(!admin)return null;
 return <div className="panel"><h2>관리자 신고 관리</h2>{error&&<p className="error" role="alert">{error}</p>}{items.length?items.map(report=><div className="item" key={report.id}><div><b>게시글 #{report.postId}</b><p>{report.reason}</p><p className="muted">신고자: {report.reporterId}</p></div><button className="secondary small" disabled={busy} onClick={()=>resolve(report)}>처리 완료</button><button className="danger small" disabled={busy} onClick={()=>remove(report)}>게시글 삭제</button></div>):<p className="muted">처리할 신고가 없습니다.</p>}</div>
}
