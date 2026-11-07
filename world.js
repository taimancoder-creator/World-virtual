import * as THREE from 'three';
import {makeTree,buildHouse,buildBank,buildBar,buildPark} from './buildings.js';
import {buildRoads} from './roads.js';
// o't olib tashlandi (grass.js ishlatilmaydi)
// Dunyo: landshaft, binolar, orollar, portal, uy, poyga, shahar qurish. main.js dan initWorld(C) bilan ulanadi.
export function initWorld(C){
 const {scene,solids,mat,put,slab,toast,tone,P,netSend,addScore,addMoney}=C,R=Math.random,coins=[],spin=[],pads=[],clouds=[];
 let wT=0,cd=0,asking=false,syncT=0;const bk=new Set(),mine=[];const houses=[];
 const flat=(w,d,c,x,z,y=.03)=>{const m=put(new THREE.Mesh(new THREE.PlaneGeometry(w,d),mat(c)),x,y,z,false);m.rotation.x=-Math.PI/2;m.receiveShadow=true;return m};
 const glow=(c,o)=>new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:o,blending:THREE.AdditiveBlending,depthWrite:false});
 const lbl=(t,col,w,x,y,z)=>{const cn=document.createElement('canvas');cn.width=512;cn.height=128;const g=cn.getContext('2d');g.textAlign='center';g.font='bold 72px system-ui';g.shadowColor=col;g.shadowBlur=20;g.fillStyle=col;g.fillText(t,256,90);
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cn),transparent:true,depthWrite:false,fog:false}));s.scale.set(w,w/4,1);s.position.set(x,y,z);scene.add(s)};
 const ticks=[],K={scene,solids,slab,flat,mat,houses,coin:(...a)=>coin(...a),spots:C.spots||[],bars:[],tick:ticks,beat:C.beat||(()=>performance.now()/484),view:C.view,onBar:C.onBar,spawn:C.spawn,dancers:[],cam:C.cam},tree=makeTree(K);
 const coinGeo=new THREE.CylinderGeometry(.3,.3,.07,20),coinMat=mat(0xf2b92a,0x9a6a00,.6);   // barcha tangalar umumiy geometriya va material ishlatadi (avval har biriga alohida)
 const coin=(x,y,z,v=25,s=5)=>{const m=put(new THREE.Mesh(coinGeo,coinMat),x,y,z,false);m.rotation.x=Math.PI/2;coins.push({m,x,y,z,v,s,t:0})};
 // landshaft: yo'llar, suv, tog'lar, bulutlar, daraxtlar
 const roads=buildRoads(scene,ticks,matchMedia('(pointer:coarse)').matches||innerWidth<700,solids,C.cam); // 3D yo'l modeli (roads.js)
 // eski ko'lmak olib tashlandi (yangi shaharda parklar va ko'lmaklar bor)
 const cgeo=new THREE.SphereGeometry(1,8,6),cmat=new THREE.MeshBasicMaterial({color:0xffffff,fog:false});
 for(let i=0;i<8;i++){const g=new THREE.Group();for(let j=0;j<3;j++){const b=new THREE.Mesh(cgeo,cmat);b.scale.setScalar(4+R()*3);b.position.set(j*5-5,R()*2,R()*3);b.scale.y*=.55;g.add(b)}g.position.set((R()-.5)*300,105+R()*30,(R()-.5)*300);g.scale.setScalar(2.4);scene.add(g);clouds.push(g)}
 // eski 4 ta tasodifiy daraxt olib tashlandi (shahar daraxtlari roads.js da)
 // 4 ta baland bino
 const wc=document.createElement('canvas');wc.width=64;wc.height=128;const wx=wc.getContext('2d');wx.fillStyle='#26303f';wx.fillRect(0,0,64,128);
 for(let i=0;i<4;i++)for(let j=0;j<8;j++){wx.fillStyle=R()<.6?'#ffd98a':'#35506e';wx.fillRect(6+i*15,6+j*15,9,9)}
 const wt=new THREE.CanvasTexture(wc);wt.colorSpace=THREE.SRGBColorSpace;wt.wrapS=wt.wrapT=THREE.RepeatWrapping; // eski 4 ta baland bino olib tashlandi (yangi shahar binolari roads.js da)
 // yashirin tangalar
 for(let i=0;i<30;i++){const a=R()*6.283,r=16+R()*62;coin(Math.cos(a)*r,.9,Math.sin(a)*r)}
 // katapulta (sakrash maydoni) va uchar orollar: yagona yo'l -> eng baland olmos
 const island=(x,z,top,c)=>{slab(x,z,7,7,1.2,mat(0x5b8f5a),top-1.2);const k=put(new THREE.Mesh(new THREE.ConeGeometry(3.6,5,12),mat(c)),x,top-3.7,z);k.rotation.x=Math.PI};
 const pad=(x,y,z,vy)=>{put(new THREE.Mesh(new THREE.CylinderGeometry(1.3,1.5,.25,24),mat(0xffe27a,0xffd24a,1.6)),x,y+.12,z,false);
  const r=put(new THREE.Mesh(new THREE.TorusGeometry(1.1,.07,6,24),glow(0xffffaa,.8)),x,y+.45,z,false);r.rotation.x=Math.PI/2;spin.push({m:r,s:3});pads.push({x,y,z,vy})};
 island(30,26,5,0x6b5a4a);island(30,38,14,0x6b4a5a);
 pad(30,0,17.5,Math.sqrt(2*24*6.4));pad(30,5,28.3,Math.sqrt(2*24*10.4));
 coin(28.5,6,26,60,10);coin(31.5,6,26,60,10);
 const gem=put(new THREE.Mesh(new THREE.OctahedronGeometry(.7),new THREE.MeshStandardMaterial({color:0xe0115f,emissive:0xe0115f,emissiveIntensity:.8,roughness:.1})),30,15.8,38,false);gem.scale.y=1.5;spin.push({m:gem,s:2,y:1});
 lbl('+500','#ff62d5',4,30,19,38);let gemT=0;
 // portal + topishmoq
 let solved=false,pcd=0;const ptl=(x,z,c)=>{const g=new THREE.Group();g.position.set(x,2.2,z);g.add(new THREE.Mesh(new THREE.TorusGeometry(1.9,.2,12,40),mat(c,c,1.6)),new THREE.Mesh(new THREE.CircleGeometry(1.8,28),glow(c,.45)));scene.add(g);spin.push({m:g,s:1,y:1})};
 ptl(-20,15,0xff62d5);ptl(70,-66,0x5be7a9);lbl('PORTAL','#ff62d5',3,-20,5,15);lbl('QAYTISH','#5be7a9',3,70,5,-66);
 for(let i=0;i<8;i++)coin(58+R()*24,.9,-82+R()*24,40,8);
 put(new THREE.Mesh(new THREE.BoxGeometry(1.4,2.4,1.4),mat(0x7d8ea0,0x335577,.6)),-28,1.2,12);lbl('TOPISHMOQ','#ffe27a',3.4,-28,3.4,12);
 const RID=['Ko‘p bo‘lsa, shuncha kam ko‘rasiz. U nima?',['qorongulik','qorongilik','zulmat','qorongu']];
 const house=(hx,hz,secret)=>buildHouse(K,hx,hz,secret);
 const H1=house(-25,-30,true);
 // poyga: start, to'siqlar, finish
 const SX=-40,SZ=-12,FZ=-80;let race=null,rcd=0;
 // yo'l chetidagi o't olib tashlandi
 const rg=put(new THREE.Mesh(new THREE.RingGeometry(2,2.6,32),glow(0x00eaff,.8)),SX,.06,SZ,false);rg.rotation.x=-Math.PI/2;lbl('START (2 kishi)','#00eaff',4.6,SX,3.2,SZ);
 for(let k=0;k<6;k++)slab(SX+(k%2?4:-4),-20-k*10,4,2,1.2+(k%3)*.1,mat(0xffb347));
 put(new THREE.Mesh(new THREE.BoxGeometry(14,.3,.3),mat(0xffffff)),SX,4.5,FZ);put(new THREE.Mesh(new THREE.BoxGeometry(.4,4.5,.4),mat(0xffffff)),SX-7,2.25,FZ);put(new THREE.Mesh(new THREE.BoxGeometry(.4,4.5,.4),mat(0xffffff)),SX+7,2.25,FZ);lbl('FINISH','#ffffff',5,SX,6,FZ);
 const startRace=()=>{race={t:0};toast('Poyga boshlandi! Finishga yuguring')};
 // shahar qurish va maqomlar
 const built=[],mk=[
  {n:'Park',p:500,f:(x,z)=>buildPark(K,x,z)},
  {n:'Bar',p:1500,bar:true,f:(x,z)=>buildBar(K,x,z)},
  {n:'Bank',p:5000,f:(x,z)=>buildBank(K,x,z)},
  {n:'Uy',p:3000,f:(x,z)=>{house(x,z,false)}},
  {n:'Boy maqomi',p:2000,rank:'BOY'},{n:'VIP maqomi',p:10000,rank:'VIP'}];
 const sh=document.createElement('div');sh.id='shop';sh.innerHTML='<b>Shahar qurish</b>';document.body.appendChild(sh);
 let barBtn=null;mk.forEach((it,i)=>{const b=document.createElement('button');if(it.bar){b.style.display='none';barBtn=b}b.innerHTML='<span>'+it.n+'</span><em>$'+it.p.toLocaleString('en-US')+'</em>';b.onclick=()=>buy(i);sh.appendChild(b)});
 document.getElementById('shopBtn').onclick=e=>{e.stopPropagation();document.getElementById('fight').classList.remove('open');sh.classList.toggle('open')};
 function buy(i){const it=mk[i],me=C.me();if(!me)return;
  if(it.bar&&!P.barKey)return toast('Bar sotib olish yopiq');
  if(it.bar&&built.filter(v=>v===1).length>=3)return toast('Barlar soni chegaralangan');
  if(!P.inf&&P.money<it.p)return toast('Pul yetmaydi');
  if(it.rank){if(P.hacker)return toast('Sizda eng yuqori maqom bor');addMoney(-it.p);P.rank=it.rank;me.setRank(it.rank);toast('Yangi maqom: '+it.rank);tone(880,.2,.1,'triangle',1320);return}
  if(built.length>=20)return toast('Shahar to‘ldi');
  const p=me.root.position,r=me.root.rotation.y,x=Math.round(p.x+Math.sin(r)*10),z=Math.round(p.z+Math.cos(r)*10);
  if(Math.abs(x)>80||Math.abs(z)>80)return toast('Bu yerga qurib bo‘lmaydi');
  addMoney(-it.p);addScore(it.p/50);built.push(i);it.f(x,z);bk.add(i+':'+x+':'+z);const bm={k:'b',t:i,x,z,h:it.bar?C.barTok:0};mine.push(bm);netSend(bm);toast('Qurildi: '+it.n);tone(520,.2,.1,'triangle',900)}
 function onNet(id,d){
  if(d.k==='b'){const it=mk[d.t|0];const key=(d.t|0)+':'+d.x+':'+d.z;if(it&&it.f&&isFinite(d.x)&&isFinite(d.z)&&Math.abs(d.x)<=80&&Math.abs(d.z)<=80&&built.length<20&&!bk.has(key)){
    if(it.bar&&(d.h!==C.barTok||built.filter(v=>v===1).length>=3))return;
    bk.add(key);built.push(d.t|0);it.f(d.x,d.z)}return}
  if(d.to!==C.myInfo.id&&d.a!=='win')return;const rn=(C.remotes.get(id)||{}).name||'O‘yinchi';
  if(d.a==='ask'&&!race&&!asking){asking=true;C.ask(rn+' sizni poygaga chorlayapti.').then(ok=>{asking=false;if(ok&&!race){startRace();netSend({k:'r',a:'yes',to:id})}})}
  else if(d.a==='yes')startRace();
  else if(d.a==='win'&&race){race=null;toast(''+rn+' g‘olib bo‘ldi')}}
 function update(dt){
  wT+=dt;cd-=dt;pcd-=dt;rcd-=dt;
  for(const s of spin){if(s.y)s.m.rotation.y+=s.s*dt;else s.m.rotation.z+=s.s*dt}
  for(const c of clouds){c.position.x+=dt*1.5;if(c.position.x>170)c.position.x=-170}
  const me=C.me();if(!me)return;const p=me.root.position;
  // bar: ichkariga kirganda tashqi qobiq (devor+tom) yashiriladi; uzoqdagi barlarda animatsiya o'chadi
  for(const b of K.bars){b.near=Math.abs(p.x-b.x)<b.hw+45&&Math.abs(p.z-b.z)<b.hd+45;b.vis=b.ins||!C.view||C.view(b.x,2,b.z,11);const ins=Math.abs(p.x-b.x)<b.hw-.3&&Math.abs(p.z-b.z)<b.hd-.3&&p.y<3;if(ins!==b.ins){b.ins=ins;for(const m of b.shell)m.visible=!ins}
   // ichkarida kamera devor orqasiga o'tib qolsa, o'sha devor yashiriladi (personaj ko'rinib tursin)
   if(b.ins&&C.cam){const c=C.cam();b.wh=1;for(const w of b.walls){const o=w.ax==='x'?(c.x-b.x)*w.sg:(c.z-b.z)*w.sg;w.m.visible=o<(w.ax==='x'?b.hw:b.hd)-.5}}
   else if(b.wh){b.wh=0;for(const w of b.walls)w.m.visible=true}}
  for(const f of ticks)f(dt,wT);
  coins.forEach((c,i)=>{if(c.t>0){c.t-=dt;c.m.visible=c.t<=0;return}c.m.rotation.z+=dt*3;c.m.position.y=c.y+Math.sin(wT*2+i)*.08;
   if(Math.hypot(c.x-p.x,c.z-p.z)<1.2&&Math.abs(c.y-p.y-1)<1.6){c.t=30;c.m.visible=false;addMoney(c.v);addScore(c.s);tone(1318,.07,.09,'square');setTimeout(()=>tone(1760,.14,.09,'square'),60)}});
  gemT-=dt;gem.visible=gemT<=0;if(gem.visible&&Math.hypot(30-p.x,38-p.z)<1.4&&Math.abs(15.8-p.y-1)<1.6){gemT=60;addScore(500);addMoney(1000);toast('Eng baland olmos! +500 bal');tone(660,.3,.12,'triangle',1320)}
  for(const q of pads)if(Math.hypot(q.x-p.x,q.z-p.z)<1.3&&Math.abs(p.y-q.y)<.5&&cd<=0){me.vy=q.vy;me.grounded=false;me.jc=1;cd=.6;tone(300,.35,.18,'square',1100)}
  if(pcd<=0){
   if(Math.hypot(-28-p.x,12-p.z)<2.2&&!solved){pcd=20;C.input(RID[0]).then(v=>{if(v===null)return;const a=String(v).toLowerCase().replace(/[‘’ʻ`'’]/g,'').trim();if(RID[1].includes(a)){solved=true;addScore(200);toast('To‘g‘ri! Portal ochildi (+200)')}else toast('Noto‘g‘ri javob')})}
   else if(Math.hypot(-20-p.x,15-p.z)<1.8&&p.y<3){if(solved){p.set(66,0,-62);me.vy=0;pcd=2;tone(200,.5,.18,'sawtooth',1400)}else{pcd=3;toast('Avval topishmoqni yeching')}}
   else if(Math.hypot(70-p.x,-66-p.z)<1.8&&p.y<3){p.set(-18,0,13);me.vy=0;pcd=2;tone(200,.5,.18,'sawtooth',1400)}}
  // uy: tom yopinchig'i, sirli tugma
  for(const h of houses){const ins=Math.abs(p.x-h.hx)<4.4&&Math.abs(p.z-h.hz)<4.4&&p.y<3;h.roof.visible=!ins;
   if(!h.open&&Math.hypot(p.x-(h.hx+3),p.z-(h.hz-3))<.9&&p.y<.3){h.open=true;h.pm.visible=false;solids.splice(solids.indexOf(h.ps),1);toast('Sirli yo‘l ochildi!');tone(180,.4,.2,'sawtooth',500)}}
  // poyga
  if(race){race.t+=dt;if(p.z<FZ&&Math.abs(p.x-SX)<8){addScore(300);addMoney(500);toast('Siz g‘olibsiz! +300 bal');netSend({k:'r',a:'win'});race=null}else if(race.t>150)race=null}
  else if(rcd<=0&&Math.hypot(p.x-SX,p.z-SZ)<3)for(const[id,r]of C.remotes)if(Math.hypot(r.tx-SX,r.tz-SZ)<3&&C.myInfo.id<id){rcd=20;netSend({k:'r',a:'ask',to:id});toast('Poyga taklifi yuborildi…');break}
 }
 function sync(){const n=performance.now();if(!mine.length||n-syncT<4000)return;syncT=n;mine.forEach((m,i)=>setTimeout(()=>netSend(m),i*300))}
 return{update,onNet,houses,bars:K.bars,dancers:K.dancers,sync,unlockBar:()=>{if(barBtn)barBtn.style.display=''}};
}
