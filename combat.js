import * as THREE from 'three';
// Jang (HP, godmode), botlar, 4/4 jamoaviy jang arenasi, juftlik va sevgi izhori. main.js dan initCombat(C) bilan ulanadi.
export function initCombat(C){
 const {scene,P,toast,tone,netSend,remotes,myInfo,addScore,houses,body}=C,R=Math.random,bots=[],tm=new Map(),dead=new Set(),$=id=>document.getElementById(id);
 const AX=70,AZ=0,OUCH=['Nega urasiz?','Tinchlik bo‘lsin!','Men tinch odamman!','Ey, to‘xtang!'],NAMES=['Azizbek','Malika','Sardor','Nigora'],HOME=[[9,10],[-9,11],[14,3],[-14,2]];
 let asking=false,hpW='',hp=100,team='',fight=null,partner='',lastAtk='',loveCd=0,dateCd=0,tT=0,sT=0,cT=0;
 const fl=new THREE.Mesh(new THREE.CircleGeometry(15,40),new THREE.MeshStandardMaterial({color:0x4a2a3a,roughness:.8}));fl.rotation.x=-Math.PI/2;fl.position.set(AX,.05,AZ);fl.receiveShadow=true;scene.add(fl);
 const rg=new THREE.Mesh(new THREE.RingGeometry(14.4,15,48),new THREE.MeshBasicMaterial({color:0xff4d6d}));rg.rotation.x=-Math.PI/2;rg.position.set(AX,.06,AZ);scene.add(rg);
 const pn=document.createElement('div');pn.id='fight';pn.innerHTML='<b>Jang va juftlik</b><small id="fs"></small>';document.body.appendChild(pn);
 const btn=(t,f)=>{const b=document.createElement('button');b.textContent=t;b.onclick=f;pn.appendChild(b)};
 btn('A jamoa',()=>setTeam('A'));btn('B jamoa',()=>setTeam('B'));btn('Jamoadan chiqish',()=>setTeam(''));btn('Jangni boshlash',startFight);btn('Sevgi izhori',love);
 $('fightBtn').onclick=e=>{e.stopPropagation();$('shop').classList.remove('open');pn.classList.toggle('open')};
 const me=()=>C.me();
 function setTeam(t){if(fight)return;team=t;netSend({k:'t',tm:t});toast(t?'Jamoa '+t+' ga qo‘shildingiz':'Jamoadan chiqdingiz')}
 function startFight(){
  if(fight||!team)return toast('Avval jamoa tanlang');
  const m=[[myInfo.id,team]];tm.forEach((t,id)=>{if(remotes.has(id)&&t)m.push([id,t])});
  if(!m.some(x=>x[1]==='A')||!m.some(x=>x[1]==='B'))return toast('Ikkala jamoada ham o‘yinchi kerak');
  netSend({k:'f',a:'start',m});begin(m)}
 function begin(m){
  const m0=me();if(fight||!m0||!m.some(x=>x[0]===myInfo.id))return;
  fight=new Map(m);dead.clear();const i=m.filter(x=>x[1]===team).findIndex(x=>x[0]===myInfo.id);
  m0.root.position.set(team==='A'?AX-12:AX+12,0,AZ+(i-1.5)*3);m0.vx=m0.vz=0;hp=100;m0.lock=0;toast('Jang boshlandi! O‘limgacha');tone(200,.4,.2,'sawtooth',600)}
 function check(){
  if(!fight)return;const a={A:0,B:0};fight.forEach((t,id)=>{if(!dead.has(id))a[t]++});if(a.A&&a.B)return;
  const w=a.A?'A':a.B?'B':'';if(w&&team===w){addScore(300);toast(''+w+' jamoa g‘olib! +300 bal')}else toast(w?'Jang tugadi: '+w+' jamoa yutdi':'Durang');
  fight=null;dead.clear();hp=100;const m0=me();if(m0){m0.lock=0;m0.root.position.set(0,0,14);m0.vx=m0.vz=0}}
 function dmg(n,from){const m0=me();if(!m0||P.god||hp<=0||!n)return;hp=Math.max(0,hp-n);lastAtk=from||'';tone(140,.15,.2,'sawtooth',60);if(hp<=0)die()}
 function die(){
  const m0=me();if(lastAtk)netSend({k:'f',a:'kill',to:lastAtk});toast('Siz yiqildingiz');m0.lockN='dead';
  if(fight){dead.add(myInfo.id);netSend({k:'f',a:'dead'});m0.lock=m0.lockT=9999;check()}
  else{m0.lock=m0.lockT=3;setTimeout(()=>{m0.root.position.set(0,0,14);m0.vx=m0.vz=0;hp=100;m0.lock=0},3000)}}
 function hit(){
  const m0=me();if(!m0)return;const k=m0.pk==='k'?14:8;
  setTimeout(()=>{const p=m0.root.position,r=m0.root.rotation.y,fx=Math.sin(r),fz=Math.cos(r),
   near=q=>{const dx=q.x-p.x,dz=q.z-p.z,d=Math.hypot(dx,dz);return d<2.3&&(dx*fx+dz*fz)/(d||1)>.2&&Math.abs(q.y-p.y)<1.6};
   remotes.forEach((r2,id)=>{if(r2.char&&near(r2.char.root.position)&&!(fight&&fight.get(id)===fight.get(myInfo.id)))netSend({k:'h',to:id,d:k})});
   bots.forEach(b=>{if(b.cd<=0&&near(b.c.root.position)){b.cd=.6;addScore(-10);C.pop?C.pop('−10 bal',b.c,'#ff8a8a'):toast('Botni urdingiz: -10 bal');b.c.say(OUCH[Math.floor(R()*OUCH.length)]);if(C.crime&&!fight)C.crime('Odamni urdingiz')}});
   if(C.cops)C.cops().forEach(q=>{if(near(q.root.position)&&C.crime&&!fight)C.crime('Politsiyaga qarshilik')});
   if(C.crime&&!fight)remotes.forEach(r2=>{if(r2.char&&near(r2.char.root.position))C.crime('Odamni urdingiz')})},180)}
 function love(){
  const m0=me();if(!m0||loveCd>0)return;let best=null,bd=6;
  remotes.forEach((r,id)=>{if(!r.char)return;const d=r.char.root.position.distanceTo(m0.root.position);if(d<bd){bd=d;best=id}});
  if(!best)return toast('Yaqinda o‘yinchi yo‘q');loveCd=15;netSend({k:'lv',a:'ask',to:best});m0.say('Seni yoqtiraman');toast('Sevgi izhori yuborildi')}
 function pair(id){partner=id;addScore(100);toast('Siz juft bo‘ldingiz! +100 bal');const m0=me();if(m0)m0.say('Juftmiz')}
 function onNet(id,d){
  const mid=myInfo.id;
  if(d.k==='t'){if(d.tm==='A'||d.tm==='B')tm.set(id,d.tm);else tm.delete(id)}
  else if(d.k==='f'){
   if(d.a==='start'&&Array.isArray(d.m)&&d.m.length<=16)begin(d.m.filter(x=>Array.isArray(x)&&typeof x[0]==='string'&&(x[1]==='A'||x[1]==='B')));
   else if(d.a==='dead'&&fight&&fight.has(id)){dead.add(id);check()}
   else if(d.a==='kill'&&d.to===mid){addScore(50);toast('Raqibni yiqitdingiz: +50 bal')}}
  else if(d.k==='h'){if(d.to!==mid)return;if(fight&&(!fight.has(id)||fight.get(id)===fight.get(mid)))return;dmg(Math.min(20,Math.max(0,+d.d||0)),id)}
  else if(d.k==='lv'&&d.to===mid){
   if(d.a==='ask'&&!partner&&!asking){asking=true;C.ask(((remotes.get(id)||{}).name||'O‘yinchi')+' sizga sevgi izhor qildi. Juft bo‘lasizmi?').then(ok=>{asking=false;if(ok&&!partner){pair(id);netSend({k:'lv',a:'yes',to:id})}})}
   else if(d.a==='yes')pair(id)}}
 function start(){
  if(bots.length)return;
  HOME.forEach((h,i)=>setTimeout(()=>C.spawn(i%C.nChars,NAMES[i],h[0],h[1]).then(c=>bots.push({c,hx:h[0],hz:h[1],tg:null,w:1+R()*5,cd:0,t:0})).catch(()=>{}),i*250))}
 function update(dt){
  const m0=me();if(!m0)return;const p=m0.root.position;loveCd-=dt;dateCd-=dt;tT-=dt;sT-=dt;cT-=dt;
  {const w=hp+'%';if(w!==hpW){hpW=w;$('hp').firstChild.style.width=w}}
  for(const b of bots){const c=b.c;b.cd-=dt;let tx=0,tz=0,has=false;
   if(b.w>0)b.w-=dt;else{if(!b.tg){const a=R()*6.283,r=R()*3;b.tg={x:b.hx+Math.cos(a)*r,z:b.hz+Math.sin(a)*r};b.t=0}
    const dx=b.tg.x-c.root.position.x,dz=b.tg.z-c.root.position.z,d=Math.hypot(dx,dz);b.t+=dt;
    if(d<.4||b.t>6){b.tg=null;b.w=3+R()*6}else{has=true;tx=dx/d*1.4;tz=dz/d*1.4}}
   body(c,tx,tz,has,dt,false);if(c.root.visible||c.bt>0)c.update(dt)}
  if(tT<=0){tT=3;if(team&&!fight)netSend({k:'t',tm:team});if(partner&&!remotes.has(partner))partner=''}
  if(fight&&cT<=0){cT=1;fight.forEach((t,id)=>{if(id!==myInfo.id&&!remotes.has(id))dead.add(id)});check()}
  if(sT<=0){sT=.5;$('fs').textContent=(team?'Jamoa: '+team:'Jamoasiz')+(fight?' · JANG!':'')+(partner?' · '+((remotes.get(partner)||{}).name||''):'')}
  if(partner&&dateCd<=0){const r=remotes.get(partner);
   if(r&&r.char)for(const h of houses){const ins=(x,z)=>Math.abs(x-h.hx)<4.4&&Math.abs(z-h.hz)<4.4;
    if(ins(p.x,p.z)&&ins(r.tx,r.tz)){dateCd=300;addScore(150);toast('Juftingiz bilan uydasiz! +150 bal');m0.say('Juftmiz');break}}}
 }
 return{update,hit,onNet,bots,start};
}
