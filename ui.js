// O'yin ichidagi oyna: confirm()/prompt() o'rniga (ular o'yinni qotirib qo'yardi).
export function initUI(){
 const root=document.createElement('div');root.id='modal';
 root.innerHTML='<div class="mbox"><p class="mt"></p><input class="mi" maxlength="40" autocomplete="off" autocapitalize="off" spellcheck="false"><div class="mb"><button class="mn"></button><button class="my"></button></div></div>';
 document.body.appendChild(root);
 const t=root.querySelector('.mt'),i=root.querySelector('.mi'),y=root.querySelector('.my'),n=root.querySelector('.mn');
 let done=null,isIn=false;
 const close=v=>{root.classList.remove('open');document.body.classList.remove('modal');i.blur();const d=done;done=null;if(d)d(v)};
 const show=(text,inp,yes,no)=>new Promise(res=>{
  if(done)close(isIn?null:false);
  done=res;isIn=inp;t.textContent=text;i.style.display=inp?'block':'none';i.value='';y.textContent=yes;n.textContent=no;
  root.classList.add('open');document.body.classList.add('modal');if(inp)setTimeout(()=>i.focus(),80);
 });
 y.onclick=()=>close(isIn?i.value:true);
 n.onclick=()=>close(isIn?null:false);
 i.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')y.click();if(e.key==='Escape')n.click()});
 return{ask:text=>show(text,false,'Qabul qilish','Rad etish'),input:text=>show(text,true,'Yuborish','Bekor qilish')};
}
