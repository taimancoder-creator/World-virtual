import * as THREE from 'three';
// Vertolyot (vertolyot_4k.html prototipining o'yinga ko'chirilgani). Kvartal ichida to'xtab turadi; yaqinlashib "E / VERTOLYOTGA O'TIRISH" bosiladi.
// UMUMIY: birinchi o'tirgan = uchuvchi, qolganlar (3 tagacha) yo'lovchi bo'lib birga uchadi. Parrak ovozi jonli sintez qilinadi.
// Boshqaruv: joystik oldinga/orqaga = tezlik, o'ng/chap = burilish; SAKRA = ko'tarilish, ZARBA = pasayish (kompyuterda: Space / Shift yoki C ushlab turiladi).
// Tekstura: ULTRA 4096 (telefonda 2048), BALANCED 2048, PERFORMANCE 1024. Model o'yin boshlangach bosqichma-bosqich quriladi (yuklanishda qotmasligi uchun).
// Ishlatish: const HE = initHeli({scene, solids, toast, tone, me, renderer, camera});  HE.flying, HE.yaw, HE.speed, HE.canEnter(), HE.enter(), HE.exit(), HE.fly(dt,ix,iy,keys,pulse), HE.down(), HE.update(dt)
export function initHeli(C){
const T = THREE, {scene, solids, toast, tone, renderer, camera} = C, remotes = C.remotes || new Map(), fin = v => typeof v === 'number' && isFinite(v);
const mob = matchMedia('(pointer:coarse)').matches || innerWidth < 700, GM = (window.GFX && window.GFX.mode) || (mob ? 'balanced' : 'ultra');
const TS = GM === 'ultra' ? (mob ? 2048 : 4096) : GM === 'balanced' ? 2048 : 1024, LITE = mob && GM !== 'ultra';
const S = {x:-20, z:0, yaw:Math.PI/2, alt:0, vy:0, fv:0, om:0, fly:false, ready:false, tAlt:0, role:0, seat:0, enterT:0, rem:null, crew:new Map(), netT:0, hbT:0};   // role: 0 yo'q, 1 uchuvchi, 2 yo'lovchi
const root = new T.Group(), H = new T.Group(), V3 = (x,y,z) => new T.Vector3(x,y,z);
root.position.set(S.x, 0, S.z); root.rotation.y = S.yaw; root.visible = false; scene.add(root); H.position.y = 1.43; root.add(H);
let rot, tailR, disc, beac, strobe, lamps = [], hl = null;   // hl: korpus LOD (uzoqdan past aniqlikdagi geometriya)
const cv=s=>{const c=document.createElement('canvas');c.width=c.height=s;return c};
let sd=2463534242;const rnd=()=>{sd^=sd<<13;sd^=sd>>>17;sd^=sd<<5;return(sd>>>0)/4294967296};
const tex=(c,col)=>{const t=new T.CanvasTexture(c);t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());if(col)t.colorSpace=T.SRGBColorSpace;return t};
const ss=(a,b,x)=>{x=Math.min(1,Math.max(0,(x-a)/(b-a)));return x*x*(3-2*x)};
// fyuzelyaj kesimi (z bo'ylab): burun -> kabina -> dum bumi
const Rf=z=>z>.4?1.02*Math.sqrt(Math.max(0,1-((z-.4)/2)**2))+1e-4:z>-.4?1.02:z>-3?.24+.78*(1-ss(0,1,(-.4-z)/2.6)):.24-.13*((-3-z)/3.4);
const V=z=>(z+6.4)/8.8,Y=(z,S)=>(1-V(z))*S;
function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
function paint(S){   // albedo (4K), bump, korpus alfa-maskasi, oyna alfa-maskasi — hammasi bir xil UV
 const c=cv(S),g=c.getContext('2d'),B=cv(S/2),h=B.getContext('2d'),M=cv(S/2),k=M.getContext('2d'),Q=cv(S/2),q=Q.getContext('2d');
 [h,k,q].forEach(x=>x.scale(.5,.5));
 g.fillStyle='#e9ecef';g.fillRect(0,0,S,S);h.fillStyle='#808080';h.fillRect(0,0,S,S);k.fillStyle='#fff';k.fillRect(0,0,S,S);q.fillStyle='#000';q.fillRect(0,0,S,S);
 g.fillStyle='#7c838a';g.fillRect(0,0,S*.08,S);g.fillRect(S*.92,0,S*.08,S);
 g.fillStyle='#c4202b';[[.13,.18],[.82,.87]].forEach(([a,b])=>g.fillRect(a*S,0,(b-a)*S,S));g.fillRect(0,Y(-5.4,S),S,S);
 g.strokeStyle='rgba(25,29,35,.5)';g.lineWidth=S/1500;h.strokeStyle='#2a2a2a';h.lineWidth=S/1000;
 [1.7,1,.3,-.4,-1.2,-2.2,-3.2,-4.2,-5.2].forEach(z=>{const y=Y(z,S);[g,h].forEach(x=>{x.beginPath();x.moveTo(0,y);x.lineTo(S,y);x.stroke()});
  for(let x=0;x<S;x+=S/150){g.fillStyle='rgba(30,34,40,.45)';g.fillRect(x,y+S/450,S/1800+1,S/1800+1);h.fillStyle='#d8d8d8';h.fillRect(x,y+S/450,S/1500+1,S/1500+1)}});
 [.08,.5,.92,.34,.66].forEach(u=>[g,h].forEach(a=>{a.beginPath();a.moveTo(u*S,0);a.lineTo(u*S,S);a.stroke()}));
 [[.2,.31],[.69,.8]].forEach(([a,b])=>{const y=Y(1.5,S),H=Y(-1.3,S)-y;g.strokeStyle='rgba(20,24,30,.75)';g.lineWidth=S/700;rr(g,a*S,y,(b-a)*S,H,S*.01);g.stroke();
  h.strokeStyle='#1c1c1c';h.lineWidth=S/500;rr(h,a*S,y,(b-a)*S,H,S*.01);h.stroke();g.fillStyle='#9aa0a6';g.fillRect((a+(b-a)*.8)*S,Y(.2,S),S*.012,S*.005)});
 for(let i=0;i<260;i++){const x=rnd()*S,y=rnd()*S;g.strokeStyle='rgba(45,38,30,'+(.03+rnd()*.07)+')';g.lineWidth=S/700*(1+rnd()*3);g.beginPath();g.moveTo(x,y);g.lineTo(x+(rnd()-.5)*S/150,y+S*(.02+rnd()*.09));g.stroke()}
 const so=g.createLinearGradient(0,Y(-1.8,S),0,Y(-3.4,S));so.addColorStop(0,'rgba(20,16,12,.0)');so.addColorStop(.5,'rgba(20,16,12,.3)');so.addColorStop(1,'rgba(20,16,12,0)');g.fillStyle=so;g.fillRect(S*.3,Y(-1.8,S),S*.4,Y(-3.4,S)-Y(-1.8,S));   // dvigatel kuyindisi
 [[.2,.31,1.45,-.35],[.69,.8,1.45,-.35],[.38,.62,2.1,.85]].forEach(([a,b,z1,z0])=>{const x=a*S,y=Y(z1,S),w=(b-a)*S,H=Y(z0,S)-y,p=S*.006;
  g.fillStyle='#14181c';rr(g,x-p,y-p,w+2*p,H+2*p,S*.012);g.fill();g.fillStyle='#1b2128';rr(g,x,y,w,H,S*.01);g.fill();
  k.fillStyle='#000';rr(k,x,y,w,H,S*.01);k.fill();q.fillStyle='#8c8c8c';rr(q,x,y,w,H,S*.01);q.fill()});
 const Lx=S/8.8,txt=(u,z,r,a,s,col,t)=>{g.save();g.translate(u*S,Y(z,S));g.rotate(a);g.scale(Lx/100,S/(2*Math.PI*r)/100);g.fillStyle=col;g.font='bold '+s+'px Arial';g.textAlign='center';g.textBaseline='middle';g.fillText(t,0,0);g.restore()};
 txt(.25,-4.3,.19,Math.PI/2,22,'#2b3036','TAIMAN');txt(.75,-4.3,.19,-Math.PI/2,22,'#2b3036','TAIMAN');
 txt(.155,-1.8,.85,Math.PI/2,13,'#fff','TG-777');txt(.845,-1.8,.85,-Math.PI/2,13,'#fff','TG-777');
 return{map:tex(c,1),bump:tex(B),mask:tex(M),glass:tex(Q)};
}
const glowT=(()=>{const c=cv(64),g=c.getContext('2d'),r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.25,'rgba(255,255,255,.5)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64);return tex(c)})();
function mkEnv(top,hor,gnd,sunC,sunI,sp){const s=new T.Scene(),g=new T.SphereGeometry(50,32,16),p=g.attributes.position,cl=[],c=new T.Color();
 for(let i=0;i<p.count;i++){const y=p.getY(i)/50;y>0?c.copy(hor).lerp(top,Math.pow(y,.6)):c.copy(hor).lerp(gnd,Math.min(1,-y*3));cl.push(c.r,c.g,c.b)}
 g.setAttribute('color',new T.Float32BufferAttribute(cl,3));s.add(new T.Mesh(g,new T.MeshBasicMaterial({vertexColors:true,side:T.BackSide})));
 const mk=(w,h,col,I,pos)=>{const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:new T.Color(col).multiplyScalar(I),side:T.DoubleSide}));m.position.copy(pos);m.lookAt(0,0,0);s.add(m)};
 mk(26,26,sunC,sunI,sp.clone().multiplyScalar(40));mk(40,12,0xffffff,sunI*.25,new T.Vector3(0,40,-10));
 const pm=new T.PMREMGenerator(renderer),t=pm.fromScene(s,.02).texture;pm.dispose();return t}
// ---------- model: 3 bosqichda quriladi ----------
let P = null, env = null;
function stage1(){ P = paint(TS); env = mkEnv(new T.Color(0x4a86c9), new T.Color(0xbfd6e6), new T.Color(0x6b6e66), 0xffffff, 12, V3(.5,.8,.6)); setTimeout(stage2, 60); }
function stage2(){
 const PM = LITE ? T.MeshStandardMaterial : T.MeshPhysicalMaterial, cc = LITE ? {} : {clearcoat:1, clearcoatRoughness:.08};
 const body = new PM(Object.assign({map:P.map, bumpMap:P.bump, bumpScale:1.4, alphaMap:P.mask, alphaTest:.5, side:T.DoubleSide, roughness:.28, metalness:.12}, cc));
 const glass = new PM({color:0x0b1620, roughness:.03, metalness:0, transparent:true, alphaMap:P.glass, depthWrite:false});
 const dark = new T.MeshStandardMaterial({color:0x24272b, roughness:.5, metalness:.5}), red = new PM(Object.assign({color:0xc4202b, roughness:.3, metalness:.1}, cc)),
  white = new PM(Object.assign({color:0xe9ecef, roughness:.3}, cc)), cowl = new T.MeshStandardMaterial({color:0x4b5058, roughness:.4, metalness:.35}), seat = new T.MeshStandardMaterial({color:0x15181b, roughness:.9});
 [body, glass, dark, red, white, cowl].forEach(m => { m.envMap = env; m.envMapIntensity = .9; });
 const add = (g, m, x, y, z, p) => { const o = new T.Mesh(g, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; (p || H).add(o); return o; };
 const pts = []; for(let i = 0; i <= 160; i++){ const z = -6.4 + 8.8*i/160; pts.push(new T.Vector2(Rf(z), z)); }
 const bg = new T.LatheGeometry(pts, mob ? 72 : 128); bg.rotateX(Math.PI/2); bg.scale(.9, 1, 1);
 const bodyM = add(bg, body, 0, 0, 0); const gl = new T.Mesh(bg, glass); gl.scale.set(1.006, 1.006, 1); gl.renderOrder = 2; H.add(gl);
 // LOD: korpus ~41k uchburchak x 3 o'tish (soya, korpus, oyna). Uzoqdan (>75 m) UV si bir xil, lekin ~4x yengil geometriya ishlatiladi
 { const lp = []; for(let i = 0; i <= 80; i++){ const z = -6.4 + 8.8*i/80; lp.push(new T.Vector2(Rf(z), z)); }
   const lo = new T.LatheGeometry(lp, mob ? 36 : 56); lo.rotateX(Math.PI/2); lo.scale(.9, 1, 1); hl = {hi:bg, lo, m:[bodyM, gl], cur:0}; }
 const co = add(new T.SphereGeometry(1, 40, 24), cowl, 0, 1.12, -.35); co.scale.set(.85, .5, 1.5);
 add(new T.BoxGeometry(.6, .18, .12), dark, 0, 1.3, 1.02); add(new T.CylinderGeometry(.09, .12, .5, 16), dark, .18, 1.0, -1.85).rotation.x = 1.4;
 [-.34, .34].forEach(x => { add(new T.BoxGeometry(.46, .12, .46), seat, x, -.4, .55); const b = add(new T.BoxGeometry(.46, .62, .1), seat, x, -.1, .3); b.rotation.x = -.15; });
 add(new T.BoxGeometry(1.3, .3, .18), seat, 0, .25, 1.5); add(new T.BoxGeometry(1.6, .04, 2.8), seat, 0, -.62, 0);
 const fs = new T.Shape(); [[4.9,.15],[6.55,.15],[6.75,1.75],[6.3,1.85],[5.4,.7]].forEach(([a, b], i) => i ? fs.lineTo(a, b) : fs.moveTo(a, b));
 const fg = new T.ExtrudeGeometry(fs, {depth:.1, bevelEnabled:false}); fg.translate(0, 0, -.05); fg.rotateY(Math.PI/2); add(fg, red, 0, 0, 0);
 add(new T.BoxGeometry(2.3, .045, .55), white, 0, .35, -5.4); add(new T.CylinderGeometry(.16, .1, .4, 16), dark, .14, 1.05, -6.35).rotation.z = Math.PI/2;
 const skid = new T.CatmullRomCurve3([V3(0,0,-1.6), V3(0,0,1.2), V3(0,.2,1.9), V3(0,.43,2.15)]);
 [-1.05, 1.05].forEach(x => add(new T.TubeGeometry(skid, 48, .045, 8), dark, x, -1.38, 0));
 [.9, -.6].forEach(z => add(new T.TubeGeometry(new T.CatmullRomCurve3([V3(-1.05,-1.38,z), V3(-.9,-.95,z), V3(0,-.8,z), V3(.9,-.95,z), V3(1.05,-1.38,z)]), 40, .04, 8), dark, 0, 0, 0));
 add(new T.CylinderGeometry(.08, .11, .9, 16), dark, 0, 1.55, .2); rot = new T.Group(); rot.position.set(0, 2.05, .2); H.add(rot);
 add(new T.CylinderGeometry(.22, .22, .18, 24), dark, 0, 0, 0, rot);
 const bl = new T.BoxGeometry(5.1, .035, .36, 24, 1, 1), p = bl.attributes.position, cl = [];
 for(let i = 0; i < p.count; i++){ const x = p.getX(i), t = (x + 2.55)/5.1, tw = -.18*t, y = p.getY(i), z = p.getZ(i)*(1 - .35*t); p.setY(i, y*Math.cos(tw) - z*Math.sin(tw)); p.setZ(i, y*Math.sin(tw) + z*Math.cos(tw));
  cl.push(...(t > .955 ? [.8,.1,.1] : t > .9 ? [.92,.92,.92] : [.1,.1,.11])); }
 bl.setAttribute('color', new T.Float32BufferAttribute(cl, 3)); bl.translate(2.85, 0, 0);
 const bm = new T.MeshStandardMaterial({vertexColors:true, roughness:.5, metalness:.3});
 for(let i = 0; i < 4; i++){ const pv = new T.Group(); pv.rotation.y = i*Math.PI/2; rot.add(pv); const b = new T.Mesh(bl, bm); b.castShadow = true; b.rotation.set(.1, 0, .04); pv.add(b); }
 const dc = cv(256), dg = dc.getContext('2d'), rg = dg.createRadialGradient(128,128,20,128,128,128); rg.addColorStop(0,'rgba(200,205,212,.25)'); rg.addColorStop(.85,'rgba(200,205,212,.32)'); rg.addColorStop(1,'rgba(200,205,212,0)'); dg.fillStyle = rg; dg.fillRect(0, 0, 256, 256);
 disc = new T.Mesh(new T.CircleGeometry(5.5, 48), new T.MeshBasicMaterial({map:tex(dc, 1), transparent:true, opacity:0, depthWrite:false, side:T.DoubleSide})); disc.rotation.x = -Math.PI/2; disc.position.y = .12; rot.add(disc);
 tailR = new T.Group(); tailR.position.set(.3, 1.15, -6.35); H.add(tailR);
 [0, Math.PI/2].forEach(a => { const b = new T.Mesh(new T.BoxGeometry(.04, 1.05, .13), dark); b.rotation.x = a; b.castShadow = true; tailR.add(b); });
 const lamp = (x, y, z, col) => { const m = new T.MeshStandardMaterial({color:col, emissive:col, emissiveIntensity:.3}), o = add(new T.SphereGeometry(.06, 10, 8), m, x, y, z),
   s = new T.Sprite(new T.SpriteMaterial({map:glowT, color:col, blending:T.AdditiveBlending, depthWrite:false, transparent:true, opacity:0})); s.scale.setScalar(.7); s.position.copy(o.position); H.add(s); const l = {m, s}; lamps.push(l); return l; };
 lamp(.88, -.2, 1.0, 0xff2020); lamp(-.88, -.2, 1.0, 0x20ff60); beac = lamp(0, 1.9, -6.3, 0xff2a1a); strobe = lamp(0, .3, -6.75, 0xffffff);
 add(new T.CylinderGeometry(.14, .14, .08, 20), new T.MeshStandardMaterial({color:0xffffee, emissive:0xffffee, emissiveIntensity:.6}), 0, -.98, 1.75).rotation.x = .9;
 setTimeout(stage3, 60);
}
function stage3(){ root.visible = true; try{ renderer.compile(scene, camera); }catch(e){} S.ready = true; }
setTimeout(stage1, 1500);
// ---------- fizika ----------
const me = () => C.me(), floorAt = (x, z) => { let f = window.roadGroundH ? window.roadGroundH(x, z) : 0;
 for(const s of solids){ if(s.top > f && Math.abs(x - s.x) < s.hx + 1 && Math.abs(z - s.z) < s.hz + 1) f = s.top; } return f; };
const blocked = (x, z, a) => { for(const s of solids){ if(s.top > a + .4 && (s.y0 === undefined || s.y0 < a + 3.4) && Math.abs(x - s.x) < s.hx + 1.7 && Math.abs(z - s.z) < s.hz + 1.7) return true; } return false; };
const near = () => { const m = me(); if(!m || !S.ready) return false; const p = m.root.position; return Math.hypot(p.x - S.x, p.z - S.z) < 4.6 && p.y < S.alt + 1.4; };
const shortest = a => Math.atan2(Math.sin(a), Math.cos(a));

// ---------- umumiy vertolyot (tarmoq) ----------
// Birinchi o'tirgan o'yinchi = UCHUVCHI (holatni 10 marta/soniya yuboradi). Keyingilar yoniga kelib o'tirsa = YO'LOVCHI (3 tagacha): ular uchuvchining
// vertolyotini ko'radi va u bilan birga uchadi. Uchuvchi yerga qo'nib tushsa, eng avval o'tirgan yo'lovchi avtomatik uchuvchi bo'ladi.
// Xabarlar (k:'he'): r=1 uchuvchi holati, r=0 uchuvchi tushdi (oxirgi holat bilan), r=2 yo'lovchi (har .5 s), r=3 yo'lovchi tushdi. e = o'tirgan vaqt (kim avval — shu uchuvchi).
const MAXC = 3, myId = () => String(C.myId ? C.myId() : '');
const nameOf = id => { const r = remotes.get(id); return r && r.name ? r.name : 'o‘yinchi'; };
const send = o => { try{ if(C.netSend) C.netSend(Object.assign({k:'he'}, o)); }catch(e){} };
const q2 = (v, n) => +v.toFixed(n), alive = t => performance.now() - t < 2500;
const packPilot = r => ({r, e:S.enterT, x:q2(S.x, 2), y:q2(S.alt, 2), z:q2(S.z, 2), w:q2(S.yaw, 3), v:q2(S.fv, 1), o:q2(S.om, 1), a:q2(H.rotation.x, 3), b:q2(H.rotation.z, 3)});
function crewPurge(){ for(const [id, c] of S.crew) if(!alive(c.t)) S.crew.delete(id); }
function freeSeat(){ crewPurge(); const used = new Set([...S.crew.values()].map(c => c.seat)); for(let i = 1; i <= MAXC; i++) if(!used.has(i)) return i; return 1; }
function pilotGone(d){
 S.rem = null;
 if(d && fin(d.x) && fin(d.z)){ S.x = d.x; S.z = d.z; if(fin(d.y)) S.alt = d.y; if(fin(d.w)) S.yaw = d.w; }
 S.fv = 0; S.vy = 0;
 if(S.role === 2){
  crewPurge(); let first = true; const mid = myId();
  for(const [id, c] of S.crew) if(c.e < S.enterT || (c.e === S.enterT && id < mid)){ first = false; break; }
  if(first){ S.role = 1; S.seat = 0; S.netT = 0; S.tAlt = S.alt; toast('Siz endi uchuvchisiz'); send(packPilot(1)); }
 }
}
function onNet(id, d){
 if(!d || typeof d !== 'object') return;
 const r = d.r | 0, now = performance.now();
 if(r === 1){
  if(!fin(d.x) || !fin(d.y) || !fin(d.z)) return;
  const e = fin(d.e) ? d.e : 0;
  if(S.role === 1){   // ikki kishi bir vaqtda o'tirib qoldi: avval o'tirgan uchuvchi bo'lib qoladi
   if(e < S.enterT || (e === S.enterT && id < myId())){ S.role = 2; S.rem = null; S.seat = freeSeat(); S.hbT = 0; toast('Uchuvchi: ' + nameOf(id) + ' (u birinchi o‘tirgan)'); }
   else return;
  }
  if(S.rem && S.rem.id !== id && alive(S.rem.t) && S.rem.e <= e) return;
  S.rem = {id, t:now, e, x:d.x, y:d.y, z:d.z, w:fin(d.w) ? d.w : 0, v:fin(d.v) ? d.v : 0, o:fin(d.o) ? d.o : 0, a:fin(d.a) ? d.a : 0, b:fin(d.b) ? d.b : 0};
 }else if(r === 0){
  if(S.rem && S.rem.id === id) pilotGone(d);
  else if(!S.rem && !S.fly && fin(d.x) && fin(d.z)){ S.x = d.x; S.z = d.z; if(fin(d.y)) S.alt = d.y; if(fin(d.w)) S.yaw = d.w; }
 }else if(r === 2){ if(fin(d.s)) S.crew.set(id, {seat:d.s | 0, e:fin(d.e) ? d.e : 0, t:now}); }
 else if(r === 3) S.crew.delete(id);
}
// boshqa o'yinchilarning personajlari vertolyot ichida: ular yerda turgandek ko'rinmasin
const hidden = new Set(); let hidT = 0;
function crewTick(dt){
 hidT -= dt; if(hidT > 0) return; hidT = .25; crewPurge();
 const ids = new Set(); if(S.rem) ids.add(S.rem.id); for(const id of S.crew.keys()) ids.add(id);
 for(const id of ids){ const r = remotes.get(id); if(r && r.char){ r.char.hid = true; hidden.add(id); } }
 for(const id of hidden) if(!ids.has(id)){ const r = remotes.get(id); if(r && r.char) r.char.hid = false; hidden.delete(id); }
}

// ---------- OVOZ: parrak ovozi (WebAudio, jonli sintez, fayl kerak emas) ----------
// 1) pichirlash: 4 ta parrak urilishi (past "vup-vup", aylanish tezligiga qarab tezlashadi/pasayadi)  2) parrak shamoli (qo'ng'ir shovqin)
// 3) turbina hushtagi  4) dum parragi g'ulduragi. Hajm masofaga qarab pasayadi, kabina ichida yumshoqroq; chap/o'ng kanalga kamera tomoniga qarab taqsimlanadi.
let TB = null, SN = null, sndAcc = 0; const _fw = new T.Vector3();
function sbuf(ctx){
 if(TB && TB.ctx === ctx) return TB;
 const sr = ctx.sampleRate, L = Math.round(sr*.5), th = ctx.createBuffer(1, L, sr), d = th.getChannelData(0), nl = (sr*1.5)|0, wn = ctx.createBuffer(1, nl, sr), nd = wn.getChannelData(0);
 let br = 0; for(let i = 0; i < nl; i++){ const w = Math.random()*2 - 1; br = (br + .02*w)/1.02; nd[i] = Math.max(-1, Math.min(1, br*3.5 + w*.12)); }
 const len = Math.round(sr*.14);
 for(let k = 0; k < 4; k++){
  const t0 = Math.round(k*L/4 + (k & 1 ? sr*.008 : 0)); let lp = 0;
  for(let i = 0; i < len; i++){
   const t = i/sr, env = Math.exp(-t*34)*(1 - Math.exp(-t*700)), ph = 50*t + 70*(1 - Math.exp(-t*30))/30, n = Math.random()*2 - 1; lp += (n - lp)*.3;
   d[(t0 + i) % L] += (Math.sin(6.2832*ph) + .55*Math.sin(12.5664*ph) + .3*Math.sin(18.8496*ph))*env*.6 + lp*Math.exp(-t*110)*.5;
  }
 }
 let mx = 0; for(let i = 0; i < L; i++) mx = Math.max(mx, Math.abs(d[i])); if(mx > 0) for(let i = 0; i < L; i++) d[i] /= mx*1.1;
 return TB = {ctx, th, wn};
}
function sndOn(a){
 const ctx = a.ctx, B = sbuf(ctx), n = {ctx, src:[]}, mk = (type, f, Q) => { const x = ctx.createBiquadFilter(); x.type = type; x.frequency.value = f; if(Q) x.Q.value = Q; return x; }, gn = v => { const g = ctx.createGain(); g.gain.value = v; return g; };
 n.bus = gn(0); n.lp = mk('lowpass', 7000, .4); n.bus.connect(n.lp);
 if(ctx.createStereoPanner){ n.pan = ctx.createStereoPanner(); n.lp.connect(n.pan); n.pan.connect(a.out); } else n.lp.connect(a.out);
 n.th = ctx.createBufferSource(); n.th.buffer = B.th; n.th.loop = true; n.th.playbackRate.value = .12; n.gTh = gn(.6); n.th.connect(n.gTh); n.gTh.connect(n.bus);
 n.wn = ctx.createBufferSource(); n.wn.buffer = B.wn; n.wn.loop = true; n.bp = mk('bandpass', 500, .7); n.gWn = gn(0); n.wn.connect(n.bp); n.bp.connect(n.gWn); n.gWn.connect(n.bus);
 n.tu = ctx.createOscillator(); n.tu.type = 'sawtooth'; n.tu.frequency.value = 500; n.tf = mk('bandpass', 1200, 10); n.gTu = gn(0); n.tu.connect(n.tf); n.tf.connect(n.gTu); n.gTu.connect(n.bus);
 n.tr = ctx.createOscillator(); n.tr.type = 'sawtooth'; n.tr.frequency.value = 70; n.trf = mk('bandpass', 420, 1.5); n.am = gn(.5); n.gTr = gn(0);
 n.lf = ctx.createOscillator(); n.lf.frequency.value = 6; n.lg = gn(.5); n.lf.connect(n.lg); n.lg.connect(n.am.gain);
 n.tr.connect(n.trf); n.trf.connect(n.am); n.am.connect(n.gTr); n.gTr.connect(n.bus);
 n.src = [n.th, n.wn, n.tu, n.tr, n.lf]; n.src.forEach(s => s.start()); return n;
}
function sndOff(n){ try{ n.bus.gain.setTargetAtTime(0, n.ctx.currentTime, .06); }catch(e){} setTimeout(() => { n.src.forEach(s => { try{ s.stop(); }catch(e){} }); try{ n.bus.disconnect(); }catch(e){} }, 400); }
function sndSet(n, om, att, pan, inside, load){
 const f = Math.min(1, om/44), t = n.ctx.currentTime, k = .07;
 n.th.playbackRate.setTargetAtTime(.12 + .88*f, t, k); n.gTh.gain.setTargetAtTime(.45 + .4*load, t, k);
 n.gWn.gain.setTargetAtTime(.55*f*f*(1 + .4*load), t, k); n.bp.frequency.setTargetAtTime(360 + 700*f, t, k);
 n.tu.frequency.setTargetAtTime(500 + 1100*f, t, k); n.tf.frequency.setTargetAtTime(500 + 1100*f, t, k); n.gTu.gain.setTargetAtTime(.05*f*f, t, k);
 n.tr.frequency.setTargetAtTime(70 + 90*f, t, k); n.lf.frequency.setTargetAtTime(6 + 20*f, t, k); n.gTr.gain.setTargetAtTime(.1*f*f, t, k);
 n.lp.frequency.setTargetAtTime(inside ? 2400 : 1500 + 5500*att, t, k);
 n.bus.gain.setTargetAtTime(.8*att*Math.min(1, f*1.6), t, k);
 if(n.pan) n.pan.pan.setTargetAtTime(pan, t, .1);
}
function sndTick(dt){
 sndAcc -= dt; if(sndAcc > 0) return; sndAcc = .05;
 try{
  const a = C.audio && C.audio(), cp = camera && camera.position;
  const dx = cp ? S.x - cp.x : 0, dz = cp ? S.z - cp.z : 0, d = Math.hypot(dx, dz), inside = S.fly, att = inside ? 1 : d > 260 ? 0 : 1/(1 + (d/22)*(d/22));
  if(a && S.om > .8 && att > .01){
   if(!SN || SN.ctx !== a.ctx) SN = sndOn(a);
   let pan = 0; if(!inside && d > .5){ camera.getWorldDirection(_fw); pan = Math.max(-1, Math.min(1, (dx*(-_fw.z) + dz*_fw.x)/d))*.85; }
   sndSet(SN, S.om, att, pan, inside, Math.min(1, Math.abs(S.fv)/36)*.6 + (S.vy > 1 ? .3 : 0));
  }else if(SN){ sndOff(SN); SN = null; }
 }catch(e){ if(SN){ try{ sndOff(SN); }catch(_){} SN = null; } }
}

// ---------- kirish / chiqish / uchish ----------
function enter(){
 const m = me(); if(!m || !S.ready) return;
 const taken = !!(S.rem && alive(S.rem.t));
 if(taken){ crewPurge(); if(S.crew.size >= MAXC){ toast('Vertolyot to‘la'); return; } }
 S.fly = true; S.enterT = Date.now(); m.root.visible = false; m.vx = m.vz = m.vy = 0; m.speed = 0; m.moving = m.running = false;
 if(taken){ S.role = 2; S.seat = freeSeat(); S.hbT = .5; send({r:2, e:S.enterT, s:S.seat}); toast('Yo‘lovchisiz · uchuvchi: ' + nameOf(S.rem.id) + ' · tushish uchun qo‘nishini kuting'); }
 else{ S.role = 1; S.rem = null; S.netT = 0; toast('Siz uchuvchisiz · SAKRA = ko‘tarilish · ZARBA = pasayish · do‘stlar yoningizga o‘tira oladi'); }
 tone(180, .2, .15, 'sawtooth', 90);
}
function leave(place){
 const m = me(); if(!m) return; const was = S.role;
 S.fly = false; S.role = 0; S.fv = 0; S.vy = 0; m.root.visible = true; m.vx = m.vz = m.vy = 0;
 if(place){ const side = was === 2 ? -1 : 1, off = 3.6 + (was === 2 ? (S.seat - 1)*.7 : 0);
  m.root.position.set(S.x + side*Math.cos(S.yaw)*off, floorAt(S.x, S.z), S.z - side*Math.sin(S.yaw)*off); }
 if(was === 1) send(packPilot(0)); else if(was === 2) send({r:3});
 S.seat = 0; tone(160, .1, .12, 'square', 260);
}
function exit(){ if(S.alt - floorAt(S.x, S.z) > .8){ toast('Avval yerga qo‘ning'); return; } leave(true); }
const up = () => { if(S.role === 1) S.tAlt = Math.min(110, S.alt + 8); }, down = () => { if(S.role === 1) S.tAlt = Math.max(0, S.alt - 8); };
function fly(dt, ix, iy, keys, pulse){
 const m = me(), p = m.root.position;
 if(Math.hypot(p.x - S.x, p.z - S.z) > 8){ if(S.role === 1) S.alt = floorAt(S.x, S.z); leave(false); return false; }   // portal/teleport: tushib qolamiz
 if(m.lock > 0 && S.alt - floorAt(S.x, S.z) < 1){ leave(true); return false; }
 if(S.role === 2){   // yo'lovchi: vertolyot bilan birga uchadi, boshqarmaydi
  p.set(S.x, S.alt, S.z); m.root.rotation.y = S.yaw; m.vx = m.vz = m.vy = 0; m.speed = 0; m.grounded = true; m.moving = m.running = m.air = false; m.jc = 0;
  return true;
 }
 if(pulse) up(); if(keys.Space) S.tAlt = Math.min(110, S.tAlt + 14*dt); if(keys.ShiftLeft || keys.KeyC) S.tAlt = Math.max(0, S.tAlt - 14*dt);
 const fl = floorAt(S.x, S.z), ready = S.om > 38;
 S.tAlt = Math.max(S.tAlt, fl);
 const want = ready ? Math.max(-9, Math.min(10, (S.tAlt - S.alt)*1.2)) : (S.alt > fl ? -3 : 0);
 S.vy += (want - S.vy)*(1 - Math.exp(-dt*2.2)); S.alt = Math.max(fl, S.alt + S.vy*dt); if(S.alt <= fl && S.vy < 0) S.vy = 0;
 const air = S.alt - fl > .5;
 S.yaw -= ix*(air ? 1.15 : 0)*dt;
 S.fv += ((air ? (iy > 0 ? iy*36 : iy*12) : 0) - S.fv)*(1 - Math.exp(-dt*(air ? .9 : 3)));
 const dx = Math.sin(S.yaw)*S.fv*dt, dz = Math.cos(S.yaw)*S.fv*dt;
 if(!blocked(S.x + dx, S.z + dz, S.alt)){ S.x = Math.max(-300, Math.min(300, S.x + dx)); S.z = Math.max(-300, Math.min(300, S.z + dz)); }
 else if(Math.abs(S.fv) > 6){ S.fv *= -.35; toast('Bino bilan to‘qnashdingiz'); }
 p.set(S.x, S.alt, S.z); m.root.rotation.y = S.yaw; m.vx = m.vz = m.vy = 0; m.speed = 0; m.grounded = true; m.moving = m.running = m.air = false; m.jc = 0;
 H.rotation.x += (.14*Math.max(0, S.fv)/36 - H.rotation.x)*(1 - Math.exp(-dt*3)); H.rotation.z += (ix*.16*(air ? 1 : 0) - H.rotation.z)*(1 - Math.exp(-dt*3));
 return true;
}
function update(dt){
 if(!S.ready) return;
 // tarmoq: uchuvchi holatini yuboradi, yo'lovchi "men shu yerdaman" deb turadi
 if(S.role === 1){ S.netT -= dt; if(S.netT <= 0){ S.netT = .1; send(packPilot(1)); } }
 else if(S.role === 2){ S.hbT -= dt; if(S.hbT <= 0){ S.hbT = .5; send({r:2, e:S.enterT, s:S.seat}); } }
 // boshqa o'yinchi uchayotgan bo'lsa, vertolyot uning holatiga silliq ergashadi
 if(S.rem && S.role !== 1){
  const R = S.rem;
  if(!alive(R.t)) pilotGone(null);
  else{
   if(Math.hypot(R.x - S.x, R.z - S.z) > 25){ S.x = R.x; S.z = R.z; S.alt = R.y; S.yaw = R.w; }
   const k = 1 - Math.exp(-dt*10); S.x += (R.x - S.x)*k; S.alt += (R.y - S.alt)*k; S.z += (R.z - S.z)*k; S.yaw += shortest(R.w - S.yaw)*k; S.fv = R.v;
   H.rotation.x += (R.a - H.rotation.x)*k; H.rotation.z += (R.b - H.rotation.z)*k;
  }
 }
 crewTick(dt);
 const m = me(); if(m){ const p = m.root.position; root.visible = S.fly || Math.hypot(p.x - S.x, p.z - S.z) < 230; }
 sndTick(dt);
 if(!root.visible) return;
 if(hl && camera){ const d = Math.hypot(camera.position.x - S.x, camera.position.z - S.z), want = hl.cur ? (d > 55 ? 1 : 0) : (d > 75 ? 1 : 0);
   if(want !== hl.cur){ hl.cur = want; const g = want ? hl.lo : hl.hi; hl.m[0].geometry = g; hl.m[1].geometry = g; } }
 const tgt = S.role === 1 ? 44 : S.rem ? S.rem.o : S.role === 2 ? 44 : 0;
 S.om += (tgt - S.om)*(1 - Math.exp(-dt*(S.role === 1 ? .45 : S.rem ? 5 : S.fly ? .45 : .25)));
 if(!S.fly && !S.rem && S.alt > floorAt(S.x, S.z)){ S.alt = Math.max(floorAt(S.x, S.z), S.alt - 6*dt); }
 root.position.set(S.x, S.alt, S.z); root.rotation.y = S.yaw;
 if(!S.fly && !S.rem){ H.rotation.x *= .9; H.rotation.z *= .9; }
 if(S.om > .3){ rot.rotation.y += S.om*dt; tailR.rotation.x += S.om*5.2*dt; disc.material.opacity = Math.min(.9, Math.max(0, (S.om - 14)/26)); } else disc.material.opacity = 0;
 const t = performance.now()/1000, bk = (t % 1) < .12 ? 1 : 0, f = (t*1.5) % 1, sk = (f < .07 || (f > .2 && f < .27)) ? 1 : 0;
 lamps.forEach(l => { const v = l === beac ? bk : l === strobe ? sk : 1; l.m.emissiveIntensity = .2 + v*2.5; l.s.material.opacity = v*.45; });
 if((S.fly || S.rem) && S.om > 10) H.position.x = Math.sin(t*37)*.004*S.om/44; else H.position.x = 0;
}
return {update, onNet, enter, exit, fly, down, canEnter:() => !S.fly && near(), get occupied(){ return !S.fly && !!S.rem && alive(S.rem.t); }, get role(){ return S.role; }, get flying(){ return S.fly; }, get yaw(){ return S.yaw; }, get speed(){ return Math.abs(S.fv); }};
}
