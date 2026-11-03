import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import {initWorld} from './world.js';
import {initCombat} from './combat.js';
import {initUI} from './ui.js';
import {buildTerrain,buildSky,groundMat} from './terrain.js';

const $=id=>document.getElementById(id);
// personajlar: rasm (img) va model (model) nomi bir xil. Yangi personaj qo'shish uchun shu ro'yxatga qator qo'shing
const CHARS=[
 {id:'adam',name:'Adam',model:'adam.glb',img:'adam.png'},
 {id:'eva',name:'Eva',model:'eva.glb',img:'eva.png'},
 {id:'jack',name:'Jack',model:'jack.glb',img:'jack.png'},
 {id:'lily',name:'Lily',model:'lily.glb',img:'lily.png'}];
const WALK=2.8,RUN=5.4,RUN_AT=.88,G=24,JUMP=9;
const clamp=THREE.MathUtils.clamp;

let scene,camera,renderer,clock,sun,me=null,started=false,jumpReq=false;
const loader=new GLTFLoader(),gltfCache=new Map();
const myInfo={name:'Taiman',g:0,id:Math.random().toString(36).slice(2,10)};
const remotes=new Map(),joyDir=new THREE.Vector2(),keys={};
let cameraAngle=0,cameraPitch=.2,camPointer=null,lastX=0,lastY=0,joystickPointer=null,stepT=0,camDist=3.8,camK=1;
let fpsN=0,fpsT=0,PRmax=1.75,PRcur=1.75,fpsBad=0,warmT=0,lastT=0;
const applyPR=()=>renderer.setPixelRatio(Math.min(devicePixelRatio,PRcur));
const _SL=new THREE.Vector3(30,60,20),_SR=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),_SL).normalize(),_SU=new THREE.Vector3().crossVectors(_SL,_SR).normalize(),_ST=32/1024,_bp=new THREE.Vector3();
const _fr=new THREE.Frustum(),_pm=new THREE.Matrix4(),_sp=new THREE.Sphere(new THREE.Vector3(),3.2);
const shortest=a=>Math.atan2(Math.sin(a),Math.cos(a));

/* ===== OVOZ ===== */
let AC=null,master=null,noiseBuf=null,muted=false;
function initAudio(){
 if(AC){if(AC.state==='suspended')AC.resume();return}
 const A=window.AudioContext||window.webkitAudioContext;if(!A)return;
 AC=new A();master=AC.createGain();master.gain.value=.9;master.connect(AC.destination);
 noiseBuf=AC.createBuffer(1,AC.sampleRate*.4,AC.sampleRate);
 const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
}
function noise(type,freq,dur,vol,to){
 if(!AC||vol<.01)return;const t=AC.currentTime,s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();
 s.buffer=noiseBuf;s.playbackRate.value=.8+Math.random()*.4;f.type=type;f.frequency.setValueAtTime(freq,t);
 if(to)f.frequency.exponentialRampToValueAtTime(to,t+dur);
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
 s.connect(f);f.connect(g);g.connect(master);s.start(t);s.stop(t+dur+.02);
}
function tone(f0,dur,vol,type,f1){
 if(!AC)return;const t=AC.currentTime,o=AC.createOscillator(),g=AC.createGain();
 o.type=type||'sine';o.frequency.setValueAtTime(f0,t);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+dur);
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
 o.connect(g);g.connect(master);o.start(t);o.stop(t+dur+.02);
}
const sndStep=(v=1)=>{noise('lowpass',420+Math.random()*300,.14,.45*v);tone(70+Math.random()*20,.1,.12*v,'sine',45)};
const sndSend=()=>tone(660,.12,.12,'triangle',880);
const sndMsg=()=>{tone(740,.1,.12,'triangle');setTimeout(()=>tone(990,.14,.12,'triangle'),90)};
const sndPunch=()=>{noise('bandpass',1800,.18,.5,300);setTimeout(()=>{noise('lowpass',300,.15,.7);tone(110,.15,.3,'sine',50)},90)};
const sndPtt=()=>tone(1100,.06,.1,'square');
const sndJump=n=>tone(n>1?520:380,.18,.14,'sine',n>1?950:650);
const sndLand=()=>{noise('lowpass',300,.12,.5);tone(90,.1,.2,'sine',50)};
document.addEventListener('pointerdown',initAudio);
$('mute').onclick=e=>{e.stopPropagation();initAudio();muted=!muted;if(master)master.gain.value=muted?0:.9;$('mute').classList.toggle('m',muted)};

/* ===== BAL, MAQOM, FILTR, CHEAT OYNASI ===== */
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
 const cmd=(c==='inf'&&(A[0]||'').toLowerCase()==='money')?'infmoney':c;
 switch(cmd){
  case 'infmoney':P.inf=!P.inf;ok();break;
  case 'godmode':P.god=!P.god;ok();break;
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
const mat=(c,e,i)=>new THREE.MeshStandardMaterial({color:c,roughness:.7,emissive:e||0,emissiveIntensity:i||0});
function put(m,x,y,z,sh){m.position.set(x,y,z);if(sh!==false)m.castShadow=m.receiveShadow=true;scene.add(m);return m}
function slab(x,z,w,d,h,m,y0=0){const q=put(new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m),x,y0+h/2,z);solids.push({x,z,hx:w/2,hz:d/2,top:y0+h,y0});return q}

function buildWorld(){
 const gr=put(new THREE.Mesh(new THREE.PlaneGeometry(700,700),groundMat()),0,0,0,false);gr.rotation.x=-Math.PI/2;gr.receiveShadow=true;
 buildTerrain(scene);buildSky(scene);
}
let W=null,CB=null;
function updateWorld(dt){
 if(W)W.update(dt);if(CB)CB.update(dt);
 // === bu yerga sahna animatsiyalari (kun/tun, aylanuvchi obyektlar...) qo'shiladi ===
 if(me){const t=me.root.position,a=t.x*_SR.x+t.z*_SR.z,b=t.x*_SU.x+t.z*_SU.z,da=a-Math.round(a/_ST)*_ST,db=b-Math.round(b/_ST)*_ST,
  tx=t.x-da*_SR.x-db*_SU.x,ty=-da*_SR.y-db*_SU.y,tz=t.z-da*_SR.z-db*_SU.z;
  sun.target.position.set(tx,ty,tz);sun.position.set(tx+30,ty+60,tz+20)}
}

function fitCam(){const a=innerWidth/innerHeight,w=a>1.2;camera.aspect=a;camera.fov=w?42:52;camK=w?.87:1;camera.updateProjectionMatrix();if(renderer){PRmax=w?1.5:1.75;PRcur=Math.min(PRcur,PRmax);applyPR()}}
function init(){
 scene=new THREE.Scene();scene.background=new THREE.Color(0xbcd3e0);scene.fog=new THREE.Fog(0xbcd3e0,60,330);
 camera=new THREE.PerspectiveCamera(52,innerWidth/innerHeight,.1,500);
 renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
 renderer.setSize(innerWidth,innerHeight);applyPR();
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
 document.body.appendChild(renderer.domElement);
 clock=new THREE.Clock();
 scene.add(new THREE.HemisphereLight(0xffffff,0x526174,1.4));
 sun=new THREE.DirectionalLight(0xffffff,2);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
 Object.assign(sun.shadow.camera,{left:-16,right:16,top:16,bottom:-16,far:160});scene.add(sun,sun.target);
 const UI=initUI();buildWorld();W=initWorld({ask:UI.ask,input:UI.input,scene,solids,mat,put,slab,toast,tone,P,netSend,me:()=>me,remotes,myInfo,addScore,addMoney});
 CB=initCombat({ask:UI.ask,scene,P,toast,tone,netSend,remotes,myInfo,addScore,say,body,houses:W.houses,me:()=>me,nChars:CHARS.length,spawn:(g,n,x,z)=>loadGltf(g).then(gl=>{const c=new Char(gl,n,g,false);c.root.position.set(x,0,z);return c})});
 camera.position.set(0,3,-6);
 fitCam();{const rs=()=>{const ae=document.activeElement;if(ae&&ae.tagName==='INPUT'&&innerWidth===rs.w)return;rs.w=innerWidth;fitCam();renderer.setSize(innerWidth,innerHeight)};rs.w=innerWidth;addEventListener('resize',rs);addEventListener('orientationchange',()=>setTimeout(rs,250))}
}

/* ===== PERSONAJ (GLB) ===== */
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
 root.add(obj);return root;
}
function tagSprite(name,color,rank){
 const cn=document.createElement('canvas');cn.width=256;cn.height=rank?96:64;const x=cn.getContext('2d'),y=rank?74:42;
 x.textAlign='center';x.shadowColor='#000';x.shadowBlur=6;
 if(rank){x.font='bold 22px system-ui,sans-serif';x.fillStyle='#ffd24a';x.shadowColor='#ff9d00';x.fillText(rank,128,32)}
 x.font='bold 30px system-ui,sans-serif';x.shadowColor='#000';x.fillStyle=color;x.fillText(name,128,y);
 const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cn),transparent:true,depthWrite:false,fog:false}));
 sp.scale.set(1.6,rank?.6:.4,1);sp.position.y=rank?2.25:2.15;return sp;
}
const _p0=new THREE.Vector3(),_p1=new THREE.Vector3(),_p2=new THREE.Vector3(),_t1=new THREE.Vector3(),_t2=new THREE.Vector3(),_a=new THREE.Vector3(),_Z=new THREE.Vector3(0,0,1),_q1=new THREE.Quaternion(),_q3=new THREE.Quaternion(),_q4=new THREE.Quaternion(),_q5=new THREE.Quaternion(),_q6=new THREE.Quaternion(),_q7=new THREE.Quaternion();
class Char{
 constructor(gltf,name,g,isMe){
  const clone=SkeletonUtils.clone(gltf.scene);
  this.root=prepare(clone);this.model=clone;this.base=clone.position.clone();this.acts={};this.cur=null;this.lock=0;this.lockT=1;this.name=name;this.g=g;
  this.moving=false;this.running=false;this.air=false;this.grounded=true;this.speed=0;this.vx=0;this.vz=0;this.vy=0;this.jc=0;this.ph=0;this.mw=0;this.aw=0;this.limbs=[];
  this.wv=0;this.wvw=0;this.wvT=0;this.pw=0;this.pt=0;this.pk='h';this.ps=1;this.mod=new Map();this.combo=0;this.lockN='';this.fixY=0;this.feet=[];this.h0=0;
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
  const ww=this.wvw,pw=this.pw;
  // oldingi kadrda biz o'zgartirgan, lekin animatsiya qayta yozmagan suyaklarni asl holiga qaytaramiz (qotib qolmasligi uchun)
  if(this.mod.size){for(const [b,m] of this.mod)if(b.quaternion.equals(m.last))b.quaternion.copy(m.base);this.root.updateMatrixWorld(true);this.mod.clear()}
  if(ww<.01&&pw<.01)return;
  this.root.updateMatrixWorld(true);this.root.getWorldQuaternion(_q1);
  const aim=(b,c,t,w)=>{b.getWorldPosition(_p0);c.getWorldPosition(_p1);_p1.sub(_p0);if(_p1.lengthSq()<1e-8)return;_p1.normalize();
   _p2.copy(t).normalize().applyQuaternion(_q1);_q5.setFromUnitVectors(_p1,_p2);_q6.identity().slerp(_q5,w);
   b.getWorldQuaternion(_q7);_q7.premultiply(_q6);b.parent.getWorldQuaternion(_q3);b.quaternion.copy(_q3.invert().multiply(_q7))};
  const sm=x=>x*x*(3-2*x),t=this.pt;
  for(const L of this.limbs){
   if(!L.ch)continue;const s=L.side;let w=0;
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
   }else continue;
   for(const b of [L.b,L.ch,L.ch2])if(b&&!this.mod.has(b))this.mod.set(b,{base:b.quaternion.clone(),last:null});
   aim(L.b,L.ch,_t1,w);
   if(L.ch2){L.b.updateMatrixWorld(true);aim(L.ch,L.ch2,_t2,w)}
  }
  this.mod.forEach((m,b)=>{m.last=b.quaternion.clone()});
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
  if(this.lock>0)this.lock-=dt;
  {
   let n=this.moving?(this.running?'run':'walk'):'idle';
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
  this.pt=clamp(1-this.lock/this.lockT,0,1);this.pw=(this.lock>0&&this.lockN==='punch')?clamp(Math.sin(Math.PI*this.pt)*3,0,1):0;
  this.armPose();
  if(this.feet.length){this.model.position.y=this.base.y;const need=clamp(this.h0-this.feetMin()-.02,0,.4);this.fixY+=(need-this.fixY)*Math.min(1,dt*18)}
  const run=clamp(this.speed/RUN,0,1);
  this.model.position.y=this.base.y+this.fixY+(this.acts.walk?0:Math.abs(Math.sin(this.ph))*.06*this.mw*(1+run));
  this.model.rotation.x+=((this.air?.08:this.running?.14:0)-this.model.rotation.x)*Math.min(1,dt*8);
  if(this.bt>0){this.bt-=dt;if(this.bt<=0)this.bubble.style.display='none'}
 }
 dispose(){scene.remove(this.root);this.bubble.remove()}
}
function placeBubble(ch){
 if(ch.bt<=0)return;const b=ch.bubble,p=_bp.copy(ch.root.position);p.y+=2.5;p.project(camera);
 if(p.z>1){b.style.opacity=0;return}b.style.opacity=1;
 if(!ch.bh)ch.bh=b.offsetHeight;
 const x=clamp((p.x*.5+.5)*innerWidth,110,innerWidth-110),y=Math.max(ch.bh+50,(-p.y*.5+.5)*innerHeight);
 b.style.transform='translate3d('+x.toFixed(1)+'px,'+y.toFixed(1)+'px,0) translate(-50%,-100%)';
}

function cullChars(){
 camera.updateMatrixWorld();_pm.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);_fr.setFromProjectionMatrix(_pm);
 const t=c=>{_sp.center.copy(c.root.position);_sp.center.y+=1;c.root.visible=_fr.intersectsSphere(_sp)};
 if(CB)CB.bots.forEach(b=>t(b.c));remotes.forEach(r=>{if(r.char)t(r.char)});
}

/* ===== LOG ===== */
function say(t){const d=document.createElement('div');d.textContent=t;$('log').appendChild(d);
 while($('log').children.length>4)$('log').firstChild.remove();setTimeout(()=>d.remove(),6000)}

/* ===== BOSHQARUV ===== */
function toggleChat(open){
 const p=$('chatPanel'),o=open===undefined?!p.classList.contains('open'):open;
 p.classList.toggle('open',o);$('chatBtn').classList.toggle('on',o);document.body.classList.toggle('chatting',o);
 if(o)setTimeout(()=>$('messageInput').focus(),60);else $('messageInput').blur();
}
function doPunch(){if(!me||me.lock>me.lockT*.45)return;sndPunch();me.punch(me.combo);if(CB)CB.hit();netSend({k:'a',a:'punch',c:me.combo});me.combo=(me.combo+1)%4}
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
 addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;keys[e.code]=true;if(e.code==='Space'){e.preventDefault();if(!e.repeat)jumpReq=true}});
 addEventListener('keyup',e=>{keys[e.code]=false});
 $('messageInput').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')sendChat();if(e.key==='Escape')toggleChat(false)});
 $('send').onclick=sendChat;
 $('chatBtn').onclick=()=>toggleChat();
 $('punch').addEventListener('pointerdown',e=>{e.preventDefault();doPunch()});
 $('jump').addEventListener('pointerdown',e=>{e.preventDefault();jumpReq=true});
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
 p.x=clamp(p.x+c.vx*dt,-90,90);p.z=clamp(p.z+c.vz*dt,-90,90);
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
 const len=Math.hypot(ix,iy),has=len>.12&&me.lock<=0;
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
 camY+=(c.y-camY)*(1-Math.exp(-dt*6));
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
  if(me)push2(me,c,1,0);
  c.update(dt);
 });
}

/* ===== TARMOQ (MQTT) ===== */
let net=null,mqttClient=null,lastSent='';
const loadJs=u=>new Promise((ok,no)=>{const e=document.createElement('script');e.src=u;e.onload=ok;e.onerror=no;document.head.appendChild(e)});
function netSend(o){try{if(mqttClient&&mqttClient.connected)mqttClient.publish(net.base,JSON.stringify({...o,id:myInfo.id}))}catch(e){}}
const fin=v=>typeof v==='number'&&isFinite(v);
async function connect(){
 if(!window.mqtt){try{await loadJs('https://cdn.jsdelivr.net/npm/mqtt@5.10.1/dist/mqtt.min.js')}catch(e){try{await loadJs('https://unpkg.com/mqtt@5.10.1/dist/mqtt.min.js')}catch(e2){say('Tarmoq kutubxonasi yuklanmadi: yolg‘iz rejim');return}}}
 const code=(location.hash.match(/r=([a-z0-9]{4,12})/)||[])[1]||'olam';
 net={base:'taiman-gta-v1/'+code};
 const B=['wss://broker.emqx.io:8084/mqtt','wss://broker.hivemq.com:8884/mqtt','wss://test.mosquitto.org:8081'];
 let bi=0,fails=0,up=false;
 function go(){
  const u=B[bi%B.length];let ok=false,dead=false;
  const c=mqtt.connect(u,{clientId:'tg'+myInfo.id+bi,keepalive:30,reconnectPeriod:2000,connectTimeout:6000,clean:true,
   will:{topic:net.base,payload:JSON.stringify({k:'l',id:myInfo.id}),qos:0}});
  mqttClient=c;
  const bad=()=>{if(ok||dead)return;dead=true;clearTimeout(to);try{c.end(true)}catch(e){}bi++;fails++;setTimeout(go,Math.min(6000,700*fails))};
  const to=setTimeout(bad,8000);
  c.on('connect',()=>{ok=true;clearTimeout(to);fails=0;c.subscribe(net.base,err=>{if(err)return;up=true;$('chip').classList.remove('off');say('Onlayn olamga ulandingiz');sendPresence()})});
  c.on('message',(t,m)=>{try{const d=JSON.parse(m.toString());if(d&&typeof d==='object'&&d.id&&d.id!==myInfo.id)handle(d)}catch(e){}});
  c.on('close',()=>{if(!ok)bad();else if(up){up=false;$('chip').classList.add('off');say('Aloqa uzildi, qayta ulanmoqda…')}});
  c.on('error',()=>{if(!ok)bad()});
 }
 go();
 setInterval(sendPresence,110);
 addEventListener('pagehide',()=>netSend({k:'l'}));
}
function sendPresence(){
 if(!me)return;const p=me.root.position;
 const o={k:'p',n:myInfo.name,g:myInfo.g,s:P.score,t:P.rank||'',x:+p.x.toFixed(2),y:+p.y.toFixed(2),z:+p.z.toFixed(2),r:+me.root.rotation.y.toFixed(2)};
 const s=o.x+'|'+o.y+'|'+o.z+'|'+o.r+'|'+o.s+'|'+o.t;
 if(s===lastSent&&performance.now()-(sendPresence.t||0)<1000)return;
 lastSent=s;sendPresence.t=performance.now();netSend(o);
}
function handle(d){
 const id=String(d.id);
 if(d.k==='p'){
  if(!fin(d.x)||!fin(d.z))return;
  let r=remotes.get(id);
  if(!r){r={char:null,pending:false,name:String(d.n||'Taiman').slice(0,16),g:(Number.isInteger(d.g)&&d.g>=0&&d.g<CHARS.length)?d.g:0,tx:d.x,tz:d.z,ty:0,tyaw:d.r||0,seen:Date.now()};remotes.set(id,r)}
  r.seen=Date.now();r.score=fin(d.s)?d.s:0;r.rk=typeof d.t==='string'?d.t.slice(0,20):'';if(r.char)r.char.setRank(r.rk);r.ty=fin(d.y)?d.y:0;r.tx=d.x;r.tz=d.z;r.tyaw=fin(d.r)?d.r:0;
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
  else if(d.a==='wave')r.char.wave(2)}
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
 if(!mqttClient||!mqttClient.connected){say('Ratsiya uchun onlayn bo‘ling');return}
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
 buildGrid();$('intro').classList.remove('loading');
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
 const raw=lastT?Math.max(0,(t-lastT)/1000):1/60;lastT=t;const dt=Math.min(raw,.05);
 if(started){
  warmT+=raw;
  if(raw>.25){fpsN=0;fpsT=0}
  else if(warmT>2.5){fpsN++;fpsT+=raw;if(fpsT>1.5){const f=fpsN/fpsT;fpsN=0;fpsT=0;
   if(f<50){if(++fpsBad>=2&&PRcur>1){fpsBad=0;PRcur=Math.max(1,PRcur-.25);applyPR()}}else fpsBad=0}}
 }
 updateMe(dt);updateWorld(dt);updateRemotes(dt);updateCamera(dt);cullChars();
 if(me)placeBubble(me);if(CB)CB.bots.forEach(b=>placeBubble(b.c));remotes.forEach(r=>{if(r.char)placeBubble(r.char)});
 updRadio();
 renderer.render(scene,camera);
}
