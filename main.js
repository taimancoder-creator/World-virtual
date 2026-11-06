import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import {initWorld} from './world.js';
import {initCombat} from './combat.js';
import {initUI} from './ui.js';
import {buildTerrain,buildSky,groundMat} from './terrain.js';import {initBoqiy,BQZ} from './boqiy.js';
const $=id=>document.getElementById(id);
// personajlar: rasm (img) va model (model) nomi bir xil. Yangi personaj qo'shish uchun shu ro'yxatga qator qo'shing
const CHARS=[
 {id:'adam',name:'Adam',model:'adam.glb',img:'adam.png'},
 {id:'eva',name:'Eva',model:'eva.glb',img:'eva.png'},
 {id:'jack',name:'Jack',model:'jack.glb',img:'jack.png'},
 {id:'lily',name:'Lily',model:'lily.glb',img:'lily.png'},
 {id:'max',name:'Max',model:'max.glb',img:'max.png'},
 {id:'mia',name:'Mia',model:'mia.glb',img:'mia.png'}];
const WALK=2.8,RUN=5.4,RUN_AT=.88,G=24,JUMP=9;
const clamp=THREE.MathUtils.clamp;
let scene,camera,renderer,clock,sun,me=null,started=false,jumpReq=false;
const loader=new GLTFLoader(),gltfCache=new Map();
const myInfo={name:'Taiman',g:0,id:Math.random().toString(36).slice(2,10)};
const remotes=new Map(),joyDir=new THREE.Vector2(),keys={};
let cameraAngle=0,cameraPitch=.2,camPointer=null,lastX=0,lastY=0,joystickPointer=null,stepT=0,camDist=3.8,camK=1;
const MIN_DT=0;   // kadr chegarasi (ms): 0 = cheklovsiz (120 Hz da 120 FPS). Qizisa 10 qiling: 120 Hz da ~60 FPS bo'ladi
const MOB=matchMedia('(pointer:coarse)').matches||innerWidth<700||/Android|iPhone|iPad|iPod/i.test(navigator.userAgent),PRmin=1,SHM=MOB?768:1024;
let fpsN=0,fpsT=0,PRmax=MOB?1.25:1.5,PRcur=PRmax,fpsBad=0,warmT=0,lastT=0;
const applyPR=()=>renderer.setPixelRatio(Math.min(devicePixelRatio,PRcur));
const _SL=new THREE.Vector3(30,60,20),_SR=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),_SL).normalize(),_SU=new THREE.Vector3().crossVectors(_SL,_SR).normalize(),_ST=32/(MOB?768:1024),_bp=new THREE.Vector3();
const _fr=new THREE.Frustum(),_pm=new THREE.Matrix4(),_sp=new THREE.Sphere(new THREE.Vector3(),3.2);
const _vs=new THREE.Sphere(new THREE.Vector3(),1),inView=(x,y,z,r)=>{_vs.center.set(x,y,z);_vs.radius=r;return _fr.intersectsSphere(_vs)};
const shortest=a=>Math.atan2(Math.sin(a),Math.cos(a));
/* ===== OVOZ ===== */
let AC=null,master=null,noiseBuf=null,muted=false,OUT=null,TAT=0,musicG=null;
function initAudio(){
 if(AC){if(AC.state==='suspended')AC.resume();return}
 const A=window.AudioContext||window.webkitAudioContext;if(!A)return;
 AC=new A();master=AC.createGain();master.gain.value=.9;master.connect(AC.destination);musicG=AC.createGain();musicG.gain.value=0;musicG.connect(master);
 noiseBuf=AC.createBuffer(1,AC.sampleRate*.4,AC.sampleRate);
 const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
}
function noise(type,freq,dur,vol,to){
 if(!AC||vol<.01)return;const t=AC.currentTime+TAT,s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();
 s.buffer=noiseBuf;s.playbackRate.value=.8+Math.random()*.4;f.type=type;f.frequency.setValueAtTime(freq,t);
 if(to)f.frequency.exponentialRampToValueAtTime(to,t+dur);
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
 s.connect(f);f.connect(g);g.connect(OUT||master);s.start(t);s.stop(t+dur+.02);
}
function tone(f0,dur,vol,type,f1){
 if(!AC)return;const t=AC.currentTime+TAT,o=AC.createOscillator(),g=AC.createGain();
 o.type=type||'sine';o.frequency.setValueAtTime(f0,t);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+dur);
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
 o.connect(g);g.connect(OUT||master);o.start(t);o.stop(t+dur+.02);
}
const sndStep=(v=1)=>{noise('lowpass',420+Math.random()*300,.14,.45*v);tone(70+Math.random()*20,.1,.12*v,'sine',45)};
const sndSend=()=>tone(660,.12,.12,'triangle',880);
const sndMsg=()=>{tone(740,.1,.12,'triangle');setTimeout(()=>tone(990,.14,.12,'triangle'),90)};
const sndPunch=()=>{noise('bandpass',1800,.18,.5,300);setTimeout(()=>{noise('lowpass',300,.15,.7);tone(110,.15,.3,'sine',50)},90)};
const sndPtt=()=>tone(1100,.06,.1,'square');
const sndJump=n=>tone(n>1?520:380,.18,.14,'sine',n>1?950:650);
const sndLand=()=>{noise('lowpass',300,.12,.5);tone(90,.1,.2,'sine',50)};
/* ===== MUSIQA: bar yaqinida chalinadi (124 BPM, kod bilan hosil qilinadi). Raqqosalar va o'yinchi shu soat bo'yicha raqsga tushadi ===== */
// O'Z MUSIQANGIZ: index.html bilan bir papkadagi music.mp3. Raqs shu musiqaning tempiga moslanadi.
// MP3_BPM = qo'shig'ingiz BPM i (raqs zarbga tushishi uchun), MP3_OFFSET = birinchi zarb necha soniyada boshlanadi.
const MP3_BPM=124,MP3_OFFSET=0;
let mp3=null,mp3Fail=false;
try{mp3=new Audio('music.mp3');mp3.loop=true;mp3.preload='auto';mp3.volume=0;mp3.addEventListener('error',()=>{mp3Fail=true})}catch(e){mp3Fail=true}
const mp3Ok=()=>mp3&&!mp3Fail;
const SPB=60/MP3_BPM,beatNow=()=>mp3Ok()&&mp3.readyState>1?(mp3.currentTime-MP3_OFFSET)/SPB:Date.now()/(SPB*1000),
 MCH=[[55,220,261.63,329.63],[43.65,174.61,220,261.63],[65.41,261.63,329.63,392],[49,196,246.94,293.66]],MU={step:-1};
function playStep(n,at){
 const s=n%16,c=MCH[Math.floor(n/16)%4];OUT=musicG;TAT=Math.max(0,at-AC.currentTime);
 try{
  if(s%4===0)tone(165,.26,.85,'sine',42);                                  // kik
  if(s===4||s===12)noise('bandpass',1700,.16,.4,900);                      // chapak
  if(s%4===2)noise('highpass',7500,.08,.22);else if(s%2===1)noise('highpass',9000,.03,.09);   // tarelka
  if(s%4===2)tone(c[0],.2,.5,'triangle');                                  // bas
  if(s===0||s===6||s===10)for(let i=1;i<4;i++)tone(c[i],.2,.045,'square'); // akkord
  if(s%2===0)tone(c[1+((s>>1)%3)]*2,.11,.035,'triangle');                  // arpedjio
  if(n%64===0)noise('highpass',5000,.9,.2,9000);
 }finally{OUT=null;TAT=0}
}
function musicVol(){
 if(!W||!me||!W.bars.length)return 0;const p=me.root.position;let v=0;
 for(const b of W.bars){if(b.ins)return 1;const d=Math.hypot(Math.max(0,Math.abs(p.x-b.x)-b.hw),Math.max(0,Math.abs(p.z-b.z)-b.hd)),t=Math.max(0,1-d/34);v=Math.max(v,t*t*.55)}
 return v;
}
function musicTick(){
 if(!started||document.hidden)return;
 if(mp3Ok()){
  const v=muted?0:musicVol(),tg=Math.min(1,v*.9);mp3.volume=Math.min(1,Math.max(0,mp3.volume+(tg-mp3.volume)*.5));
  if(v<.02){if(!mp3.paused)mp3.pause()}else if(mp3.paused)mp3.play().catch(()=>{});
  return;
 }
 if(!AC||!musicG)return;
 const v=muted?0:musicVol();musicG.gain.setTargetAtTime(v*.9,AC.currentTime,.15);
 if(v<.02){MU.step=-1;return}
 const now=Date.now(),ms=SPB*1000/4;
 if(MU.step<0||MU.step*ms<now-250)MU.step=Math.ceil(now/ms);
 while(MU.step*ms<now+350){playStep(MU.step,AC.currentTime+Math.max(0,(MU.step*ms-now)/1000));MU.step++}
}
setInterval(musicTick,90);
document.addEventListener('pointerdown',initAudio);
$('mute').onclick=e=>{e.stopPropagation();initAudio();muted=!muted;if(master)master.gain.value=muted?0:.9;$('mute').classList.toggle('m',muted)};
/* ===== BAL, MAQOM, FILTR, CHEAT OYNASI ===== */
const BARH=8975501052642359;   // Bar ochish kodi hashi (terminalga yoziladi)
const OWNER=8091422672336268;   // Taimanhacker paroli (cyrb53 hash)
function cyrb53(s){let h1=0xdeadbeef,h2=0x41c6ce57;for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);h1=Math.imul(h1^c,2654435761);h2=Math.imul(h2^c,1597334677)}h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);return 4294967296*(2097151&h2)+(h1>>>0)}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let SV={};try{SV=JSON.parse(localStorage.getItem('tg_p')||'{}')}catch(e){}
const P={score:+SV.score||0,money:+SV.money||0,rank:SV.rank||'',inf:false,god:false,hacker:false};
const fmtM=n=>P.inf?'∞':'$'+Math.floor(n).toLocaleString('en-US');
function addScore(n){P.score=Math.max(0,Math.round(P.score+n))}
function addMoney(n){if(!P.inf)P.money=Math.max(0,P.money+n)}
function toast(t){const e=$('toast');e.textContent=t;e.classList.add('show');clearTimeout(toast.h);toast.h=setTimeout(()=>e.classList.remove('show'),2600)}
// haqoratli so'zlar filtri: ro'yxatni xohlagancha kengaytiring
const BAD=['dnx','sikaman','onenami','gandon','qanjiq','jalab','haromi','qotoq'];
const normT=t=>t.toLowerCase().replace(/[‘’ʻ`´']/g,'').replace(/[^a-zа-яё]/g,'');
const isBad=t=>{const n=normT(t);return BAD.some(w=>w&&n.includes(w))};
function topPlayer(){let b={n:myInfo.name,s:P.score,m:1};remotes.forEach(r=>{if((r.score||0)>b.s)b={n:r.name,s:r.score||0}});return b}
function updHud(){const b=topPlayer(),h='<span>BAL</span> '+P.score+' <span>·</span> <span>PUL</span> '+fmtM(P.money)+'<br><span>TOP</span> '+esc(b.n)+' <span>'+b.s+'</span>';if(h!==updHud.l){updHud.l=h;$('hud').innerHTML=h}}
function saveP(){try{const s=JSON.stringify({score:P.score,money:P.inf?(+SV.money||0):P.money,rank:P.hacker?'':P.rank});if(s===saveP.l)return;saveP.l=s;localStorage.setItem('tg_p',s)}catch(e){}}
const T={open:false};
function tprint(t,c){const d=document.createElement('div');d.textContent=t;if(c)d.style.color=c;const o=$('tout');o.appendChild(d);while(o.children.length>5)o.firstChild.remove()}
function termToggle(o){T.open=o===undefined?!T.open:o;$('term').style.display=T.open?'flex':'none';$('tout').innerHTML='';$('tin').value='';if(T.open)setTimeout(()=>$('tin').focus(),50);else $('tin').blur()}
function termRun(l){
 const a=l.trim().split(/\s+/),c=(a[0]||'').toLowerCase(),A=a.slice(1),n=parseFloat(A[0]),ok=()=>tprint('OK','#5be7a9'),no=()=>tprint('ERR','#ff8080');
 if(!c)return;$('tout').innerHTML='';
 if(cyrb53(c)===BARH){P.barKey=true;if(W)W.unlockBar();ok();toast('Bar sotib olish ochildi');return}
 const cmd=(c==='inf'&&(A[0]||'').toLowerCase()==='money')?'infmoney':c;
 switch(cmd){
  case 'infmoney':P.inf=!P.inf;ok();break;
  case 'godmode':P.god=!P.god;ok();break;case 'boqiy':if(me){me.root.position.set(0,0,BQZ+20);me.vy=0;ok()}else no();break;
  case 'taimanhacker':if(cyrb53(A.join(' '))===OWNER){P.hacker=true;P.rank='TAIMANHACKER';if(me)me.setRank(P.rank);ok()}else no();break;
  case 'score':case 'money':if(!P.hacker||!isFinite(n)){no();break}if(c==='score')P.score=Math.max(0,Math.round(n));else P.money=Math.max(0,n);ok();break;
  default:no()}
}
$('tin').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'){const v=$('tin').value;$('tin').value='';termRun(v)}else if(e.key==='Escape')termToggle(false)});
{let n=0,t0=0;$('logo').addEventListener('pointerdown',()=>{const t=performance.now();n=t-t0<1000?n+1:1;t0=t;if(n>=5){n=0;termToggle()}})}
addEventListener('keydown',e=>{if(e.code==='Backquote'&&e.target.tagName!=='INPUT'){e.preventDefault();termToggle()}});
setInterval(()=>{if(started){updHud();saveP()}},500);
/* ===== SAHNA (bo'sh: faqat yer + yorug'lik. Keyin shu yerga to'ldiramiz) ===== */
const solids=[];   // to'siqlar/platformalar: {x,z,hx,hz,top,y0}
const spots=[];    // o'tirish/yotish/raqs joylari: {t:'sit'|'lie'|'dance',x,z,r,y,yaw,out}
const mat=(c,e,i)=>new THREE.MeshStandardMaterial({color:c,roughness:.7,emissive:e||0,emissiveIntensity:i||0});
function put(m,x,y,z,sh){m.position.set(x,y,z);if(sh!==false)m.castShadow=m.receiveShadow=true;scene.add(m);return m}
function slab(x,z,w,d,h,m,y0=0){const q=put(new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m),x,y0+h/2,z);solids.push({x,z,hx:w/2,hz:d/2,top:y0+h,y0});return q}
function buildWorld(){
 const gr=put(new THREE.Mesh(new THREE.PlaneGeometry(700,700),groundMat()),0,0,0,false);gr.rotation.x=-Math.PI/2;gr.receiveShadow=true;
 buildTerrain(scene);buildSky(scene);
}
let W=null,CB=null,BQ=null;
function updateWorld(dt){
 if(W)W.update(dt);if(CB)CB.update(dt);if(BQ)BQ.update(dt);
 // === bu yerga sahna animatsiyalari (kun/tun, aylanuvchi obyektlar...) qo'shiladi ===
 if(me){const t=me.root.position,a=t.x*_SR.x+t.z*_SR.z,b=t.x*_SU.x+t.z*_SU.z,da=a-Math.round(a/_ST)*_ST,db=b-Math.round(b/_ST)*_ST,
  tx=t.x-da*_SR.x-db*_SU.x,ty=-da*_SR.y-db*_SU.y,tz=t.z-da*_SR.z-db*_SU.z;
  sun.target.position.set(tx,ty,tz);sun.position.set(tx+30,ty+60,tz+20)}
}
function fitCam(){const a=innerWidth/innerHeight,w=a>1.2;camera.aspect=a;camera.fov=w?42:52;camK=w?.87:1;camera.updateProjectionMatrix();if(renderer){PRmax=(MOB||w)?1.25:1.5;PRcur=Math.min(PRcur,PRmax);applyPR()}}
function init(){
 scene=new THREE.Scene();scene.background=new THREE.Color(0xbcd3e0);scene.fog=new THREE.Fog(0xbcd3e0,60,330);
 camera=new THREE.PerspectiveCamera(52,innerWidth/innerHeight,.1,500);
 renderer=new THREE.WebGLRenderer({antialias:!MOB,powerPreference:MOB?'default':'high-performance',stencil:false});
 renderer.setSize(innerWidth,innerHeight);applyPR();
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
 document.body.appendChild(renderer.domElement);
 clock=new THREE.Clock();
 scene.add(new THREE.HemisphereLight(0xffffff,0x526174,1.4));
 sun=new THREE.DirectionalLight(0xffffff,2);sun.castShadow=true;sun.shadow.mapSize.set(SHM,SHM);
 Object.assign(sun.shadow.camera,{left:-16,right:16,top:16,bottom:-16,far:160});scene.add(sun,sun.target);
 const UI=initUI();buildWorld();W=initWorld({ask:UI.ask,input:UI.input,scene,solids,mat,put,slab,toast,tone,P,netSend,me:()=>me,remotes,myInfo,addScore,addMoney,spots,spawn:spawnChar,cam:()=>camera.position,view:inView,barTok:BARH,beat:beatNow,nChars:CHARS.length});
 CB=initCombat({ask:UI.ask,scene,P,toast,tone,netSend,remotes,myInfo,addScore,say,body,pop,houses:W.houses,me:()=>me,nChars:CHARS.length,spawn:spawnChar});
 try{BQ=initBoqiy({scene,solids,toast,tone,addScore,addMoney,me:()=>me})}catch(e){console.error('Boqiy Shahar yuklanmadi',e)}
 camera.position.set(0,3,-6);
 fitCam();{const rs=()=>{const ae=document.activeElement;if(ae&&ae.tagName==='INPUT'&&innerWidth===rs.w)return;rs.w=innerWidth;fitCam();renderer.setSize(innerWidth,innerHeight)};rs.w=innerWidth;addEventListener('resize',rs);addEventListener('orientationchange',()=>setTimeout(rs,250))}
}
/* ===== PERSONAJ (GLB) ===== */
const spawnChar=(g,n,x,z)=>loadGltf(g).then(gl=>{const c=new Char(gl,n,g,false);c.root.position.set(x,0,z);return c});
function loadGltf(g,onp){
 if(!gltfCache.has(g))gltfCache.set(g,new Promise((ok,no)=>loader.load(CHARS[g].model,ok,e=>{if(onp&&e.lengthComputable&&e.total)onp(e.loaded/e.total)},no)));
 return gltfCache.get(g);
}
function prepare(obj){
 const root=new THREE.Group();obj.updateMatrixWorld(true);
 let box=new THREE.Box3().setFromObject(obj);const size=box.getSize(new THREE.Vector3());
 if(size.y<.01)throw new Error('Model o‘lchami noto‘g‘ri');
 obj.scale.setScalar(1.8/size.y);obj.updateMatrixWorld(true);
 box=new THREE.Box3().setFromObject(obj);const c=box.getCenter(new THREE.Vector3());
 obj.position.x-=c.x;obj.position.z-=c.z;obj.position.y-=box.min.y;
 obj.traverse(ch=>{if(ch.isMesh){ch.castShadow=true;ch.receiveShadow=true;ch.frustumCulled=false}});
 const pivot=new THREE.Group();pivot.add(obj);root.add(pivot);root.userData.pivot=pivot;return root;
}
function tagSprite(name,color,rank){
 const cn=document.createElement('canvas');cn.width=256;cn.height=rank?96:64;const x=cn.getContext('2d'),y=rank?74:42;
 x.textAlign='center';x.shadowColor='#000';x.shadowBlur=6;
 if(rank){x.font='bold 22px system-ui,sans-serif';x.fillStyle='#ffd24a';x.shadowColor='#ff9d00';x.fillText(rank,128,32)}
 x.font='bold 30px system-ui,sans-serif';x.shadowColor='#000';x.fillStyle=color;x.fillText(name,128,y);
 const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cn),transparent:true,depthWrite:false,fog:false}));
 sp.scale.set(1.6,rank?.6:.4,1);sp.position.y=rank?2.25:2.15;return sp;
}
const _p0=new THREE.Vector3(),_p1=new THREE.Vector3(),_p2=new THREE.Vector3(),_t1=new THREE.Vector3(),_t2=new THREE.Vector3(),_a=new THREE.Vector3(),_Z=new THREE.Vector3(0,0,1),_q1=new THREE.Quaternion(),_q3=new THREE.Quaternion(),_q4=new THREE.Quaternion(),_q5=new THREE.Quaternion(),_q6=new THREE.Quaternion(),_q7=new THREE.Quaternion(),_qP=new THREE.Quaternion();
// SALTO: FRONT / BACK / SIDE / TWIST BACK / TWIST FRONT — prototipdagi (TAIMAN FLIP 3D) vaqt oralig'i, burchaklar va formulalar
const FLIP_TURN=.2,FLIP_A0=45,FLIP_A1=90,FLIP_SIDE=1,FLIP_DUR=1.5,TWIST_DUR=1.35,
 RELEASE_DEG={f:270,b:200,s:300},REL_TIME=.07,FLIP_SPEED={f:3.5,b:3.5,s:4,t:3.5,tf:3.5},
 ARM_HUG={armX:.8,armZ:.5,fore:1.9},TWIST_LEG_BEND=.25,TWISTS={t:{axis:'back',deg:720},tf:{axis:'front',deg:360}},FLIP_KINDS=['f','b','s','t','tf'],
 _fe=new THREE.Euler(),_fq=new THREE.Quaternion(),FL_AX=new THREE.Vector3(1,0,0),FL_AY=new THREE.Vector3(0,1,0),FL_AZ=new THREE.Vector3(0,0,1),
 FL_C=new THREE.Vector3(),FL_Q1=new THREE.Quaternion(),FL_Q2=new THREE.Quaternion(),
 FLIP_BONES={hips:'Hips',spine:'Spine',spine01:'Spine01',spine1:'Spine01',spine02:'Spine02',spine2:'Spine02',leftupleg:'LeftUpLeg',rightupleg:'RightUpLeg',leftleg:'LeftLeg',rightleg:'RightLeg',leftarm:'LeftArm',rightarm:'RightArm',leftforearm:'LeftForeArm',rightforearm:'RightForeArm'};
class Char{
 constructor(gltf,name,g,isMe){
  const clone=SkeletonUtils.clone(gltf.scene);
  this.root=prepare(clone);this.model=clone;this.base=clone.position.clone();this.acts={};this.cur=null;this.lock=0;this.lockT=1;this.name=name;this.g=g;
  this.moving=false;this.running=false;this.air=false;this.grounded=true;this.speed=0;this.vx=0;this.vz=0;this.vy=0;this.jc=0;this.ph=0;this.mw=0;this.aw=0;this.limbs=[];
  this.wv=0;this.wvw=0;this.wvT=0;this.pw=0;this.pt=0;this.pk='h';this.ps=1;this.mod=new Map();this.combo=0;this.lockN='';this.fixY=0;this.feet=[];this.h0=0;this.pivot=this.root.userData.pivot;this.pose=0;this.sw=0;this.dv=0;this.dB=0;this.dtc=.016;this.dip=0;this.off=false;
  this.mixer=new THREE.AnimationMixer(clone);
  gltf.animations.forEach(clip=>{
   const n=clip.name.toLowerCase(),a=this.mixer.clipAction(clip);
   if(n.includes('walk'))this.acts.walk=a;else if(n.includes('run')&&!this.acts.run)this.acts.run=a;
   else if(n.includes('idle'))this.acts.idle=a;
  });
  const driven=new Set();Object.values(this.acts).forEach(a=>a.getClip().tracks.forEach(t=>driven.add(t.name.split('.')[0])));
  this.root.updateMatrixWorld(true);
  clone.traverse(o=>{
   if(!o.isBone)return;const nm=o.name.toLowerCase();let k=null;
   if(/calf|shin|lowerleg|lower_leg|knee/.test(nm))k='sh';
   else if(/thigh|upleg|upperleg|upper_leg|(^|[^a-z])leg/.test(nm))k='th';
   else if(/forearm|lowerarm|lower_arm|hand|foot|toe|finger|armature/.test(nm))return;
   else if(/arm/.test(nm))k='ua';
   const ch=o.children.find(c=>c.isBone);if(!k||!ch)return;
   const p0=o.getWorldPosition(new THREE.Vector3()),d=ch.getWorldPosition(new THREE.Vector3()).sub(p0).normalize(),dr=driven.has(o.name);
   const dE=d.clone();if(k==='ua'&&!dr&&Math.abs(d.y)<.6)dE.set(Math.sign(d.x||1)*.25,-.95,0).normalize();
   const ax=new THREE.Vector3().crossVectors(dE,_Z);if(ax.length()<.1)return;ax.normalize();
   this.limbs.push({b:o,k,x:p0.x,y:p0.y,side:p0.x>0?1:-1,q0:o.quaternion.clone(),dr,ax,ch,ch2:ch.children.find(c=>c.isBone),low:(k==='ua'&&!dr)?new THREE.Quaternion().setFromUnitVectors(d,dE):null});
  });
  // chap/o'ng: juftlikdagi nisbiy x bo'yicha (model markazi siljigan bo'lsa ham to'g'ri); ortiqcha son suyaklar olib tashlanadi
  for(const k of ['th','ua']){let g=this.limbs.filter(L=>L.k===k);
   if(k==='th'&&g.length>2){g.sort((a,b)=>b.y-a.y);const dr=new Set(g.slice(2));this.limbs=this.limbs.filter(L=>!dr.has(L));g=g.slice(0,2)}
   if(g.length>=2){const m=g.reduce((t,L)=>t+L.x,0)/g.length;g.forEach(L=>L.side=L.x>=m?1:-1)}}
  clone.traverse(o=>{if(o.isBone&&/foot|toe|ankle/.test(o.name.toLowerCase()))this.feet.push(o)});if(this.feet.length)this.h0=this.feetMin();
  // salto uchun: tayanch (rest) holat va kerakli suyaklar (prototipdagi bones/restPose)
  this.flipT=-1;this.flipK='f';this.fdur=FLIP_DUR;this.flipYaw0=0;this.fdx=0;this.fdz=1;this.fy=0;this.fb={};this.fr=[];this.rq=new Map();
  clone.traverse(o=>{if(!o.isBone)return;this.fr.push({b:o,q:o.quaternion.clone(),p:o.position.clone()});
   const k=FLIP_BONES[o.name.toLowerCase().replace(/^mixamorig/,'').replace(/[^a-z0-9]/g,'')];if(k&&!this.fb[k]){this.fb[k]=o;this.rq.set(o,o.quaternion.clone())}});
  this.tagCol=isMe?'#00eaff':'#ff62d5';this.rank='';this.tag=tagSprite(name,this.tagCol);this.root.add(this.tag);
  this.bubble=document.createElement('div');this.bubble.className='bubble'+(isMe?'':' o');
  this.bubble.innerHTML='<b></b><span></span>';this.bubble.firstChild.textContent=name;$('bubbles').appendChild(this.bubble);
  this.bt=0;scene.add(this.root);this.play('idle');
 }
 play(n){
  const next=this.acts[n];
  if(!next){if(n==='idle'&&this.cur){this.cur.fadeOut(.3);this.cur=null}return}
  if(this.cur===next)return;
  if(this.cur)this.cur.fadeOut(.3);
  next.reset().fadeIn(.3).play();this.cur=next;
 }
 // zarba kombinatsiyasi: 0 o'ng qo'l, 1 chap qo'l, 2 o'ng oyoq, 3 chap oyoq
 punch(i){const k=((i|0)%4+4)%4;this.pk=k<2?'h':'k';this.ps=(k%2===0)?1:-1;const ms=this.pk==='h'?450:700;this.lock=ms/1000;this.lockT=this.lock;this.lockN='punch';this.pt=0}
 wave(s){this.wv=s||2}
 setRank(t){const on=t||'';if(this.rank===on)return;this.rank=on;this.root.remove(this.tag);this.tag.material.map.dispose();this.tag=tagSprite(this.name,this.tagCol,on);this.root.add(this.tag)}
 feetMin(){this.root.updateMatrixWorld(true);let m=1e9;for(const f of this.feet){f.getWorldPosition(_p0);if(_p0.y<m)m=_p0.y}return m-this.root.position.y}
 // qo'l/oyoq holatini joriy animatsiyadan maqsad yo'nalishga buradi (salom, zarba, tepish)
 armPose(){
  const ww=this.wvw,pw=this.pw,sw=this.sw,dv=this.dv;
  // oldingi kadrda biz o'zgartirgan, lekin animatsiya qayta yozmagan suyaklarni asl holiga qaytaramiz (qotib qolmasligi uchun)
  if(this.mod.size){for(const [b,m] of this.mod)if(b.quaternion.equals(m.last))b.quaternion.copy(m.base);this.root.updateMatrixWorld(true);this.mod.clear()}
  if(ww<.01&&pw<.01&&sw<.01&&dv<.01)return;
  this.root.updateMatrixWorld(true);this.root.getWorldQuaternion(_q1);this.pivot.getWorldQuaternion(_qP);
  const aim=(b,c,t,w,fq)=>{b.getWorldPosition(_p0);c.getWorldPosition(_p1);_p1.sub(_p0);if(_p1.lengthSq()<1e-8)return;_p1.normalize();
   _p2.copy(t).normalize().applyQuaternion(fq);_q5.setFromUnitVectors(_p1,_p2);_q6.identity().slerp(_q5,w);
   b.getWorldQuaternion(_q7);_q7.premultiply(_q6);b.parent.getWorldQuaternion(_q3);b.quaternion.copy(_q3.invert().multiply(_q7))};
  const sm=x=>x*x*(3-2*x),t=this.pt,B=this.dB,kk=Math.min(1,this.dtc*16);
  for(const L of this.limbs){
   if(!L.ch)continue;const s=L.side;let w=0,fq=_q1;
   if(pw>=.01&&this.pk==='h'&&L.k==='ua'&&s===this.ps&&L.ch2){
    // musht: ixcham holat -> to'g'ri otiladi -> qaytadi
    const e=sm(t<.4?t/.4:1-(t-.4)/.6);w=pw;
    _t1.set(s*.3,-.8,.3).lerp(_a.set(s*.05,.1,1),e);
    _t2.set(-s*.15,.9,.5).lerp(_a.set(-s*.03,.12,1),e);
   }else if(pw>=.01&&this.pk==='k'&&L.k==='th'&&s===this.ps&&L.ch2){
    // tepish: tizza ko'tariladi -> boldir cho'ziladi -> qaytadi
    const e=sm(t<.45?t/.45:1-(t-.45)/.55);w=pw;
    _t1.set(s*.05,.7,.7).lerp(_a.set(s*.08,.55,1),e);
    _t2.set(0,-1,.2).lerp(_a.set(0,.45,1),e);
   }else if(pw<.01&&ww>=.01&&L.k==='ua'&&s>0){
    w=ww;_t1.set(s*.8,.6,.1);_t2.set(s*(.15+.5*Math.sin(this.wvT)),1,.1);
   }else if(pw<.01&&L.ch2&&(L.k==='ua'||L.k==='th')&&(dv>=.01||sw>=.01)){
    // raqs / o'tirish / yotish: maqsad yo'nalishlar silliq o'zgaradi
    if(dv>=.01){w=dv;this.danceT(L,B,s);fq=L.k==='ua'?_qP:_q1}else{w=sw;this.seatT(L,s);fq=_qP}
    if(L.v1){L.v1.lerp(_t1,kk);L.v2.lerp(_t2,kk)}else{L.v1=_t1.clone();L.v2=_t2.clone()}
    _t1.copy(L.v1);_t2.copy(L.v2);
   }else continue;
   for(const b of [L.b,L.ch,L.ch2])if(b&&!this.mod.has(b))this.mod.set(b,{base:b.quaternion.clone(),last:null});
   aim(L.b,L.ch,_t1,w,fq);
   if(L.ch2){L.b.updateMatrixWorld(true);aim(L.ch,L.ch2,_t2,w,fq)}
  }
  this.mod.forEach((m,b)=>{m.last=b.quaternion.clone()});
 }
 // RAQS: 6 ta harakat, har biri 8 zarb davom etadi; hamma raqqosalar bir xil (unison). B = soat zarbi (butun qism = zarb raqami)
 danceT(L,B,s){
  const bi=Math.floor(B),ph=B-bi,mv=Math.floor(B/8)%6,act=(s>0)===(bi%2===0),e=.5-.5*Math.cos(ph*6.2832),d=1-e,l=Math.sin(ph*Math.PI),sy=Math.sin(B*Math.PI),v=_t1,u=_t2;
  if(L.k==='ua'){
   if(mv===0){if(act){v.set(s*.6,.75,.25);u.set(s*.35,.9,.15)}else{v.set(s*.7,-.6,-.1);u.set(-s*.7,-.55,.35)}}   // disko ishora + belda qo'l
   else if(mv===1){v.set(s*.35,.95,.1);u.set(s*(.2+.45*d),.9,.15+.25*d)}                                       // qo'llar tepada pompa
   else if(mv===2){v.set(s*.45+sy*.5,.85,.05);u.set(s*.2+sy*.7,.9,.1)}                                          // tepada katta to'lqin
   else if(mv===3){v.set(s*.7,-.6,-.1);u.set(-s*.7,-.55,.35)}                                                   // belda qo'llar
   else if(mv===4){v.set(s*.3,.5,.8);u.set(s*(-.5+.9*e),.7,.6)}                                                 // chapak
   else{const a=Math.sin(B*Math.PI+(s>0?0:Math.PI));v.set(s*.18,-.7,a*.7);u.set(s*.12,-.5,a*.8+.35)}            // qo'l siltash
  }else{
   const a=.38*(.4+.6*d);
   v.set(0,-Math.cos(a),Math.sin(a));u.set(0,-Math.cos(a*1.05),-Math.sin(a*1.05));                              // tizza bukilishi (zarbga mos)
   if(mv===0&&!act){v.set(s*.45,-.9,.05);u.set(s*.4,-.9,-.1)}
   else if(mv===1&&act){v.set(s*.05,-.95+.35*l,.1+.7*l);u.set(0,-.95,-.1-.4*l)}
   else if(mv===2){const o=Math.max(0,s*sy);v.set(s*(.2+.35*o),-.93,0);u.set(s*(.1+.25*o),-.95,-.05)}
   else if(mv===3&&act){v.set(s*.1,-.85,.45);u.set(0,-.95,-.3)}
   else if(mv===4&&act){v.set(s*(.15+.7*l),-.95+.5*l,.05);u.set(s*(.1+.6*l),-.95+.4*l,-.05)}
   else if(mv===5&&act){v.set(s*.08,-.95+.1*l,.05+.55*l);u.set(0,-.99,.1*l)}
  }
 }
 // O'TIRISH (pose 1) va YOTISH (pose 2) holati
 seatT(L,s){
  const v=_t1,u=_t2;
  if(this.pose===2){if(L.k==='th'){v.set(s*.07,-1,0);u.set(s*.05,-1,.04)}else{v.set(s*.25,-.8,.3);u.set(-s*.85,-.2,.55)}}
  else if(L.k==='th'){v.set(s*.1,-.03,1);u.set(s*.03,-1,-.12)}
  else{v.set(s*.2,-.85,.3);u.set(-s*.08,-.25,.95)}
 }
 setPose(q){this.pose=q|0}
 // ===== SALTO: kind = 'f' front, 'b' back, 's' side, 't' twist back, 'tf' twist front =====
 flip(kind){
  if(this.flipT>=0||this.pose)return false;
  if(!FLIP_KINDS.includes(kind))kind='f';
  const sg=(kind==='b'||kind==='t')?-1:1;   // back flip orqaga siljiydi
  this.flipK=kind;this.fdur=TWISTS[kind]?TWIST_DUR:FLIP_DUR;this.flipYaw0=this.root.rotation.y;
  this.fdx=Math.sin(this.flipYaw0)*sg;this.fdz=Math.cos(this.flipYaw0)*sg;
  this.flipT=0;this.fy=0;this.mixer.stopAllAction();this.cur=null;this.mod.clear();this.wv=0;this.wvw=0;this.pw=0;this.tag.visible=false;return true;
 }
 // sakrash paytidagi siljish tezligi (m/s): FLIP_TURN..0.85 oralig'ida sinus shaklida (prototipdagi updateFlip)
 flipSpeed(){const t=this.flipT;return(t>FLIP_TURN&&t<.85)?FLIP_SPEED[this.flipK]*Math.sin((t-FLIP_TURN)/(.85-FLIP_TURN)*Math.PI):0}
 // prototipdagi rotateBone: tayanch kvaternion * Euler(XYZ)
 rb(n,x,y,z){const b=this.fb[n];if(!b)return;_fq.setFromEuler(_fe.set(x||0,y||0,z||0,'XYZ'));b.quaternion.copy(this.rq.get(b)).multiply(_fq)}
 flipRest(){for(const r of this.fr){r.b.quaternion.copy(r.q);r.b.position.copy(r.p)}}
 // gavda markazi (0,H/2,0) atrofida aylantirish: pivot kvaterniyasi + siljish (markaz faqat 'off' balandlikka ko'tariladi)
 flipSet(q,off){const h=.9;this.pivot.quaternion.copy(q);FL_C.set(0,h,0).applyQuaternion(q);this.pivot.position.set(-FL_C.x,h-FL_C.y+off,-FL_C.z);this.fy=off}
 flipPose(t){
  if(TWISTS[this.flipK])return this.twistPose(t);
  const H=1.8,R=(n,x,y,z)=>this.rb(n,x,y,z),kd=this.flipK,side=kd==='s',back=kd==='b';let a=0,off=0;
  this.flipRest();
  if(side){ // butun personajning burilishi: 0 -> 45 -> 90 -> 0
   const sm=x=>{x=x<0?0:x>1?1:x;return x*x*(3-2*x)};let yaw;
   if(t<FLIP_TURN)yaw=FLIP_A0*sm(t/FLIP_TURN);
   else if(t<.78)yaw=FLIP_A0+(FLIP_A1-FLIP_A0)*sm((t-FLIP_TURN)/(.78-FLIP_TURN));
   else yaw=FLIP_A1*(1-sm((t-.78)/.22));
   this.root.rotation.y=this.flipYaw0+FLIP_SIDE*yaw*Math.PI/180;
  }
  if(t<.18){ // 1. tayyorlanish
   const b=Math.sin(t/.18*Math.PI/2);
   if(back){R('Hips',.2*b);R('Spine',.25*b);R('LeftUpLeg',-.75*b);R('RightUpLeg',-.75*b);R('LeftLeg',1.2*b);R('RightLeg',1.2*b);R('LeftArm',-1*b,0,-.1);R('RightArm',-1*b,0,.1);off=-H*.12*b}
   else{R('Hips',.25*b);R('Spine',.12*b);R('LeftArm',2.4*b,0,-.1);R('RightArm',2.4*b,0,.1)}
  }else if(t<.35){ // 2. sakrash
   const j=Math.sin((t-.18)/.17*Math.PI/2);
   if(back){const u=1-j;R('Hips',.2-.55*j);R('Spine',.25-.7*j);R('LeftUpLeg',-.75*u);R('RightUpLeg',-.75*u);R('LeftLeg',1.2*u);R('RightLeg',1.2*u);
    R('LeftArm',-1+3.6*j,0,-.1-.1*j);R('RightArm',-1+3.6*j,0,.1+.1*j);off=-H*.12*u+H*.65*j}
   else{R('Hips',.25);R('Spine',.3);R('LeftArm',1.4*j,0,-.2);R('RightArm',1.4*j,0,.2);off=H*.65*j}
  }else{ // 3. havoda g'ujanak + 360 aylanish, RELEASE_DEG da oyoqlar ochiladi, 4. qo'nish
   const tR=.35+.43*RELEASE_DEG[kd]/360,air=t<.78,p=air?(t-.35)/.43:1;a=Math.PI*2*p;
   const x=Math.min(Math.max((t-tR)/REL_TIME,0),1),rel=Math.sin(x*Math.PI/2),
    tin=back?(()=>{const y=Math.min(p/.2,1);return y*y*(3-2*y)})():1,e=1-tin,w=(1-rel)*tin,
    k=air?1:1-Math.min((t-.78)/.22,1),lk=rel*k,
    tH=side?.55:(back?-.35:.35),tS=side?.25:(back?-.5:.5),tS2=side?.45:.25,uz=side?.8:.35,az=side?.1:.3,fl=side?.27:.7,fr=side?.17:.7;
   R('Hips',tH*w-.35*e+.15*lk);R('Spine',tS*w-.45*e);R('Spine01',.35*w);R('Spine02',tS2*w);
   R('LeftUpLeg',-1.65*w-.7*lk,0,-uz*w);R('RightUpLeg',-1.65*w-.7*lk,0,uz*w);R('LeftLeg',2*w+.5*lk);R('RightLeg',2*w+.5*lk);
   R('LeftArm',1.5*w+1.4*lk+2.6*e,0,-az*w-.2*lk);R('RightArm',1.5*w+1.4*lk+2.6*e,0,az*w+.2*lk);
   R('LeftForeArm',fl*w+.7*lk);R('RightForeArm',fr*w+.7*lk);
   off=air?H*(.65+Math.sin(p*Math.PI)*.15):H*.65*k;
  }
  // front = X o'qi, back = teskari X, side = Z o'qi
  if(side)FL_Q1.setFromAxisAngle(FL_AZ,a);else FL_Q1.setFromAxisAngle(FL_AX,a*(back?-1:1));
  this.flipSet(FL_Q1,off);
 }
 // prototipdagi twistFlipPose: salto + vertikal (bo'ylama) o'q atrofida burovlash. t = twist backflip (720°), tf = twist front flip (360°)
 twistPose(t){
  const cfg=TWISTS[this.flipK],H=1.8,R=(n,x,y,z)=>this.rb(n,x,y,z),back=cfg.axis==='back',tot=cfg.deg*Math.PI/180;
  const twAt=tt=>tot*Math.min(Math.max((tt-.35)/.65,0),1);
  const hug=(w,up)=>{R('LeftArm',ARM_HUG.armX*w+up,0,-ARM_HUG.armZ*w);R('RightArm',ARM_HUG.armX*w+up,0,ARM_HUG.armZ*w);R('LeftForeArm',ARM_HUG.fore*w);R('RightForeArm',ARM_HUG.fore*w)};
  let off=0;this.flipRest();
  if(t<.18){ // 1. tayyorlanish
   const k=Math.sin(t/.18*Math.PI/2);
   if(back){R('Hips',.25*k);R('Spine',.3*k);R('LeftUpLeg',-.8*k);R('RightUpLeg',-.8*k);R('LeftLeg',1.2*k);R('RightLeg',1.2*k);R('LeftArm',-1.2*k);R('RightArm',-1.2*k)}
   else{R('Hips',.25*k);R('Spine',.12*k);R('LeftArm',2.4*k,0,-.1);R('RightArm',2.4*k,0,.1)}
   FL_Q1.identity();off=-(back?H*.12:H*.04)*k;
  }else if(t<.35){ // 2. sakrash
   const j=Math.sin((t-.18)/.17*Math.PI/2);
   if(back){R('Hips',.25-.5*j);R('Spine',.3-.5*j);R('LeftArm',2.5*j);R('RightArm',2.5*j);R('LeftUpLeg',-.8*(1-j));R('RightUpLeg',-.8*(1-j));R('LeftLeg',1.2*(1-j));R('RightLeg',1.2*(1-j))}
   else{R('Hips',.25);R('Spine',.3);R('LeftArm',2.4+.1*j,0,-.1*(1-j));R('RightArm',2.4+.1*j,0,.1*(1-j))}
   FL_Q1.identity();off=-(back?H*.12:H*.04)*(1-j)+H*.65*j;
  }else if(t<.85){ // 3. havoda: qo'llar gavdani ushlaydi, burovlash davom etadi
   const p=(t-.35)/.5,g=Math.min(p/.15,1),hg=g*g*(3-2*g),lean=back?-.15:.15,hE=back?-.25:.25,sE=back?-.2:.3;
   R('Hips',hE+(lean-hE)*hg);R('Spine',sE+(lean-sE)*hg);hug(hg,2.5*(1-hg));
   const lb=TWIST_LEG_BEND*hg;R('LeftUpLeg',-1.9*lb);R('RightUpLeg',-1.9*lb);R('LeftLeg',4*lb);R('RightLeg',2*lb);
   FL_Q1.setFromAxisAngle(FL_AX,back?-Math.PI*2*p:Math.PI*2*p);FL_Q2.setFromAxisAngle(FL_AY,twAt(t));FL_Q1.multiply(FL_Q2);
   off=H*(.65+Math.sin(p*Math.PI)*.15);
  }else{ // 4. qo'nish: burovlash tugaydi, qo'llar bo'shaydi, tizzalar yumshoq bukiladi
   const p=Math.min((t-.85)/.15,1),rl=p*p*(3-2*p),c=Math.sin(p*Math.PI),lr=TWIST_LEG_BEND*(1-rl);
   R('LeftUpLeg',-1.7*lr-.5*c);R('RightUpLeg',-1.7*lr-.5*c);R('LeftLeg',2*lr+.8*c);R('RightLeg',2*lr+.8*c);hug(1-rl,0);
   FL_Q1.setFromAxisAngle(FL_AY,twAt(t));off=H*.65*(1-rl);
  }
  this.flipSet(FL_Q1,off);
 }
 flipEnd(){
  this.flipRest();
  this.pivot.rotation.set(0,0,0);this.pivot.position.set(0,0,0);this.tag.visible=true;this.flipT=-1;this.fy=0;if(this.flipK==='s')this.root.rotation.y=this.flipYaw0;
  // oddiy animatsiyaga (idle/yurish/yugurish) qaytamiz; shu kadrning o'zida mixer qayta yozadi
  const a=this.acts[this.moving?(this.running&&this.acts.run?'run':'walk'):'idle']||this.acts.idle;
  if(a){a.reset().play();this.cur=a}else this.cur=null;
 }
 flipStep(dt){
  if(this.lock>0){this.flipEnd();return}   // yiqilsak (HP 0) salto to'xtaydi
  this.flipT+=dt/(this.fdur||FLIP_DUR);
  if(this.flipT>=1){this.flipEnd();return}
  this.flipPose(this.flipT);
  this.model.position.y=this.base.y;this.model.rotation.x=0;
  if(this.bt>0){this.bt-=dt;if(this.bt<=0)this.bubble.style.display='none'}
 }
 say(t){this.bubble.lastChild.textContent=t;this.bubble.style.display='block';this.bt=8;this.bh=0}
 applyLimbs(){
  const run=clamp(this.speed/RUN,0,1),amp=this.mw*(.35+.5*run),air=this.aw,s=Math.sin(this.ph),c=Math.cos(this.ph);
  this.root.updateMatrixWorld(true);this.root.getWorldQuaternion(_q1);
  for(const L of this.limbs){
   let ang;
   if(L.k==='th')ang=L.side*s*amp*(1-air)+air*.5*L.side;
   else if(L.k==='sh')ang=-(Math.max(0,L.side*c)*amp*1.3*(1-air)+air*.9);
   else ang=-L.side*s*amp*.9*(1-air)+air*.8;
   L.b.parent.getWorldQuaternion(_q3);_q4.copy(_q3).invert().multiply(_q1);
   _q5.setFromAxisAngle(_a.copy(L.ax).applyQuaternion(_q4),ang);
   _q6.copy(L.dr?L.b.quaternion:L.q0);
   if(L.low){_a.set(L.low.x,L.low.y,L.low.z).applyQuaternion(_q4);_q6.premultiply(_q7.set(_a.x,_a.y,_a.z,L.low.w))}
   L.b.quaternion.copy(_q6.premultiply(_q5));
  }
 }
 update(dt){
  this.dtc=dt;if(this.lock>0)this.lock-=dt;
  if(this.flipT>=0){this.flipStep(dt);if(this.flipT>=0)return}
  {
   let n=this.moving?(this.running?'run':'walk'):'idle';
   if(this.pose)n='idle';
   if(n==='run'&&!this.acts.run)n='walk';
   this.play(n);
   if(this.acts.walk)this.acts.walk.timeScale=(n==='walk'&&this.running)?1.8:clamp(this.speed/WALK,.5,1.3);
   if(this.acts.run)this.acts.run.timeScale=clamp(this.speed/RUN,.8,1.2);
  }
  this.mixer.update(dt);
  if(this.wv>0)this.wv-=dt;
  this.wvw+=((this.wv>0?1:0)-this.wvw)*Math.min(1,dt*7);if(this.wvw>.01)this.wvT+=dt*10;
  this.ph+=dt*(this.speed*2.4+1.5);
  this.mw+=((this.moving&&!this.air?1:0)-this.mw)*Math.min(1,dt*10);this.aw+=((this.air?1:0)-this.aw)*Math.min(1,dt*12);
  if(!this.acts.walk&&this.limbs.length)this.applyLimbs();
  {const k=Math.min(1,dt*7);
   this.sw+=(((this.pose===1||this.pose===2)?1:0)-this.sw)*k;this.dv+=((this.pose===3?1:0)-this.dv)*Math.min(1,dt*5);
   this.pivot.rotation.x+=((this.pose===2?-Math.PI/2:0)-this.pivot.rotation.x)*k;
   let dip=0,sway=0,twist=0;
   if(this.dv>.01){const B=beatNow(),ph=B-Math.floor(B),d=.5+.5*Math.cos(ph*6.2832),mv=Math.floor(B/8)%6;this.dB=B;
    dip=this.dv*.07*(.4+.6*d);sway=this.dv*Math.sin(B*Math.PI)*.07;twist=this.dv*Math.sin(B*Math.PI+.5)*(mv===5?.45:.28)}
   this.pivot.rotation.y=twist;this.pivot.rotation.z=sway;this.dip=dip}
  this.pt=clamp(1-this.lock/this.lockT,0,1);this.pw=(this.lock>0&&this.lockN==='punch')?clamp(Math.sin(Math.PI*this.pt)*3,0,1):0;
  this.armPose();
  if(this.feet.length){this.model.position.y=this.base.y;const need=clamp(this.h0-this.feetMin()-.02,0,.4);this.fixY+=(need-this.fixY)*Math.min(1,dt*18)}
  const run=clamp(this.speed/RUN,0,1);
  this.model.position.y=this.base.y+this.fixY-this.dip+(this.acts.walk?0:Math.abs(Math.sin(this.ph))*.06*this.mw*(1+run));
  this.model.rotation.x+=((this.air?.08:this.running?.14:0)-this.model.rotation.x)*Math.min(1,dt*8);
  if(this.bt>0){this.bt-=dt;if(this.bt<=0)this.bubble.style.display='none'}
 }
 dispose(){scene.remove(this.root);this.bubble.remove();this.mixer.stopAllAction();this.mixer.uncacheRoot(this.model);this.tag.material.map.dispose();this.tag.material.dispose();this.model.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.dispose()})}
}
function placeBubble(ch){
 if(ch.bt<=0)return;const b=ch.bubble,p=_bp.copy(ch.root.position);p.y+=2.7;p.project(camera);
 if(p.z>1){b.style.opacity=0;return}b.style.opacity=1;
 if(!ch.bh)ch.bh=b.offsetHeight;
 const x=clamp((p.x*.5+.5)*innerWidth,110,innerWidth-110),y=Math.max(ch.bh+50,(-p.y*.5+.5)*innerHeight);
 b.style.transform='translate3d('+x.toFixed(1)+'px,'+y.toFixed(1)+'px,0) translate(-50%,-100%)';
}
/* bot ustidagi "-10 bal" yozuvi: tana (ko'krak) balandligidan o'ngga qarab ko'tariladi; gap pufagi esa bosh tepasida, shuning uchun ustma-ust tushmaydi */
const pops=[];
function pop(text,ch,color){
 const e=document.createElement('div');e.className='pop';e.textContent=text;if(color)e.style.color=color;$('pops').appendChild(e);
 pops.push({e,ch,t:0,ox:Math.random()*16-8});if(pops.length>12){pops.shift().e.remove()}
}
function updPops(dt){
 for(let i=pops.length-1;i>=0;i--){const q=pops[i];q.t+=dt;
  if(q.t>1.3){q.e.remove();pops.splice(i,1);continue}
  const p=_bp.copy(q.ch.root.position);p.y+=1.0+q.t*.5;p.project(camera);
  if(p.z>1){q.e.style.opacity=0;continue}
  const x=(p.x*.5+.5)*innerWidth+46+q.ox,y=(-p.y*.5+.5)*innerHeight;
  q.e.style.opacity=Math.min(1,(1.3-q.t)*2.5);q.e.style.transform='translate3d('+x.toFixed(1)+'px,'+y.toFixed(1)+'px,0) translate(0,-50%)'}
}
function cullChars(){
 camera.updateMatrixWorld();_pm.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);_fr.setFromProjectionMatrix(_pm);
 const t=c=>{_sp.center.copy(c.root.position);_sp.center.y+=1;c.root.visible=_fr.intersectsSphere(_sp)};
 if(CB)CB.bots.forEach(b=>t(b.c));if(W)W.dancers.forEach(c=>{t(c);if(c.off)c.root.visible=false});remotes.forEach(r=>{if(r.char)t(r.char)});
}
/* ===== LOG ===== */
function say(t){const d=document.createElement('div');d.textContent=t;$('log').appendChild(d);
 while($('log').children.length>4)$('log').firstChild.remove();setTimeout(()=>d.remove(),6000)}
/* ===== O'TIRISH / YOTISH / RAQS ===== */
let seat=null,dAt=null,ctxT='';
function nearestSpot(){
 const p=me.root.position;let best=null,bd=1e9;
 for(const s of spots){if(s.t==='dance')continue;const d=Math.hypot(p.x-s.x,p.z-s.z);if(d<s.r&&d<bd){bd=d;best=s}}
 if(!best)for(const s of spots)if(s.t==='dance'&&Math.hypot(p.x-s.x,p.z-s.z)<s.r){best=s;break}
 return best;
}
function standUp(){
 if(seat){const o=seat.s.out;me.root.position.set(o[0],0,o[1]);me.root.rotation.y=Math.atan2(o[0]-seat.s.x,o[1]-seat.s.z);seat=null}
 dAt=null;me.setPose(0);
}
function ctxPress(){
 if(!me||!started||me.lock>0||me.flipT>=0)return;initAudio();
 if(me.pose){standUp();return}
 const s=nearestSpot();if(!s||!me.grounded)return;
 if(s.t==='dance'){me.setPose(3);dAt={x:me.root.position.x,z:me.root.position.z};return}
 seat={s};me.setPose(s.t==='lie'?2:1);me.vx=me.vz=me.vy=0;
}
function seatTick(dt,len){
 const s=seat.s,p=me.root.position,px=s.px===undefined?s.x:s.px,pz=s.pz===undefined?s.z:s.pz,k=1-Math.exp(-dt*10);
 if(Math.hypot(p.x-px,p.z-pz)>3.5){seat=null;me.setPose(0);return}   // teleport/jang: o'rindiqdan chiqib ketamiz
 p.x+=(px-p.x)*k;p.z+=(pz-p.z)*k;p.y+=(s.y-p.y)*k;me.root.rotation.y+=shortest(s.yaw-me.root.rotation.y)*k;
 me.vx=me.vz=me.vy=0;me.speed=0;me.moving=me.running=me.air=false;me.grounded=true;me.jc=0;stepT=.25;
 if(len>.45||jumpReq){jumpReq=false;standUp();return}
 me.update(dt);
}
function updCtx(){
 let t='';
 if(started&&me&&me.lock<=0&&!document.body.classList.contains('modal')){
  if(me.pose)t=me.pose===3?'RAQSNI TO‘XTATISH':'TURISH';
  else if(me.grounded&&me.speed<3){const s=nearestSpot();if(s)t=s.t==='lie'?'YOTISH':s.t==='dance'?'RAQS':'O‘TIRISH'}
 }
 if(t!==ctxT){ctxT=t;const b=$('ctxBtn');b.textContent=t;b.classList.toggle('show',!!t)}
}
/* ===== BOSHQARUV ===== */
function toggleChat(open){
 const p=$('chatPanel'),o=open===undefined?!p.classList.contains('open'):open;
 p.classList.toggle('open',o);$('chatBtn').classList.toggle('on',o);document.body.classList.toggle('chatting',o);
 if(o)setTimeout(()=>$('messageInput').focus(),60);else $('messageInput').blur();
}
function doPunch(){if(!me||me.pose||me.flipT>=0||me.lock>me.lockT*.45)return;sndPunch();me.punch(me.combo);if(CB)CB.hit();netSend({k:'a',a:'punch',c:me.combo});me.combo=(me.combo+1)%4}
function doFlip(kind){
 if(!me||!started||me.flipT>=0||me.pose||seat||me.lock>0||!me.grounded||document.body.classList.contains('modal'))return;
 initAudio();if(!me.flip(kind))return;sndJump(1);netSend({k:'a',a:'flip',f:kind});
}
function createControls(){
 const joy=$('joystick'),stick=$('stick');
 let jr=null;
 function upd(e){const r=jr||(jr=joy.getBoundingClientRect());let dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);
  const max=r.width*.3,len=Math.hypot(dx,dy);if(len>max){dx=dx/len*max;dy=dy/len*max}
  stick.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;joyDir.set(dx/max,dy/max);
  joy.classList.toggle('run',joyDir.length()>=RUN_AT)}
 function reset(e){if(e&&joystickPointer!==e.pointerId)return;joyDir.set(0,0);jr=null;stick.style.transform='translate(-50%,-50%)';joystickPointer=null;joy.classList.remove('run')}
 joy.addEventListener('pointerdown',e=>{jr=null;joystickPointer=e.pointerId;joy.setPointerCapture(e.pointerId);upd(e)});
 joy.addEventListener('pointermove',e=>{if(joystickPointer===e.pointerId)upd(e)});
 joy.addEventListener('pointerup',reset);joy.addEventListener('pointercancel',reset);
 addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;keys[e.code]=true;if(e.code==='KeyE'&&!e.repeat)ctxPress();if(e.code==='KeyF'&&!e.repeat)doFlip('f');if(e.code==='KeyG'&&!e.repeat)doFlip('s');if(e.code==='KeyB'&&!e.repeat)doFlip('b');if(e.code==='KeyT'&&!e.repeat)doFlip('t');if(e.code==='KeyY'&&!e.repeat)doFlip('tf');if(e.code==='Space'){e.preventDefault();if(!e.repeat)jumpReq=true}});
 addEventListener('keyup',e=>{keys[e.code]=false});
 $('messageInput').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')sendChat();if(e.key==='Escape')toggleChat(false)});
 $('send').onclick=sendChat;
 $('chatBtn').onclick=()=>toggleChat();
 $('punch').addEventListener('pointerdown',e=>{e.preventDefault();doPunch()});
 $('jump').addEventListener('pointerdown',e=>{e.preventDefault();jumpReq=true});
 $('flipBtn').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();doFlip('f')});
 $('sideBtn').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();doFlip('s')});
 for(const[id,k]of[['backBtn','b'],['twBBtn','t'],['twFBtn','tf']])$(id).addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();doFlip(k)});
 {const fp=$('flipPanel'),fm=$('flipMain'),shut=()=>{fp.classList.remove('open');fm.classList.remove('on')};fm.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();fm.classList.toggle('on',fp.classList.toggle('open'))});fp.addEventListener('pointerdown',()=>setTimeout(shut,0),true);document.addEventListener('pointerdown',e=>{if(!e.target.closest('#flipPanel,#flipMain'))shut()},true)}
 $('ctxBtn').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();ctxPress()});
 $('ptt').onclick=()=>VO.on?pttUp():pttDown();
 const cv=renderer.domElement;
 cv.addEventListener('pointerdown',e=>{if(camPointer!==null)return;camPointer=e.pointerId;lastX=e.clientX;lastY=e.clientY;cv.setPointerCapture(e.pointerId)});
 cv.addEventListener('pointermove',e=>{if(camPointer!==e.pointerId)return;cameraAngle+=(e.clientX-lastX)*.006;cameraPitch=clamp(cameraPitch+(e.clientY-lastY)*.005,-.3,1.25);lastX=e.clientX;lastY=e.clientY});
 const end=e=>{if(camPointer===e.pointerId)camPointer=null};cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);
}
/* ===== FIZIKA ===== */
function body(c,tvx,tvz,has,dt,jr){
 const a=1-Math.exp(-dt*(has?(c.grounded?11:4):(c.grounded?14:1.5)));
 c.vx+=(tvx-c.vx)*a;c.vz+=(tvz-c.vz)*a;
 const p=c.root.position,spd=Math.hypot(c.vx,c.vz);
 const zb=p.z>BQZ-400;p.x=clamp(p.x+c.vx*dt,zb?-200:-90,zb?200:90);p.z=clamp(p.z+c.vz*dt,zb?BQZ-120:-90,zb?BQZ+200:90);
 for(const s of solids){
  if(p.y>s.top-.35||p.y+1.8<s.y0)continue;
  const dx=p.x-s.x,dz=p.z-s.z,ox=s.hx+.35-Math.abs(dx),oz=s.hz+.35-Math.abs(dz);
  if(ox>0&&oz>0){if(ox<oz)p.x+=(dx<0?-1:1)*ox;else p.z+=(dz<0?-1:1)*oz}
 }
 let gh=0;for(const s of solids)if(Math.abs(p.x-s.x)<s.hx+.15&&Math.abs(p.z-s.z)<s.hz+.15&&s.top<=p.y+.4&&s.top>gh)gh=s.top;
 if(jr&&(c.grounded||c.jc<2)){c.vy=c.grounded?JUMP:JUMP*.9;c.jc=c.grounded?1:2;c.grounded=false;if(c===me)sndJump(c.jc)}
 c.vy-=G*dt;p.y+=c.vy*dt;
 if(p.y<=gh){if(c.vy<-7&&c===me)sndLand();p.y=gh;c.vy=0;c.grounded=true;c.jc=0}
 else if(p.y>gh+.06){c.grounded=false;if(c.jc===0)c.jc=1}
 if(!(isFinite(p.x)&&isFinite(p.y)&&isFinite(p.z))){p.set(0,0,12);c.vx=c.vz=c.vy=0}
 c.air=!c.grounded;c.speed=spd;c.moving=spd>.35;c.running=c.running?spd>3.6:spd>4.2;
 if(spd>.3)c.root.rotation.y+=shortest(Math.atan2(c.vx,c.vz)-c.root.rotation.y)*Math.min(1,dt*10);
}
let camA=0;
function updateMe(dt){
 if(!me)return;
 const jl=joyDir.length();
 let ix=joyDir.x,iy=-joyDir.y;
 if(keys.KeyA||keys.ArrowLeft)ix-=1;if(keys.KeyD||keys.ArrowRight)ix+=1;
 if(keys.KeyW||keys.ArrowUp)iy+=1;if(keys.KeyS||keys.ArrowDown)iy-=1;
 const len=Math.hypot(ix,iy);
 // salto davomida joyida turadi: yurish/sakrash/fizika to'xtatiladi, tugagach boshqaruv o'zi qaytadi
 if(me.flipT>=0){ // oldinga siljish: oddiy fizika (to'qnashuv, zamin) orqali, yo'nalish flip boshidagi yo'nalish
  jumpReq=false;const fs=me.flipSpeed();me.vx=me.fdx*fs;me.vz=me.fdz*fs;
  const ry=me.root.rotation.y;body(me,me.vx,me.vz,fs>0,dt,false);me.root.rotation.y=ry;   // body() yo'nalishga burib yuboradi: orqaga saltoda burilmasin
  me.moving=me.running=false;me.speed=0;stepT=.25;me.update(dt);return}
 if(me.pose&&me.lock>0){seat=null;dAt=null;me.setPose(0)}     // yiqilsak yoki jang boshlansa turib ketamiz
 if(seat){seatTick(dt,len);return}
 if(me.pose===3&&(len>.3||jumpReq||(dAt&&Math.hypot(me.root.position.x-dAt.x,me.root.position.z-dAt.z)>4))){me.setPose(0);dAt=null;jumpReq=false}
 const has=len>.12&&me.lock<=0&&me.pose!==3;
 let tvx=0,tvz=0;
 if(has){
  const nx=ix/len,ny=iy/len,fx=-Math.sin(camA),fz=Math.cos(camA),rx=-fz,rz=fx;
  const wx=fx*ny+rx*nx,wz=fz*ny+rz*nx,wl=Math.hypot(wx,wz)||1;
  const power=jl>.12?Math.min(1,len):((keys.ShiftLeft||keys.ShiftRight)?1:.6);
  const ws=Math.max(.9,WALK*Math.min(power,RUN_AT)/RUN_AT),rt=clamp((power-(RUN_AT-.12))/.16,0,1),sp=ws+(RUN-ws)*rt*rt*(3-2*rt);
  tvx=wx/wl*sp;tvz=wz/wl*sp;
 }
 const jr=jumpReq;jumpReq=false;
 body(me,tvx,tvz,has,dt,jr);
 if(me.moving&&me.grounded&&me.lock<=0){stepT+=dt;if(stepT>1.15/Math.max(1.2,me.speed)){stepT=0;sndStep(me.running?1.15:1)}}else stepT=.25;
 me.update(dt);
}
/* ===== KAMERA ===== */
let camY=0,camP=.2;const foc=new THREE.Vector3();let focInit=false;
function updateCamera(dt){
 if(!me)return;const c=me.root.position;
 if(!focInit||foc.distanceTo(c)>10){foc.copy(c);camY=c.y;camA=cameraAngle;camP=cameraPitch;focInit=true}
 const kf=1-Math.exp(-dt*12);foc.x+=(c.x-foc.x)*kf;foc.z+=(c.z-foc.z)*kf;
 camA+=shortest(cameraAngle-camA)*(1-Math.exp(-dt*14));
 camP+=(cameraPitch-camP)*(1-Math.exp(-dt*10));
 const wantD=(me.running?4.5:3.8)*camK;camDist+=(wantD-camDist)*(1-Math.exp(-dt*4));
 camY+=(c.y+(me.fy||0)*.6-camY)*(1-Math.exp(-dt*6));
 const cp=Math.cos(camP),sp=Math.sin(camP),ty=camY+(camK<1?1.0:1.15);
 camera.position.set(foc.x+Math.sin(camA)*camDist*cp,Math.max(.35,ty+sp*camDist),foc.z-Math.cos(camA)*camDist*cp);
 camera.lookAt(foc.x,ty+Math.max(0,-camP)*2,foc.z);
}
/* ===== BOSHQA O'YINCHILAR ===== */
function push2(a,b,wa,wb){const pa=a.root.position,pb=b.root.position;if(Math.abs(pa.y-pb.y)>1.6)return;
 let dx=pa.x-pb.x,dz=pa.z-pb.z,d=Math.hypot(dx,dz);const M=.8;if(d>=M)return;
 if(d<.001){dx=Math.random()-.5;dz=Math.random()-.5;d=Math.hypot(dx,dz)||1}
 const k=(M-d)/d;pa.x+=dx*k*wa;pa.z+=dz*k*wa;pb.x-=dx*k*wb;pb.z-=dz*k*wb}
function updateRemotes(dt){
 const k=1-Math.exp(-dt*9),now=Date.now();
 remotes.forEach((r,id)=>{
  if(now-r.seen>7000){if(r.char)r.char.dispose();remotes.delete(id);say(r.name+' chiqib ketdi');$('cn').textContent=remotes.size+1;return}
  const c=r.char;if(!c)return;const p=c.root.position,ox=p.x,oz=p.z;
  p.x+=(r.tx-p.x)*k;p.z+=(r.tz-p.z)*k;p.y+=(r.ty-p.y)*k;c.root.rotation.y+=shortest(r.tyaw-c.root.rotation.y)*k;
  const inst=Math.hypot(p.x-ox,p.z-oz)/Math.max(dt,.001);
  r.sp=(r.sp||0)+(inst-(r.sp||0))*Math.min(1,dt*5);
  c.air=Math.abs(r.ty-p.y)>.12;c.speed=r.sp;c.moving=r.sp>.45;c.running=c.running?r.sp>3.4:r.sp>4.2;
  if(c.moving&&me){r.st=(r.st||0)-dt;if(r.st<=0){r.st=1.15/Math.max(1.2,r.sp);const d=p.distanceTo(me.root.position);if(d<16)sndStep(.6*(1-d/16))}}
  c.setPose(r.q|0);
  if(me)push2(me,c,1,0);
  if(c.root.visible||c.bt>0)c.update(dt);
 });
}
/* ===== TARMOQ (MQTT) ===== */
let net=null,lastSent='',netSeq=0;
const mqttPool=[];   // bir vaqtning o'zida 2-3 ta broker (hamma o'yinchilar umumiy broker orqali uchrashadi)
const netUp=()=>mqttPool.some(c=>c.connected);
const loadJs=u=>new Promise((ok,no)=>{const e=document.createElement('script');e.src=u;e.onload=ok;e.onerror=no;document.head.appendChild(e)});
function netSend(o){if(!net)return;const m=JSON.stringify({...o,id:myInfo.id,u:++netSeq});mqttPool.forEach(c=>{try{if(c.connected)c.publish(net.base,m)}catch(e){}})}
const fin=v=>typeof v==='number'&&isFinite(v);
async function connect(){
 if(!window.mqtt){try{await loadJs('https://cdn.jsdelivr.net/npm/mqtt@5.10.1/dist/mqtt.min.js')}catch(e){try{await loadJs('https://unpkg.com/mqtt@5.10.1/dist/mqtt.min.js')}catch(e2){say('Tarmoq kutubxonasi yuklanmadi: yolg‘iz rejim');return}}}
 const code=(location.hash.match(/r=([a-z0-9]{4,12})/)||[])[1]||'olam';
 net={base:'taiman-gta-v1/'+code};
 const B=['wss://broker.emqx.io:8084/mqtt','wss://broker.hivemq.com:8884/mqtt','wss://test.mosquitto.org:8081'];
 const seen=new Map(),started=[];let wasUp=false;
 // bir xil xabar ikki brokerdan kelsa, bir marta ishlanadi
 const dup=d=>{if(!d.u)return false;let s=seen.get(d.id);if(!s)seen.set(d.id,s=new Set());if(s.has(d.u))return true;s.add(d.u);if(s.size>300)s.delete(s.values().next().value);return false};
 const refresh=()=>{const u=netUp();
  if(u&&!wasUp){wasUp=true;$('chip').classList.remove('off');say('Onlayn olamga ulandingiz')}
  else if(!u&&wasUp){wasUp=false;$('chip').classList.add('off');say('Aloqa uzildi, qayta ulanmoqda…')}};
 function start(i){
  if(started[i])return;started[i]=1;
  const c=mqtt.connect(B[i],{clientId:'tg'+myInfo.id+i,keepalive:30,reconnectPeriod:3000,connectTimeout:6000,clean:true});
  mqttPool.push(c);
  c.on('connect',()=>{c.subscribe(net.base,err=>{if(err)return;lastSent='';sendPresence();refresh()})});
  c.on('message',(t,m)=>{try{const d=JSON.parse(m.toString());if(d&&typeof d==='object'&&d.id&&d.id!==myInfo.id&&!dup(d))handle(d)}catch(e){}});
  c.on('close',refresh);
  c.on('error',()=>{});
 }
 start(0);start(1);
 // 2 tadan kam broker ishlayotgan bo'lsa, uchinchisi ham yoqiladi
 setInterval(()=>{if(!started[2]&&mqttPool.filter(c=>c.connected).length<2)start(2)},8000);
 setInterval(sendPresence,150);
 addEventListener('pagehide',()=>netSend({k:'l'}));
}
function sendPresence(){
 if(!me)return;const p=me.root.position;
 const o={k:'p',q:me.pose|0,n:myInfo.name,g:myInfo.g,s:P.score,t:P.rank||'',x:+p.x.toFixed(2),y:+p.y.toFixed(2),z:+p.z.toFixed(2),r:+me.root.rotation.y.toFixed(2)};
 const s=o.x+'|'+o.y+'|'+o.z+'|'+o.r+'|'+o.s+'|'+o.t+'|'+o.q;
 if(s===lastSent&&performance.now()-(sendPresence.t||0)<1000)return;
 lastSent=s;sendPresence.t=performance.now();netSend(o);
}
function handle(d){
 const id=String(d.id);
 if(d.k==='p'){
  if(!fin(d.x)||!fin(d.z))return;
  let r=remotes.get(id);
  if(!r){if(remotes.size>=24)return;r={char:null,pending:false,name:String(d.n||'Taiman').slice(0,16),g:(Number.isInteger(d.g)&&d.g>=0&&d.g<CHARS.length)?d.g:0,tx:d.x,tz:d.z,ty:0,tyaw:d.r||0,seen:Date.now()};remotes.set(id,r);if(W&&W.sync)W.sync()}
  r.seen=Date.now();r.score=fin(d.s)?d.s:0;r.rk=typeof d.t==='string'?d.t.slice(0,20):'';if(r.char)r.char.setRank(r.rk);r.q=(d.q===1||d.q===2||d.q===3)?d.q:0;r.ty=fin(d.y)?d.y:0;r.tx=d.x;r.tz=d.z;r.tyaw=fin(d.r)?d.r:0;
  if(!r.char&&!r.pending){
   r.pending=true;
   loadGltf(r.g).then(gl=>{
    if(!remotes.has(id))return;r.char=new Char(gl,r.name,r.g,false);r.char.setRank(r.rk);r.char.root.position.set(r.tx,0,r.tz);
    say(r.name+' olamga kirdi');tone(880,.15,.1,'sine',1200);$('cn').textContent=remotes.size+1;
   }).catch(()=>{r.pending=false});
  }
 }else if(d.k==='l'){const r=remotes.get(id);if(r){if(r.char)r.char.dispose();remotes.delete(id);say(r.name+' chiqib ketdi');$('cn').textContent=remotes.size+1}}
 else if(d.k==='c'){const r=remotes.get(id),t=String(d.t||'').slice(0,140);if(!r||!t)return;sndMsg();
  if(r.char)r.char.say(t);else say(r.name+': '+t)}
 else if(d.k==='a'){const r=remotes.get(id);if(!r||!r.char)return;
  if(d.a==='punch'){r.char.punch(d.c|0);if(me&&r.char.root.position.distanceTo(me.root.position)<20)sndPunch()}
  else if(d.a==='wave')r.char.wave(2)
  else if(d.a==='flip')r.char.flip(String(d.f||'f'))
  else if(d.a==='sflip')r.char.flip('s')}
 else if(d.k==='r'||d.k==='b'){if(W)W.onNet(id,d)}
 else if(d.k==='h'||d.k==='f'||d.k==='t'||d.k==='lv'){if(CB)CB.onNet(id,d)}
 else if(d.k==='v'){playVoice(id,d)}
}
/* ===== CHAT ===== */
let chatT=0;
function sendChat(){
 const inp=$('messageInput'),t=inp.value.trim().slice(0,140);
 if(!t||!me||performance.now()-chatT<500)return;chatT=performance.now();inp.value='';
 if(isBad(t)){addScore(-30);toast('Haqoratli so‘z: -30 bal');say('Haqoratli so‘z yozganingiz uchun -30 bal');return}
 initAudio();sndSend();me.say(t);netSend({k:'c',t});
 toggleChat(false);
}
/* ===== OVOZLI RATSIYA (bir marta bosish = yoqish, yana bosish = o'chirish) ===== */
const VO={on:false,stream:null,mime:'',tmr:0,rec:null,q:new Map(),talk:new Map()};
async function micInit(){
 if(VO.stream)return true;
 try{VO.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
  VO.mime=['audio/webm;codecs=opus','audio/mp4','audio/webm','audio/ogg;codecs=opus'].find(m=>window.MediaRecorder&&MediaRecorder.isTypeSupported(m))||'';return true}
 catch(e){say('Mikrofon ishlamadi: ruxsat bering (sahifa HTTPS da ochilishi kerak)');return false}
}
function sendVoice(blob,last){const rd=new FileReader();rd.onload=()=>{const b=String(rd.result).split(',')[1];if(b)netSend({k:'v',b,e:last?1:0})};rd.readAsDataURL(blob)}
function seg(){
 if(!VO.on)return;const ch=[];let r;
 try{r=new MediaRecorder(VO.stream,VO.mime?{mimeType:VO.mime,audioBitsPerSecond:24000}:{audioBitsPerSecond:24000})}
 catch(e){VO.on=false;$('ptt').classList.remove('on');say('Ovoz yozish bu qurilmada ishlamaydi');return}
 r.ondataavailable=e=>{if(e.data&&e.data.size)ch.push(e.data)};
 r.onstop=()=>{if(ch.length)sendVoice(new Blob(ch,{type:r.mimeType||VO.mime}),!VO.on)};
 r.start();VO.rec=r;VO.tmr=setTimeout(()=>{try{r.stop()}catch(e){}seg()},1000);
}
async function pttDown(){
 initAudio();if(VO.on||!started)return;
 if(!netUp()){say('Ratsiya uchun onlayn bo‘ling');return}
 VO.on=true;$('ptt').classList.add('on');
 if(!await micInit()){VO.on=false;$('ptt').classList.remove('on');return}
 if(!VO.on)return;sndPtt();seg();
}
function pttUp(){
 if(!VO.on)return;VO.on=false;$('ptt').classList.remove('on');clearTimeout(VO.tmr);
 try{VO.rec&&VO.rec.state!=='inactive'&&VO.rec.stop()}catch(e){}sndPtt();
}
function playVoice(id,d){
 if(!AC||muted||typeof d.b!=='string'||d.b.length>90000)return;
 let ab;try{const bin=atob(d.b),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);ab=u.buffer}catch(e){return}
 new Promise((ok,no)=>AC.decodeAudioData(ab,ok,no)).then(buf=>{
  const st=VO.q.get(id)||{next:0};VO.q.set(id,st);const now=AC.currentTime;
  if(st.next<now-.05){noise('bandpass',2500,.09,.2);st.next=now+.1}
  const s=AC.createBufferSource();s.buffer=buf;s.connect(master);s.start(st.next);st.next+=buf.duration;
  VO.talk.set(id,performance.now()+(st.next-now)*1000+300);
 }).catch(()=>{});
}
let radTxt='',radAct=false;
function updRadio(){
 const now=performance.now(),nm=[];
 VO.talk.forEach((t,id)=>{if(t>now){const r=remotes.get(id);nm.push(r?r.name:'Taiman')}});
 const act=VO.on||nm.length>0,txt=VO.on?'Mikrofon yoniq — o‘chirish uchun yana bosing':nm.length?''+nm.join(', ')+' gapirmoqda':'Ratsiya: o‘chiq';
 if(act!==radAct){radAct=act;$('radio').classList.toggle('act',act)}
 if(txt!==radTxt){radTxt=txt;$('radio').textContent=txt}
}
/* ===== YUKLASH VA PERSONAJ TANLASH ===== */
let selG=-1;const okM=[],gls=[];let savedId='';
try{$('nick').value=localStorage.getItem('tg_n')||'';savedId=localStorage.getItem('tg_c')||''}catch(e){}
function pickChar(i){if(!okM[i])return;selG=i;document.querySelectorAll('.card').forEach((c,k)=>c.classList.toggle('s',k===i))}
function buildGrid(){
 $('grid').innerHTML='';
 CHARS.forEach((c,i)=>{const b=document.createElement('button');b.className='card'+(okM[i]?'':' na');
  const im=new Image();im.src=c.img;im.alt=c.name;im.draggable=false;im.onerror=()=>im.remove();
  const sp=document.createElement('span');sp.textContent=c.name;b.append(im,sp);b.onclick=()=>pickChar(i);$('grid').appendChild(b)});
 let f=CHARS.findIndex((c,i)=>c.id===savedId&&okM[i]);if(f<0)f=okM.findIndex(Boolean);
 if(f>=0)pickChar(f);else $('go').disabled=true;
 const miss=CHARS.filter((c,i)=>!okM[i]).map(c=>c.model);
 if(miss.length)$('msg').textContent='Topilmadi: '+miss.join(', ')+' (index bilan bir papkada bo‘lsin)';
}
function warmup(){
 try{
  const kept=[],fc=[];
  gls.forEach(gl=>{if(!gl)return;gl.scene.traverse(o=>{if(o.isMesh){kept.push([o,o.castShadow,o.receiveShadow]);o.castShadow=o.receiveShadow=true}});scene.add(gl.scene)});
  scene.traverse(o=>{if(o.frustumCulled!==false){fc.push(o);o.frustumCulled=false}
   const ms=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];
   ms.forEach(mt=>{for(const k in mt){const v=mt[k];if(v&&v.isTexture)renderer.initTexture(v)}})});
  renderer.render(scene,camera);
  fc.forEach(o=>{o.frustumCulled=true});
  gls.forEach(gl=>{if(gl)scene.remove(gl.scene)});
  kept.forEach(([o,c,r])=>{o.castShadow=c;o.receiveShadow=r});
 }catch(e){console.warn('warmup',e)}
}
async function preload(){
 const prog=CHARS.map(()=>0),bar=$('barf'),tx=$('ldt');
 const upd=()=>{const v=Math.round(prog.reduce((a,b)=>a+b,0)/CHARS.length*100);bar.style.width=v+'%';tx.textContent='Yuklanmoqda… '+v+'%'};
 await Promise.all(CHARS.map((c,i)=>loadGltf(i,f=>{prog[i]=Math.min(.99,f);upd()})
  .then(gl=>{okM[i]=true;gls[i]=gl}).catch(e=>{console.error(c.model,e);okM[i]=false}).then(()=>{prog[i]=1;upd()})));
 await new Promise(r=>setTimeout(r,350));
 warmup();
 buildGrid();$('intro').classList.remove('loading');rotHint();
}
/* telefonni birinchi marta portret holatda ochganda: gorizontal o'ynash eslatiladi (bir marta) */
function rotHint(){
 let seen=false;try{seen=!!localStorage.getItem('tg_rot')}catch(e){}
 const box=$('rot'),port=()=>innerHeight>innerWidth,mob=()=>matchMedia('(pointer:coarse)').matches||innerWidth<700||/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
 if(seen||!mob()||!port())return;
 const done=()=>{box.classList.remove('open');try{localStorage.setItem('tg_rot','1')}catch(e){}};
 box.classList.add('open');
 $('rotOk').onclick=()=>{done();try{screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape').catch(()=>{})}catch(e){}};
 addEventListener('resize',()=>{if(!port()&&box.classList.contains('open'))done()});
}
init();createControls();animate();preload();
$('go').onclick=async()=>{
 if(selG<0)return;
 const nk=$('nick').value.trim().slice(0,16);
 myInfo.name=nk||('Taiman'+Math.floor(100+Math.random()*900));myInfo.g=selG;
 try{localStorage.setItem('tg_n',nk);localStorage.setItem('tg_c',CHARS[selG].id)}catch(e){}
 initAudio();$('go').disabled=true;
 try{
  const gl=await loadGltf(selG);
  me=new Char(gl,myInfo.name,selG,true);me.root.position.set((Math.random()-.5)*10,0,(Math.random()-.5)*10);if(P.rank)me.setRank(P.rank);
 }catch(e){console.error(e);$('msg').textContent='Model yuklanmadi: '+CHARS[selG].model;$('go').disabled=false;return}
 $('intro').style.display='none';started=true;tone(660,.15,.12,'sine',990);
 say('Salom, '+myInfo.name+'!');connect();if(CB)CB.start();
};
/* ===== SIKL ===== */
function animate(t){
 requestAnimationFrame(animate);
 if(t===undefined)t=performance.now();
 if(document.hidden)return;
 if(MIN_DT&&lastT&&t-lastT<MIN_DT)return;   // ~60 FPS chegarasi: 90/120 Hz ekranlarda qizishni kamaytiradi
 const raw=lastT?Math.max(0,(t-lastT)/1000):1/60;lastT=t;const dt=Math.min(raw,.05);
 if(started){
  warmT+=raw;
  if(raw>.25){fpsN=0;fpsT=0}
  else if(warmT>2.5){fpsN++;fpsT+=raw;if(fpsT>1.5){const f=fpsN/fpsT;fpsN=0;fpsT=0;
   if(f<50){if(++fpsBad>=2&&PRcur>PRmin){fpsBad=0;PRcur=Math.max(PRmin,PRcur-.25);applyPR()}}else fpsBad=0}}
 }
 updateMe(dt);updateWorld(dt);updateRemotes(dt);updateCamera(dt);cullChars();
 if(me)placeBubble(me);if(CB)CB.bots.forEach(b=>placeBubble(b.c));if(W)W.dancers.forEach(c=>placeBubble(c));updPops(dt);updCtx();remotes.forEach(r=>{if(r.char)placeBubble(r.char)});
 updRadio();
 renderer.render(scene,camera);
}
