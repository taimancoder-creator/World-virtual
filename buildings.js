import * as THREE from 'three';
import {mergeVertices,mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// Binolar: uy (tomi, eshigi, derazalari, mebel), bank (ustunlar, pediment, zinapoya), bar (soyabon, vitrina), park (favvora, skameykalar), daraxt.
const M=(c,o)=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.8},o||{}));
const BX=new THREE.BoxGeometry(1,1,1);
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


/* ---------- professional daraxtlar: tartibsiz yaproq to'plamlari, egilgan tana, shoxlar, qarag'ay qavatlari ---------- */
function rng(s){return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function paint(g,lo,hi,y0,y1,vary=.12){
 const p=g.attributes.position,c=new Float32Array(p.count*3),a=new THREE.Color(lo),b=new THREE.Color(hi),t=new THREE.Color();
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=Math.min(1,Math.max(0,(y-y0)/(y1-y0))),n=Math.sin(x*5.1+y*4.3)*Math.sin(z*4.7-y*3.1)*.5+.5;
  t.copy(a).lerp(b,k*.8+n*.35).multiplyScalar(1-vary+n*vary*2);c[i*3]=t.r;c[i*3+1]=t.g;c[i*3+2]=t.b}
 g.setAttribute('color',new THREE.BufferAttribute(c,3));return g;
}
function fin(g){g.computeVertexNormals();g=g.toNonIndexed();g.deleteAttribute('uv');return g}
function blob(r,seed,x,y,z,sy,lo,hi,y0,y1){
 let g=new THREE.IcosahedronGeometry(r,4);g.deleteAttribute('normal');g.deleteAttribute('uv');g=mergeVertices(g);
 const p=g.attributes.position;
 for(let i=0;i<p.count;i++){const vx=p.getX(i),vy=p.getY(i),vz=p.getZ(i),
  n=Math.sin(vx*2.3+seed)*Math.sin(vy*2.9+seed*1.7)*Math.sin(vz*2.5+seed*.6)*.5+Math.sin(vx*7+vy*6+seed)*Math.sin(vz*7-seed)*.18,k=1+n*.34;
  p.setXYZ(i,vx*k,vy*k*sy,vz*k)}
 g.translate(x,y,z);return fin(paint(g,lo,hi,y0,y1,.16));
}
function limb(x0,y0,z0,x1,y1,z1,r){
 const d=new THREE.Vector3(x1-x0,y1-y0,z1-z0),L=d.length();let g=new THREE.CylinderGeometry(r*.55,r,L,6);g.translate(0,L/2,0);
 g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()));g.translate(x0,y0,z0);
 return fin(paint(g,0x2e2118,0x5a4330,y0,y1,.1));
}
function trunk(h,rt,rb,seed){
 const g=new THREE.CylinderGeometry(rt,rb,h,9,6);g.translate(0,h/2,0);const p=g.attributes.position;
 for(let i=0;i<p.count;i++){const y=p.getY(i),x=p.getX(i),z=p.getZ(i),fl=1+.7*Math.pow(Math.max(0,1-y/(h*.28)),2),w=1+.08*Math.sin(Math.atan2(z,x)*5+seed);
  p.setXYZ(i,x*fl*w+Math.sin(y*.9+seed)*.07*y,y,z*fl*w)}
 return fin(paint(g,0x2a1f16,0x5b4532,0,h,.14));
}
const BROAD=[[0x1f4d24,0x5ba13c],[0x265a22,0x6bb043],[0x2d5a1c,0x86a83a],[0x1b4a2c,0x4f9a46]];
function broad(i){
 const R=rng(101+i*37),h=2.3+R()*.9,[lo,hi]=BROAD[i%BROAD.length],cy=h+1.35,parts=[],tp=[trunk(h,.15,.32,i)];
 parts.push(blob(1.75,i*3.1,0,cy,0,.9,lo,hi,h-.3,h+3.3));
 const n=6+(R()*3|0);
 for(let k=0;k<n;k++){const a=R()*6.283,rr=.8+R()*.8,y=h+.2+R()*2.3,x=Math.cos(a)*rr,z=Math.sin(a)*rr,r=.85+R()*.65;
  parts.push(blob(r,k*5.3+i,x,y,z,.85,lo,hi,h-.3,h+3.3));if(k<3)tp.push(limb(0,h*.8,0,x*.6,y-.4,z*.6,.09))}
 return{leaf:mergeGeometries(parts),trunk:mergeGeometries(tp)};
}
function pine(i){
 const R=rng(7+i*53),parts=[],N=7;
 for(let k=0;k<N;k++){const t=k/(N-1),r=(1.95-1.55*t)*(.9+R()*.2),hh=1.45+R()*.25,y=1.2+t*4.3;
  let g=new THREE.ConeGeometry(r,hh,11,2);const p=g.attributes.position,s=R()*9;
  for(let v=0;v<p.count;v++){const x=p.getX(v),z=p.getZ(v),py=p.getY(v),a=Math.atan2(z,x),q=1+.13*Math.sin(a*5+s)+.08*Math.sin(a*9+s*2);
   p.setXYZ(v,x*q,py<0?py-.14:py,z*q)}
  g.translate(0,y+hh/2,0);parts.push(fin(paint(g,0x0f3320,0x347238,1.2,6.4,.14)));}
 return{leaf:mergeGeometries(parts),trunk:trunk(5.2,.1,.26,i+9)};
}
let TV=null;
export function treeParts(){if(!TV)TV={b:[0,1,2,3].map(broad),p:[0,1,2].map(pine)};return TV}
const LEAFM=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.92}),BARKM=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1});
export const makeTree=K=>(x,z)=>{
 const v=treeParts(),a=Math.random()<.4?v.p:v.b,vv=a[Math.floor(Math.random()*a.length)],s=.85+Math.random()*.4,g=new THREE.Group(),
  l=new THREE.Mesh(vv.leaf,LEAFM),t=new THREE.Mesh(vv.trunk,BARKM);
 l.castShadow=t.castShadow=true;l.receiveShadow=t.receiveShadow=true;g.add(t,l);
 g.position.set(x,0,z);g.rotation.set((Math.random()-.5)*.05,Math.random()*6.283,(Math.random()-.5)*.05);
 g.scale.set(s*(.9+Math.random()*.2),s*(.92+Math.random()*.22),s*(.9+Math.random()*.2));K.scene.add(g);return g;
};

export function buildHouse(K,hx,hz,secret){
 const {scene,solids,slab,flat,coin,houses}=K,H=3.4,g=new THREE.Group();scene.add(g);
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
 // orqa devordagi yashirin eshik va xazina xonasi
 const pm=bx(g,2.4,H,.3,M(0xd2c4a4),hx,H/2,hz-4.5),ps={x:hx,z:hz-4.5,hx:1.2,hz:.15,top:H,y0:0};solids.push(ps);
 const o={hx,hz,roof,open:!secret};
 if(secret){const sz=hz-7.65;flat(6,6,0x4a3a2a,hx,sz,.04);slab(hx-3,sz,.3,6,H,WALL);slab(hx+3,sz,.3,6,H,WALL);slab(hx,sz-3,6.3,.3,H,WALL);coin(hx,.9,sz,800,100);
  bx(g,1.1,.5,.7,WOOD,hx,.25,sz+.9);bx(g,1.1,.14,.7,GOLD,hx,.57,sz+.9);bx(g,1.2,.05,1.2,M(0x6e5b3a),hx+3,.07,hz-3,false);o.pm=pm;o.ps=ps}
 houses.push(o);return o;
}

export function buildBank(K,x,z){
 const {scene,solids,slab}=K,g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
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
}

export function buildBar(K,x,z){
 const {scene,slab}=K,g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
 slab(x,z,8,6,3.6,M(0x7b3a3f));
 bx(g,8.6,.3,6.6,M(0x2c2430),0,3.75,0);
 bx(g,1.7,2.6,.12,TRIM,0,1.3,3.04);bx(g,1.3,2.35,.1,WOOD,0,1.2,3.1);bx(g,.08,.08,.1,GOLD,.45,1.2,3.17,false);
 const WL=M(0xffd9a0,{emissive:0xffb060,emissiveIntensity:.9,roughness:.3});
 for(const wx of[-2.5,2.5]){bx(g,1.9,1.5,.1,TRIM,wx,1.8,3.04);bx(g,1.65,1.25,.12,WL,wx,1.8,3.06,false)}
 for(let i=0;i<8;i++)bx(g,1,.07,1.9,i%2?AW2:AW1,-3.5+i,3.05,3.95).rotation.x=.38;
 bx(g,3.8,1,.12,sign('BAR','#ff62d5','#20102a'),0,4.45,2.7,false);bx(g,.1,.4,.1,TRIM,-1.7,4.1,2.7);bx(g,.1,.4,.1,TRIM,1.7,4.1,2.7);
 for(const bxp of[-3.6,3.6]){const b=new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,.8,10),WOOD);b.position.set(bxp,.4,3.6);b.castShadow=true;g.add(b)}
}

export function buildPark(K,x,z){
 const {scene,solids,flat}=K,t=makeTree(K),g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
 flat(14,14,0x4aa05a,x,z,.04);flat(2,14,0xcfc7b0,x,z,.045);flat(14,2,0xcfc7b0,x,z,.046);
 for(const[dx,dz]of[[-4.5,-4.5],[4.5,-4.5],[-4.5,4.5],[4.5,4.5]])t(x+dx,z+dz);
 const cyl=(a,b,h,m,py)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(a,b,h,24),m);o.position.y=py;o.castShadow=o.receiveShadow=true;g.add(o)};
 const WT=M(0x4aa8e8,{roughness:.1,metalness:.2,emissive:0x16507a,emissiveIntensity:.4});
 cyl(1.7,1.9,.5,STONE,.25);cyl(1.45,1.45,.1,WT,.52);cyl(.22,.3,1.4,STONE,1.1);cyl(.9,.3,.25,STONE,1.75);cyl(.7,.7,.06,WT,1.9);
 solids.push({x,z,hx:1.7,hz:1.7,top:.55,y0:0});
 for(const[bxp,bz,r]of[[-3.4,1.9,0],[3.4,-1.9,Math.PI]]){const b=new THREE.Group();b.position.set(bxp,0,bz);b.rotation.y=r;
  bx(b,1.7,.1,.5,WOOD,0,.5,0);bx(b,1.7,.5,.08,WOOD,0,.85,-.22);bx(b,.1,.5,.4,TRIM,-.7,.25,0);bx(b,.1,.5,.4,TRIM,.7,.25,0);g.add(b)}
 const LP=M(0xfff0b8,{emissive:0xffd070,emissiveIntensity:1});
 for(const lx of[-5.5,5.5]){const p=new THREE.Mesh(new THREE.CylinderGeometry(.06,.09,3,6),TRIM);p.position.set(lx,1.5,0);g.add(p);const l=new THREE.Mesh(new THREE.SphereGeometry(.22,12,8),LP);l.position.set(lx,3.1,0);g.add(l)}
}
