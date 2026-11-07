import * as THREE from 'three';
// Yo'l chetidagi uzun o't (yashil_maydon_modeli.html dan): shamolda tebranadi, faqat yo'l/trotuardan tashqarida o'sadi.
// Ishlatish: buildGrass(scene, ticks, roads, mobile, avoid, camPos) — roads: buildRoads() natijasi, avoid: [[x,z,radius],...] o'tsiz joylar,
// camPos: () => kamera pozitsiyasi (ixtiyoriy; berilsa uzoqdagi o'tlar chizilmaydi).
// YANGI: o't katakchalarga (CELL) bo'linadi. Kamera ko'rmaydigan va uzoqdagi katakchalar umuman chizilmaydi (avval hammasi har kadrda chizilardi — telefon qotishi/qizishining asosiy sababi).
export function buildGrass(scene, ticks, roads, mobile, avoid = [], camPos = null){
const T = THREE, EDGE = 7.2, START = EDGE + .4, BAND = 9;          // trotuar chetidan 0.4 m keyin boshlanadi, 9 m gacha tarqaladi
const H0 = .15, HR = .2;                                             // o'tning uzunligi: 0.15 m dan 0.35 m gacha (ba'zilari 0.45 m)
const DENS = mobile ? 40 : 120;                                      // 1 m² ga taxminan o't soni
const CELL = 32, SHOW = mobile ? 46 : 90;                            // katakcha o'lchami va ko'rinish masofasi (m)
// ---- barg geometriyasi ----
const SEG = mobile ? 3 : 4, pos = [], idx = [];
for(let i = 0; i <= SEG; i++){ const t = i/SEG, w = .02*Math.pow(1-t, .8); if(i < SEG) pos.push(-w, t, 0, w, t, 0); else pos.push(0, 1, 0); }
for(let i = 0; i < SEG-1; i++){ const a = i*2; idx.push(a, a+1, a+2, a+1, a+3, a+2); }
{ const a = (SEG-1)*2; idx.push(a, a+1, SEG*2); }
const basePos = new T.Float32BufferAttribute(pos, 3), baseIdx = new T.BufferAttribute(new Uint16Array(idx), 1);
// ---- yo'l o'qi bo'ylab joylashtirish ----
const at = (p, s) => { let i = 1; while(i < p.length-1 && p[i].s < s) i++; const a = p[i-1], b = p[i], k = (s-a.s)/((b.s-a.s) || 1), L = u => a[u] + (b[u]-a[u])*k, lx = L('lx'), lz = L('lz'), l = Math.hypot(lx, lz) || 1; return {x:L('x'), z:L('z'), lx:lx/l, lz:lz/l}; };
const total = roads.arms.reduce((n, a) => n + a.p[a.p.length-1].s, 0), N = Math.round(total*2*BAND*.6*DENS);
const cells = new Map();
for(let tries = 0, n = 0; n < N && tries < N*3; tries++){
  let q = Math.random()*total, arm = roads.arms[0];
  for(const a of roads.arms){ const e = a.p[a.p.length-1].s; if(q < e){ arm = a; break; } q -= e; }
  const c = at(arm.p, q), side = Math.random() < .5 ? -1 : 1, o = side*(START + BAND*Math.pow(Math.random(), 1.6));
  const x = c.x + c.lx*o, z = c.z + c.lz*o;
  if(roads.near(x, z, -.1)) continue;                                  // boshqa yo'l/trotuar ustiga o'smasin
  if(avoid.some(([ax, az, r]) => Math.hypot(x-ax, z-az) < r)) continue;
  const key = Math.floor(x/CELL) + '|' + Math.floor(z/CELL);
  let b = cells.get(key); if(!b) cells.set(key, b = {cx:(Math.floor(x/CELL) + .5)*CELL, cz:(Math.floor(z/CELL) + .5)*CELL, o:[], p:[]});
  b.o.push(x, z, Math.random()*6.2832);
  b.p.push(H0 + Math.random()*HR + (Math.random() < .12 ? HR*.5 : 0), .25 + Math.random()*.55, Math.random());
  n++;
}
const U = {uTime:{value:0}, uWind:{value:1}, fogColor:{value:new T.Color(0xbcd3e6)}, fogNear:{value:1e4}, fogFar:{value:2e4}};
const mat = new T.ShaderMaterial({
  uniforms:U, side:T.DoubleSide,
  vertexShader:`
    attribute vec3 aOff; attribute vec3 aP; uniform float uTime, uWind;
    varying float vT, vW, vH, vD;
    void main(){
      float t = position.y, h = aP.x, c = cos(aOff.z), s = sin(aOff.z);
      vec3 p = vec3(position.x*c, t*h, position.x*s);
      p.xz += vec2(-s, c) * aP.y * t*t * h * .35;
      vec2 wd = normalize(vec2(1., .35)); float ph = dot(aOff.xy, wd);
      float wave = sin(ph*.22 - uTime*1.5)*.6 + sin(ph*.6 - uTime*2.7 + aOff.y*.3)*.3 + sin(uTime*5. + aOff.x*1.7 + aOff.y*1.3)*.1;
      float sway = (.55 + .45*wave) * uWind;
      p.xz += wd * sway * t*t * h * .55 + vec2(-wd.y, wd.x) * sin(uTime*2.1 + ph*.4) * .06 * uWind * t*t * h;
      p.y -= sway * t*t * h * .15;
      vec4 mv = modelViewMatrix * vec4(p + vec3(aOff.x, 0., aOff.y), 1.);
      gl_Position = projectionMatrix * mv; vT = t; vW = sway; vH = aP.z; vD = -mv.z;
    }`,
  fragmentShader:`
    uniform vec3 fogColor; uniform float fogNear, fogFar; varying float vT, vW, vH, vD;
    void main(){
      vec3 col = mix(vec3(.10,.22,.06), vec3(.30,.55,.14), smoothstep(0., .5, vT));
      col = mix(col, vec3(.70,.82,.34), smoothstep(.45, 1., vT));
      col *= .78 + .44*vH; col += vW*.07*vT;
      gl_FragColor = vec4(mix(col, fogColor, smoothstep(fogNear, fogFar, vD)), 1.);
    }`
});
const group = new T.Group(), meshes = []; let count = 0;
const CR = CELL*.72 + 1.5;                                           // katakcha chegaralovchi sferasi radiusi
cells.forEach(b => {
  const geo = new T.InstancedBufferGeometry();
  geo.setAttribute('position', basePos); geo.setIndex(baseIdx);
  geo.setAttribute('aOff', new T.InstancedBufferAttribute(new Float32Array(b.o), 3)); geo.setAttribute('aP', new T.InstancedBufferAttribute(new Float32Array(b.p), 3));
  geo.instanceCount = b.o.length/3; count += geo.instanceCount;
  geo.boundingSphere = new T.Sphere(new T.Vector3(b.cx, .3, b.cz), CR);   // frustum culling shu sfera bo'yicha ishlaydi
  const m = new T.Mesh(geo, mat); m.userData.c = b; meshes.push(m); group.add(m);
});
scene.add(group);
ticks.push((dt, t) => {                                               // soat + o'yin tumani bilan moslash
  U.uTime.value = t; const f = scene.fog;
  if(f){ U.fogColor.value.copy(f.color); U.fogNear.value = f.near; U.fogFar.value = f.far; }
  if(camPos){ const c = camPos(), lim = SHOW + CR; for(const m of meshes){ const b = m.userData.c; m.visible = Math.hypot(c.x - b.cx, c.z - b.cz) < lim; } }
});
return {uniforms:U, count, mesh:group};
}
