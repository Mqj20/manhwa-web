const state={items:[],genre:"الكل",query:"",sort:"new",shown:24};
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
function toast(t){const x=$("#toast");x.textContent=t;x.style.display="block";setTimeout(()=>x.style.display="none",2200)}
async function init(){
 try{const r=await fetch("data/catalog.json");state.items=await r.json()}catch(e){state.items=[]}
 render();
}
function filtered(){
 let a=state.items.filter(x=>(state.genre==="الكل"||x.genres?.includes(state.genre))&&x.title.includes(state.query));
 if(state.sort==="az")a.sort((a,b)=>a.title.localeCompare(b.title,"ar")); else a.sort((a,b)=>(b.updated||"").localeCompare(a.updated||""));
 return a;
}
function render(){
 const a=filtered(), list=a.slice(0,state.shown);
 $("#grid").innerHTML=list.map(card).join("")||'<div class="pageNote">لا توجد نتائج.</div>';
 $("#more").style.display=a.length>state.shown?"block":"none";
}
function card(x){return `<article class="card" data-id="${esc(x.id)}"><div class="cover">${x.cover?"<img src='"+esc(x.cover)+"' style='width:100%;height:100%;object-fit:cover'>":"📚"}</div><div class="info"><h3>${esc(x.title)}</h3><div class="meta">${esc((x.genres||[]).slice(0,2).join(" • "))}</div></div></article>`}
document.addEventListener("click",e=>{
 const c=e.target.closest(".card");if(c)openDetail(c.dataset.id);
 const chip=e.target.closest(".chip");if(chip){document.querySelectorAll(".chip").forEach(x=>x.classList.remove("active"));chip.classList.add("active");state.genre=chip.dataset.genre;state.shown=24;render()}
 if(e.target.matches("[data-close]"))e.target.closest(".modal").classList.remove("show");
});
$("#search").oninput=e=>{state.query=e.target.value.trim();state.shown=24;render()};
$("#sort").onchange=e=>{state.sort=e.target.value;render()};
$("#more").onclick=()=>{state.shown+=24;render()};
function openDetail(id){
 const x=state.items.find(a=>a.id===id);if(!x)return;
 $("#detail").innerHTML=`<p class="eyebrow">MQJ MANHWA</p><h2 class="detailTitle">${esc(x.title)}</h2><p class="muted">${esc(x.description||"لا يوجد وصف.")}</p><div>${(x.genres||[]).map(g=>`<span class="chip" style="display:inline-block;margin:3px">${esc(g)}</span>`).join("")}</div><h3>الفصول</h3><div>${(x.chapters||[]).map(c=>`<div class="chapter"><span>الفصل ${esc(c.number)}</span><button class="primary" data-read="${esc(x.id)}" data-ch="${esc(c.id)}">قراءة</button></div>`).join("")||"<p class='muted'>أضف بيانات الفصول في data/chapters.</p>"}</div>`;
 $("#detailModal").classList.add("show");
}
document.addEventListener("click",async e=>{
 const b=e.target.closest("[data-read]");if(!b)return;
 const id=b.dataset.read,ch=b.dataset.ch; const x=state.items.find(a=>a.id===id);
 $("#detailModal").classList.remove("show");$("#reader").classList.add("show");$("#readerTitle").textContent=x.title;$("#readerChapter").textContent="الفصل "+ch;
 const p=$("#pages");p.innerHTML='<div class="pageNote">جاري تحميل الفصل…</div>';
 try{const r=await fetch("data/chapters/"+encodeURIComponent(ch)+".json");const d=await r.json();p.innerHTML=(d.pages||[]).map(u=>`<img class="page" loading="lazy" src="${esc(u)}" alt="">`).join("")||'<div class="pageNote">لا توجد صفحات لهذا الفصل.</div>'}
 catch{p.innerHTML='<div class="pageNote">لم تتم إضافة صفحات هذا الفصل بعد.</div>'}
});
$("#closeReader").onclick=()=>$("#reader").classList.remove("show");
$("#loginBtn").onclick=()=>$("#loginModal").classList.add("show");
$("#doLogin").onclick=()=>{const u=$("#username").value.trim();if(!u)return toast("اكتب اسم المستخدم");localStorage.setItem("mqj_user",u);$("#loginModal").classList.remove("show");toast("تم تسجيل الدخول محلياً")};
$("#adultBtn").onclick=()=>$("#adultModal").classList.add("show");
$("#enterAdult").onclick=()=>{
 const age=$("#age18").checked,user=localStorage.getItem("mqj_user");
 if(!age)return toast("يجب تأكيد العمر");
 if(!user){$("#adultModal").classList.remove("show");$("#loginModal").classList.add("show");toast("سجّل الدخول أولاً");return}
 $("#adultModal").classList.remove("show");toast("تم فتح بوابة قسم البالغين");
};
init();
