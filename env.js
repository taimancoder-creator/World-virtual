import * as THREE from 'three';
// Umumiy muhit xaritasi (PMREM): osmon gradiyenti + quyosh. Mashinaning bo'yoq/xrom/oynasi realistik aks ettirishi uchun.
// Bir marta quriladi (bir necha ms, xotirada kichik); har kadrda hech qanday xarajat yo'q. heli.js dagi mkEnv bilan bir xil retsept.
let cache=null;
export function skyEnv(renderer){
 if(cache)return cache;
 try{
  const top=new THREE.Color(0x4a86c9),hor=new THREE.Color(0xbfd6e6),gnd=new THREE.Color(0x6b6e66),s=new THREE.Scene(),g=new THREE.SphereGeometry(50,32,16),p=g.attributes.position,cl=[],c=new THREE.Color();
  for(let i=0;i<p.count;i++){const y=p.getY(i)/50;y>0?c.copy(hor).lerp(top,Math.pow(y,.6)):c.copy(hor).lerp(gnd,Math.min(1,-y*3));cl.push(c.r,c.g,c.b)}
  g.setAttribute('color',new THREE.Float32BufferAttribute(cl,3));s.add(new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide})));
  const mk=(w,h,col,I,pos)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(col).multiplyScalar(I),side:THREE.DoubleSide}));m.position.copy(pos);m.lookAt(0,0,0);s.add(m)};
  mk(26,26,0xffffff,12,new THREE.Vector3(.5,.8,.6).normalize().multiplyScalar(40));mk(40,12,0xffffff,3,new THREE.Vector3(0,40,-10));
  const pm=new THREE.PMREMGenerator(renderer);cache=pm.fromScene(s,.02).texture;pm.dispose();
  s.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose()});
 }catch(e){console.warn('skyEnv',e);cache=null}
 return cache;
}
