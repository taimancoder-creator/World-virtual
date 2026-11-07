// Politsiya botlari: 3 ta patrul. O'yinchi qoida buzsa (odam yoki botni urish, politsiyaga qarshilik) — yugurib kelib hibsga oladi.
// main.js dan initPolice(C) bilan ulanadi. Model: police.glb (index.html bilan bir papkada).
const R=Math.random;
const NAMES=['Inspektor Aziz','Inspektor Jasur','Inspektor Dilnoza'];
const HOME=[[6,-9],[-8,9],[22,-3]];
const ARREST=['To‘xtang! Siz hibsga olindingiz!','Qonunni buzdingiz, men bilan yuring!','Qo‘lingizni ko‘rsating, hibsdasiz!'];
const WARN=['Qoidani buzmang!','Ushlang uni!','Qonunbuzar! To‘xting!'];
const CHASE_SPD=5.6,PATROL_SPD=1.5,WANTED_T=25,RANGE=1.5;
export function initPolice(C){
 const {toast,tone,addScore,addMoney,body,P}=C,cops=[];
 let wanted=0,arrestT=0,cd=0,boot=false;
 const me=()=>C.me();
 const inMain=()=>{const m=me();return m&&m.root.position.z<C.far-400};
 function crime(why){
  if(!inMain()||P.hacker)return;
  const first=wanted<=0;wanted=WANTED_T;
  if(first){toast('Qoida buzildi: '+why+'! Politsiya sizni qidirmoqda');tone(500,.5,.15,'sawtooth',900);
   const c=cops[(R()*cops.length)|0];if(c)c.c.say(WARN[(R()*WARN.length)|0])}
 }
 function release(){
  const m=me();if(!m)return;
  m.lock=0;m.lockN='';m.root.position.set(0,0,14);m.vx=m.vz=m.vy=0;wanted=0;cd=6;arrestT=0;
  toast('Siz ozod qilindingiz. Qoidani buzmang!');
 }
 function arrest(cop){
  const m=me();if(!m||arrestT>0)return;
  arrestT=3.5;wanted=0;const fine=Math.min(P.money,Math.max(50,Math.round(P.money*.1)));
  addMoney(-fine);addScore(-30);
  m.lock=m.lockT=3.5;m.lockN='arrest';m.vx=m.vz=0;
  cop.c.say(ARREST[(R()*ARREST.length)|0]);tone(300,.6,.2,'square',150);
  toast('Siz hibsga olindingiz! Jarima: $'+fine+', -30 bal');
 }
 function start(){
  if(boot||!C.loadModel)return;boot=true;
  HOME.forEach((h,i)=>setTimeout(()=>C.loadModel('police.glb',NAMES[i],h[0],h[1]).then(c=>{c.setRank('POLITSIYA');c.tagCol='#4d9bff';
   cops.push({c,hx:h[0],hz:h[1],tg:null,w:1+R()*4,t:0})}).catch(e=>console.warn('police.glb yuklanmadi',e)),i*300));
 }
 function update(dt){
  const m=me();if(!m)return;const p=m.root.position;
  if(arrestT>0){arrestT-=dt;if(arrestT<=0)release()}
  cd-=dt;
  const main=inMain();
  if(!main)wanted=0;
  if(wanted>0&&arrestT<=0){
   // juda uzoqda bo'lsa vaqt tezroq tugaydi (o'yinchi qochib qutuldi)
   let near=1e9;for(const o of cops)near=Math.min(near,Math.hypot(o.c.root.position.x-p.x,o.c.root.position.z-p.z));
   wanted-=dt*(near>45?3:1);
  }
  for(const o of cops){const c=o.c;let tx=0,tz=0,has=false;
   if(wanted>0&&main&&arrestT<=0){
    const dx=p.x-c.root.position.x,dz=p.z-c.root.position.z,d=Math.hypot(dx,dz);
    if(d<RANGE&&p.y<2&&cd<=0)arrest(o);
    else if(d>RANGE*.8){has=true;tx=dx/d*CHASE_SPD;tz=dz/d*CHASE_SPD}
   }else if(arrestT>0){/* hibsga olish: turib turadi */}
   else{
    if(o.w>0)o.w-=dt;
    else{
     if(!o.tg){const a=R()*6.283,r=3+R()*8;o.tg={x:o.hx+Math.cos(a)*r,z:o.hz+Math.sin(a)*r};o.t=0}
     const dx=o.tg.x-c.root.position.x,dz=o.tg.z-c.root.position.z,d=Math.hypot(dx,dz);o.t+=dt;
     if(d<.5||o.t>10){o.tg=null;o.w=2+R()*5}else{has=true;tx=dx/d*PATROL_SPD;tz=dz/d*PATROL_SPD}
    }
   }
   body(c,tx,tz,has,dt,false);
   if(arrestT>0&&!has){const dx=p.x-c.root.position.x,dz=p.z-c.root.position.z;c.root.rotation.y=Math.atan2(dx,dz)}
   if(c.root.visible||c.bt>0)c.update(dt);
  }
 }
 return{update,start,crime,cops,get wanted(){return wanted}};
}
