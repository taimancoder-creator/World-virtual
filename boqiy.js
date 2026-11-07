import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {makeTree} from './buildings.js';
import {batchStatic} from './batch.js';
import {skyEnv} from './env.js';
// Boqiy Shahar (Samarqand) — TAIMAN GTA ichidagi alohida hudud (taxminiy rekonstruksiya).
// Asosiy xaritadan portal orqali kiriladi. Hudud dunyo z=BQZ markazida joylashgan, shuning uchun eski xaritaga tegmaydi.
export const BQZ=1000;
const ENTRY=[14,6];          // asosiy xaritadagi kirish portali (x,z)
const SPAWN=[0,BQZ+20];      // Boqiy Shaharga tushish nuqtasi
const BACK=[-12,20];         // hudud ichidagi qaytish portali (mahalliy koordinata)
const EXIT=[14,12];          // qaytganda chiqish nuqtasi (asosiy xarita)
export function initBoqiy(C){
 const {scene,solids,toast,tone,addScore,addMoney}=C;
 const mobile=matchMedia('(pointer:coarse)').matches||innerWidth<700,rnd=Math.random;
 const G=new THREE.Group();G.position.set(0,0,BQZ);scene.add(G);
 const sol=(x,z,hx,hz,top,y0=0)=>solids.push({x,z:z+BQZ,hx,hz,top,y0});
 // aylantirilgan to'g'ri to'rtburchakni kichik AABB bo'laklarga bo'lib to'siq qiladi
 const obb=(cx,cz,len,wid,ang,top,y0=0,seg=2.4)=>{const n=Math.max(1,Math.ceil(len/seg)),sl=len/n,sx=Math.sin(ang),co=Math.cos(ang);
  for(let i=0;i<n;i++){const t=(i+.5)*sl-len/2;sol(cx+sx*t,cz+co*t,Math.abs(sx)*sl/2+Math.abs(co)*wid/2,Math.abs(co)*sl/2+Math.abs(sx)*wid/2,top,y0)}};
 /* ---------- teksturalar ---------- */
 const ct=(s,fn,rep=1,srgb=true)=>{const c=document.createElement('canvas');c.width=c.height=s;fn(c.getContext('2d'),s);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep,rep);t.anisotropy=mobile?2:4;if(srgb)t.colorSpace=THREE.SRGBColorSpace;return t};
 const stone=(base,n,bl,line='rgba(0,0,0,.22)')=>ct(256,(x,s)=>{x.fillStyle=base;x.fillRect(0,0,s,s);
  for(let i=0;i<n;i++){x.fillStyle=`rgba(${rnd()<.5?'0,0,0':'255,255,255'},${rnd()*.08})`;x.fillRect(rnd()*s,rnd()*s,1+rnd()*4,1+rnd()*4)}
  for(let i=0;i<30;i++){const gx=rnd()*s,g=x.createLinearGradient(0,0,0,s);g.addColorStop(0,'rgba(70,50,30,0)');g.addColorStop(1,'rgba(70,50,30,.12)');x.fillStyle=g;x.fillRect(gx,0,2+rnd()*6,s)}
  x.strokeStyle=line;x.lineWidth=1.5;const k=s/bl;
  for(let r=0;r<bl;r++){x.beginPath();x.moveTo(0,r*k);x.lineTo(s,r*k);x.stroke();for(let c=0;c<bl;c++){const o=(r%2)*k/2;x.beginPath();x.moveTo(c*k+o,r*k);x.lineTo(c*k+o,r*k+k);x.stroke()}}});
 const T={
  lime:stone('#e2c48c',2500,8),sand:stone('#d6a566',2500,6),gray:stone('#6d6e70',3500,10,'rgba(0,0,0,.35)'),
  marble:stone('#efe9e1',900,2,'rgba(120,110,100,.15)'),plaza:stone('#b5a285',3500,4,'rgba(0,0,0,.28)'),
  gravel:ct(128,(x,s)=>{x.fillStyle='#a9a9a4';x.fillRect(0,0,s,s);for(let i=0;i<900;i++){const v=110+rnd()*110|0;x.fillStyle=`rgb(${v},${v},${v-4})`;x.beginPath();x.arc(rnd()*s,rnd()*s,1+rnd()*3,0,7);x.fill()}}),
  wood:ct(128,(x,s)=>{x.fillStyle='#8a5a34';x.fillRect(0,0,s,s);for(let i=0;i<60;i++){x.fillStyle=`rgba(${rnd()<.5?'40,20,5':'200,150,90'},${rnd()*.25})`;x.fillRect(0,rnd()*s,s,1+rnd()*3)}}),
  dome:ct(128,(x,s)=>{x.fillStyle='#c98f5a';x.fillRect(0,0,s,s);x.strokeStyle='rgba(90,60,40,.45)';for(let i=0;i<s;i+=8){x.beginPath();x.moveTo(i,0);x.lineTo(i,s);x.stroke();x.beginPath();x.moveTo(0,i);x.lineTo(s,i);x.stroke()}}),
  tile:ct(256,(x,s)=>{x.fillStyle='#14507f';x.fillRect(0,0,s,s);const c=s/2;for(const[r,col]of[[100,'#2ab1b5'],[70,'#f2f0e6'],[40,'#14507f']]){for(let a=0;a<2;a++){x.save();x.translate(c,c);x.rotate(a*Math.PI/4);x.fillStyle=col;x.fillRect(-r*.7,-r*.7,r*1.4,r*1.4);x.restore()}}x.strokeStyle='#f2f0e6';x.lineWidth=2;x.strokeRect(2,2,s-4,s-4)}),
  lat:ct(128,(x,s)=>{x.fillStyle='#000';x.fillRect(0,0,s,s);x.strokeStyle='#fff';x.lineWidth=9;x.translate(s/2,s/2);for(let a=0;a<4;a++){x.rotate(Math.PI/4);x.strokeRect(-s*.32,-s*.32,s*.64,s*.64)}},1,false),
  glass:ct(128,(x,s)=>{x.fillStyle='#1d3345';x.fillRect(0,0,s,s);for(let y=0;y<s;y+=8)for(let i=0;i<s;i+=8){x.fillStyle=rnd()<.35?'#ffd48a':'#2b4a63';x.fillRect(i+1,y+1,6,5)}})
 };
 T.wn=ct(256,(x,s)=>{const h=(i,j)=>Math.sin(i/s*6.283*3+Math.sin(j/s*6.283*2)*1.6)*.5+Math.sin(j/s*6.283*5+Math.cos(i/s*6.283*4)*1.3)*.35+Math.sin((i+j)/s*6.283*9)*.15;
  const d=x.createImageData(s,s);for(let j=0;j<s;j++)for(let i=0;i<s;i++){const dx=h(i+1,j)-h(i-1,j),dy=h(i,j+1)-h(i,j-1),k=(j*s+i)*4;d.data[k]=128-dx*60;d.data[k+1]=128-dy*60;d.data[k+2]=255;d.data[k+3]=255}x.putImageData(d,0,0)},1,false);
 T.wn.repeat.set(100,2);
 const M=o=>new THREE.MeshStandardMaterial(Object.assign({roughness:.85,metalness:0},o));
 const mat={
  lime:M({map:T.lime,bumpMap:T.lime,bumpScale:.5}),sand:M({map:T.sand,bumpMap:T.sand,bumpScale:.5}),gray:M({map:T.gray,bumpMap:T.gray,bumpScale:.8,color:0xb8b8bc}),
  marble:M({map:T.marble,roughness:.35,metalness:.05}),plaza:M({map:T.plaza,bumpMap:T.plaza,bumpScale:.4}),gravel:M({map:T.gravel,bumpMap:T.gravel,bumpScale:.8}),
  wood:M({map:T.wood,bumpMap:T.wood,bumpScale:.6}),dome:M({map:T.dome,roughness:.7}),tile:M({map:T.tile,roughness:.3,metalness:.05}),
  turq:M({color:0x1fa7a2,roughness:.25,metalness:.15}),dark:M({color:0x2a2018}),
  win:M({color:0x151a20,roughness:.3,metalness:.2,side:THREE.DoubleSide}),
  glass:M({map:T.glass,roughness:.15,metalness:.3}),
  lat:M({color:0xf1ece4,alphaMap:T.lat,transparent:true,alphaTest:.5,side:THREE.DoubleSide,roughness:.4}),
  trunk:M({color:0x4a3a2a}),lawn:M({color:0x5c9a38,roughness:1}),lamp:M({color:0xffffff,emissive:0xffe2a0,emissiveIntensity:.6})
 };
 // realistik aks: firuza gumbaz, kafel, marmar, shisha va kanal suvi osmon muhit xaritasini aks ettiradi (renderer bo'lmasa avvalgidek)
 const penv=C.renderer?skyEnv(C.renderer):null;
 if(penv)for(const[k,i]of[['turq',1],['tile',.6],['marble',.5],['glass',.7]]){mat[k].envMap=penv;mat[k].envMapIntensity=i}
 // dunyo masshtabli UV li quti
 const bg=(w,h,d,tile=6)=>{const g=new THREE.BoxGeometry(w,h,d),u=g.attributes.uv,dm=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];
  for(let f=0;f<6;f++)for(let v=0;v<4;v++){const i=f*4+v;u.setXY(i,u.getX(i)*dm[f][0]/tile,u.getY(i)*dm[f][1]/tile)}return g};
 const box=(w,h,d,m,tile=6)=>{const o=new THREE.Mesh(bg(w,h,d,tile),m);o.castShadow=o.receiveShadow=true;return o};
 const add=(o,x=0,y=0,z=0,p=G)=>{o.position.set(x,y,z);p.add(o);return o};
 const archGeo=(w,h)=>{const s=new THREE.Shape(),k=h*.62;s.moveTo(-w/2,0);s.lineTo(-w/2,k);s.quadraticCurveTo(-w/2,h*.92,0,h);s.quadraticCurveTo(w/2,h*.92,w/2,k);s.lineTo(w/2,0);return new THREE.ShapeGeometry(s)};
 const lbl=(t,col,w,x,y,z,p=scene)=>{const cn=document.createElement('canvas');cn.width=512;cn.height=128;const g=cn.getContext('2d');g.textAlign='center';g.font='bold 72px system-ui';g.shadowColor=col;g.shadowBlur=20;g.fillStyle=col;g.fillText(t,256,90);
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cn),transparent:true,depthWrite:false,fog:false}));s.scale.set(w,w/4,1);s.position.set(x,y,z);p.add(s)};
 /* ---------- osmon ---------- */
 {const g=new THREE.SphereGeometry(460,24,16),p=g.attributes.position,out=[],top=new THREE.Color(0x4a82c4),hor=new THREE.Color(0xbcd3e0),c=new THREE.Color();
  for(let i=0;i<p.count;i++){const y=Math.max(0,p.getY(i)/460);c.copy(hor).lerp(top,Math.pow(y,.55));out.push(c.r,c.g,c.b)}
  g.setAttribute('color',new THREE.Float32BufferAttribute(out,3));
  const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,fog:false,depthWrite:false}));m.renderOrder=-1;G.add(m)}
 /* ---------- zamin va kanal ---------- */
 for(const s of[-1,1]){
  add(box(1000,2,390,mat.plaza,10),0,-1,s*205);
  add(box(1000,3,.8,mat.lime,6),0,-1.5,s*10.2);
  add(box(1000,.06,4,mat.gravel,3),0,.03,s*12.4);
  add(box(1000,.04,30,mat.lawn,8),0,.02,s*30)}
 add(box(1000,.6,22,mat.plaza,8),0,-3.2,0);
 const wg=new THREE.PlaneGeometry(1000,20,100,8);wg.rotateX(-Math.PI/2);
 const water=new THREE.Mesh(wg,new THREE.MeshStandardMaterial({color:0x1b6e69,roughness:.12,metalness:0,normalMap:T.wn,normalScale:new THREE.Vector2(.45,.45),transparent:true,opacity:.92}));
 if(penv){water.material.envMap=penv;water.material.envMapIntensity=.9}
 water.position.y=-1.3;water.receiveShadow=true;G.add(water);const wp=wg.attributes.position,wb=Float32Array.from(wp.array);
 // kanalga tushib ketmaslik uchun ko'rinmas devor (ko'prikdan tashqari)
 sol(-252.55,0,247.45,10.1,60,-5);sol(252.55,0,247.45,10.1,60,-5);
 /* ---------- binolar ---------- */
 const winPos=[];
 function pishtaq(g,w,h,z){add(box(w,h,1.4,mat.tile,5),0,h/2,z,g);
  add(new THREE.Mesh(archGeo(w*.55,h*.7),mat.dark),0,.2,z+.72,g);
  for(const s of[-1,1]){const m=new THREE.Mesh(new THREE.CylinderGeometry(.6,.7,h*1.12,10),mat.tile);m.castShadow=true;add(m,s*(w/2+.5),h*.56,z,g);
   add(new THREE.Mesh(new THREE.ConeGeometry(.7,1.4,10),mat.turq),s*(w/2+.5),h*1.12+.7,z,g)}}
 function domeAt(g,x,y,z,r,m){const dr=new THREE.Mesh(new THREE.CylinderGeometry(r*.85,r*.9,r*.9,20),mat.lime);dr.castShadow=true;add(dr,x,y+r*.45,z,g);
  const d=new THREE.Mesh(new THREE.SphereGeometry(r,24,12,0,Math.PI*2,0,Math.PI/2),m);d.scale.y=1.1;d.castShadow=true;add(d,x,y+r*.9,z,g);
  add(new THREE.Mesh(new THREE.CylinderGeometry(.05,.1,r*.6,6),mat.marble),x,y+r*.9+r*1.1+.2,z,g)}
 function building(x,z,w,d,h,ry,o={}){
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=ry;G.add(g);
  const bm=mat.lime.clone();bm.color.setRGB(.86+rnd()*.14,.84+rnd()*.14,.8+rnd()*.14);
  add(box(w,h,d,bm),0,h/2,0,g);add(box(w+.3,1.2,d+.3,mat.sand),0,.6,0,g);add(box(w+.6,.6,d+.6,mat.sand),0,h+.3,0,g);
  const n=Math.floor((w-6)/3.2);
  for(let f=0;f<(h>10?2:1);f++)for(let i=0;i<n;i++){const lx=(i-(n-1)/2)*3.2;if(o.p&&Math.abs(lx)<w*.2)continue;winPos.push([g,lx,2.2+f*5.4,d/2+.03])}
  if(o.p)pishtaq(g,w*.34,h*.9,d/2+.4);
  if(o.dome)domeAt(g,0,h+.6,0,o.dome,mat.dome);
  g.updateMatrix();
  sol(x+(o.p?(ry?-.4:.4):0),z,w/2+.4,d/2+.3+(o.p?.4:0),h+.6);
  return g}
 [[-84,22,12],[-60,16,11],[-38,12,10],[38,12,10],[62,18,12],[86,22,14]].forEach((a,i)=>building(a[0],-26,a[1],a[2],a[2]===12?10:9,0,{p:i%2===0,dome:i%2?0:3.4}));
 [[-86,20,12],[-62,16,10],[20,22,12],[50,16,10],[78,20,12]].forEach((a,i)=>building(a[0],30,a[1],a[2],i%2?8:10,Math.PI,{p:i%2===0,dome:i===2?4:0}));
 // firuza gumbazli masjid
 {const g=building(72,-30,16,14,11,0,{p:true});domeAt(g,0,11.6,0,4.2,mat.turq);
  for(const s of[-1,1]){const m=new THREE.Mesh(new THREE.CylinderGeometry(.7,.9,18,12),mat.tile);m.castShadow=true;add(m,s*9.5,9,6,g)}}
 // yog'och suv g'ildirakli uy
 let noria=null;
 {const g=new THREE.Group();g.position.set(-30,0,14.5);G.add(g);
  add(box(14,8,8,mat.lime),0,4,3,g);add(box(14.6,.6,8.6,mat.wood),0,8.3,3,g);add(box(12,4,6,mat.wood),0,10.6,3,g);
  for(let i=-3;i<=3;i++)add(box(.4,6,.4,mat.wood),i*2,11,.2,g);
  add(box(15,.4,3,mat.wood),0,6,-1.8,g);
  for(const s of[-6.5,6.5])add(box(.4,6,.4,mat.wood),s,3,-2,g);
  noria=new THREE.Group();noria.position.set(-4,1.6,-5);g.add(noria);
  noria.add(new THREE.Mesh(new THREE.TorusGeometry(3.4,.18,6,24),mat.wood));
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2,sp=box(.18,6.6,.18,mat.wood);sp.rotation.z=a;noria.add(sp);const p=box(.4,1,1.2,mat.wood);p.position.set(Math.cos(a)*3.4,Math.sin(a)*3.4,0);p.rotation.z=a;noria.add(p)}
  sol(-30,17.5,7.3,4.3,8.9)}
 // orqa fondagi minoralar
 for(const[x,z,w,h]of[[-130,150,22,34],[-60,170,16,70],[20,160,24,40],[110,170,14,62],[160,150,18,36]]){add(box(w,h,w,mat.glass,12),x,h/2,z);sol(x,z,w/2+.3,w/2+.3,h+.6)}
 // derazalar (instanced)
 {const m=new THREE.InstancedMesh(archGeo(1.3,2.4),mat.win,winPos.length),o=new THREE.Object3D(),mm=new THREE.Matrix4();
  winPos.forEach((p,i)=>{o.position.set(p[1],p[2],p[3]);o.rotation.set(0,0,0);o.updateMatrix();m.setMatrixAt(i,mm.multiplyMatrices(p[0].matrix,o.matrix))});G.add(m)}
 /* ---------- amfiteatr ---------- */
 const AC=new THREE.Vector3(0,0,-60),AR=40,AH=26,A0=Math.PI-1.05,AL=2.1,RISE=.3,NS=26;
 {const wm=mat.gray.clone();wm.side=THREE.DoubleSide;
  const w=new THREE.Mesh(new THREE.CylinderGeometry(AR,AR,AH,48,1,true,A0,AL),wm);w.castShadow=w.receiveShadow=true;add(w,AC.x,AH/2,AC.z);
  add(new THREE.Mesh(new THREE.CylinderGeometry(AR+1,AR+1,1.4,48,1,false,A0,AL),mat.gray),AC.x,AH+.7,AC.z);
  for(const s of[A0,A0+AL]){const b=box(5,AH+2,5,mat.gray,8);b.position.set(AC.x+AR*Math.sin(s),(AH+2)/2,AC.z+AR*Math.cos(s));b.rotation.y=s;G.add(b)}
  // devor to'siqlari: yoy bo'ylab bo'laklar
  const da=2.4/AR;for(let a=A0+da/2;a<A0+AL;a+=da)obb(AC.x+AR*Math.sin(a),AC.z+AR*Math.cos(a),2.4,1.2,a+Math.PI/2,AH);
  // arkali derazalar
  const m=new THREE.InstancedMesh(archGeo(1.8,3.6),mat.win,300),o=new THREE.Object3D();let c=0;
  for(let row=0;row<3;row++)for(let a=A0+.08;a<A0+AL-.05;a+=.075){if(Math.abs(a-Math.PI)<.14)continue;
   o.position.set(AC.x+(AR-.12)*Math.sin(a),2+row*7.6,AC.z+(AR-.12)*Math.cos(a));o.rotation.set(0,a+Math.PI,0);o.updateMatrix();m.setMatrixAt(c++,o.matrix)}
  m.count=c;G.add(m);
  // katta zinapoya: yurib chiqiladigan (har pog'ona 0.3), tepada maydoncha
  const parts=[];for(let i=0;i<NS;i++){const hh=RISE*(i+1),g=bg(9,hh,1,5);g.translate(0,hh/2,-70-i);parts.push(g);sol(0,-70-i,4.5,.5,hh)}
  {const hh=RISE*NS,g=bg(9,hh,4,5);g.translate(0,hh/2,-97.5);parts.push(g);sol(0,-97.5,4.5,2,hh)}
  const st=new THREE.Mesh(mergeGeometries(parts),mat.gray);st.castShadow=st.receiveShadow=true;G.add(st);
  // marmar panjara va ustunlar
  const L=Math.hypot(NS-1,RISE*NS),th=Math.atan2(RISE*NS,NS-1);
  for(const s of[-1,1]){const r=box(1.1,1.2,L,mat.marble,3);r.rotation.x=th;add(r,s*5.2,RISE*NS/2+.6,-82.5);
   for(let i=0;i<5;i++){const zz=-72-i*5.2;add(box(.7,.7,1.4,mat.marble),s*5.2,RISE*(-zz-69)+.95,zz)}}
  // yon tayanch devorlar
  for(const s of[-1,1]){add(box(2,AH*.7,22,mat.gray,8),s*21,AH*.35,-77).rotation.y=s*.5;obb(s*21,-77,22,2,s*.5,AH*.7)}}
 /* ---------- marmar panjarali ko'prik ---------- */
 {const g=new THREE.Group();g.position.y=-.53;G.add(g);add(box(10,.9,28,mat.marble,4),0,.1,0,g);
  T.lat.repeat.set(22,1);
  for(const s of[-1,1]){const p=new THREE.Mesh(new THREE.PlaneGeometry(26,1.2),mat.lat);p.rotation.y=Math.PI/2;add(p,s*5,1.15,0,g);
   add(box(.6,.3,26,mat.marble,3),s*5,1.85,0,g);
   for(let z=-13;z<=13;z+=6.5){add(box(.8,2.2,.8,mat.marble,3),s*5,1.1,z,g);add(new THREE.Mesh(new THREE.ConeGeometry(.5,.8,6),mat.marble),s*5,2.6,z,g)}}}
 /* ---------- chiroqlar ---------- */
 {const NL=84,lm=new THREE.InstancedMesh(new THREE.SphereGeometry(.35,10,8),mat.lamp,NL),po=new THREE.InstancedMesh(new THREE.CylinderGeometry(.1,.14,4.4,6),mat.trunk,NL),o=new THREE.Object3D();let c=0;
  for(let x=-180;x<=180;x+=18)for(const z of[-14,14]){if(Math.abs(x)<8||c>=NL)continue;o.position.set(x,2.2,z);o.updateMatrix();po.setMatrixAt(c,o.matrix);o.position.y=4.5;o.updateMatrix();lm.setMatrixAt(c++,o.matrix)}
  lm.count=po.count=c;G.add(lm,po)}
 /* ---------- daraxtlar (o'yindagi makeTree) ---------- */
 {const tree=makeTree({scene:G});
  for(let x=-96;x<=96;x+=8)for(const z of[-17.5,17.5]){if(Math.abs(x)<10||(Math.abs(x+30)<10&&z>0)||(Math.abs(x-BACK[0])<5&&z>0))continue;tree(x+(rnd()-.5)*2,z+(rnd()-.5)*1.5)}
  for(let i=0;i<(mobile?14:24);i++){const z=(rnd()<.5?-1:1)*(40+rnd()*50),x=-110+rnd()*220;if(z<0&&x>-40&&x<40&&z<-45)continue;tree(x,z)}}
 /* ---------- tangalar ---------- */
 const coins=[],coinGeo=new THREE.CylinderGeometry(.3,.3,.07,20),coinMat=new THREE.MeshStandardMaterial({color:0xf2b92a,emissive:0x9a6a00,emissiveIntensity:.6,roughness:.7});
 const coin=(x,y,z,v=25,s=5)=>{const m=new THREE.Mesh(coinGeo,coinMat);m.position.set(x,y,z);m.rotation.x=Math.PI/2;G.add(m);coins.push({m,x,y,z:z+BQZ,v,s,t:0})};
 for(let x=-90;x<=90;x+=20){if(Math.abs(x)<8)continue;coin(x,.9,16.5)}
 for(let x=-80;x<=80;x+=20)coin(x,.9,-16.5);
 for(let i=0;i<4;i++)coin(-1.5+i,RISE*NS+.9,-97.5,60,10);
 /* ---------- portallar ---------- */
 const spin=[],glow=c=>new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.45,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
 const portal=(parent,x,z,c,txt,col)=>{const g=new THREE.Group();g.position.set(x,2.2,z);
  g.add(new THREE.Mesh(new THREE.TorusGeometry(1.9,.2,12,40),new THREE.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:1.6})),new THREE.Mesh(new THREE.CircleGeometry(1.8,28),glow(c)));
  parent.add(g);spin.push(g);lbl(txt,col,4.6,x,5.4,z,parent)};
 portal(scene,ENTRY[0],ENTRY[1],0x5fe3ff,'BOQIY SHAHAR','#5fe3ff');
 portal(G,BACK[0],BACK[1],0x5be7a9,'QAYTISH','#5be7a9');
 // uzoqdan ko'rinadigan yorug' nur (kirish portalini topish oson bo'lsin)
 {const b=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.1,70,16,1,true),new THREE.MeshBasicMaterial({color:0x5fe3ff,transparent:true,opacity:.28,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false}));b.position.set(ENTRY[0],35,ENTRY[1]);scene.add(b)}
 // statik geometriya material bo'yicha 100 m li katakchalarga birlashtiriladi (draw call keskin kamayadi, frustum culling saqlanadi). Animatsiyali: g'ildirak, suv, portallar — tegilmaydi
 batchStatic(G,{exclude:new Set([noria,water,...spin]),cell:100});
 /* ---------- yangilash ---------- */
 let wT=0,pcd=0,fr=0;
 function update(dt){
  wT+=dt;pcd-=dt;
  for(const g of spin)g.rotation.y+=dt;
  const me=C.me();if(!me)return;const p=me.root.position,inZ=p.z>BQZ-400;G.visible=inZ;   // asosiy xaritada Boqiy Shahar butunlay chizilmaydi
  if(inZ){
   if(noria)noria.rotation.z=-wT*.6;
   if(++fr%3===0){const a=wp.array;for(let i=0;i<a.length;i+=3){a[i+1]=wb[i+1]+Math.sin(a[i]*.12+wT*1.1)*.05+Math.sin(a[i+2]*.5+wT*1.6)*.035}wp.needsUpdate=true}
   T.wn.offset.x=wT*.012;T.wn.offset.y=wT*.02;
   coins.forEach((c,i)=>{if(c.t>0){c.t-=dt;c.m.visible=c.t<=0;return}c.m.rotation.z+=dt*3;c.m.position.y=c.y+Math.sin(wT*2+i)*.08;
    if(Math.hypot(c.x-p.x,c.z-p.z)<1.2&&Math.abs(c.y-p.y-1)<1.6){c.t=30;c.m.visible=false;addMoney(c.v);addScore(c.s);tone(1318,.07,.09,'square');setTimeout(()=>tone(1760,.14,.09,'square'),60)}});
   if(pcd<=0&&Math.hypot(p.x-BACK[0],p.z-(BQZ+BACK[1]))<1.8&&p.y<3){p.set(EXIT[0],0,EXIT[1]);me.vy=0;pcd=2;tone(200,.5,.18,'sawtooth',1400)}
  }else if(pcd<=0&&Math.hypot(p.x-ENTRY[0],p.z-ENTRY[1])<1.8&&p.y<3){
   p.set(SPAWN[0],0,SPAWN[1]);me.vy=0;pcd=2;tone(200,.5,.18,'sawtooth',1400);toast('Boqiy Shahar · taxminiy rekonstruksiya')}
 }
 return{update};
}
