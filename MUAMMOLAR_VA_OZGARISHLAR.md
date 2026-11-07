# TAIMAN GTA — optimizatsiya hisoboti

## 0. Muhim: nima tekshirildi, nima tekshirilmadi
- Tekshirildi: barcha .js fayllarda sintaksis (`node --check`), `import/export` mosligi, ESLint `no-undef` (yangi xato yo‘q; `mqtt` — avvaldan CDN dan keladigan global).
- **Tekshirilmadi: o‘yinni brauzerda ishga tushirish.** Bu muhitda three.js yuklab bo‘lmadi (tarmoq yopiq) va modellar (.glb) yo‘q. FPS raqamlarini o‘lchay olmadim. Quyidagi "kutilgan ta’sir" — kod tahlilidan hisoblangan taxmin; haqiqiy raqamni `?debug` paneli ko‘rsatadi (pastda).

## 1. Allaqachon yaxshi bo‘lgan (tegilmadi)
Grafika rejimlari (ULTRA/BALANCED/PERFORMANCE/AUTO), avto piksel-zichlik, debug panel (FPS, ms, draw calls, uchburchak, geometriya, tekstura), roads.js dagi kvartal culling va birlashtirish, soya xaritasining o‘yinchiga ergashishi va texel-snap, 60 FPS chegarasi (MIN_DT), uzoq personajlarni frustum bilan yashirish.

## 2. Topilgan muammolar, sabab, yechim
| # | Muammo | Sabab | Yechim | Fayl |
|---|--------|-------|--------|------|
| 1 | Har bir daraxt juda og‘ir | Hisoblab chiqdim (desktop): bitta daraxt ≈ 430–500 shox (~6k uchburchak) + ≈ 3000–3500 barg (~30k uchburchak). Boqiy Shaharda ~70 ta + bog‘larda. LOD yo‘q edi, katakcha 48 m (kamera uzoq daraxtni ham to‘liq chizardi) | 3 darajali LOD: to‘liq (<85 m) — avvalgi daraxt **aynan o‘sha**; o‘rta (<175 m) — barglar 1/3, 1.7x kattaroq (qoplama yuzasi saqlanadi), ingichka novdalarsiz (~6k uchb.); uzoq — 1/8 barg (~1k uchb.). Katakcha 24 m, 8 m gisterezis (tebranmaydi). Yaqin daraxt sifati o‘zgarmadi | buildings.js, main.js |
| 2 | Po‘stloq teksturasi 4096² | ~64 MB (mip bilan ~85 MB) GPU xotira; tana ~0.5 m, ekranda bunday aniqlik ko‘rinmaydi; yuklanishda ham sekin chiziladi | 2048² (~21 MB). Tana ekranda baribir shu aniqlikdan past | buildings.js |
| 3 | Mashina = yuzlab alohida mesh | cars.js da barcha detallar (panjara, bamper, chrom, ramka…) alohida Mesh = alohida draw call | `batchStatic`: bir xil materialli statik qismlar bitta meshga; g‘ildirak (aylanadi/buriladi), shaffof oynalar tegilmaydi. Ko‘rinish bir xil (vertex-rang farqi saqlanadi) | cars.js, batch.js |
| 4 | Boqiy Shahar: yuzlab alohida mesh | `box()`, minora, bino qismlari hammasi alohida | 100 m li katakchalar bo‘yicha material bilan birlashtirish (frustum culling saqlanadi). G‘ildirak, suv, portallar, osmon tegilmaydi | boqiy.js, batch.js |
| 5 | Uy/bank/bar/park: har biri 30–70 mesh | `bx()` har bir detalga alohida Mesh; qurilganlar soni 20 gacha | Statik qismlar birlashtiriladi; tom (yashirinadi), yashirin devor, bar animatsiyali qismlari istisno | buildings.js |
| 6 | Vertolyot korpusi ×3 o‘tish | Lathe 128×160 ≈ 41k uchburchak; soya + korpus + shaffof oyna = 3 marta | >75 m masofada ~4x yengil geometriya (UV bir xil → tekstura o‘zgarmaydi), <55 m da qaytadi | heli.js |
| 7 | Tangalar: har biriga alohida geometriya+material | `coin()` har chaqiruvda `new CylinderGeometry` va `mat()` | Umumiy geometriya va material | world.js |
| 8 | Uzoqdagi NPC lar to‘liq tezlikda yangilanadi | `Char.update`: mixer + suyaklar + `updateMatrixWorld` har kadrda | 50 m dan uzoq NPC/o‘yinchi animatsiyasi har 2-kadrda (dt jamlanadi). Salto/zarba/yiqilish/gap pufagida to‘liq tezlik. O‘yinchining o‘zi hech qachon | main.js |
| 9 | GC: raqs/zarba paytida har kadrda yangi Quaternion | `armPose` da `quaternion.clone()` | `copy()` bilan qayta ishlatish | main.js |
| 10 | Xotira oqishi (kichik) | `setRank` eski SpriteMaterial ni dispose qilmasdi | `material.dispose()` | main.js |

## 3. Grafika sifati (pasaytirilmadi, oshirildi)
- Mashina: osmon+quyosh PMREM muhit xaritasi (`env.js`, bir marta ~ms) → bo‘yoq, xrom, po‘lat va oynada realistik aks. Intensivlik: bo‘yoq .8, xrom 1, po‘lat .6.
- Boqiy Shahar: firuza gumbaz, kafel, marmar, shisha va **kanal suvi** osmonni aks ettiradi.
- Shahar osmono‘par oynalari (roads.js): aks ettirish (.6). Telefonda BALANCED/PERFORMANCE da o‘chiq (LITE).
- Debug panel: GPU nomi, WebGL versiyasi, maxTex, anisotropy, JS heap, daraxt LOD taqsimoti qo‘shildi.

## 4. Qilinmadi va sababi
- **Ambient Occlusion (SSAO/GTAO)**: postprocessing chuqurlik/normal uchun sahnani ikkinchi marta chizadi — bu sahnada (daraxt, shahar) kadr narxini sezilarli oshiradi va 60 FPS maqsadiga zid. Oldin yuqoridagi o‘zgarishlarni o‘lchab, zaxira qolsa, faqat desktop ULTRA da ixtiyoriy yoqiladigan variant qo‘shish mumkin.
- `solids` uchun fazoviy indeks: hozir ~yuzlab to‘siq × ~10 personaj — mikrosekundlar. Muammo emas, tegilmadi.
- `grass.js`: hech joyda import qilinmagan (o‘lik kod), tegilmadi.
- Mexanika, xarita, binolar, NPC/mashina soni — o‘zgarmadi.

## 5. Birinchi ishga tushirishda nimani tekshirish kerak
1. `index.html?debug` ochib, **Draw calls** va **Uchburchak** ni eski versiya bilan solishtiring (Boqiy: terminalga `boqiy`).
2. Mashina rangi: tom/ustunlar avvalgidek ekanini ko‘ring (vertex-rang guruhlari ataylab ajratilgan).
3. Daraxtlar 85 m / 175 m atrofida yurganda sezilarli "sakrash" bo‘lmasligi. Sezilsa: `buildings.js` da `TL=[85,175]` ni oshiring (masalan `[110,220]`).
4. Qaytarish: har bir `batchStatic(...)` qatorini izohga olish shu qismni eski holatga qaytaradi; `treeLOD(...)` qatorini main.js dan olib tashlasangiz daraxtlar doim to‘liq (eski xatti-harakat).
5. Fayllardagi qator oxiri belgilari LF ga keltirildi (buildings.js, cars.js, heli.js) — mantiqqa ta’sir qilmaydi.
