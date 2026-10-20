document.body.classList.add('js');
const menu=document.querySelector('.menu-toggle');
const nav=document.querySelector('#main-nav');
menu.addEventListener('click',()=>{
 const open=menu.getAttribute('aria-expanded')!=='true';
 menu.setAttribute('aria-expanded',String(open));
 nav.classList.toggle('is-open',open);
 menu.querySelector('span').textContent=open?'−':'＋';
});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&menu.getAttribute('aria-expanded')==='true'){
  menu.setAttribute('aria-expanded','false');nav.classList.remove('is-open');menu.querySelector('span').textContent='＋';menu.focus();
 }
});
const buttons=[...document.querySelectorAll('.zoom-photo')];
const box=document.querySelector('.lightbox');
const image=box.querySelector('img');
const frame=box.querySelector('.lightbox-frame');
const caption=box.querySelector('#lightbox-caption');
const count=box.querySelector('.lightbox-count');
let active=0,opener=null;
function showPhoto(index){
 active=(index+buttons.length)%buttons.length;
 const b=buttons[active];
 image.src='assets/photos/'+b.dataset.photo+'.jpg';
 image.alt=b.querySelector('img').alt;
 caption.textContent=b.dataset.caption;
 frame.className='lightbox-frame '+(b.dataset.crop||'');
 count.textContent=String(active+1).padStart(2,'0')+' / '+String(buttons.length).padStart(2,'0');
}
buttons.forEach((b,i)=>b.addEventListener('click',()=>{
 opener=b;showPhoto(i);box.showModal();document.body.classList.add('modal-open');box.querySelector('.lightbox-close').focus();
}));
box.querySelector('.lightbox-close').addEventListener('click',()=>box.close());
box.querySelector('.lightbox-prev').addEventListener('click',()=>showPhoto(active-1));
box.querySelector('.lightbox-next').addEventListener('click',()=>showPhoto(active+1));
box.addEventListener('keydown',e=>{
 if(e.key==='ArrowRight'){e.preventDefault();showPhoto(active+1);}
 if(e.key==='ArrowLeft'){e.preventDefault();showPhoto(active-1);}
});
box.addEventListener('click',e=>{if(e.target===box)box.close();});
box.addEventListener('close',()=>{document.body.classList.remove('modal-open');if(opener)opener.focus();});
