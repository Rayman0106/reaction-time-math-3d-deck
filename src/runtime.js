const $=s=>document.querySelector(s);
const release=Boolean(window.DECK_RELEASE);
$('#viewport').inert=true;$('#controls').inert=true;
const data=window.DECK_CONTENT, charts=window.DeckCharts, assets=window.DECK_ASSETS;
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sentence=s=>s.toLowerCase().replace(/^[a-z]/,c=>c.toUpperCase());
const heading=(n,title)=>`<div class="eyebrow">${escapeHTML(sentence(data[n].section.replace(/^\d+ \/ /,'')))}</div><h1 id="title-${n}">${title||escapeHTML(data[n].title)}</h1>`;
const small=(s)=>`<p class="small-note">${s}</p>`;
const legend=`<div class="legend-line"><span><i class="dot"></i>Quiet</span><span><i class="dot amber"></i>Conversation</span><span>Time in milliseconds</span></div>`;
const MAIN_COUNT=15;
const motion=window.DeckMotion,icon=(name,extra)=>motion.icon(name,extra);
const html=[
`<div class="dark-left story-opening">${heading(0,'One more<br><em>try.</em>').replace('<h1','<h1 class="hero-title"')}<p class="subhead" data-reveal=".4">A fraction of a second.<br>A question about attention.</p><div class="practice-story" data-reveal=".7">${window.ReactionLoop.markup()}<small class="practice-disclaimer">Illustrative task · not study data</small></div></div>`,
`<div class="dark-left story-question">${heading(1,'Why does<br>it <em>change?</em>').replace('<h1','<h1 class="hero-title"')}<p class="quiet-thought" data-reveal="2.4"><span>Same task.</span> <span class="different-response">Different response.</span></p></div>`,
`<div class="dark-left story-ideas">${heading(2,'Choose one.<br><em>Conversation.</em>')}<div class="idea-grid">${[['sleep','Sleep'],['practice','Practice'],['clock','Time of day'],['device','Device'],['conversation','Conversation']].map((d,j)=>`<div class="idea ${j===4?'chosen':''}" data-idea="${j}">${icon(d[0])}<span>${d[1]}</span>${j===4?'<b>→</b>':''}</div>`).join('')}</div></div>`,
`<div class="dark-left story-method">${heading(3,'One task.<br>Two conditions.')}<p class="research-question" data-reveal="4.2">Does background conversation make visual reaction times slower or less consistent?</p><div class="conditions"><span><i class="dot"></i>Quiet</span><span><i class="dot amber"></i>Conversation</span></div><div class="method-visuals">${[['people','30','people'],['trials','5','trials / condition'],['conditions','2','conditions']].map((d,j)=>`<div data-reveal="${.4+j*.6}">${icon(d[0])}<strong>${d[1]}</strong><span>${d[2]}</span></div>`).join('')}</div><p class="sampling-note" data-reveal="2.1">Convenience sample: classmates and acquaintances.<br>Each person completed both conditions.</p><p class="method-foot" data-reveal="2.5">2 practice responses · 1.5–3.5 s random wait<br>Paired unit: 30 people · 298 restricted responses</p></div>`,
`<div class="dark-left story-rule">${heading(4,'Keep the rule<br>in view.')}<div class="stat-total" data-reveal=".3">298<small>restricted trials</small></div><div class="count-split" data-reveal=".7"><div class="blue"><strong>150</strong><span>Quiet</span></div><div class="amber"><strong>148</strong><span>Conversation</span></div></div><div class="rule-graphic" data-reveal="1.2"><div class="rule-band"><span>100</span><i></i><span>1000 ms</span></div><span class="rule-label">Restricted analysis range · not a measurement-error diagnosis</span><div class="rule-excluded"><span>Long responses</span><b>2030.5</b><b>1973.4 ms</b></div></div></div>`,
`${heading(5,'A familiar cluster.')}${icon('distribution','chart-emblem')}<div class="content-grid"><div class="chart-wrap">${motion.histogram(assets.histogram)}</div><div class="chart-aside"><span class="big">200–250</span><span class="unit">ms · modal interval</span><p>Both distributions skew right.</p><p>Quiet has the longer tail.</p><p class="tiny">Relative frequencies · 50 ms bins<br>Quiet n = 150 · Conversation n = 148</p></div></div>`,
`${heading(6,'Follow the distribution.')}${icon('cumulative','chart-emblem')}<p class="subhead">How many responses finished by this time?</p><div class="content-grid" style="margin-top:48px"><div class="chart-wrap">${motion.cumulative(assets.cumulative)}</div><div class="chart-aside"><span class="big">50%</span><span class="unit">locates the median</span><div class="graphic-line"><p class="blue">Quiet<br><strong>233.1 ms</strong></p><p class="amber">Conversation<br><strong>226.0 ms</strong></p></div><p class="tiny">The curves overlap and cross.</p></div></div><p class="finding">Quiet reaches 100% later: its retained responses include a longer tail.</p>`,
`${heading(7,'Lower. Narrower. Pooled.')}${icon('box','chart-emblem')}${legend}<div class="box-layout">${charts.boxplot()}</div><div class="qline">${[['MEDIAN','233.1','226.0'],['MEAN','261.8','253.0'],['IQR','86.8','58.3'],['SAMPLE SD','102.5','80.9']].map(m=>`<div><div class="metric-name">${m[0]==='IQR'?'IQR':m[0]==='SAMPLE SD'?'Sample SD':sentence(m[0])}</div><div class="metric-values"><span class="blue">${m[1]}</span><i>/</i><span class="amber">${m[2]}</span></div></div>`).join('')}</div><div class="within-comparison" data-reveal="3.4"><div><span class="within-label">Estimated pooled within-participant SD</span><span class="within-values"><b class="blue">83.1</b><i> / </i><b class="amber">61.9</b><small>ms</small></span></div><p><strong>≈25% lower</strong> with conversation in the restricted data.<br>Rounded summaries · 4–5 trials per condition · not every person’s SD</p></div>`,
`<div class="paired-head"><div>${heading(8,'Most people<br>slowed down.')}<div class="formula">Δ = Conversation mean − Quiet mean</div></div><div class="pair-count"><div class="amber"><b>19</b><span>slower</span></div><div class="blue"><b>11</b><span>faster</span></div></div></div><div class="paired-chart">${charts.paired()}</div>`,
`${heading(9,'Mean <em>left.</em> Median <em>right.</em>')}${icon('average','chart-emblem')}<div class="difference-legend" aria-label="Dot colours show the effect of conversation"><span><i class="dot"></i>Faster with conversation · Δ &lt; 0</span><span><i class="dot amber"></i>Slower with conversation · Δ &gt; 0</span></div><div class="mean-chart">${charts.meanMedian()}</div><div class="mean-bottom"><p class="finding">A few large decreases outweigh many small increases.<br><strong>The median stays positive.</strong></p><div class="pullquote">Paired mean: −7.9 ms<br>Pooled mean: −8.8 ms<br><span class="tiny">Different weighting: P08 and P11 retain one fewer conversation trial.</span></div></div>`,
`${heading(10,'Two responses reverse the comparison.')}<p class="subhead">Restore the two long responses: <span data-restored-trial="0">2030.5</span> and <span data-restored-trial="1">1973.4</span> ms.</p><div class="sensitivity-chart">${charts.sensitivity()}</div><div class="sensitivity-result" data-reveal="4.4"><p>Pooled mean difference: <strong>−8.8 → ≈+14.5 ms</strong></p><p><strong>19 of 30</strong> still have a slower conversation mean.</p></div>`,
`${heading(11,'A better next test.')}<div class="improvement-grid">${[
['trials','More trials','Estimate consistency within each person.'],
['device','One setup','Fix the device, response method and volume.'],
['sound','Separate sounds','Distinguish speech from restaurant ambience.'],
['shuffle','Balance the order','Counterbalance or randomise condition order to reduce practice and fatigue effects.']
].map((v,i)=>`<div class="improvement" data-reveal="${.25+i*.4}">${icon(v[0])}<h2>${v[1]}</h2><p>${v[2]}</p></div>`).join('')}</div><p class="study-design-note" data-reveal="1.2"><strong>Also:</strong> sample from a broader, defined population; prespecify exclusions and report full and restricted results.</p>`,
`<div class="dark-left story-conclusion">${heading(12,'A <em>mixed</em><br>answer.').replace('<h1','<h1 class="hero-title"')}<div class="conclusion-count" data-reveal="1.3"><div><b>19</b><span>slower</span></div><i>/</i><div><b>11</b><span>faster</span></div></div><div class="conclusion-findings" data-reveal="2.7"><p><strong>Speed</strong>Mixed changes. The mean depends on the two long responses.</p><p><strong>Consistency</strong>Lower estimated pooled within-participant variability in the restricted data.</p></div><p class="conclusion-boundary" data-reveal="3.5">Not evidence that everyone became more consistent.<br>Findings describe our convenience sample.</p></div>`,
`<div class="dark-left story-ending">${heading(13,'Until the<br><em>next test.</em>').replace('<h1','<h1 class="hero-title"')}<p class="subhead" data-reveal=".6">A clearer question to take forward.</p><div class="power-status" data-reveal="1.6">${icon('power')}<span id="power-status">Closing the investigation…</span></div></div>`,
`<div class="dark-left story-bow">${heading(14,'Thank<br><em>you.</em>').replace('<h1','<h1 class="hero-title"')}<p class="subhead" data-reveal=".8">Questions &amp; discussion</p><p class="members" data-reveal="2">Ethan Yang · Aries Xia<br>Hector Kang · Rayman Guo</p></div>`,
`${heading(15,'Full summary of the retained trials')}<p class="subhead">Quiet n = 150 · Conversation n = 148 · timing values in milliseconds</p><div class="appendix-table">${charts.pooledTable()}</div>`,
`${heading(16,'All 30 paired comparisons')}<p class="subhead">Positive Δ = slower with conversation · Negative Δ = faster</p><div class="appendix-table" style="margin-top:22px">${charts.participantTable()}</div>`
];
const darks=new Set([0,1,2,3,4,12,13,14]);
$('#slides').innerHTML=html.map((s,i)=>`<section class="slide ${darks.has(i)?'dark':''} ${i<3?'story-slide':''}" data-index="${i}" aria-labelledby="title-${i}" aria-hidden="true">${s}</section>`).join('');
const sections=[...document.querySelectorAll('.slide')];
const analysisFX=window.DeckAnalysisTransitions.create(sections),chartFloors=new Map();
const sources=[
'Animated demonstration · example timings, not study data',
'Conceptual story · a question, not a finding',
'Candidate influences · only background conversation was investigated',
'Question, convenience sample and paired method · report p. 1',
'Restricted analysis range · report p. 1',
'Original source figure 1 · report p. 2',
'Original source figure 2 · report p. 2',
'Box plots: report p. 3 · within-participant SD: p. 5, Table 4',
'All 30 reported paired differences · report p. 4',
'Reported paired comparisons · report pp. 4–5',
'Approximate sensitivity comparison · report p. 5, Table 3',
'Limitations and proposed improvements · report p. 6, Section 9',
'Speed and consistency · restricted/full comparisons · report pp. 5–6',
'Illustrated closing · data and formulas available in the appendices',
'Thank you for listening · questions and discussion',
'Overall: report p. 3, Table 1 · within-participant: pp. 5–6, Tables 4–5',
'Table 2, supplied report p. 4 · unchanged reported values'
];
const transitionTypes=['dolly','pause','ideas','choose','gate','enter','scan','quartile','fan','focus','recall','slide','return','shutdown','bow','scan','fan'];
let captureFrozen=false,ready=false,started=false,starting=false;
let index=0,transition=null,auto=false,autoStart=performance.now(),episodeStart=autoStart,episodeDone=false,reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,raf=0,toastTimer=0,heldTypeIndex=null;
const sceneLoadStart=performance.now();
const boot=window.DeckPreparation;
const preparedImages=await boot.decode(assets);
boot.step('titles',0,sections.length,'Preparing font masks');
await window.DeckTypography.prepare(sections,{onProgress:(done,total)=>boot.step('titles',done,total),yieldControl:boot.tick});
let scene=null;try{scene=await window.createReactionScene(THREE,$('#scene'),{deferWarmup:true,screenImage:preparedImages.screenAnalysis,limitationsImage:preparedImages.screenLimitations,yieldControl:boot.tick,onProgress:boot.step});}catch(error){console.error('3D scene unavailable',error);boot.step('scene',4,4,'2D fallback');toast('3D unavailable. All slides remain readable.');}
const ease=t=>t*t*t*(t*(t*6-15)+10),clamp=n=>Math.min(1,Math.max(0,n));
const uiDurations={0:window.ReactionPractice.duration,1:14,2:18,3:10,12:10,13:8,14:14};
const durationFor=i=>Math.max(uiDurations[i]||0,motion.duration(i),window.DeckTypography.duration(i),scene?.episodeDuration?.(i)||0);
let lastSize={w:0,h:0};
function resize(){const s=Math.min(innerWidth/1920,innerHeight/1080);$('#stage').style.transform=`scale(${s})`;if(scene){const w=Math.round(1920*s),h=Math.round(1080*s);if(w!==lastSize.w||h!==lastSize.h){scene.resize(w,h,Math.min(devicePixelRatio,1.6));lastSize={w,h};scene.render();}}}
function toast(msg){$('#toast').textContent=msg;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2500);}
function updateChrome(i){$('#chapter').textContent=sentence(data[i].section.replace(/^\d+ \/ /,''));$('#source-note').textContent=sources[i];$('#slide-count').textContent=i<MAIN_COUNT?`${String(i+1).padStart(2,'0')} / ${MAIN_COUNT}`:`APPENDIX ${i===MAIN_COUNT?'A':'B'}`;$('#prev').disabled=i===0;$('#next').disabled=i===sections.length-1;$('#progress div').style.width=`${Math.min(i+1,MAIN_COUNT)/MAIN_COUNT*100}%`;if(!release)$('#notes-content').innerHTML=`<div class="timing">${i<MAIN_COUNT?`Slide ${i+1} · approximately ${data[i].duration} seconds`:'Backup slide'}</div><h2>${escapeHTML(data[i].title)}</h2><p>${escapeHTML(data[i].notes)}</p><p class="cue">${escapeHTML(data[i].cue)}</p>`;document.querySelectorAll('.overview-item').forEach((el,j)=>el.classList.toggle('current',j===i));}
function resetSection(el){el.style.transform='';el.style.filter='';el.style.clipPath='';el.style.opacity='';el.style.background='';}
function updateStoryUI(i,t){
 motion.sample(sections[i],i,Math.max(t,chartFloors.get(i)||0));window.DeckTypography.sample(sections[i],heldTypeIndex===i?window.DeckTypography.duration(i):t,scene?.semanticAnchors?.()||{});$('#stage').dataset.slide=String(i);sections[i].dataset.motionState=t>=Math.max(motion.duration(i),window.DeckTypography.duration(i))?'complete':'playing';
 if(i===13){const off=t>=6.2;$('#power-status').textContent=off?'Investigation complete.':'Closing the investigation…';$('.power-status').classList.toggle('off',off);}
}
function episode(i,t){
 $('#stage').dataset.actionSecond=String(Math.floor(t));
 if(scene&&darks.has(i)){scene.sample(i,i,1,t);scene.render();}
 updateStoryUI(i,t);
}
function resetPlane(){analysisFX.clear();const plane=$('#presentation-layer');plane.style.opacity='1';plane.style.background='';}
function settled(i,{finish=false,holdType=false,seconds=0}={}){
 heldTypeIndex=holdType?i:null;
 resetPlane();$('#presentation-layer').style.background=darks.has(i)?'':'rgb(240,243,242)';$('#stage').style.background='';$('#masthead').style.opacity='';$('#slide-footer').style.opacity='';
 sections.forEach((el,j)=>{resetSection(el);el.classList.toggle('active',i===j);el.style.visibility=i===j?'visible':'hidden';el.setAttribute('aria-hidden',i===j?'false':'true');});
 $('#stage').classList.toggle('light',!darks.has(i));$('#stage').classList.toggle('ending',i===13||i===14);
 $('#scene').style.opacity=darks.has(i)?'1':'0';$('#scene-shade').style.opacity=darks.has(i)?'1':'0';$('#transition-trace').style.opacity='0';
 const elapsed=Math.max(0,Math.min(seconds,durationFor(i))),now=performance.now();
 episodeStart=now-elapsed*1000;episodeDone=finish||reduce||elapsed>=durationFor(i);episode(i,episodeDone?durationFor(i):elapsed);updateChrome(i);autoStart=now;
}
function beginPresentationPlayback(){
 if(started)return;
 started=true;starting=false;resize();settled(index);episodeStart=autoStart=performance.now();profileLast=0;profileIntervals.length=0;
 $('#viewport').inert=false;$('#controls').inert=false;boot.dismiss();$('#start').blur?.();
 document.body.classList.add('show-controls');clearTimeout(controlsTimer);controlsTimer=setTimeout(()=>document.body.classList.remove('show-controls'),5500);
 if(!captureFrozen)raf=requestAnimationFrame(frame);
}
function startPresentation(){
 if(!ready||started||starting)return false;
 starting=true;$('#start').disabled=true;
 // Request synchronously in the button gesture. Hold the cover and clocks
 // until the fullscreen viewport has settled; a denial still allows play.
 if(!captureFrozen&&!document.fullscreenElement&&typeof document.documentElement.requestFullscreen==='function'){
  try{Promise.resolve(document.documentElement.requestFullscreen({navigationUI:'hide'})).then(beginPresentationPlayback,beginPresentationPlayback);}catch{beginPresentationPlayback();}
 }else beginPresentationPlayback();
 return true;
}
const isAnalysisPage=i=>i>=5&&i<=11;
const isEntryPair=(from,to)=>from===4&&to===5||from===5&&to===4;
function animateAnalysisPages(tr,p){
 const from=sections[tr.from],to=sections[tr.to],fx=tr.fx||(tr.fx=analysisFX.begin(tr.from,tr.to)),style=analysisFX.sample(fx,p);
 from.style.opacity=String(style.fromOpacity);to.style.opacity=String(style.toOpacity);from.style.background=to.style.background='';
 from.style.transform=style.fromTransform;to.style.transform=style.toTransform;
 from.style.clipPath=to.style.clipPath='';
 // The transfer itself builds the next chart. Do not erase that completed
 // shape with its old chart-intro frame when the native layer takes over.
 chartFloors.set(tr.to,fx.chartFloor);tr.incomingSeconds=Math.max(0,(p-fx.incomingAt)*tr.duration/1000);updateStoryUI(tr.to,tr.incomingSeconds);analysisFX.decorate(fx,p);
 if(p>=.5&&tr.chromeIndex!==tr.to){updateChrome(tr.to);tr.chromeIndex=tr.to;}
 $('#stage').classList.add('light');$('#scene').style.opacity=$('#scene-shade').style.opacity='0';
}
function animateSection(el,type,p,incoming){
 const q=incoming?1-p:p;
 el.style.opacity=String(incoming?clamp(p*1.3):1-clamp(p*1.7));
 el.style.clipPath='';
 el.style.transform=`translateY(${(incoming?1:-1)*q*(type==='return'?14:22)}px)`;
}
// Explicit developer-only profiling view; absent from normal presentation.
const profileEnabled=!release&&new URLSearchParams(location.search).has('profile');
let profileLast=0,profileStamp=0,profileLoadMs=0;const profileIntervals=[];
let profileEl=null;
if(profileEnabled){profileEl=document.createElement('pre');profileEl.id='profile-readout';document.body.appendChild(profileEl);}
function profileFrame(now){
 if(!profileEl)return;
 if(profileLast&&now-profileLast<1000&&scene&&(transition||!episodeDone))profileIntervals.push(now-profileLast);profileLast=now;
 if(now-profileStamp<600)return;profileStamp=now;
 const values=profileIntervals.slice().sort((a,b)=>a-b),mean=values.reduce((a,b)=>a+b,0)/(values.length||1),metrics=scene?.metrics?.()||{};
 profileEl.textContent=JSON.stringify({scope:'Active animation frames',loadMs:Math.round(profileLoadMs),frames:values.length,meanFps:mean?Math.round(10000/mean)/10:0,p95FrameMs:values[Math.floor(values.length*.95)]||0,over33ms:values.filter(x=>x>33.4).length,viewport:innerWidth+'×'+innerHeight,calls:metrics.calls,triangles:metrics.triangles},null,2);
}
function frame(now){
 if(!started)return;
 profileFrame(now);
 if(transition){const tr=transition,p=clamp((now-tr.start)/tr.duration),e=ease(p),from=sections[tr.from],to=sections[tr.to];const bothLight=!darks.has(tr.from)&&!darks.has(tr.to);
  const throughMonitor=isEntryPair(tr.from,tr.to),exitMonitor=(tr.from===11&&tr.to===12)||(tr.from===12&&tr.to===11);$('#stage').dataset.transitionPhase=String(Math.floor(p*10));
  const plane=$('#presentation-layer');
  if(throughMonitor){
   // Hold the title's initial state during monitor arrival. Cluster starts
   // drawing after arrival, on the same clock as the histogram.
   const q=tr.to===5?p:1-p,page=sections[5],person=sections[4];
   if(tr.to===5)window.DeckTypography.sample(page,0);
   // The source remains opaque. A complete opaque page is blended ONCE over
   // the identical, registered monitor image: coverage is one at every frame.
   const reveal=ease(clamp((q-.90)/.10));
   person.style.opacity=String(1-ease(clamp(q/.22)));person.style.transform='';person.style.clipPath='';
   page.style.opacity=q>=.90?'1':'0';page.style.transform='';page.style.clipPath='';
   $('#scene').style.opacity='1';$('#scene-shade').style.opacity=String(1-ease(clamp(q/.28)));
   plane.style.background=q>=.90?'rgb(240,243,242)':'';plane.style.opacity=q>=.90?String(reveal):'1';
   const chromeOpacity=q>=.90?1:1-ease(clamp(q/.22));
   const chromeIndex=q>=.90?5:4;if(tr.chromeIndex!==chromeIndex){updateChrome(chromeIndex);tr.chromeIndex=chromeIndex;}
   $('#masthead').style.opacity=String(chromeOpacity);$('#slide-footer').style.opacity=String(chromeOpacity);
   $('#stage').classList.toggle('light',q>=.90);$('#stage').style.background='rgb(7,21,28)';
  }else if(exitMonitor){
   const q=tr.from===11?p:1-p,handoff=ease(clamp((q-.06)/.12)),reveal=ease(clamp((q-.86)/.14));
   const page=sections[11],person=sections[12];
   page.style.opacity=q<.18?'1':'0';page.style.transform='';page.style.clipPath='';
   person.style.opacity=q>=.86?'1':'0';person.style.transform='';person.style.clipPath='';
   plane.style.background=q<.18?'rgb(240,243,242)':'';plane.style.opacity=String(q<.18?1-handoff:q>=.86?reveal:0);
   $('#scene').style.opacity='1';$('#scene-shade').style.opacity=String(reveal);
   const chromeIndex=q<.86?11:12;
   if(tr.chromeIndex!==chromeIndex){updateChrome(chromeIndex);tr.chromeIndex=chromeIndex;}
   $('#masthead').style.opacity='1';$('#slide-footer').style.opacity='1';
   $('#stage').classList.toggle('light',q<.18);$('#stage').style.background='rgb(7,21,28)';
  }else if(tr.analysis){
   animateAnalysisPages(tr,p);
  }else{
   const out=clamp(p/.46),inc=clamp((p-.34)/.66);animateSection(from,tr.type,ease(out),false);animateSection(to,tr.type,ease(inc),true);
   if(!bothLight){const a=darks.has(tr.from)?1:0,b=darks.has(tr.to)?1:0;let f=e;if(tr.type==='enter')f=ease(clamp((p-.48)/.52));if(tr.type==='return')f=ease(clamp(p/.7));const alpha=a+(b-a)*f;$('#scene').style.opacity=String(alpha);$('#scene-shade').style.opacity=String(alpha);$('#stage').style.background=`rgb(${Math.round(7+233*(1-alpha))},${Math.round(21+222*(1-alpha))},${Math.round(28+214*(1-alpha))})`;}
   if(false){$('#transition-trace').style.opacity=String(Math.sin(p*Math.PI)*.55);$('#transition-trace').style.transform=`translateX(${(p-.5)*1700}px)`;}
  }
  // Every camera path receives one raw clock; scene.js applies easing once.
  if(scene&&!bothLight){scene.sample(tr.from,tr.to,p,0,tr.fromStorySeconds);scene.render();}
  if(p>=1){transition=null;settled(index,{finish:exitMonitor&&tr.to===11,holdType:false,seconds:tr.incomingSeconds||0});}
 }else if(!episodeDone){const t=Math.max(0,Math.min((now-episodeStart)/1000,durationFor(index)));episode(index,t);if(t>=durationFor(index))episodeDone=true;}
 if(auto&&!transition&&index<MAIN_COUNT&&now-autoStart>data[index].duration*1000){if(index===MAIN_COUNT-1){auto=false;$('#auto').classList.remove('selected');toast('Investigation complete.');}else go(index+1);}
 if(!captureFrozen)raf=requestAnimationFrame(frame);
}
function go(n,replay=false){if(!ready||!started)return;n=Math.max(0,Math.min(sections.length-1,n));if(transition){transition=null;settled(index,{finish:true});}if(n===index&&!replay)return;
 heldTypeIndex=null;
 chartFloors.delete(n);
 const from=replay?Math.max(0,n-1):index,fromStorySeconds=replay?durationFor(from):episodeDone?durationFor(from):Math.min((performance.now()-episodeStart)/1000,durationFor(from));
 index=n;location.hash=String(n+1);if(reduce||from===n){settled(n);return;}
 resetPlane();if(!darks.has(from)&&!darks.has(n))$('#presentation-layer').style.background='rgb(240,243,242)';
 const exitMonitor=(from===11&&n===12)||(from===12&&n===11);
 const analysis=isAnalysisPage(from)&&isAnalysisPage(n),entryMonitor=isEntryPair(from,n),chromeIndex=exitMonitor||entryMonitor||analysis?from:n;
 sections.forEach((el,j)=>{resetSection(el);el.classList.toggle('active',j===from||j===n);el.style.visibility=j===from||j===n?'visible':'hidden';el.setAttribute('aria-hidden',j===n?'false':'true');});sections[from].style.opacity='1';sections[n].style.opacity='0';updateChrome(chromeIndex);updateStoryUI(n,0);
 transition={from,to:n,fromStorySeconds,start:performance.now(),duration:entryMonitor||exitMonitor?2700:analysis?window.DeckAnalysisTransitions.duration(from,n):darks.has(from)||darks.has(n)?1250:800,type:transitionTypes[Math.max(from,n)],chromeIndex,analysis,incomingSeconds:0};
}
function toggleNotes(){$('#notes').hidden=!$('#notes').hidden;$('#notes-toggle').classList.toggle('selected',!$('#notes').hidden);}
function toggleOverview(){if(!ready||!started)return;$('#overview-panel').hidden=!$('#overview-panel').hidden;}
function toggleAuto(){auto=!auto;autoStart=performance.now();$('#auto').classList.toggle('selected',auto);toast(auto?'Timed story: about 9 minutes 30 seconds including transitions':'Manual navigation');}
function toggleMotion(){reduce=!reduce;$('#motion').textContent=reduce?'Motion off':'Motion on';if(transition)transition=null;settled(index,{finish:reduce});toast(reduce?'Reduced motion enabled':'Story animation enabled');}
async function full(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('Use your browser’s fullscreen control.');}}
if(!release){$('#credits-toggle').onclick=()=>$('#credits').hidden=!$('#credits').hidden;$('#close-credits').onclick=()=>$('#credits').hidden=true;
 $('#replay').onclick=()=>go(index,true);$('#notes-toggle').onclick=toggleNotes;$('#close-notes').onclick=toggleNotes;$('#auto').onclick=toggleAuto;$('#motion').onclick=toggleMotion;$('#fullscreen').onclick=full;}
$('#prev').onclick=()=>go(index-1);$('#next').onclick=()=>go(index+1);$('#overview').onclick=toggleOverview;$('#close-overview').onclick=toggleOverview;
$('#start').onclick=startPresentation;
$('#overview-grid').innerHTML=data.map((d,i)=>`<button class="overview-item" data-slide="${i}"><b>${i<MAIN_COUNT?String(i+1).padStart(2,'0'):'APPENDIX '+(i===MAIN_COUNT?'A':'B')}</b><span>${escapeHTML(d.title)}</span><small>${i<MAIN_COUNT?d.duration+' sec':'Q&A reference'}</small></button>`).join('');
document.querySelectorAll('.overview-item').forEach(el=>el.onclick=()=>{go(Number(el.dataset.slide));$('#overview-panel').hidden=true;});
document.addEventListener('keydown',e=>{if(!ready||!started)return;if(e.target.closest('button')&&(e.key===' '||e.key==='Enter'))return;if(e.ctrlKey||e.metaKey||e.altKey)return;if(release&&['r','R','n','N','f','F','p','P','m','M'].includes(e.key))return;switch(e.key){case'ArrowRight':case' ':case'PageDown':e.preventDefault();go(index+1);break;case'ArrowLeft':case'PageUp':e.preventDefault();go(index-1);break;case'Home':e.preventDefault();go(0);break;case'End':e.preventDefault();go(MAIN_COUNT-1);break;case'r':case'R':go(index,true);break;case'n':case'N':toggleNotes();break;case'g':case'G':toggleOverview();break;case'f':case'F':full();break;case'p':case'P':toggleAuto();break;case'm':case'M':toggleMotion();break;case'Escape':if(!release){$('#notes').hidden=true;$('#notes-toggle').classList.remove('selected');}$('#overview-panel').hidden=true;break;}});
let touchX=0;$('#viewport').addEventListener('touchstart',e=>touchX=e.touches[0].clientX,{passive:true});$('#viewport').addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-touchX;if(Math.abs(dx)>65)go(index+(dx<0?1:-1));},{passive:true});
let controlsTimer;document.addEventListener('pointermove',()=>{document.body.classList.add('show-controls');clearTimeout(controlsTimer);controlsTimer=setTimeout(()=>document.body.classList.remove('show-controls'),2200);});
addEventListener('hashchange',()=>{const n=Math.max(0,Math.min(sections.length-1,(Number(location.hash.slice(1))||1)-1));if(n!==index)go(n);});
addEventListener('resize',resize);addEventListener('fullscreenchange',resize);
window.__DECK__={go,start:startPresentation, get index(){return index}, get transition(){return transition}, get scene(){return scene},data,inspect(){return {ready,started,starting,preparation:boot.inspect(),chartTransition:analysisFX.inspect(),index,transitioning:!!transition,three:!!scene,reduce,slides:sections.length,images:[...document.images].map(i=>({loaded:i.complete&&i.naturalWidth>0,width:i.naturalWidth}))};}};
const params=new URLSearchParams(location.search);
index=Math.max(0,Math.min(sections.length-1,(Number(location.hash.slice(1))||1)-1));resize();
if(scene?.warmup)await scene.warmup({onProgress:(done,total,detail)=>boot.step('gpu',done,total,detail),yieldControl:boot.tick});
else boot.step('gpu',1,1,'2D presentation');
// Exercise every chart/letter state while the cover is still present. This
// populates selector caches and first Canvas/SVG paths before navigation.
const pageWork=sections.length*5+12*5+1;let warmedPages=0;
boot.step('pages',0,pageWork,'Preparing page states');
await analysisFX.prepare(preparedImages,{yieldControl:boot.tick});boot.step('pages',++warmedPages,pageWork,'Original chart traces & transfer paths');
for(const[i,section]of sections.entries()){
 sections.forEach((el,j)=>{el.classList.toggle('active',i===j);el.style.visibility=i===j?'visible':'hidden';});
 $('#stage').classList.toggle('light',!darks.has(i));
 const d=durationFor(i);for(const t of[0,d*.25,d*.55,d*.85,d]){updateStoryUI(i,t);boot.step('pages',++warmedPages,pageWork,`Page ${i+1} / ${sections.length}`);await boot.tick();}
}
// Prime the registered chart transfers and authored panel reveals before playback.
for(let from=5;from<11;from++)for(const[a,b]of[[from,from+1],[from+1,from]]){
 sections.forEach((el,j)=>{resetSection(el);el.classList.toggle('active',j===a||j===b);el.style.visibility=j===a||j===b?'visible':'hidden';});
 const tr={from:a,to:b,duration:window.DeckAnalysisTransitions.duration(a,b),chromeIndex:a};
 for(const p of[0,.25,.5,.75,1]){animateAnalysisPages(tr,p);boot.step('pages',++warmedPages,pageWork,`Chart transfer ${a+1} → ${b+1}`);await boot.tick();}
}
chartFloors.clear();resize();settled(index);await boot.tick();ready=true;
// Prepared and playing are separate states. Normal presentations wait for
// the button without a render loop or an advancing episode/title clock.
if(!release)$('#motion').textContent=reduce?'Motion off':'Motion on';profileLoadMs=performance.now()-sceneLoadStart;
captureFrozen=!release&&(params.has('still')||params.has('capture'));
boot.finish();
// Explicit developer still/capture views retain their static diagnostics.
// Query parameters never bypass the manual gate in the formal release.
if(captureFrozen)startPresentation();
const stillTime=params.get('still');
if(captureFrozen&&stillTime!==null){episodeDone=true;episode(index,Math.max(0,Math.min(durationFor(index),Number(stillTime)||0)));}
const captureTransition=params.get('transition');
if(captureFrozen&&captureTransition){
 const [from,to]=captureTransition.split('-').map(n=>Number(n)-1);
 if(Number.isInteger(from)&&Number.isInteger(to)&&from>=0&&to>=0&&from<sections.length&&to<sections.length&&from!==to){
  index=from;settled(from,{finish:true});go(to);if(transition){const tr=transition;captureFrozen=true;frame(tr.start+tr.duration*clamp(Number(params.get('at'))||0));}
 }
}
if(!release&&params.has('typecheck')){
 const readout=document.createElement('pre');readout.id='typography-readout';
 readout.textContent=JSON.stringify(window.DeckTypography.audit(sections),null,2);document.body.appendChild(readout);
}
