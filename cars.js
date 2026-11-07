import * as THREE from 'three';
import {batchStatic} from './batch.js';
import {skyEnv} from './env.js';
// GAZ-24 «Volga» mashinasi: gaz24_volga_modeli.html dagi model (kuzov, shisha, g'ildirak, salon) o'yinga ko'chirilgan + haydash fizikasi.
// main.js dan initCars(C) bilan ulanadi. Kirish/chiqish: E yoki "MASHINAGA O'TIRISH" tugmasi. Haydash: joystik / WASD. Qo'l tormozi: SPACE / SAKRA.
function buildCar(T, mobile, env){
 const P = Math.PI, S4 = mobile ? 512 : 1024;   // teksturalar o'yin uchun yengillashtirilgan (asl modelda 4K)
// ---------- Teksturalar ----------
const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const tex = (c, rx = 1, ry = 1, srgb = false) => { const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; if(srgb) t.colorSpace = T.SRGBColorSpace; return t; };
const flake = (() => { const [c, g] = cv(S4, S4), im = g.createImageData(S4, S4), d = im.data;      // bo‘yoq mikro-notekisligi (4K)
  for(let i = 0; i < S4*S4; i++){ const v = 128 + (Math.random()-.5)*34; d[i*4] = d[i*4+1] = d[i*4+2] = v; d[i*4+3] = 255; } g.putImageData(im, 0, 0); return tex(c, 3, 3); })();
const tread = (() => { const [c, g] = cv(S4, S4/4); g.fillStyle = '#777'; g.fillRect(0, 0, S4, S4/4); g.strokeStyle = '#111'; g.lineWidth = S4/260;
  for(let i = 0; i < 80; i++){ const x = i*S4/80; g.beginPath(); g.moveTo(x, S4/16); g.lineTo(x + S4/115, S4/8); g.lineTo(x, S4*.1875); g.stroke(); }
  for(let i = 0; i < 40000; i++){ g.fillStyle = `rgba(0,0,0,${Math.random()*.25})`; g.fillRect(Math.random()*S4, Math.random()*S4/4, 3, 3); } return tex(c); })();
const hubTex = (() => { const [c, g] = cv(1024, 1024), gr = g.createRadialGradient(400, 380, 40, 512, 512, 512); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#8e949a'); g.fillStyle = gr; g.fillRect(0, 0, 1024, 1024);
  g.strokeStyle = 'rgba(40,44,48,.7)'; [150, 260, 340, 420, 480].forEach((r, i) => { g.lineWidth = i % 2 ? 6 : 14; g.beginPath(); g.arc(512, 512, r, 0, 7); g.stroke(); }); return tex(c, 1, 1, true); })();
const plateTex = (() => { const [c, g] = cv(1024, 256); g.fillStyle = '#f6f6f2'; g.fillRect(0, 0, 1024, 256); g.fillStyle = '#1d4fa0'; g.fillRect(0, 0, 150, 256); g.strokeStyle = '#111'; g.lineWidth = 8; g.strokeRect(6, 6, 1012, 244);
  g.fillStyle = '#fff'; g.font = 'bold 54px Georgia'; g.textAlign = 'center'; g.fillText('UZ', 75, 150); g.fillStyle = '#111'; g.font = 'bold 150px Georgia'; g.fillText('01 A 777 AA', 590, 185); return tex(c, 1, 1, true); })();
const fabric = (() => { const [c, g] = cv(512, 512); g.fillStyle = '#5a4636'; g.fillRect(0, 0, 512, 512); g.strokeStyle = 'rgba(30,20,12,.5)'; g.lineWidth = 6;
  for(let i = 0; i < 512; i += 32){ g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); } return tex(c, 2, 2, true); })();

// ---------- Materiallar ----------
const COLS = [0xc5c8c1, 0xe6e0c8, 0x16181b, 0xf0f0ee, 0x2f4a3a, 0x6d8fa8, 0x6a1f27];
const paint = mobile ? new T.MeshStandardMaterial({vertexColors:true, color:COLS[0], metalness:.15, roughness:.38, bumpMap:flake, bumpScale:.12})   // telefonda clearcoat (og'ir shader) o'rniga oddiy material
  : new T.MeshPhysicalMaterial({vertexColors:true, color:COLS[0], metalness:.15, roughness:.38, clearcoat:.7, clearcoatRoughness:.08, bumpMap:flake, bumpScale:.12});
const glass = new (mobile ? T.MeshStandardMaterial : T.MeshPhysicalMaterial)({color:0xaec2c4, metalness:0, roughness:.02, envMapIntensity:1.5, transparent:true, opacity:.16, side:T.DoubleSide, depthWrite:false});
const M = (c, o = {}) => new T.MeshStandardMaterial(Object.assign({color:c, roughness:.6}, o));
const chrome = M(0xe2e5e8, {metalness:.55, roughness:.1}), dark = M(0x0c0d0f, {roughness:.7}), rubber = M(0x161616, {roughness:.9, bumpMap:tread, bumpScale:2});
const steel = M(0x9da2a6, {metalness:.45, roughness:.4}), seat = M(0xffffff, {map:fabric, roughness:.95}), trim = M(0x3b2f26, {roughness:.9}), liner = M(0xcfc6b0, {roughness:1});
const head = M(0xffffff, {emissive:0xfff2cc, emissiveIntensity:1.8, roughness:.1}), tail = M(0xff2a2a, {emissive:0xff1010, emissiveIntensity:1.2, roughness:.2});
const amber = M(0xff8a00, {emissive:0xff6a00, emissiveIntensity:.9, roughness:.3}), white = M(0xf4f4f0, {emissive:0xffffff, emissiveIntensity:.3, roughness:.2});
// realistik aks: bo'yoq, xrom, po'lat va oyna osmon muhit xaritasini aks ettiradi (env yo'q bo'lsa avvalgidek)
if(env){ paint.envMap = env; paint.envMapIntensity = .8; chrome.envMap = env; chrome.envMapIntensity = 1; steel.envMap = env; steel.envMapIntensity = .6; glass.envMap = env; }
const car = new T.Group();
const add = (g, m, x = 0, y = 0, z = 0, sh = true) => { const o = new T.Mesh(g, m); o.position.set(x, y, z); o.castShadow = sh; o.receiveShadow = true; car.add(o); return o; };
const V = (x, y, z) => new T.Vector3(x, y, z);
const bar = (a, b, w, h, m) => { a = V(...a); b = V(...b); const d = b.clone().sub(a), o = add(new T.BoxGeometry(w, h, d.length()), m, 0, 0, 0, false); o.position.copy(a).addScaledVector(d, .5); o.up.set(Math.abs(d.y/d.length()) > .99 ? 1 : 0, Math.abs(d.y/d.length()) > .99 ? 0 : 1, 0); o.lookAt(b); return o; };
const quad = (p, m) => { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(p.flat(), 3)); g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals(); return add(g, m, 0, 0, 0, false); };

//BODY_START
// Kuzov: ko‘ndalang kesimlar (superellips) bo‘ylab loft; old/orqa tomoni planda yumaloq, salon "vanna", g‘ildirak o‘yiqlari
const XFL = 1.76, XFE = 2.26, XRL = -1.84, XRE = -2.3, WMAX = .9, XA = [1.45, -1.35], AR = .47, TUB = .42;
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x-a)/(b-a))); return t*t*(3-2*t); };
const keyed = (k, x) => { if(x <= k[0][0]) return k[0][1]; for(let i = 1; i < k.length; i++) if(x <= k[i][0]){ const t = (x-k[i-1][0])/(k[i][0]-k[i-1][0]), s = (1-Math.cos(Math.PI*t))/2; return k[i-1][1] + (k[i][1]-k[i-1][1])*s; } return k[k.length-1][1]; };
const TOP = [[-2.3,.8],[-2.2,.95],[-1.9,.99],[-1.2,1.0],[.9,1.0],[1.3,.985],[1.9,.95],[2.2,.9],[2.26,.82]];
const BOT = [[-2.3,.42],[-2.2,.34],[-1.9,.3],[2.0,.3],[2.2,.34],[2.26,.44]];
const xFront = z => XFL + (XFE-XFL)*Math.pow(Math.max(0, 1 - Math.pow(Math.min(Math.abs(z), WMAX)/WMAX, 4)), .25);
const xRear  = z => XRL + (XRE-XRL)*Math.pow(Math.max(0, 1 - Math.pow(Math.min(Math.abs(z), WMAX)/WMAX, 3)), 1/3);
function section(w, top, bot){            // yumaloq to‘rtburchak kesim: [z, y, yuqorimi]
  const rt = Math.min(.14, w*.9), rb = Math.min(.06, w*.9), P = [], arc = (cz, cy, r, a0, a1, n, up) => { for(let k = 0; k < n; k++){ const a = a0 + (a1-a0)*k/n; P.push([cz + r*Math.cos(a), cy + r*Math.sin(a), up]); } };
  for(let k = 0; k < 28; k++) P.push([w, bot + rb + (top - rt - bot - rb)*k/28, 0]);              // o‘ng devor
  arc(w-rt, top-rt, rt, 0, Math.PI/2, 10, 1);                                                        // o‘ng yelka
  for(let k = 0; k < 14; k++) P.push([(w-rt) - 2*(w-rt)*k/14, top, 1]);                              // tepa
  arc(-(w-rt), top-rt, rt, Math.PI/2, Math.PI, 10, 1);                                               // chap yelka
  for(let k = 0; k < 28; k++) P.push([-w, top - rt - (top - rt - bot - rb)*k/28, 0]);              // chap devor
  arc(-(w-rb), bot+rb, rb, Math.PI, 1.5*Math.PI, 5, 0); for(let k = 0; k < 8; k++) P.push([-(w-rb) + 2*(w-rb)*k/8, bot, 0]); arc(w-rb, bot+rb, rb, 1.5*Math.PI, 2*Math.PI, 5, 0);
  return P;
}
function bodyGeo(NX){
  const pos = [], col = [], idx = [], L = XFE - XRE, xc = (XFE + XRE)/2; let NT = 0;
  for(let i = 0; i <= NX; i++){
    const x = xc - L/2*Math.cos(Math.PI*i/NX);
    let w = WMAX; if(x > XFL) w *= Math.pow(Math.max(0, 1 - Math.pow((x-XFL)/(XFE-XFL), 4)), .25); if(x < XRL) w *= Math.pow(Math.max(0, 1 - Math.pow((XRL-x)/(XRL-XRE), 3)), 1/3);
    w = Math.max(w, .003); const top = keyed(TOP, x), bot = keyed(BOT, x), S = section(w, top, bot); NT = S.length;
    for(const [zz, yy, up] of S){
      let z = zz, y = yy;
      if(up) y += .035*(1 - (z/WMAX)**2)*(sm(.9, 1.1, x)*(1 - sm(1.9, 2.25, x)) + sm(-1.6, -1.9, x)*(1 - sm(-2.15, -2.3, x)));    // kapot va bagaj qirrasi
      let r = 1, g = 1, b = 1;
      if(up){ const f = sm(-1.58, -1.5, x)*(1 - sm(.88, .95, x))*(1 - sm(.72, .84, Math.abs(z))); y += (TUB - y)*f; const k = sm(.3, .8, f); r += (.3-1)*k; g += (.25-1)*k; b += (.2-1)*k; }   // salon
      if(!up) XA.forEach(xa => { const d = Math.hypot(x-xa, y-.34), f = 1 - sm(AR-.06, AR+.04, d); if(Math.abs(z) > .55 && f > 0){ z = z*(1-f) + Math.sign(z)*.5*f; const k = sm(.5, .95, f); r += (.06-r)*k; g += (.06-g)*k; b += (.06-b)*k; } });  // g‘ildirak o‘yig‘i
      pos.push(x, y, z); col.push(r, g, b);
    }
  }
  for(let i = 0; i < NX; i++) for(let j = 0; j < NT; j++){ const a = i*NT + j, b = i*NT + (j+1) % NT, c = (i+1)*NT + j, d = (i+1)*NT + (j+1) % NT; idx.push(a, c, b, b, c, d); }
  return {pos, col, idx};
}
//BODY_END

const fp = (fn, z) => (fn(z+.01) - fn(z-.01))/.02, yawF = z => Math.atan(fp(xFront, z)), yawR = z => P + Math.atan(fp(xRear, z));
// ---------- Kuzov (GAZ-24: 4735×1800×1476, baza 2800) ----------
{ const d = bodyGeo(mobile ? 200 : 280), g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(d.pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(d.col, 3)); g.setIndex(d.idx); g.computeVertexNormals(); add(g, paint); }
const roof = new T.Shape(); [[-1.18,1.4],[-1.1,1.44],[.42,1.445],[.5,1.4]].forEach(([x, y], i) => i ? roof.lineTo(x, y) : roof.moveTo(x, y)); roof.closePath();
{ const g = new T.ExtrudeGeometry(roof, {depth:1.2, bevelEnabled:true, bevelThickness:.04, bevelSize:.03, bevelSegments:4}); g.translate(0, 0, -.6); add(g, paint); }
add(new T.BoxGeometry(1.55, .012, 1.2), liner, -.35, 1.385, 0, false);
for(const s of [-1, 1]){
  bar([.93,1.0,s*.78], [.48,1.45,s*.61], .05, .05, paint); bar([.66,1.0,s*.795], [.58,1.45,s*.62], .02, .02, chrome);
  bar([-.22,1.0,s*.8], [-.22,1.45,s*.63], .07, .05, paint); bar([-1.52,1.0,s*.78], [-1.14,1.45,s*.6], .13, .06, paint);
  bar([.47,1.455,s*.61], [-1.12,1.455,s*.61], .03, .03, paint); bar([.93,1.012,s*.81], [-1.5,1.012,s*.81], .012, .02, chrome);
  const g = new T.Group(); g.position.set(0, 1.0, s*.8); g.rotation.x = -s*.38; car.add(g);
  [[[.885,.05],[.64,.05],[.575,.42],[.51,.42]], [[.61,.05],[-.17,.05],[-.17,.43],[.58,.43]], [[-.27,.05],[-1.46,.05],[-1.12,.43],[-.27,.43]]].forEach(pp => {
    const sh = new T.Shape(); pp.forEach(([x, y], i) => i ? sh.lineTo(x, y) : sh.moveTo(x, y)); g.add(new T.Mesh(new T.ShapeGeometry(sh), glass)); });
}
const WS = [[.93,1.0,-.74], [.93,1.0,.74], [.49,1.44,.58], [.49,1.44,-.58]], RW = [[-1.52,1.0,.72], [-1.52,1.0,-.72], [-1.14,1.44,-.58], [-1.14,1.44,.58]];
quad(WS, glass); quad(RW, glass); [WS, RW].forEach(q => q.forEach((p, i) => bar(p, q[(i+1) % 4], .026, .026, chrome)));
[[-.32, -.05], [.2, .0]].forEach(([z, dz]) => bar([.9, 1.03, z], [.6, 1.27, z + dz], .014, .014, dark));                // tozalagichlar
bar([2.05,.953,0], [1.0,1.037,0], .06, .012, paint); bar([2.05,.948,.62], [1.0,1.03,.62], .008, .006, dark); bar([2.05,.948,-.62], [1.0,1.03,-.62], .008, .006, dark);
add(new T.BoxGeometry(.14, .012, .9), dark, .99, 1.034, -.05, false); for(let i = 0; i < 9; i++) add(new T.BoxGeometry(.012, .016, .9), steel, .93 + i*.015, 1.036, -.05, false);
for(const s of [-1, 1]){
  [.64, -.22, -1.32].forEach(x => add(new T.BoxGeometry(.008, .62, .006), dark, x, .67, s*.903, false));
  add(new T.BoxGeometry(2.0, .006, .006), dark, -.35, .36, s*.903, false);
  [-.14, -1.2].forEach(x => { add(new T.BoxGeometry(.12, .025, .012), chrome, x, .9, s*.907, false); add(new T.BoxGeometry(.04, .03, .02), chrome, x + .02, .9, s*.916, false); });
  add(new T.BoxGeometry(.1, .11, .045), chrome, .74, 1.1, s*.9, false); bar([.76,1.04,s*.84], [.76,1.1,s*.9], .015, .015, chrome);
  const m = add(new T.SphereGeometry(.028, 12, 8), amber, 1.98, .7, s*.9, false); m.scale.z = .5;
  add(new T.BoxGeometry(.015, .2, .12), rubber, -1.35-.52, .22, s*.84, false);
}
// ---------- Old qism ----------
add(new T.BoxGeometry(.02, .24, 1.04), dark, 2.262, .63, 0, false);
for(let k = 0; k <= 26; k++){ const z = -.5 + k*.0385, o = add(new T.BoxGeometry(.03, .21, .013), chrome, xFront(z) + .03, .63, z, false); o.rotation.y = yawF(z); }
[.74, .52].forEach(y => { for(let k = 0; k < 20; k++){ const z = -.5 + k*.0526; add(new T.BoxGeometry(.035, .016, .06), chrome, xFront(z) + .03, y, z + .026, false).rotation.y = yawF(z); } });
add(new T.BoxGeometry(.04, .1, .08), chrome, xFront(0) + .045, .76, 0, false).rotation.x = P/4; add(new T.BoxGeometry(.045, .03, .03), M(0xb5171e), xFront(0) + .07, .76, 0, false);
for(const s of [-1, 1]){
  const hz = .67, g = new T.Group(); g.position.set(xFront(hz) + .02, .67, s*hz); g.rotation.y = yawF(s*hz); car.add(g);
  const bez = new T.Mesh(new T.TorusGeometry(.108, .024, 12, 36), chrome); bez.rotation.y = P/2; g.add(bez);
  const lens = new T.Mesh(new T.SphereGeometry(.09, 24, 10, 0, 2*P, 0, P/2), glass); lens.rotation.z = -P/2; g.add(lens);
  const ref = new T.Mesh(new T.SphereGeometry(.085, 20, 8, 0, 2*P, 0, P/2), chrome); ref.rotation.z = P/2; g.add(ref); g.add(new T.Mesh(new T.SphereGeometry(.03, 12, 8), head));
  const ta = add(new T.BoxGeometry(.04, .07, .19), amber, xFront(.76) + .01, .44, s*.76, false); ta.rotation.y = yawF(s*.76);
  const fl = add(new T.BoxGeometry(.05, .09, .16), M(0xd9dcde, {metalness:.55, roughness:.1}), xFront(.36) + .14, .46, s*.36, false); add(new T.BoxGeometry(.04, .07, .14), white, xFront(.36) + .165, .46, s*.36, false);
}
const bump = sx => { const pts = []; for(let k = -10; k <= 10; k++){ const z = k*.088; pts.push(V(sx > 0 ? xFront(z) + .13 : xRear(z) - .13, .36, z)); }
  const sh = new T.Shape(); sh.moveTo(-.02, -.055); sh.lineTo(.02, -.055); sh.lineTo(.02, .055); sh.lineTo(-.02, .055); sh.closePath();
  add(new T.ExtrudeGeometry(sh, {steps:80, bevelEnabled:false, extrudePath:new T.CatmullRomCurve3(pts)}), chrome); };
bump(1); bump(-1);
add(new T.BoxGeometry(.05, .02, 1.4), dark, xFront(0) + .125, .295, 0, false);
[[xFront(0) + .16, .43, P/2], [xRear(0) - .15, .56, -P/2]].forEach(([x, y, r]) => { const m = add(new T.PlaneGeometry(.52, .13), M(0xffffff, {map:plateTex, roughness:.4}), x, y, 0, false); m.rotation.y = r; });
// ---------- Orqa qism ----------
for(const s of [-1, 1]){ const gr = new T.Group(); gr.position.set(xRear(.7) - .012, 0, s*.7); gr.rotation.y = yawR(s*.7); car.add(gr);
  [[.78, .09, amber], [.65, .13, tail], [.54, .06, white]].forEach(([y, h, m]) => { const o = new T.Mesh(new T.BoxGeometry(.04, h, .2), m); o.position.y = y; gr.add(o); }); }
add(new T.BoxGeometry(.03, .03, .14), chrome, xRear(0) - .01, .84, 0, false); add(new T.CylinderGeometry(.03, .03, .2, 12), M(0x888c90, {metalness:.55, roughness:.3}), -2.22, .27, -.5, false).rotation.z = P/2;
// ---------- Salon ----------
for(const [x, y, n] of [[-.05, .53, 2], [-.98, .55, 1]]){
  const w = n === 2 ? .62 : 1.3; for(const z of n === 2 ? [-.38, .38] : [0]){ add(new T.BoxGeometry(.5, .14, w), seat, x, y, z, false); const b = add(new T.BoxGeometry(.1, .52, w), seat, x - .24, y + .3, z, false); b.rotation.z = .16; } }
add(new T.BoxGeometry(.4, .22, 1.4), trim, .72, .93, 0, false).rotation.z = -.15;                                // asboblar paneli
const sw = add(new T.TorusGeometry(.19, .016, 8, 28), M(0x1a1a1a), .5, 1.0, -.38, false); sw.rotation.y = P/2 - .45; add(new T.CylinderGeometry(.02, .02, .35, 8), dark, .6, .94, -.38, false).rotation.z = P/2 - .45;
for(const s of [-1, 1]){ add(new T.BoxGeometry(.8, .5, .04), trim, .22, .72, s*.78, false); add(new T.BoxGeometry(.8, .5, .04), trim, -.75, .72, s*.78, false); }
// ---------- G‘ildiraklar ----------
const prof = a => a.map(([r, y]) => new T.Vector2(r, y));
const tireG = new T.LatheGeometry(prof([[.18,-.1],[.26,-.105],[.325,-.09],[.34,-.05],[.34,.05],[.325,.09],[.26,.105],[.18,.1]]), 64), barrelG = new T.LatheGeometry(prof([[.16,-.1],[.182,-.095],[.182,.095],[.16,.1]]), 40);
const wheels = [];
for(const [x, s] of [[XA[0], 1], [XA[0], -1], [XA[1], 1], [XA[1], -1]]){
  const w = new T.Group(), sp = new T.Group(); w.position.set(x, .34, s*.7); w.add(sp); car.add(w);
  const mk = (g, m, z = 0, rx = true) => { const o = new T.Mesh(g, m); o.castShadow = true; if(rx) o.rotation.x = P/2; o.position.z = z; sp.add(o); return o; };
  mk(tireG, rubber); mk(barrelG, steel); mk(new T.CylinderGeometry(.176, .176, .02, 36), steel, s*.06);
  mk(new T.CylinderGeometry(.135, .14, .02, 40), [chrome, new T.MeshStandardMaterial({map:hubTex, metalness:.5, roughness:.2}), new T.MeshStandardMaterial({map:hubTex, metalness:.5, roughness:.2})], s*.085);
  mk(new T.CylinderGeometry(.038, .038, .03, 20), dark, s*.098); mk(new T.CylinderGeometry(.16, .16, .1, 28), dark, 0);
  wheels.push(sp);
}
 // statik qismlar (~200 ta mesh) material bo'yicha birlashtiriladi: ko'rinish bir xil, draw call ~8x kam. G'ildirak guruhlari (aylanadi/buriladi) tegilmaydi
 batchStatic(car, {exclude:new Set(wheels.map(w => w.parent))});
 return {car, wheels, paint, head, tail};
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const shortest = a => Math.atan2(Math.sin(a), Math.cos(a));
const fin = v => typeof v === 'number' && isFinite(v);

export function initCars(C){
 const {scene, solids, toast, tone, netSend, remotes} = C;
 const mobile = matchMedia('(pointer:coarse)').matches || innerWidth < 700;
 const B = buildCar(THREE, mobile, C.renderer ? skyEnv(C.renderer) : null);
 const root = new THREE.Group(), tilt = new THREE.Group();
 B.car.rotation.y = -Math.PI/2;          // model +X (old) -> o'yin +Z (oldinga)
 tilt.add(B.car); root.add(tilt); scene.add(root);
 B.paint.color.setHex(0xe6e0c8);
 const front = [B.wheels[0].parent, B.wheels[1].parent];   // old g'ildiraklar (rul uchun)
 // holat: x,z = o'rni, yaw = yo'nalishi, v = tezlik (m/s, oldinga +), st = rul burchagi (o'ng +)
 const S = {x:24, z:-2, yaw:Math.PI/2, v:0, st:0, drv:false, rem:null, hb:0, brake:false, engT:0, netT:0, hitT:0};
 const CIRC = [-1.5, 0, 1.5], RAD = 1.0, LIM = 90;

 function step(dt, ix, iy, hold){
  const MAXF = 26, MAXR = 8;
  let tv = 0, rate = 2.5, brake = false;
  if(Math.abs(iy) > .12){
   tv = iy > 0 ? iy*MAXF : iy*MAXR;
   if(Math.sign(tv) !== Math.sign(S.v) && Math.abs(S.v) > .5){rate = 18; brake = true}
   else rate = Math.abs(tv) > Math.abs(S.v) ? 7 + 4*(1 - Math.abs(S.v)/MAXF) : 3;
  }
  if(hold || S.hb > 0){tv = 0; rate = 24; brake = true}
  S.hb = Math.max(0, S.hb - dt);
  const dv = tv - S.v; S.v += Math.sign(dv)*Math.min(Math.abs(dv), rate*dt); S.brake = brake;
  // rul: tezlik oshganda burilish burchagi kamayadi
  const ms = .62/(1 + Math.abs(S.v)*.07), ts = (Math.abs(ix) > .08 ? clamp(ix, -1, 1) : 0)*ms;
  S.st += (ts - S.st)*Math.min(1, dt*7);
  S.yaw -= S.v*Math.tan(S.st)/2.8*dt;
  const fx = Math.sin(S.yaw), fz = Math.cos(S.yaw);
  S.x = clamp(S.x + fx*S.v*dt, -LIM, LIM); S.z = clamp(S.z + fz*S.v*dt, -LIM, LIM);
  // to'qnashuv: 3 ta aylana (old, o'rta, orqa) va to'siqlar (AABB)
  let hit = 0;
  for(const o of CIRC){
   let cx = S.x + fx*o, cz = S.z + fz*o;
   for(const s of solids){
    if(s.y0 > 1.5 || s.top < .4) continue;
    if(Math.abs(cx - s.x) > s.hx + RAD || Math.abs(cz - s.z) > s.hz + RAD) continue;
    const nx = clamp(cx, s.x - s.hx, s.x + s.hx), nz = clamp(cz, s.z - s.hz, s.z + s.hz);
    let dx = cx - nx, dz = cz - nz, d = Math.hypot(dx, dz);
    if(d >= RAD) continue;
    if(d < 1e-4){const ox = s.hx - Math.abs(cx - s.x), oz = s.hz - Math.abs(cz - s.z); if(ox < oz){dx = cx < s.x ? -1 : 1; dz = 0; d = -ox}else{dx = 0; dz = cz < s.z ? -1 : 1; d = -oz}}
    else{dx /= d; dz /= d}
    const pen = RAD - d; S.x += dx*pen; S.z += dz*pen; cx += dx*pen; cz += dz*pen; hit = Math.max(hit, pen);
   }
  }
  if(hit > .02){
   if(Math.abs(S.v) > 6 && S.hitT <= 0 && S.drv){S.hitT = .4; tone(90, .18, .22, 'sawtooth', 45)}
   S.v *= Math.exp(-7*dt);
  }
  S.hitT -= dt;
 }

 const me = () => C.me();
 const near = () => {const m = me(); if(!m) return false; const p = m.root.position; return Math.hypot(p.x - S.x, p.z - S.z) < 3.4 && p.y < 1.2};
 const pack = d => ({k:'cr', d, x:+S.x.toFixed(2), z:+S.z.toFixed(2), r:+S.yaw.toFixed(3), v:+S.v.toFixed(2), s:+S.st.toFixed(3)});
 function enter(){
  const m = me(); if(!m) return;
  S.drv = true; S.rem = null; m.root.visible = false; m.vx = m.vz = m.vy = 0; m.speed = 0; m.moving = m.running = false;
  tone(300, .12, .15, 'square', 180); toast('Mashinadasiz · SPACE / SAKRA = qo‘l tormozi'); netSend(pack(1)); S.netT = .1;
 }
 function leave(place){
  const m = me(); if(!m) return;
  S.drv = false; m.root.visible = true; m.vx = m.vz = m.vy = 0;
  if(place){   // chap eshik tomonga tushadi
   m.root.position.set(S.x + Math.cos(S.yaw)*2.3, 0, S.z - Math.sin(S.yaw)*2.3); m.root.rotation.y = S.yaw;
  }
  tone(200, .1, .12, 'square', 300); netSend(pack(0));
 }
 // har kadrda main.js dan: true = hali haydayapmiz
 function drive(dt, ix, iy, hold, pulse){
  const m = me(), p = m.root.position;
  if(Math.hypot(p.x - S.x, p.z - S.z) > 8){leave(false); return false}   // portal/teleport: mashinadan chiqib ketamiz
  if(m.lock > 0){leave(true); return false}                               // yiqilsak ham
  if(pulse) S.hb = .5;
  step(dt, ix, iy, hold);
  p.set(S.x, 0, S.z); m.root.rotation.y = S.yaw; m.vx = m.vz = m.vy = 0; m.speed = 0; m.grounded = true; m.moving = m.running = m.air = false; m.jc = 0;
  return true;
 }
 function update(dt){
  if(S.rem){
   const R = S.rem;
   if(performance.now() - R.t > 2000){const rr = remotes.get(R.id); if(rr && rr.char) rr.char.hid = false; S.rem = null}
   else{const k = 1 - Math.exp(-dt*10); S.x += (R.x - S.x)*k; S.z += (R.z - S.z)*k; S.yaw += shortest(R.yaw - S.yaw)*k; S.v = R.v; S.st = R.s}
  }else if(!S.drv && (Math.abs(S.v) > .01 || Math.abs(S.st) > .002)) step(dt, 0, 0, true);   // qo'yib ketilgan mashina to'xtaydi
  root.position.set(S.x, 0, S.z); root.rotation.y = S.yaw;
  tilt.rotation.z = -S.st*S.v*.005;
  const spin = S.v*dt/.34; B.wheels.forEach(w => w.rotation.z -= spin);
  front.forEach(w => w.rotation.y = -S.st);
  B.tail.emissiveIntensity = S.brake ? 2.8 : 1.2;
  if(S.drv){
   S.engT -= dt; if(S.engT <= 0){S.engT = .09; const a = Math.min(1, Math.abs(S.v)/22); tone(52 + Math.abs(S.v)*5, .1, .025 + .035*a, 'sawtooth')}
   S.netT -= dt; if(S.netT <= 0){S.netT = .1; netSend(pack(1))}
  }
 }
 function onNet(id, d){
  const r = remotes.get(id);
  if(d.d){
   if(S.drv || !fin(d.x) || !fin(d.z)) return;
   S.rem = {id, t:performance.now(), x:d.x, z:d.z, yaw:fin(d.r) ? d.r : 0, v:fin(d.v) ? d.v : 0, s:fin(d.s) ? d.s : 0};
   if(r && r.char) r.char.hid = true;
  }else{
   if(S.rem && S.rem.id === id && fin(d.x) && fin(d.z)){S.x = d.x; S.z = d.z; S.yaw = fin(d.r) ? d.r : S.yaw; S.v = 0; S.st = 0; S.rem = null}
   if(r && r.char) r.char.hid = false;
  }
 }
 update(0);
 return {update, onNet, drive, enter, exit:() => leave(true), canEnter:() => !S.drv && !S.rem && near(),
  get driving(){return S.drv}, get yaw(){return S.yaw}, get speed(){return S.v}};
}
