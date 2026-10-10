/* malfilter.js – Familienplaner: Fotos in Bleistift/Buntstift/Aquarell/Pastell umwandeln.
   Rein clientseitig. API:
     Malfilter.anwenden(bildQuelle, stil, staerke0bis100) -> Promise<dataURL JPEG>
     Malfilter.dialog(bildQuelle, {titel, hinweis}) -> Promise<dataURL | null>  (null = Abbrechen; bei "Original" das unveränderte Bild; mit {mitStil:true} -> {bild, stil, geteilt}; {teilen:true|false} zeigt die Auswahl 👪 Familie / 🔒 Nur ich)
   bildQuelle: dataURL, Blob/File oder HTMLImageElement. Ergebnis max. 900px, JPEG q0.82. */
(function(){
'use strict';
const MAX=900;
let W=0,H=0,grainL=null;
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const cl=(v,a,b)=>v<a?a:v>b?b:v;

function blurPass(a,w,h,r){
  const t=new Float32Array(a.length),o=new Float32Array(a.length),n=2*r+1;
  for(let y=0;y<h;y++){const off=y*w;let s=0;
    for(let i=-r;i<=r;i++)s+=a[off+cl(i,0,w-1)];
    for(let x=0;x<w;x++){t[off+x]=s/n;s+=a[off+cl(x+r+1,0,w-1)]-a[off+cl(x-r,0,w-1)];}}
  for(let x=0;x<w;x++){let s=0;
    for(let i=-r;i<=r;i++)s+=t[cl(i,0,h-1)*w+x];
    for(let y=0;y<h;y++){o[y*w+x]=s/n;s+=t[cl(y+r+1,0,h-1)*w+x]-t[cl(y-r,0,h-1)*w+x];}}
  return o;
}
function blur(a,w,h,r){if(r<1)return a;return blurPass(blurPass(a,w,h,r),w,h,r);}
function normalize(a){let mn=1e9,mx=-1e9;for(const v of a){if(v<mn)mn=v;if(v>mx)mx=v;}const d=mx-mn||1;for(let i=0;i<a.length;i++)a[i]=(a[i]-mn)/d;return a;}

let fine=null,h1=null,h2=null,cp1=null,cp2=null,pas=null;
const ss=(a,b,x)=>{let t=(x-a)/(b-a);t=t<0?0:t>1?1:t;return t*t*(3-2*t);};
function strokes(ang,jit,len,lw,count,alpha,seed){
  const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d',{willReadFrequently:true});
  x.fillStyle='#000';x.fillRect(0,0,W,H);x.lineCap='round';x.strokeStyle='rgba(255,255,255,'+alpha+')';
  const r=rng(seed*97+13);
  for(let i=0;i<count;i++){
    const px=r()*W,py=r()*H,a=ang+(r()-.5)*jit,L=len*(.5+r()),dx=Math.cos(a)*L/2,dy=Math.sin(a)*L/2;
    x.lineWidth=lw*(.6+.8*r());x.beginPath();x.moveTo(px-dx,py-dy);
    x.quadraticCurveTo(px+(r()-.5)*L*.15,py+(r()-.5)*L*.15,px+dx,py+dy);x.stroke();}
  const d=x.getImageData(0,0,W,H).data,o=new Float32Array(W*H);
  for(let i=0,j=0;i<o.length;i++,j+=4)o[i]=d[j]/255;return o;
}
function makeGrain(){
  const n=W*H,r=rng(7),f=new Float32Array(n),l=new Float32Array(n);
  for(let i=0;i<n;i++){f[i]=r();l[i]=r();}
  fine=f;grainL=normalize(blur(l,W,H,Math.max(6,Math.round(W/45))));
  const sc=Math.max(W,H)/900;
  h1=strokes(-0.8,0.25,16*sc+6,1.1,n/45,0.6,1);
  h2=strokes(0.75,0.25,16*sc+6,1.1,n/55,0.55,2);
  cp1=strokes(-0.9,0.5,12*sc+5,1.5,n/22,0.5,3);
  cp2=strokes(0.5,0.5,12*sc+5,1.5,n/30,0.45,4);
  pas=strokes(-0.35,0.35,26*sc+10,5*sc+2,n/110,0.35,5);
}
function channels(d){const n=W*H,R=new Float32Array(n),G=new Float32Array(n),B=new Float32Array(n),L=new Float32Array(n);
  for(let i=0,j=0;i<n;i++,j+=4){R[i]=d[j];G[i]=d[j+1];B[i]=d[j+2];L[i]=.299*d[j]+.587*d[j+1]+.114*d[j+2];}return{R,G,B,L};}
function sketch(L,r,dark){
  const n=L.length,inv=new Float32Array(n);for(let i=0;i<n;i++)inv[i]=255-L[i];
  const b=blur(inv,W,H,r),s=new Float32Array(n);
  for(let i=0;i<n;i++){const d=b[i]>=254.5?255:Math.min(255,L[i]*255/(255-b[i]));s[i]=Math.pow(d/255,dark);}
  return s;
}
function kuwahara(R,G,B,r){
  const w1=W+1,sz=w1*(H+1),sR=new Float64Array(sz),sG=new Float64Array(sz),sB=new Float64Array(sz),sL=new Float64Array(sz),sQ=new Float64Array(sz);
  for(let y=0;y<H;y++){let aR=0,aG=0,aB=0,aL=0,aQ=0;
    for(let x=0;x<W;x++){const i=y*W+x,L=.299*R[i]+.587*G[i]+.114*B[i];aR+=R[i];aG+=G[i];aB+=B[i];aL+=L;aQ+=L*L;
      const k=(y+1)*w1+x+1;sR[k]=sR[k-w1]+aR;sG[k]=sG[k-w1]+aG;sB[k]=sB[k-w1]+aB;sL[k]=sL[k-w1]+aL;sQ[k]=sQ[k-w1]+aQ;}}
  const n=W*H,oR=new Float32Array(n),oG=new Float32Array(n),oB=new Float32Array(n);
  const S=(s,a,b,c,d)=>s[d]-s[b]-s[c]+s[a];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const xs=[Math.max(0,x-r),x,Math.min(W-1,x+r)],ys=[Math.max(0,y-r),y,Math.min(H-1,y+r)];
    let best=1e18,bi=0,bj=0;
    for(let qy=0;qy<2;qy++)for(let qx=0;qx<2;qx++){
      const x0=xs[qx],x1=xs[qx+1],y0=ys[qy],y1=ys[qy+1],c=(x1-x0+1)*(y1-y0+1);
      const a=y0*w1+x0,b=y0*w1+x1+1,cc=(y1+1)*w1+x0,d=(y1+1)*w1+x1+1;
      const m=S(sL,a,b,cc,d)/c,v=S(sQ,a,b,cc,d)/c-m*m;
      if(v<best){best=v;bi=qx;bj=qy;}}
    const x0=xs[bi],x1=xs[bi+1],y0=ys[bj],y1=ys[bj+1],c=(x1-x0+1)*(y1-y0+1);
    const a=y0*w1+x0,b=y0*w1+x1+1,cc=(y1+1)*w1+x0,d=(y1+1)*w1+x1+1,i=y*W+x;
    oR[i]=S(sR,a,b,cc,d)/c;oG[i]=S(sG,a,b,cc,d)/c;oB[i]=S(sB,a,b,cc,d)/c;}
  return{R:oR,G:oG,B:oB};
}
function fadeEdges(o,amt){
  const m=Math.min(W,H)*amt;
  for(let y=0,i=0;y<H;y++)for(let x=0;x<W;x++,i++){
    const d=Math.min(x,y,W-1-x,H-1-y),t=d/(m*(.45+1.1*grainL[i]));
    if(t<1){const f=Math.pow(1-t,1.6),j=i*4;for(let c=0;c<3;c++)o[j+c]=o[j+c]+(PAPER[c]-o[j+c])*f;}}
}
const PAPER=[247,244,236];

function bleistift(d,k){
  const c=channels(d),Ls=blur(c.L,W,H,2),s=sketch(c.L,Math.round(2+k*3),1.3+k*1.2),o=new Uint8ClampedArray(d.length),q=.6+.4*k;
  for(let i=0,j=0;i<W*H;i++,j+=4){
    const dk=1-Ls[i]/255;let v=s[i]*(1-.3*ss(.25,.85,dk));
    v*=1-.45*h1[i]*ss(.3,.75,dk)*q;
    v*=1-.45*h2[i]*ss(.5,.9,dk)*q;
    v*=.975+.035*fine[i];
    o[j]=58+(PAPER[0]-58)*v;o[j+1]=60+(PAPER[1]-60)*v;o[j+2]=66+(PAPER[2]-66)*v;o[j+3]=255;}
  return o;
}
function buntstift(d,k){
  const c=channels(d),b=kuwahara(c.R,c.G,c.B,2),s=sketch(c.L,2,1.2+k*.8),o=new Uint8ClampedArray(d.length);
  for(let i=0,j=0;i<W*H;i++,j+=4){
    let r=b.R[i],g=b.G[i],bb=b.B[i];const m=(r+g+bb)/3;r=m+(r-m)*1.2;g=m+(g-m)*1.2;bb=m+(bb-m)*1.2;
    const dk=1-c.L[i]/255;
    const cov=Math.min(1,cp1[i]*1.1+cp2[i]*1.1*ss(.3,.8,dk));
    const mix=Math.min(1,((.52+.3*k)+.22*dk)*(.74+.36*cov));
    const v=(1-(1-s[i])*.75)*(.985+.025*fine[i]);
    o[j]=(PAPER[0]+(r-PAPER[0])*mix)*v;o[j+1]=(PAPER[1]+(g-PAPER[1])*mix)*v;o[j+2]=(PAPER[2]+(bb-PAPER[2])*mix)*v;o[j+3]=255;}
  return o;
}
function aquarell(d,k){
  const c=channels(d);let b=kuwahara(c.R,c.G,c.B,Math.round(3+k*4));b=kuwahara(b.R,b.G,b.B,2);
  const R=blur(b.R,W,H,2),G=blur(b.G,W,H,2),B=blur(b.B,W,H,2),n=W*H,L=new Float32Array(n);
  for(let i=0;i<n;i++)L[i]=.299*R[i]+.587*G[i]+.114*B[i];
  const lb=blur(L,W,H,3),sk=sketch(c.L,2,1.2),o=new Uint8ClampedArray(d.length);
  for(let i=0,j=0;i<n;i++,j+=4){
    let col=[R[i],G[i],B[i]];const m=(col[0]+col[1]+col[2])/3;
    let f=1+Math.min(0,L[i]-lb[i])/255*(2.5+2*k);f*=.92+.14*grainL[i];f*=.98+.03*fine[i];
    const pen=1-(1-sk[i])*.22,wv=ss(222,245,L[i])*.7;
    for(let ch=0;ch<3;ch++){let v=m+(col[ch]-m)*1.12;v=v+(PAPER[ch]-v)*.12;v=v*f*pen;v=v+(PAPER[ch]-v)*wv;o[j+ch]=v;}
    o[j+3]=255;}
  fadeEdges(o,.06);
  return o;
}
function pastell(d,k){
  const c=channels(d),k0=kuwahara(c.R,c.G,c.B,Math.round(3+k*3)),b={R:blur(k0.R,W,H,2),G:blur(k0.G,W,H,2),B:blur(k0.B,W,H,2)},sk=sketch(c.L,2,1.1),o=new Uint8ClampedArray(d.length);
  for(let i=0,j=0;i<W*H;i++,j+=4){
    let r=b.R[i],g=b.G[i],bb=b.B[i];const m=(r+g+bb)/3;r=m+(r-m)*1.08;g=m+(g-m)*1.08;bb=m+(bb-m)*1.08;
    const lift=.12+.1*k;r+=(250-r)*lift;g+=(248-g)*lift;bb+=(242-bb)*lift;
    const mix=(.82+.18*Math.min(1,pas[i]*1.4))*(.96+.04*fine[i]),v=1-(1-sk[i])*.35;
    o[j]=(PAPER[0]+(r-PAPER[0])*mix)*v;o[j+1]=(PAPER[1]+(g-PAPER[1])*mix)*v;o[j+2]=(PAPER[2]+(bb-PAPER[2])*mix)*v;o[j+3]=255;}
  fadeEdges(o,.05);
  return o;
}

const STILE={bleistift:{name:'Bleistift',fn:bleistift},buntstift:{name:'Buntstift',fn:buntstift},aquarell:{name:'Aquarell',fn:aquarell},pastell:{name:'Pastell',fn:pastell}};
let cacheKey=null,cacheSrc=null;

function ladeBild(q){
  return new Promise((res,rej)=>{
    if(q instanceof HTMLImageElement&&q.complete&&q.naturalWidth){res(q);return;}
    const img=new Image();let url='';
    img.onload=()=>{if(url)URL.revokeObjectURL(url);res(img);};
    img.onerror=()=>{if(url)URL.revokeObjectURL(url);rej(new Error('Bild konnte nicht geladen werden'));};
    if(q instanceof Blob){url=URL.createObjectURL(q);img.src=url;}
    else if(q instanceof HTMLImageElement){img.src=q.src;}
    else img.src=q;
  });
}
function vorbereiten(img){
  const key=img.src+'|'+img.naturalWidth;
  if(key===cacheKey&&cacheSrc)return cacheSrc;
  const s=Math.min(1,MAX/Math.max(img.naturalWidth,img.naturalHeight));
  W=Math.max(1,Math.round(img.naturalWidth*s));H=Math.max(1,Math.round(img.naturalHeight*s));
  const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d',{willReadFrequently:true});
  x.drawImage(img,0,0,W,H);const d=x.getImageData(0,0,W,H);
  makeGrain();cacheKey=key;cacheSrc={d,W,H};return cacheSrc;
}
function rechnen(src,stil,staerke){
  W=src.W;H=src.H;
  const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
  const k=Math.max(0,Math.min(100,staerke==null?60:staerke))/100;
  const out=(stil&&STILE[stil])?STILE[stil].fn(src.d.data,k):src.d.data;
  x.putImageData(new ImageData(new Uint8ClampedArray(out),W,H),0,0);
  return c.toDataURL('image/jpeg',.82);
}
async function anwenden(q,stil,staerke){const img=await ladeBild(q);return rechnen(vorbereiten(img),stil,staerke);}

function css(){
  if(document.getElementById('mf-css'))return;
  const st=document.createElement('style');st.id='mf-css';
  st.textContent=`
.mf-bg{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;display:flex;align-items:center;justify-content:center;padding:12px}
.mf-box{background:var(--white,#fffdf8);color:var(--soil,#3a2e1f);border-radius:16px;max-width:520px;width:100%;max-height:94vh;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:12px;font-family:inherit}
.mf-box h3{margin:0;font-size:1.1rem}
.mf-bild{position:relative;background:var(--parchment,#ece0c7);border-radius:10px;overflow:hidden;min-height:120px;display:flex;align-items:center;justify-content:center}
.mf-bild img{display:block;max-width:100%;max-height:52vh;user-select:none;-webkit-user-select:none}
.mf-lade{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:rgba(255,255,255,.55);font-weight:700;color:#333}
.mf-stile{display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:6px}
.mf-stile button,.mf-akt button{font:inherit;font-weight:700;padding:9px 8px;border-radius:999px;border:1px solid rgba(0,0,0,.15);background:rgba(0,0,0,.05);color:inherit;cursor:pointer}
.mf-stile button.an{background:var(--moss,#4f6f45);border-color:var(--moss,#4f6f45);color:var(--cream,#fff)}
.mf-reg{display:flex;align-items:center;gap:10px;font-size:.9rem}
.mf-reg input{flex:1;accent-color:var(--moss,#4f6f45)}
.mf-akt{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
.mf-akt .ok{background:var(--moss,#4f6f45);border-color:var(--moss,#4f6f45);color:var(--cream,#fff)}
.mf-hinweis{font-size:.75rem;opacity:.75;margin:-4px 0 0}
.mf-teilen{display:flex;gap:6px;align-items:center;font-size:.85rem;flex-wrap:wrap}
.mf-teilen button{font:inherit;font-weight:700;padding:7px 12px;border-radius:999px;border:1px solid rgba(0,0,0,.15);background:rgba(0,0,0,.05);color:inherit;cursor:pointer}
.mf-teilen button.an{background:var(--moss,#4f6f45);border-color:var(--moss,#4f6f45);color:var(--cream,#fff)}
html[data-dark="1"] .mf-stile button,html[data-dark="1"] .mf-akt button{border-color:rgba(255,255,255,.18);background:rgba(255,255,255,.06)}
`;
  document.head.appendChild(st);
}
function dialog(q,opt){
  opt=opt||{};css();
  return new Promise(async(resolve)=>{
    let img;try{img=await ladeBild(q);}catch(e){resolve(null);return;}
    const src=vorbereiten(img),orig=rechnen(src,null);
    let stil=opt.stil||'original',staerke=opt.staerke==null?60:opt.staerke,akt=orig,t=0;
    const bg=document.createElement('div');bg.className='mf-bg';
    bg.innerHTML='<div class="mf-box" role="dialog" aria-label="Malfilter"><h3>'+(opt.titel||'🎨 Malstil wählen')+'</h3>'+
      '<div class="mf-bild"><img alt="Vorschau"><div class="mf-lade">Male …</div></div>'+
      '<div class="mf-stile"><button data-s="original">Original</button>'+Object.keys(STILE).map(k=>'<button data-s="'+k+'">'+STILE[k].name+'</button>').join('')+'</div>'+
      '<label class="mf-reg">Stärke <input type="range" min="0" max="100" step="1"><b class="mf-wert"></b></label>'+
      (opt.teilen!==undefined?'<div class="mf-teilen"><span>Sichtbar für:</span><button type="button" data-t="1">👪 Familie</button><button type="button" data-t="0">🔒 Nur ich</button></div>':'')+(opt.hinweis?'<p class="mf-hinweis">'+opt.hinweis+'</p>':'')+'<div class="mf-akt"><button class="ab">Abbrechen</button><button class="ok">Übernehmen</button></div></div>';
    document.body.appendChild(bg);
    const bi=bg.querySelector('img'),lade=bg.querySelector('.mf-lade'),reg=bg.querySelector('input'),wert=bg.querySelector('.mf-wert');
    reg.value=staerke;wert.textContent=staerke;
    let geteilt=opt.teilen!==false;
    function teilenRendern(){bg.querySelectorAll('.mf-teilen button').forEach(b=>b.classList.toggle('an',(b.dataset.t==='1')===geteilt));}
    bg.querySelectorAll('.mf-teilen button').forEach(b=>b.addEventListener('click',()=>{geteilt=b.dataset.t==='1';teilenRendern();}));
    teilenRendern();
    function zeichne(){
      bg.querySelectorAll('.mf-stile button').forEach(b=>b.classList.toggle('an',b.dataset.s===stil));
      reg.disabled=stil==='original';
      if(stil==='original'){akt=orig;bi.src=orig;return;}
      lade.style.display='flex';
      setTimeout(()=>{try{akt=rechnen(src,stil,staerke);bi.src=akt;}catch(e){console.error(e);}lade.style.display='none';},30);
    }
    function zu(r){bg.remove();resolve(r);}
    bg.querySelector('.mf-stile').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;stil=b.dataset.s;zeichne();});
    reg.addEventListener('input',()=>{staerke=+reg.value;wert.textContent=staerke;clearTimeout(t);t=setTimeout(zeichne,150);});
    bg.querySelector('.ab').onclick=()=>zu(null);
    bg.querySelector('.ok').onclick=()=>zu(opt.mitStil?{bild:akt,stil:stil,geteilt:geteilt}:akt);
    bg.addEventListener('click',e=>{if(e.target===bg)zu(null);});
    zeichne();
  });
}
window.Malfilter={anwenden,dialog,stile:Object.keys(STILE)};
})();
