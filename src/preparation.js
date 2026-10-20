/* Startup work is visible and runs before the presentation clock starts.
 * The bar counts preparation stages/tasks, not estimated seconds or bytes. */
window.DeckPreparation=(()=>{
 'use strict';
 const stages=['assets','titles','models','scene','gpu','pages'];
 const names={assets:'Fonts & images',titles:'Letter shapes & particles',models:'Local 3D models',scene:'Character & room',gpu:'Materials & key shots',pages:'Charts & page transitions'};
 const began=performance.now(),history=[],root=document.querySelector('#loading');
 let progress=0,ready=false,started=false;
 function step(stage,done=0,total=1,detail=''){
  const i=stages.indexOf(stage);if(i<0)throw new Error('Unknown preparation stage: '+stage);
  const count=Math.max(0,Math.min(total,done)),value=i+count/Math.max(1,total);progress=Math.max(progress,value);
  const bar=document.querySelector('#loading-progress'),fill=document.querySelector('#loading-fill'),label=document.querySelector('#loading-stage'),note=document.querySelector('#loading-detail');
  if(bar){bar.setAttribute('aria-valuenow',String(progress));bar.setAttribute('aria-valuetext',names[stage]+': '+count+' of '+total);}
  if(fill)fill.style.transform=`scaleX(${progress/stages.length})`;
  if(label)label.textContent=names[stage];
  if(note)note.textContent=`${i+1} / ${stages.length}  ·  ${count} / ${total}${detail?'  ·  '+detail:''}`;
  history.push({stage,done:count,total,detail,ms:Math.round(performance.now()-began)});
 }
 // Yield to a paint and a browser task. Hidden windows must not deadlock on
 // requestAnimationFrame, which browsers may suspend in background tabs.
 function tick(){return new Promise(resolve=>document.visibilityState==='hidden'?setTimeout(resolve,0):requestAnimationFrame(()=>setTimeout(resolve,0)));}
 async function decode(assets){
  const entries=Object.entries(assets),images={};let done=0;
  step('assets',0,entries.length+1,'Loading fonts');await tick();await document.fonts.ready;
  step('assets',++done,entries.length+1,'Fonts ready');await tick();
  await Promise.all(entries.map(async([key,url])=>{
   const image=new Image();image.src=url;await image.decode();images[key]=image;
   step('assets',++done,entries.length+1,key);
  }));
  await Promise.all([...document.images].map(image=>image.decode()));return images;
 }
 function finish(){
  ready=true;progress=stages.length;
  if(root){root.hidden=false;root.dataset.phase='ready';}
  const title=document.querySelector('#loading-title'),label=document.querySelector('#loading-stage'),note=document.querySelector('#loading-detail'),button=document.querySelector('#start');
  if(title)title.textContent='One more try.';
  if(label)label.textContent='Ready when you are';
  if(note)note.textContent='15 slides · Navigate with ← / →';
  if(button){button.hidden=false;button.disabled=false;button.focus?.({preventScroll:true});}
 }
 function dismiss(){if(!ready||started)return false;started=true;if(root)root.hidden=true;return true;}
 function fail(error){if(ready)return;const label=document.querySelector('#loading-stage'),note=document.querySelector('#loading-detail');if(label)label.textContent='Preparation interrupted';if(note)note.textContent='Reload the file to try again. '+String(error?.message||error);if(root)root.dataset.error=String(error?.stack||error);}
 window.addEventListener?.('unhandledrejection',event=>fail(event.reason));
 function inspect(){return {ready,started,elapsedMs:Math.round(performance.now()-began),stages:stages.length,completed:progress,history:history.slice()};}
 return Object.freeze({step,tick,decode,finish,dismiss,fail,inspect});
})();
