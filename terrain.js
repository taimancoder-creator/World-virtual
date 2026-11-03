import * as THREE from 'three';
import {treeParts} from './buildings.js';
// Haqiqiyga yaqin tog'lar: ridged-noise balandlik, balandlik/qiyalikka qarab rang (o't, o'rmon, tosh, qor), o'rmon va osmon.
const hash=(x,z)=>{const h=Math.sin(x*127.1+z*311.7)*43758.5453;return h-Math.floor(h)};
const sm=t=>t*t*(3-2*t),cl=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
function vn(x,z){const xi=Math.floor(x),zi=Math.floor(z),xf=sm(x-xi),zf=sm(z-zi),a=hash(xi,zi),b=hash(xi+1,zi),c=hash(xi,zi+1),d=hash(xi+1,zi+1);return a+(b-a)*xf+(c-a)*zf+(a-b-c+d)*xf*zf}
function fbm(x,z,o=4){let s=0,a=.5,f=1;for(let i=0;i<o;i++){s+=a*vn(x*f,z*f);f*=2.03;a*=.5}return s}
function ridge(x,z,o=5){let s=0,a=.5,f=1,w=1;for(let i=0;i<o;i++){let n=1-Math.abs(vn(x*f,z*f)*2-1);n*=n*w;w=cl(n*2);s+=n*a;f*=2.1;a*=.5}return s}

const B=97,SPAN=215,NA=240,NR=64;
const edge=t=>B/Math.max(Math.abs(Math.cos(t)),Math.abs(Math.sin(t)))+5;
function hgt(x,z,u){
 const rise=sm(cl(u/.5)),peak=12+88*ridge(x*.011+3.1,z*.011+7.7),far=sm(cl(u*1.6));
 return rise*peak*(.5+.5*far)+fbm(x*.045,z*.045)*7*sm(cl(u*5))+fbm(x*.19,z*.19,3)*1.6*rise+.03;
}

export function groundMat(){
 const cn=document.createElement('canvas');cn.width=cn.height=256;const g=cn.getContext('2d');
 g.fillStyle='#4d7a3f';g.fillRect(0,0,256,256);
 for(let i=0;i<5200;i++){g.fillStyle=Math.random()<.5?'rgba(38,78,30,.35)':'rgba(125,165,72,.30)';g.fillRect(Math.random()*256,Math.random()*256,2,2+Math.random()*3)}
 const t=new THREE.CanvasTexture(cn);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(150,150);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;
 return new THREE.MeshStandardMaterial({map:t,roughness:1});
}

export function buildTerrain(scene){
 const pos=new Float32Array(NA*(NR+1)*3),col=new Float32Array(pos.length),idx=[];let k=0;
 for(let i=0;i<=NR;i++){const u=Math.pow(i/NR,1.4);for(let j=0;j<NA;j++){const t=j/NA*Math.PI*2,r=edge(t)+u*SPAN,x=Math.cos(t)*r,z=Math.sin(t)*r;pos[k++]=x;pos[k++]=hgt(x,z,u);pos[k++]=z}}
 for(let i=0;i<NR;i++)for(let j=0;j<NA;j++){const a=i*NA+j,b=i*NA+(j+1)%NA,c=(i+1)*NA+j,d=(i+1)*NA+(j+1)%NA;idx.push(a,b,c,b,d,c)}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();
 const nr=geo.attributes.normal,cG=new THREE.Color(0x4d7a3f),cF=new THREE.Color(0x2e5a30),cD=new THREE.Color(0x6b5e45),cR=new THREE.Color(0x7d766c),cR2=new THREE.Color(0x4d4843),cS=new THREE.Color(0xf4f7fb),c=new THREE.Color(),t=new THREE.Color();
 for(let v=0;v<pos.length/3;v++){
  const x=pos[v*3],y=pos[v*3+1],z=pos[v*3+2],ny=nr.getY(v),n=fbm(x*.25,z*.25,3);
  c.copy(cG).lerp(cF,sm(cl(y/16)));if(n>.5)c.lerp(cD,(n-.5)*.9);
  const rk=cl((1-ny-.16)*3.2+(y-26)/55);t.copy(cR).lerp(cR2,fbm(x*.6,z*.6,3));c.lerp(t,rk);
  const sn=cl((y-(46+n*18))/9)*cl((ny-.5)*3.2+.35);c.lerp(cS,sn);
  c.multiplyScalar(.88+.24*vn(x*1.3,z*1.3));
  col[v*3]=Math.min(1,c.r);col[v*3+1]=Math.min(1,c.g);col[v*3+2]=Math.min(1,c.b);
 }
 geo.setAttribute('color',new THREE.BufferAttribute(col,3));
 const terrain=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0}));
 // o'rmon: pastki yonbag'irlarda instanced daraxtlar
 const NT=420,tp=treeParts().p[0],fol=new THREE.InstancedMesh(tp.leaf,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95}),NT),
  trk=new THREE.InstancedMesh(tp.trunk,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}),NT),
  d=new THREE.Object3D(),cc=new THREE.Color();let n=0,tries=0;
 while(n<NT&&tries<5000){tries++;
  const a=Math.random()*6.2832,u=Math.random()*.42,r=edge(a)+u*SPAN+2,x=Math.cos(a)*r,z=Math.sin(a)*r,y=hgt(x,z,u);
  if(y>24||fbm(x*.06+9,z*.06)<.42)continue;
  if(Math.hypot(hgt(x+1.5,z,u)-hgt(x-1.5,z,u),hgt(x,z+1.5,u)-hgt(x,z-1.5,u))>2.1)continue;
  const s=1.1+Math.random()*1.3;d.position.set(x,y-.2,z);d.rotation.set(0,Math.random()*6,0);d.scale.set(s,s*(1+Math.random()*.35),s);d.updateMatrix();
  fol.setMatrixAt(n,d.matrix);trk.setMatrixAt(n,d.matrix);cc.setHSL(.28+Math.random()*.08,.25,.62+Math.random()*.25);fol.setColorAt(n,cc);n++;
 }
 fol.count=trk.count=n;fol.instanceMatrix.needsUpdate=trk.instanceMatrix.needsUpdate=true;if(fol.instanceColor)fol.instanceColor.needsUpdate=true;
 scene.add(terrain,fol,trk);
}

export function buildSky(scene){
 const g=new THREE.SphereGeometry(460,24,16),p=g.attributes.position,out=[],top=new THREE.Color(0x4a82c4),hor=new THREE.Color(0xbcd3e0),c=new THREE.Color();
 for(let i=0;i<p.count;i++){const y=Math.max(0,p.getY(i)/460);c.copy(hor).lerp(top,Math.pow(y,.55));out.push(c.r,c.g,c.b)}
 g.setAttribute('color',new THREE.Float32BufferAttribute(out,3));
 const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,fog:false,depthWrite:false}));m.renderOrder=-1;scene.add(m);
}
