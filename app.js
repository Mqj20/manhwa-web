// MQJ MANHWA 4.0 — catalog driven reader
const SOURCES = [
  {id:'olympus', name:'Olympus / Team-X', url:'https://olympustaff.com/'},
  {id:'mesh', name:'MeshManga', url:'https://meshmanga.com/'}
];
const state={items:[],genre:'الكل',query:'',sort:'new',shown:24,source:'all'};
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
function toast(t){const x=$('#toast');x.textContent=t;x.style.display='block';setTimeout(()=>x.style.display='none',2400)}
async function init(){
 try{
  const r=await fetch('catalog.json?'+Date.now(),{cache:'no-store'});
  if(!r.ok) throw new Error('catalog');
  const d=await r.json(); state.items=Array.isArray(d)?d:(d.items||[]);
 }catch(e){state.items=[]}
 render();
}
function filtered(){
 let a=state.items.filter(x=>
  (state.genre==='الكل'||(x.genres||[]).includes(state.genre)) &&
  (state.source==='all'||x.source===state.source) &&
  (String(x.title||'').toLowerCase().includes(state.query.toLowerCase()))
 );
 if(state.sort==='az') a.sort((a,b)=>String(a.title).localeCompare(String(b.title),'ar'));
 else a.sort((a,b)=>String(b.updated||'').localeCompare(String(a.updated||'')));
 return a;
}
function render(){
 const a=filtered(), list=a.slice(0,state.shown);
 $('#grid').innerHTML=list.map(card).join('') || `<div class="pageNote">${state.items.length?'لا توجد نتائج مطابقة.':'لا توجد بيانات بعد. شغّل مزامنة GitHub Actions لإحضار الكتالوج.'}</div>`;
 $('#more').style.display=a.length>state.shown?'block':'none';
 $('#count').textContent=state.items.length;
}
function card(x){return `<article class="card" data-id="${esc(x.id)}"><div class="cover">${x.cover?`<img src="${esc(x.cover)}" loading="lazy" alt="">`:'📚'}<span class="sourceBadge">${esc(x.sourceName||'MQJ')}</span></div><div class="info"><h3>${esc(x.title)}</h3><div class="meta">${esc((x.genres||[]).slice(0,2).join(' • '))}</div><div class="chaptersCount">${Number(x.chapterCount||x.chapters?.length||0)} فصل</div></div></article>`}
document.addEventListener('click',e=>{
 const c=e.target.closest('.card'); if(c) openDetail(c.dataset.id);
 const chip=e.target.closest('.chip'); if(chip){document.querySelectorAll('.chip').forEach(x=>x.classList.remove('active'));chip.classList.add('active');state.genre=chip.dataset.genre;state.shown=24;render()}
 const src=e.target.closest('[data-source]'); if(src){document.querySelectorAll('[data-source]').forEach(x=>x.classList.remove('active'));src.classList.add('active');state.source=src.dataset.source;state.shown=24;render()}
 if(e.target.matches('[data-close]'))e.target.closest('.modal').classList.remove('show');
});
$('#search').oninput=e=>{state.query=e.target.value.trim();state.shown=24;render()};
$('#sort').onchange=e=>{state.sort=e.target.value;render()};
$('#more').onclick=()=>{state.shown+=24;render()};
function openDetail(id){
 const x=state.items.find(a=>a.id===id);if(!x)return;
 const chapters=[...(x.chapters||[])].sort((a,b)=>Number(b.number)-Number(a.number));
 $('#detail').innerHTML=`<div class="detailHero">${x.cover?`<img src="${esc(x.cover)}" alt="">`:'📚'}<div><p class="eyebrow">${esc(x.sourceName||'MQJ')}</p><h2 class="detailTitle">${esc(x.title)}</h2><p class="muted">${esc(x.description||'لا يوجد وصف.')}</p><div>${(x.genres||[]).map(g=>`<span class="chip" style="display:inline-block;margin:3px">${esc(g)}</span>`).join('')}</div></div></div><h3>الفصول (${chapters.length})</h3><div class="chapterList">${chapters.map(c=>`<div class="chapter"><span>الفصل ${esc(c.number)}${c.title?` — ${esc(c.title)}`:''}</span><button class="primary" data-read="1" data-id="${esc(x.id)}" data-ch="${esc(c.id)}">قراءة</button></div>`).join('')||"<p class='muted'>لا توجد فصول.</p>"}</div>`;
 $('#detailModal').classList.add('show');
}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-read]');if(!b)return;
 const x=state.items.find(a=>a.id===b.dataset.id), ch=(x?.chapters||[]).find(c=>c.id===b.dataset.ch);if(!x||!ch)return;
 $('#detailModal').classList.remove('show'); $('#reader').classList.add('show'); $('#readerTitle').textContent=x.title; $('#readerChapter').textContent='الفصل '+ch.number;
 const pages=ch.pages||[]; const p=$('#pages');
 p.innerHTML=pages.map((u,i)=>`<img class="page" loading="lazy" src="${esc(u)}" alt="صفحة ${i+1}" referrerpolicy="no-referrer">`).join('') || '<div class="pageNote">لا توجد صفحات لهذا الفصل.</div>';
});
$('#closeReader').onclick=()=>$('#reader').classList.remove('show');
$('#loginBtn').onclick=()=>$('#loginModal').classList.add('show');
$('#doLogin').onclick=()=>{const u=$('#username').value.trim();if(!u)return toast('اكتب اسم المستخدم');localStorage.setItem('mqj_user',u);$('#loginModal').classList.remove('show');toast('تم تسجيل الدخول محلياً')};
$('#adultBtn').onclick=()=>$('#adultModal').classList.add('show');
$('#enterAdult').onclick=()=>toast('قسم البالغين غير مفعّل في هذه النسخة.');
init();
