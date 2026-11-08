import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {batchStatic} from './batch.js';
// Binolar: uy (tomi, eshigi, derazalari, mebel), bank (ustunlar, pediment, zinapoya), bar (soyabon, vitrina), park (favvora, skameykalar), daraxt.
// Statik guruh: matritsalar bir marta hisoblanib qotiriladi (har kadrda qayta hisoblanmaydi), kameradan tashqarida o'chiriladi (main.js: CULL)
function freeze(g){g.updateMatrixWorld(true);g.traverse(o=>{o.matrixAutoUpdate=false})}
const M=(c,o)=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.8},o||{}));
const BX=new THREE.BoxGeometry(1,1,1);
const SD=.85;   // o'tirganda personaj ildizi balandligi = o'rindiq usti - SD
function bx(p,w,h,d,m,x,y,z,sh=true){const o=new THREE.Mesh(BX,m);o.scale.set(w,h,d);o.position.set(x,y,z);if(sh)o.castShadow=o.receiveShadow=true;p.add(o);return o}
const TRIM=M(0x4a3626),WOOD=M(0x7a5232),STONE=M(0xd9d0b8),STONE2=M(0xb4aa90),
 GOLD=M(0xd4a62a,{metalness:.6,roughness:.35}),WALL=M(0xe6dcc2),ROOF=M(0xa5442e,{roughness:.9}),BRICK=M(0x8a4a3a),
 GLASS=M(0x9fd0f0,{roughness:.1,metalness:.3,emissive:0x2a4a66,emissiveIntensity:.5}),GLASSD=M(0x20324a,{roughness:.15,metalness:.4,emissive:0x1a2a40,emissiveIntensity:.6}),
 GABLE=new THREE.MeshStandardMaterial({color:0xe6dcc2,side:THREE.DoubleSide,roughness:.85}),AW1=M(0xc43b3b),AW2=M(0xf1e6d0),BRONZE=M(0x4a3418,{metalness:.4,roughness:.5});
function sign(t,fg,bg){
 const cn=document.createElement('canvas');cn.width=512;cn.height=128;const g=cn.getContext('2d');
 g.fillStyle=bg;g.fillRect(0,0,512,128);g.strokeStyle=fg;g.lineWidth=6;g.strokeRect(8,8,496,112);
 g.fillStyle=fg;g.font='bold 74px system-ui,Arial,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(t,256,68);
 const x=new THREE.CanvasTexture(cn);x.colorSpace=THREE.SRGBColorSpace;
 return new THREE.MeshStandardMaterial({map:x,roughness:.5,emissive:0xffffff,emissiveMap:x,emissiveIntensity:.4});
}
function win(p,x,z,rot,y=1.9){
 const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rot;
 bx(g,1.5,1.3,.44,TRIM,0,0,0);bx(g,1.26,1.06,.46,GLASS,0,0,0,false);bx(g,1.26,.07,.5,TRIM,0,0,0,false);bx(g,.07,1.06,.5,TRIM,0,0,0,false);bx(g,1.8,.1,.7,TRIM,0,-.7,0);
 p.add(g);
}
/* ---------- DARAXTLAR: 3D_daraxt.html prototipining 1:1 ko'chirmasi ----------
   Bir xil algoritm: rekursiv shoxlanish (tana -> shoxlar -> novdalar), bezye-egri shaklli barglar (tomir teksturasi bilan),
   po'stloq teksturasi + bump, "yoz" palitrasi. 0-variant prototipdagi birinchi daraxtning (seed 7) aynan o'zi.
   O'yin uchun: har variant bitta tana + bitta barg geometriyasiga birlashtiriladi, ular katakchalar bo'yicha InstancedMesh qilinadi. */
function rng(s){return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const MOBILE=typeof matchMedia==='function'&&(matchMedia('(pointer:coarse)').matches||innerWidth<700);
const CELL=24,TL=[85,175],LODC=[];   // CELL: daraxt katakchasi (m); TL: LOD masofalari (to'liq < 85 m <= o'rta < 175 m <= uzoq)
// SIFAT SOZLAMALARI. Kompyuter = prototip bilan bir xil (depth 6, dens .8). Sekin bo'lsa depth/seg/dens ni kamaytiring.
const TQ=MOBILE?{depth:5,seg:2,dens:.4,sides:[4,6],bark:1024,leaf:512}:{depth:6,seg:5,dens:.8,sides:[6,10],bark:2048,leaf:1024};
const TREE_SCALE=.75;                      // prototip daraxti ~8.5 birlik; o'yin o'lchamiga moslash (1 = prototipdagidek)
const TSEEDS=[7,4181,9317,23011];          // 4 ta variant
const SUMMER=[0x3f7d2c,0x4f9137,0x356b27,0x5ea040];
const _Y=new THREE.Vector3(0,1,0);
function barkTex(){
 const S=TQ.bark,c=document.createElement('canvas');c.width=c.height=S;const g=c.getContext('2d');
 g.fillStyle='#5a4130';g.fillRect(0,0,S,S);
 for(let i=0;i<2600;i++){
  const x=Math.random()*S,w=2+Math.random()*S/220,dark=Math.random()<.6;
  g.strokeStyle=dark?`rgba(28,18,10,${.15+Math.random()*.35})`:`rgba(150,115,80,${.1+Math.random()*.25})`;
  g.lineWidth=w;g.beginPath();g.moveTo(x,0);let px=x;
  for(let y=0;y<=S;y+=S/16){px+=(Math.random()-.5)*S/60;g.lineTo(px,y)}
  g.stroke();
 }
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;t.colorSpace=THREE.SRGBColorSpace;return t;
}
function leafTex(){
 const S=TQ.leaf,c=document.createElement('canvas');c.width=c.height=S;const g=c.getContext('2d');g.scale(S/256,S/256);
 g.fillStyle='#e9e9e9';g.fillRect(0,0,256,256);g.strokeStyle='#8a8a8a';g.lineCap='round';
 g.lineWidth=5;g.beginPath();g.moveTo(128,256);g.lineTo(128,6);g.stroke();g.lineWidth=2;
 for(let i=1;i<9;i++){const y=256-i*26;g.beginPath();g.moveTo(128,y);g.lineTo(128-70+i*3,y-34);g.moveTo(128,y);g.lineTo(128+70-i*3,y-34);g.stroke()}
 const t=new THREE.CanvasTexture(c);t.anisotropy=8;t.colorSpace=THREE.SRGBColorSpace;return t;
}
// barg shakli: prototipdagi bezye kontur, UV, uzunligi bo'ylab egilgan
function leafShape(seg){
 const sh=new THREE.Shape();sh.moveTo(0,0);sh.bezierCurveTo(.2,.08,.24,.42,0,.72);sh.bezierCurveTo(-.24,.42,-.2,.08,0,0);
 const g=new THREE.ShapeGeometry(sh,seg),p=g.attributes.position,uv=g.attributes.uv;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);uv.setXY(i,(x+.25)/.5,y/.72);p.setZ(i,-y*y*.35+Math.abs(x)*.25)}
 g.translate(0,-.36,0);g.computeVertexNormals();return g;
}
function makeVariant(seed){
 const V=THREE.Vector3,R=rng(seed),MAXD=TQ.depth,wood=[],pts=[],M4=new THREE.Matrix4(),Q=new THREE.Quaternion(),ONE=new V(1,1,1);
 function branch(start,dir,len,rad,depth){
  const geo=new THREE.CylinderGeometry(rad*.68,rad,len,depth>3?TQ.sides[0]:TQ.sides[1],1,true);
  geo.translate(0,len/2,0);geo.applyMatrix4(M4.compose(start,Q.setFromUnitVectors(_Y,dir),ONE));wood.push({g:geo,d:depth});
  const end=start.clone().addScaledVector(dir,len);
  if(depth>=MAXD-1){const n=depth===MAXD?14:4;for(let i=0;i<n;i++)pts.push(end.clone().add(new V((R()-.5)*1.3,(R()-.5)*1.1,(R()-.5)*1.3)))}
  if(depth>=MAXD)return;
  const kids=depth===0?4:(R()<.35?3:2);
  for(let k=0;k<kids;k++){
   const ang=.4+R()*.55+(depth===0?.15:0),az=(k/kids)*Math.PI*2+R()*.9,up=Math.abs(dir.y)<.99?_Y:new V(1,0,0),
    a=new V().crossVectors(dir,up).normalize(),b=new V().crossVectors(dir,a),
    d=dir.clone().multiplyScalar(Math.cos(ang)).addScaledVector(a,Math.sin(ang)*Math.cos(az)).addScaledVector(b,Math.sin(ang)*Math.sin(az));
   d.y+=.14;d.normalize();
   branch(depth===0?end.clone().addScaledVector(dir,-len*(.12*k)):end,d,len*(.74+R()*.1),rad*.66,depth+1);
  }
 }
 branch(new V(0,0,0),new V(0,1,0),2.8,.34,0);
 for(let i=pts.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[pts[i],pts[j]]=[pts[j],pts[i]]}
 // tana/shoxlar: maxD chuqurlikkacha (LOD da eng ingichka novdalar tashlanadi — uzoqdan ko'rinmaydi)
 const woodGeo=maxD=>{const w=mergeGeometries(wood.filter(x=>x.d<=maxD).map(x=>x.g));w.scale(TREE_SCALE,TREE_SCALE,TREE_SCALE);return w};
 // barglar: bitta geometriyaga qo'lda birlashtiriladi (tez). frac = barglar ulushi, mul = barg kattalashishi (qoplama yuzasi saqlanadi), seg = barg konturi aniqligi.
 // LOD 0 (frac=1, mul=1) avvalgi daraxt bilan AYNAN bir xil; LOD larda xuddi shu tasodifiy ketma-ketlik ishlatiladi (rang/burilish mos tushadi).
 const leafGeo=(frac,mul,seg)=>{
  const n=frac>=1?Math.floor(pts.length*TQ.dens):Math.max(6,Math.floor(pts.length*TQ.dens*frac)),LG=leafShape(seg),bp=LG.attributes.position,bn=LG.attributes.normal,bu=LG.attributes.uv,bi=LG.index.array,vc=bp.count,ic=bi.length,
   P=new Float32Array(n*vc*3),N=new Float32Array(n*vc*3),U=new Float32Array(n*vc*2),C=new Float32Array(n*vc*3),I=new Uint32Array(n*ic),
   R2=rng(seed*3+1),pos=new V(),nv=new V(),col=new THREE.Color(),eu=new THREE.Euler(),nm=new THREE.Matrix3();
  for(let l=0;l<n;l++){
   eu.set(R2()*6.28,R2()*6.28,R2()*6.28);const sc=(.5+R2()*.35)*mul;col.setHex(SUMMER[Math.floor(R2()*4)]);
   M4.compose(pts[l],Q.setFromEuler(eu),pos.set(sc,sc,sc));nm.getNormalMatrix(M4);
   for(let v=0;v<vc;v++){
    const o=(l*vc+v)*3;pos.set(bp.getX(v),bp.getY(v),bp.getZ(v)).applyMatrix4(M4);P[o]=pos.x;P[o+1]=pos.y;P[o+2]=pos.z;
    nv.set(bn.getX(v),bn.getY(v),bn.getZ(v)).applyMatrix3(nm).normalize();N[o]=nv.x;N[o+1]=nv.y;N[o+2]=nv.z;
    C[o]=col.r;C[o+1]=col.g;C[o+2]=col.b;U[(l*vc+v)*2]=bu.getX(v);U[(l*vc+v)*2+1]=bu.getY(v);
   }
   for(let k=0;k<ic;k++)I[l*ic+k]=bi[k]+l*vc;
  }
  const lg=new THREE.BufferGeometry();
  lg.setAttribute('position',new THREE.BufferAttribute(P,3));lg.setAttribute('normal',new THREE.BufferAttribute(N,3));
  lg.setAttribute('uv',new THREE.BufferAttribute(U,2));lg.setAttribute('color',new THREE.BufferAttribute(C,3));lg.setIndex(new THREE.BufferAttribute(I,1));
  lg.scale(TREE_SCALE,TREE_SCALE,TREE_SCALE);LG.dispose();return lg;
 };
 const out={w:[woodGeo(MAXD),woodGeo(MAXD-2),woodGeo(MAXD-3)],l:[leafGeo(1,1,TQ.seg),leafGeo(.34,1.7,Math.min(TQ.seg,3)),leafGeo(.12,2.8,Math.min(TQ.seg,2))]};
 wood.forEach(x=>x.g.dispose());return out;   // {w:[LOD0,LOD1,LOD2], l:[LOD0,LOD1,LOD2]}
}
let TV=null;
const BARK=barkTex(),TMAT=new THREE.MeshStandardMaterial({map:BARK,bumpMap:BARK,bumpScale:1.2,roughness:.95,metalness:0}),
 LMAT=new THREE.MeshStandardMaterial({map:leafTex(),vertexColors:true,side:THREE.DoubleSide,roughness:.75,metalness:0});
const TREG=new WeakMap();
export function treeParts(){if(!TV)TV=TSEEDS.map(makeVariant);return TV}
// daraxtlar ro'yxatga olinadi va bir marta (mikrotask) KICHIK katakchalar (CELL) bo'yicha InstancedMesh ga yig'iladi.
// Har katakchada 3 ta LOD to'plami bor (to'liq / o'rta / uzoq); qaysi biri ko'rinishi treeLOD() da kameradan masofaga qarab tanlanadi.
function flushTrees(parent,q){
 const V=treeParts(),cells=new Map();
 for(const t of q){const key=t.v+'|'+Math.floor(t.x/CELL)+'|'+Math.floor(t.z/CELL);let a=cells.get(key);if(!a)cells.set(key,a=[]);a.push(t)}
 const o=new THREE.Object3D(),col=new THREE.Color();
 for(const [key,a] of cells){
  const v=V[+key.split('|')[0]],sets=[0,1,2].map(l=>[new THREE.InstancedMesh(v.w[l],TMAT,a.length),new THREE.InstancedMesh(v.l[l],LMAT,a.length)]);
  let sx=0,sz=0;
  a.forEach((t,i)=>{o.position.set(t.x,0,t.z);o.rotation.set(t.rx,t.ry,t.rz);o.scale.set(t.sx,t.sy,t.sx);o.updateMatrix();
   const k=.88+Math.random()*.24;col.setRGB(k,k*(.96+Math.random()*.08),k*.96);sx+=t.x;sz+=t.z;
   for(const s of sets)for(const m of s){m.setMatrixAt(i,o.matrix);m.setColorAt(i,col)}});
  sets.forEach((s,l)=>{for(const m of s){m.castShadow=l===0;m.receiveShadow=false;m.visible=l===0;m.instanceMatrix.needsUpdate=true;m.computeBoundingSphere();parent.add(m)}});
  LODC.push({p:parent,x:sx/a.length,z:sz/a.length,sets,l:0});
 }
}
// har kadrda main.js dan chaqiriladi (arzon: ~100 katakcha). cam = kamera dunyo pozitsiyasi. Chegarada tebranmaslik uchun 8 m gisterezis.
// parent faqat siljigan bo'lishi mumkin (aylanmagan): Boqiy Shahar guruhi shunday.
export const treeStats=()=>{const a=[0,0,0];for(const c of LODC)a[c.l]++;return a};   // debug panel uchun: [to'liq, o'rta, uzoq] katakchalar soni
export function treeLOD(cam){
 for(const c of LODC){
  const d=Math.hypot(c.x+c.p.position.x-cam.x,c.z+c.p.position.z-cam.z);
  let l=d<TL[0]?0:d<TL[1]?1:2;
  if(l!==c.l){if(c.l===0&&d<TL[0]+8)l=0;else if(c.l===1&&d>TL[0]-8&&d<TL[1]+8)l=1;else if(c.l===2&&d>TL[1]-8)l=2}
  if(l!==c.l){for(const m of c.sets[c.l])m.visible=false;for(const m of c.sets[l])m.visible=true;c.l=l}
 }
}
export const makeTree=K=>(x,z)=>{
 let r=TREG.get(K.scene);if(!r)TREG.set(K.scene,r={q:[],p:false});
 const s=.85+Math.random()*.4;
 r.q.push({v:Math.floor(Math.random()*4),x,z,rx:(Math.random()-.5)*.05,ry:Math.random()*6.283,rz:(Math.random()-.5)*.05,sx:s*(.9+Math.random()*.2),sy:s*(.92+Math.random()*.22)});
 if(!r.p){r.p=true;Promise.resolve().then(()=>{const q=r.q;r.q=[];r.p=false;flushTrees(K.scene,q)})}
};

export function buildHouse(K,hx,hz,secret){
 const {scene,solids,coin,houses,spots}=K,own=[],slab=(...a)=>{const q=K.slab(...a);own.push(q);return q},flat=(...a)=>{const q=K.flat(...a);own.push(q);return q},H=3.4,g=new THREE.Group();scene.add(g);
 flat(9,9,0x8b6b4a,hx,hz,.04);flat(4,3,0x8a2b3a,hx,hz,.05);
 // devorlar (to'qnashuv bilan)
 slab(hx-2.85,hz+4.5,3.3,.3,H,WALL);slab(hx+2.85,hz+4.5,3.3,.3,H,WALL);slab(hx-4.5,hz,.3,9,H,WALL);slab(hx+4.5,hz,.3,9,H,WALL);slab(hx,hz+4.5,2.4,.3,.9,WALL,2.5);
 slab(hx-2.85,hz-4.5,3.3,.3,H,WALL);slab(hx+2.85,hz-4.5,3.3,.3,H,WALL);
 for(const sx of[-1,1])for(const sz of[-1,1])bx(g,.5,H+.1,.5,TRIM,hx+sx*4.6,(H+.1)/2,hz+sz*4.6);
 // derazalar
 for(const s of[-1,1]){win(g,hx+s*4.5,hz-2.1,Math.PI/2);win(g,hx+s*4.5,hz+2.1,Math.PI/2);win(g,hx+s*2.85,hz+4.5,0);if(!secret)win(g,hx+s*2.85,hz-4.5,0)}
 // eshik: romi, ochiq pallasi, zinapoya
 bx(g,.2,2.5,.5,TRIM,hx-1.3,1.25,hz+4.5);bx(g,.2,2.5,.5,TRIM,hx+1.3,1.25,hz+4.5);bx(g,2.8,.18,.55,TRIM,hx,2.53,hz+4.5);
 const dp=new THREE.Group();dp.position.set(hx-1.2,1.2,hz+4.52);dp.rotation.y=-1.25;bx(dp,1.15,2.35,.08,WOOD,.58,0,0);bx(dp,.08,.08,.12,GOLD,1.05,0,.06,false);g.add(dp);
 bx(g,3.4,.16,1.3,STONE2,hx,.08,hz+5.15);
 // tom (ichkariga kirganda yashiriladi)
 const roof=new THREE.Group(),R=2.5,L=6.1,al=Math.atan(R/5.5);
 for(const s of[1,-1])bx(roof,11.6,.26,L,ROOF,hx,H+R/2+.14,hz+s*2.75).rotation.x=s*al;
 bx(roof,11.7,.22,.5,TRIM,hx,H+R+.16,hz);
 const sh=new THREE.Shape();sh.moveTo(-5.45,0);sh.lineTo(5.45,0);sh.lineTo(0,R-.1);sh.lineTo(-5.45,0);const gg=new THREE.ShapeGeometry(sh);
 for(const s of[1,-1]){const m=new THREE.Mesh(gg,GABLE);m.position.set(hx+s*4.5,H,hz);m.rotation.y=Math.PI/2;roof.add(m)}
 bx(roof,.9,2.6,.9,BRICK,hx+2.8,H+1.4,hz-1.4);bx(roof,1.1,.14,1.1,TRIM,hx+2.8,H+2.75,hz-1.4);
 g.add(roof);
 // mebel
 const SF=M(0x3b5a7a);bx(g,.9,.45,2.2,SF,hx-3.4,.28,hz-2.4);bx(g,.3,.9,2.2,SF,hx-3.8,.65,hz-2.4);
 bx(g,1.7,.08,.9,WOOD,hx-2.6,.72,hz+.8);bx(g,.3,.7,.3,WOOD,hx-2.6,.36,hz+.8);
 bx(g,2,.4,3,WOOD,hx+3.3,.22,hz+2.4);bx(g,1.8,.22,2.7,M(0xcfe0f2),hx+3.3,.5,hz+2.5);bx(g,1.2,.18,.5,M(0xffffff),hx+3.3,.68,hz+3.5);
 // o'tirish va yotish joylari: divan (2 o'rin) va krovat (boshi yostiq tomonda)
 for(const dz of[-.55,.55])spots.push({t:'sit',x:hx-3.35,z:hz-2.4+dz,r:.95,y:.505-SD,yaw:Math.PI/2,out:[hx-2.2,hz-2.4+dz]});
 spots.push({t:'lie',x:hx+3.3,z:hz+2.5,r:2.1,px:hx+3.3,pz:hz+1.8,y:.76,yaw:Math.PI,out:[hx+1.7,hz+2.5]});
 // orqa devordagi yashirin eshik va xazina xonasi
 const pm=bx(g,2.4,H,.3,M(0xd2c4a4),hx,H/2,hz-4.5),ps={x:hx,z:hz-4.5,hx:1.2,hz:.15,top:H,y0:0};solids.push(ps);
 const o={hx,hz,roof,open:!secret};
 if(secret){const sz=hz-7.65;flat(6,6,0x4a3a2a,hx,sz,.04);slab(hx-3,sz,.3,6,H,WALL);slab(hx+3,sz,.3,6,H,WALL);slab(hx,sz-3,6.3,.3,H,WALL);coin(hx,.9,sz,800,100);
  bx(g,1.1,.5,.7,WOOD,hx,.25,sz+.9);bx(g,1.1,.14,.7,GOLD,hx,.57,sz+.9);bx(g,1.2,.05,1.2,M(0x6e5b3a),hx+3,.07,hz-3,false);o.pm=pm;o.ps=ps}
 // statik qismlar (devor, pol, derazalar, mebel) material bo'yicha birlashtiriladi; tom va yashirin devor ko'rinishini o'zgartiradi — tegilmaydi
 for(const q of own)g.add(q);   // g koordinata boshida: dunyo matritsasi o'zgarmaydi
 batchStatic(g,{exclude:new Set([roof,pm])});
 freeze(g);if(K.cull)K.cull(g);houses.push(o);return o;
}
export function buildBank(K,x,z){
 const {scene,solids}=K,own=[],slab=(...a)=>{const q=K.slab(...a);own.push(q);return q},g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
 const sol=(dx,dz,hx,hz,top)=>solids.push({x:x+dx,z:z+dz,hx,hz,top,y0:0});
 slab(x,z,9,9,6,STONE);
 bx(g,9.8,.5,9.8,STONE2,0,6.25,0);
 bx(g,10.2,.4,3.4,STONE2,0,.2,6.2);sol(0,6.2,5.1,1.7,.4);
 bx(g,10.8,.2,1,STONE2,0,.1,8.4);sol(0,8.4,5.4,.5,.2);
 bx(g,10.6,.8,3.4,STONE,0,6,6.2);
 for(let i=0;i<6;i++){const cx=-3.75+i*1.5,col=new THREE.Mesh(new THREE.CylinderGeometry(.34,.4,5.2,16),STONE);col.position.set(cx,3,7.3);col.castShadow=col.receiveShadow=true;g.add(col);
  bx(g,1,.3,1,STONE2,cx,.55,7.3);bx(g,1,.3,1,STONE2,cx,5.45,7.3);sol(cx,7.3,.4,.4,6)}
 const ps=new THREE.Shape();ps.moveTo(-5.5,0);ps.lineTo(5.5,0);ps.lineTo(0,1.9);ps.lineTo(-5.5,0);
 const pg=new THREE.ExtrudeGeometry(ps,{depth:3.4,bevelEnabled:false});pg.translate(0,0,-1.7);
 const pd=new THREE.Mesh(pg,STONE);pd.position.set(0,6.4,6.2);pd.castShadow=true;g.add(pd);
 const cn=document.createElement('canvas');cn.width=cn.height=128;const cx=cn.getContext('2d');
 cx.fillStyle='#d4a62a';cx.beginPath();cx.arc(64,64,60,0,7);cx.fill();cx.strokeStyle='#8a6a10';cx.lineWidth=6;cx.stroke();
 cx.fillStyle='#6b4e08';cx.font='bold 84px Georgia,serif';cx.textAlign='center';cx.textBaseline='middle';cx.fillText('$',64,70);
 const tx=new THREE.CanvasTexture(cn);tx.colorSpace=THREE.SRGBColorSpace;
 const em=new THREE.Mesh(new THREE.CircleGeometry(.62,28),new THREE.MeshStandardMaterial({map:tx,roughness:.4,metalness:.4}));em.position.set(0,7,7.93);g.add(em);
 bx(g,5.4,.62,.06,sign('BANK','#f6d77a','#17352a'),0,6,7.93,false);
 // eshik va derazalar
 bx(g,2.8,3.5,.12,BRONZE,0,2.15,4.56);bx(g,1.2,3.2,.1,M(0x6a4a24,{metalness:.3}),-.62,2,4.62);bx(g,1.2,3.2,.1,M(0x6a4a24,{metalness:.3}),.62,2,4.62);
 bx(g,.08,.5,.12,GOLD,-.15,2,4.7,false);bx(g,.08,.5,.12,GOLD,.15,2,4.7,false);
 for(const s of[-1,1]){bx(g,1.5,2.9,.08,STONE2,s*3.3,3.1,4.52);bx(g,1.2,2.6,.1,GLASSD,s*3.3,3.1,4.55,false)}
 for(const zz of[-2.4,0,2.4])for(const s of[-1,1]){bx(g,.08,2.9,1.5,STONE2,s*4.52,3,zz);bx(g,.1,2.6,1.2,GLASSD,s*4.55,3,zz,false)}
 for(const xx of[-2.4,0,2.4]){bx(g,1.5,2.9,.08,STONE2,xx,3,-4.52);bx(g,1.2,2.6,.1,GLASSD,xx,3,-4.55,false)}
 for(const q of own){q.position.x-=x;q.position.z-=z;g.add(q)}   // g (x,0,z) da turadi: mahalliy koordinataga o'tkazamiz, dunyo holati o'zgarmaydi
 batchStatic(g);freeze(g);if(K.cull)K.cull(g);
}
/* ---------- BAR: ichiga kiriladigan klub. Raqs maydoni, DJ, disko shar, 3 ta raqqosa qiz, o'tirish joylari ---------- */
const GIRLS=[[1,'Sevinch',-1.9,-1.9,.3],[1,'Zilola',1.9,-1.9,-.3],[1,'Madina',0,-.7,0]],
 LINES=['Raqsga tushamiz!','Musiqa juda zo‘r!','Bizga qo‘shiling!','Bugun kecha bizniki!','Ana shunday, davom eting!','Raqs tugmasini bosing!'];
export function buildBar(K,x,z){
 const {scene,flat,spots}=K,own=[],slab=(...a)=>{const q=K.slab(...a);own.push(q);return q},W=14,D=10,H=4,hw=W/2,hd=D/2,g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
 const bar={x,z,hw,hd,shell:[],walls:[],near:false,vis:true,ins:false,girls:[],sayT:4,was:false};
 const WALLM=M(0x6b2f4a),DARK=M(0x1a1620),SPK=M(0x0c0c10,{roughness:.5,metalness:.3}),WOOD2=M(0x5a3a22),
  neon=c=>M(0x050505,{emissive:c,emissiveIntensity:1.5,roughness:.4}),N0=neon(0xff62d5),N1=neon(0x35e1ff),N2=neon(0xffd24a),
  GL=M(0x220a2a,{emissive:0xff62d5,emissiveIntensity:.8,roughness:.3});
 slab(x,z,W-.6,D-.6,.06,M(0x2a1e2a));   // pol: ichkarida yer balandligi .06
 // devorlar (to'qnashuv bilan). Kamera devor orqasiga o'tib qolsa, o'sha devor vaqtincha yashiriladi (world.js)
 const wall=(cx,cz,w,d,ax,sg)=>{bar.walls.push({m:slab(x+cx,z+cz,w,d,H,WALLM),ax,sg})};
 wall(0,-(hd-.15),W,.3,'z',-1);wall(-(hw-.15),0,.3,D,'x',-1);wall(hw-.15,0,.3,D,'x',1);
 wall(-4.2,hd-.15,5.6,.3,'z',1);wall(4.2,hd-.15,5.6,.3,'z',1);
 // eshik (kengligi 2.8), romi va tepasi
 bx(g,2.8,.95,.3,WALLM,0,3.52,hd-.15);for(const s of[-1,1])bx(g,.2,3.05,.4,TRIM,s*1.5,1.52,hd-.15);
 for(const s of[-1,1]){bx(g,2.8,1.6,.08,TRIM,s*4.2,1.9,hd+.02);bx(g,2.5,1.3,.1,GL,s*4.2,1.9,hd+.03,false);
  for(const zz of[-2.5,2.5]){bx(g,.08,1.6,2.8,TRIM,s*(hw+.02),1.9,zz);bx(g,.1,1.3,2.5,GL,s*(hw+.03),1.9,zz,false)}}
 for(let i=0;i<6;i++)bx(g,1,.07,1.9,i%2?AW2:AW1,-2.5+i,3.25,hd+.95).rotation.x=.38;
 // tom (ichkariga kirganda yashiriladi) va neon hoshiya
 const roof=new THREE.Group();g.add(roof);bar.shell.push(roof);
 bx(roof,W+.6,.4,D+.6,DARK,0,H+.2,0);
 for(const s of[-1,1]){bx(roof,W+.7,.1,.1,N0,0,H+.45,s*(D+.6)/2,false);bx(roof,.1,.1,D+.7,N1,s*(W+.6)/2,H+.45,0,false)}
 bx(g,4.2,1,.12,sign('BAR','#ff62d5','#20102a'),0,4.95,hd+.1,false);bx(g,.1,.6,.1,TRIM,-1.8,4.6,hd+.05);bx(g,.1,.6,.1,TRIM,1.8,4.6,hd+.05);
 // ichki neon chiziqlar va shift to'sinlari
 bx(g,W-.8,.1,.06,N0,0,3.55,-(hd-.33),false);bx(g,W-.8,.07,.06,N1,0,.3,-(hd-.33),false);
 for(const s of[-1,1]){bx(g,.06,.1,D-.8,N1,s*(hw-.33),3.55,0,false);bx(g,.06,.07,D-.8,N0,s*(hw-.33),.3,0,false)}
 bx(g,W-.6,.22,.3,DARK,0,H-.15,-1);bx(g,W-.6,.22,.3,DARK,0,H-.15,-3.4);bx(g,W-.6,.22,.3,DARK,0,H-.15,2);
 // raqs maydoni: 6x4 rangli plitkalar (musiqaga qarab rang almashadi)
 const tm=[0,1,2,3].map(()=>M(0x111111,{emissive:0xffffff,emissiveIntensity:.9,roughness:.4}));
  for(let i=0;i<6;i++)for(let j=0;j<4;j++)bx(g,.98,.012,.98,tm[(i+j*2)%4],-2.5+i,.066,-2.5+j,false);
 spots.push({t:'dance',x:x,z:z-1,r:3.7});
 // disko shar va nur dastalari
 let bg=new THREE.IcosahedronGeometry(.5,2);if(bg.index)bg=bg.toNonIndexed();
 {const n=bg.attributes.position.count,col=new Float32Array(n*3),pal=[[.9,.9,.95],[1,.4,.85],[.3,.9,1],[1,1,1]];
  for(let f=0;f<n/3;f++){const c=pal[(Math.random()*4)|0],k=.55+Math.random()*.45;for(let v=0;v<3;v++){col[(f*3+v)*3]=c[0]*k;col[(f*3+v)*3+1]=c[1]*k;col[(f*3+v)*3+2]=c[2]*k}}
  bg.setAttribute('color',new THREE.BufferAttribute(col,3))}
 const ball=new THREE.Mesh(bg,new THREE.MeshBasicMaterial({vertexColors:true}));ball.position.set(0,H-.9,-1);g.add(ball);
 const rod=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,.5,6),DARK);rod.position.set(0,H-.4,-1);g.add(rod);
 const beams=[];for(let i=0;i<4;i++){const cg=new THREE.ConeGeometry(.9,3.2,14,1,true);cg.translate(0,-1.6,0);
  const m=new THREE.MeshBasicMaterial({color:0xff62d5,transparent:true,opacity:.2,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}),c=new THREE.Mesh(cg,m),gp=new THREE.Group();
  gp.position.set(0,H-.9,-1);c.rotation.x=.45+i*.07;gp.rotation.y=i*Math.PI/2;gp.add(c);g.add(gp);beams.push({gp,m,i})}
 // DJ stoli, ekran-ekvalayzer va karnaylar
 slab(x,z-4.15,3.2,.8,1,DARK);bx(g,2.9,.06,.7,M(0x303040,{metalness:.5}),0,1.03,-4.15,false);bx(g,.7,.06,.5,N2,0,1.07,-4.15,false);
 for(const s of[-1,1]){const t=new THREE.Mesh(new THREE.CylinderGeometry(.24,.24,.04,24),M(0x111111,{metalness:.4}));t.position.set(s*.85,1.08,-4.15);g.add(t)}
 bx(g,8.4,2.6,.06,DARK,0,2.2,-(hd-.32),false);
 const eq=[];for(let i=0;i<14;i++)eq.push(bx(g,.3,1,.08,i%2?N0:N1,-3.9+i*.6,1.5,-4.6,false));
 const woofs=[];for(const s of[-1,1]){slab(x+s*3,z-4.1,1.1,.9,2.2,SPK);
  const wf=new THREE.Mesh(new THREE.CylinderGeometry(.32,.32,.1,20),M(0x2a2a32,{metalness:.5,roughness:.4}));wf.rotation.x=Math.PI/2;wf.position.set(s*3,.75,-3.62);g.add(wf);woofs.push(wf);
  const tw=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,.08,16),M(0x2a2a32,{metalness:.5}));tw.rotation.x=Math.PI/2;tw.position.set(s*3,1.6,-3.62);g.add(tw)}
 // bar peshtaxtasi, javon va butilkalar, kursilar
 slab(x+5.35,z-.6,.9,5.8,1.1,WOOD2);bx(g,1.1,.08,6,WOOD,5.35,1.14,-.6);bx(g,.05,.07,5.8,N1,4.88,.8,-.6,false);
 bx(g,.04,1.7,5.4,M(0x9fd0f0,{metalness:.8,roughness:.1}),6.66,2.0,-.6,false);
 {const bm=[0xd94f4f,0x4fa8d9,0x6fd94f,0xd9b94f,0xb04fd9].map(c=>M(c,{roughness:.2,metalness:.2,emissive:c,emissiveIntensity:.15})),bgeo=new THREE.CylinderGeometry(.07,.07,.34,8);
  for(const sy of[1.55,2.2]){bx(g,.35,.06,5.4,WOOD,6.5,sy,-.6,false);for(let i=0;i<10;i++){const b=new THREE.Mesh(bgeo,bm[(i+(sy>2?2:0))%5]);b.position.set(6.5,sy+.2,-3.1+i*.55);g.add(b)}}}
 for(const zz of[-2.6,-1.3,0,1.3]){const st=new THREE.Group();st.position.set(4,0,zz);
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.7,8),TRIM);pole.position.y=.35;const seat=new THREE.Mesh(new THREE.CylinderGeometry(.26,.26,.1,16),M(0xd94fa8));seat.position.y=.78;seat.castShadow=true;
  const base=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,.03,12),TRIM);base.position.y=.02;st.add(pole,seat,base);g.add(st);
  spots.push({t:'sit',x:x+4,z:z+zz,r:.9,y:.83-SD+.06,yaw:Math.PI/2,out:[x+3,z+zz]})}
 // divanlar (har birida 2 o'rin) va past stollar
 for(const zc of[-2.6,1.6]){const SFC=M(0x5a2a6e);bx(g,1,.45,2.2,SFC,-5.95,.28,zc);bx(g,.3,.9,2.2,SFC,-6.45,.65,zc);bx(g,1,.35,.2,SFC,-5.95,.5,zc-1.1);bx(g,1,.35,.2,SFC,-5.95,.5,zc+1.1);
  const tb=new THREE.Mesh(new THREE.CylinderGeometry(.45,.45,.4,16),M(0x2c2430,{metalness:.3}));tb.position.set(-4.5,.2,zc);tb.castShadow=true;g.add(tb);
  for(const dz of[-.55,.55])spots.push({t:'sit',x:x-5.9,z:z+zc+dz,r:.95,y:.505-SD+.06,yaw:Math.PI/2,out:[x-4.7,z+zc+dz]})}
 // animatsiya: faqat bar yaqinida
 K.tick.push((dt,t)=>{
  if(!bar.near||!bar.vis){for(const c of bar.girls)c.off=true;return}
  const b=K.beat(),ph=b-Math.floor(b),k=Math.max(0,1-ph*2.4),h0=(b*.06)%1;
  tm.forEach((m,i)=>{const h=(h0+i*.25)%1;m.emissive.setHSL(h,1,.28+.3*k);m.color.setHSL(h,.7,.12)});
  N0.emissive.setHSL((h0+.85)%1,1,.5);N1.emissive.setHSL((h0+.5)%1,1,.5);
  ball.rotation.y=t*.8;
  for(const q of beams){q.gp.rotation.y=t*(.5+q.i*.15)+q.i*1.6;q.m.color.setHSL((h0+q.i*.22)%1,1,.55);q.m.opacity=.14+.16*k}
  eq.forEach((m,i)=>{const h=.25+1.1*Math.abs(Math.sin(b*2.1+i*.8))*(.55+.45*k);m.scale.y=h;m.position.y=1.0+h/2});
  for(const w of woofs)w.scale.set(1+.14*k,1,1+.14*k);
  for(const c of bar.girls){c.off=false;c.update(dt)}
  if(bar.ins){
   if(!bar.was){bar.was=true;bar.sayT=7;const c=bar.girls[2]||bar.girls[0];if(c)c.say('Xush kelibsiz! Raqsga qo‘shiling!')}
   bar.sayT-=dt;if(bar.sayT<=0&&bar.girls.length){bar.sayT=10+Math.random()*8;bar.girls[(Math.random()*bar.girls.length)|0].say(LINES[(Math.random()*LINES.length)|0])}
  }else bar.was=false;
 });
 // 3 ta raqqosa qiz: 3 xil personaj, bir xil koreografiya (musiqaga aniq mos)
 if(K.spawn)GIRLS.forEach(([gi,nm,gx,gz,yaw],i)=>setTimeout(()=>K.spawn(gi,nm,x+gx,z+gz).then(c=>{c.pose=3;c.root.rotation.y=yaw;c.root.position.y=.06;c.off=true;bar.girls.push(c);K.dancers.push(c)}).catch(()=>{}),i*300));
 // SOYA YO'Q + statik obyektlar qotiriladi: matritsa har kadrda qayta hisoblanmaydi (faqat animatsiyali qismlar tirik qoladi)
 const live=new Set([ball,...beams.map(q=>q.gp),...eq,...woofs]);
 batchStatic(g,{exclude:new Set([roof,...live])});   // statik ichki qismlar birlashadi; tom (yashiriladi) va animatsiyali qismlar tegilmaydi
 g.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=false;if(!live.has(o)){o.matrixAutoUpdate=false;o.updateMatrix()}});
 for(const o of own){o.castShadow=o.receiveShadow=false;o.matrixAutoUpdate=false;o.updateMatrix()}
 g.updateMatrixWorld(true);own.forEach(o=>o.updateMatrixWorld(true));
 if(K.cull)K.cull(g);K.bars.push(bar);if(K.onBar)K.onBar(bar);
 return bar;
}
export function buildPark(K,x,z){
 const {scene,solids,flat,spots}=K,t=makeTree(K),g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
 flat(14,14,0x4aa05a,x,z,.04);flat(2,14,0xcfc7b0,x,z,.045);flat(14,2,0xcfc7b0,x,z,.046);
 for(const[dx,dz]of[[-4.5,-4.5],[4.5,-4.5],[-4.5,4.5],[4.5,4.5]])t(x+dx,z+dz);
 const cyl=(a,b,h,m,py)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(a,b,h,24),m);o.position.y=py;o.castShadow=o.receiveShadow=true;g.add(o)};
 const WT=M(0x4aa8e8,{roughness:.1,metalness:.2,emissive:0x16507a,emissiveIntensity:.4});
 cyl(1.7,1.9,.5,STONE,.25);cyl(1.45,1.45,.1,WT,.52);cyl(.22,.3,1.4,STONE,1.1);cyl(.9,.3,.25,STONE,1.75);cyl(.7,.7,.06,WT,1.9);
 solids.push({x,z,hx:1.7,hz:1.7,top:.55,y0:0});
 for(const[bxp,bz,r]of[[-3.4,1.9,0],[3.4,-1.9,Math.PI]]){const b=new THREE.Group();b.position.set(bxp,0,bz);b.rotation.y=r;
  bx(b,1.7,.1,.5,WOOD,0,.5,0);bx(b,1.7,.5,.08,WOOD,0,.85,-.22);bx(b,.1,.5,.4,TRIM,-.7,.25,0);bx(b,.1,.5,.4,TRIM,.7,.25,0);g.add(b);
  for(const lx of[-.42,.42]){const wx=x+bxp+lx*Math.cos(r)+.05*Math.sin(r),wz=z+bz-lx*Math.sin(r)+.05*Math.cos(r);
   spots.push({t:'sit',x:wx,z:wz,r:.9,y:.55-SD,yaw:r,out:[wx+Math.sin(r)*1.1,wz+Math.cos(r)*1.1]})}}
 const LP=M(0xfff0b8,{emissive:0xffd070,emissiveIntensity:1});
 for(const lx of[-5.5,5.5]){const p=new THREE.Mesh(new THREE.CylinderGeometry(.06,.09,3,6),TRIM);p.position.set(lx,1.5,0);g.add(p);const l=new THREE.Mesh(new THREE.SphereGeometry(.22,12,8),LP);l.position.set(lx,3.1,0);g.add(l)}
 batchStatic(g);freeze(g);if(K.cull)K.cull(g);
}
