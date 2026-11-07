import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// STATIK BATCHING: bir xil materialli, qimirlamaydigan Mesh larni (kerak bo'lsa katakchalar bo'yicha) bitta Mesh ga birlashtiradi.
// Ko'rinish aynan avvalgidek qoladi (material, soya bayroqlari, UV, normal, vertex-rang saqlanadi), faqat draw call kamayadi.
// TEGILMAYDI: shaffof / depthWrite:false / renderOrder!=0 / InstancedMesh / SkinnedMesh / massiv-materialli / yashirin / exclude ro'yxatidagi (va ularning ichidagi) obyektlar.
// Xato bo'lsa (try/catch) — asl obyektlar joyida qoladi, o'yin buzilmaydi.
// opt: {exclude:Set<Object3D>, cell:number (katakcha o'lchami, 0 = hammasi bitta), freeze:true}
const _inv=new THREE.Matrix4(),_rel=new THREE.Matrix4(),_c=new THREE.Vector3();
export function batchStatic(root,opt={}){
 const ex=opt.exclude||new Set(),cell=opt.cell||0,freeze=opt.freeze!==false,st={before:0,after:0,groups:0};
 try{
  root.updateMatrixWorld(true);_inv.copy(root.matrixWorld).invert();
  const groups=new Map();
  const okMesh=o=>{
   const m=o.material,g=o.geometry;
   if(!o.isMesh||o.isInstancedMesh||o.isSkinnedMesh||!g||!m||Array.isArray(m))return false;
   if(m.transparent||m.depthWrite===false||o.renderOrder!==0||o.userData.noBatch||o.onBeforeRender!==THREE.Object3D.prototype.onBeforeRender)return false;
   if(!g.attributes.position||g.morphAttributes&&Object.keys(g.morphAttributes).length)return false;   // (BoxGeometry/Cylinder 'groups' bor, lekin material bitta bo'lgani uchun ahamiyatsiz)
   return true;
  };
  const walk=o=>{
   if(ex.has(o)||!o.visible)return;
   if(okMesh(o)){
    _rel.multiplyMatrices(_inv,o.matrixWorld);
    if(_rel.determinant()>0){   // ko'zguli (manfiy masshtab) bo'lsa tegmaymiz
     const g=o.geometry,a=g.attributes;
     if(!g.boundingBox)g.computeBoundingBox();
     _c.copy(g.boundingBox.getCenter(new THREE.Vector3())).applyMatrix4(_rel);
     const sig=Object.keys(a).sort().map(k=>k+a[k].itemSize+(a[k].normalized?'n':'')+a[k].array.constructor.name).join(',');
     const key=[o.material.uuid,sig,g.index?1:0,o.castShadow?1:0,o.receiveShadow?1:0,cell?Math.floor(_c.x/cell)+'_'+Math.floor(_c.z/cell):0].join('|');
     let e=groups.get(key);if(!e)groups.set(key,e={mat:o.material,cs:o.castShadow,rs:o.receiveShadow,list:[]});
     e.list.push({o,mx:_rel.clone()});
    }
   }
   for(const c of o.children)walk(c);
  };
  for(const c of root.children)walk(c);
  for(const e of groups.values()){
   st.before+=e.list.length;
   if(e.list.length<2){st.after+=e.list.length;continue}
   try{
    const gs=e.list.map(x=>{const g=x.o.geometry.clone();g.applyMatrix4(x.mx);return g});
    const merged=mergeGeometries(gs,false);
    gs.forEach(g=>g.dispose());
    if(!merged){st.after+=e.list.length;continue}
    const m=new THREE.Mesh(merged,e.mat);m.castShadow=e.cs;m.receiveShadow=e.rs;
    if(freeze){m.matrixAutoUpdate=false;m.updateMatrix()}
    for(const x of e.list)if(x.o.parent)x.o.parent.remove(x.o);
    root.add(m);st.after++;st.groups++;
   }catch(err){console.warn('batchStatic: guruh birlashtirilmadi',err);st.after+=e.list.length}
  }
 }catch(err){console.warn('batchStatic',err)}
 return st;
}
