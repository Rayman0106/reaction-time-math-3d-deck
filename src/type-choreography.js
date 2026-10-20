/* Content-led typography. Absolute clocks, real chart/scene anchors and native
 * text at rest. Decorative paths never replace or move reported data marks. */
window.DeckTypeChoreography=(()=>{
 'use strict';
 const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10);};
 const phase=(t,a,b)=>ease((t-a)/(b-a)),pulse=(t,a,b,c,d)=>phase(t,a,b)*(1-phase(t,c,d)),mix=(a,b,p)=>a+(b-a)*p;
 const ns='http://www.w3.org/2000/svg',create=(name,attrs={})=>{const e=document.createElementNS(ns,name);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);return e;};
 function box(el){const a=document.querySelector('#stage').getBoundingClientRect(),b=el.getBoundingClientRect(),k=1920/a.width;return{x:(b.left-a.left)*k,y:(b.top-a.top)*k,w:b.width*k,h:b.height*k};}
 const center=el=>{const b=box(el);return[b.x+b.w/2,b.y+b.h/2];};
 const target=u=>[u.anchor.x+u.anchor.w/2,u.anchor.y+u.anchor.h/2];
 function svgPoint(el,x,y){
  const svg=el.ownerSVGElement||el,m=svg.getScreenCTM?.();
  if(m){const stage=document.querySelector('#stage').getBoundingClientRect(),k=1920/stage.width;return[(m.a*x+m.c*y+m.e-stage.left)*k,(m.b*x+m.d*y+m.f-stage.top)*k];}
  // CPU fixture fallback. The live browser uses its actual SVG screen matrix,
  // including letterboxing, viewBox and all presentation-plane transforms.
  const b=box(svg),v=svg.viewBox.baseVal;return[b.x+(x-v.x)/v.width*b.w,b.y+(y-v.y)/v.height*b.h];
 }
 function bezier(a,b,p,arch=38){const dx=b[0]-a[0],q=1-p;return[q*q*q*a[0]+3*q*q*p*(a[0]+dx*.24)+3*q*p*p*(b[0]-dx*.16)+p*p*p*b[0],q*q*q*a[1]+3*q*q*p*(a[1]-arch)+3*q*p*p*(b[1]-arch*.35)+p*p*p*b[1]];}
 function route(a,b,arch=38){const dx=b[0]-a[0];return`M${a[0]},${a[1]} C${a[0]+dx*.24},${a[1]-arch} ${b[0]-dx*.16},${b[1]-arch*.35} ${b[0]},${b[1]}`;}
 function letters(el){
  if(!el)return[];const walker=document.createTreeWalker(el,4),out=[];let n;
  while(n=walker.nextNode())for(let i=0;i<n.textContent.length;i++){const char=n.textContent[i];if(!/[a-z.]/i.test(char))continue;const range=document.createRange();range.setStart(n,i);range.setEnd(n,i+1);out.push({char,range,element:el});}return out;
 }
 function wordRange(el,word){
  if(!el)return null;const walker=document.createTreeWalker(el,4);let n;
  while(n=walker.nextNode()){const i=n.textContent.toLowerCase().indexOf(word.toLowerCase());if(i<0)continue;const range=document.createRange();range.setStart(n,i);range.setEnd(n,i+word.length);return range;}return el;
 }
 function colourMix(a,b,p){const rgb=c=>c.startsWith('#')?[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)):(c.match(/[\d.]+/g)||['24','62','64']).slice(0,3).map(Number),x=rgb(a),y=rgb(b);return `rgb(${x.map((v,i)=>Math.round(mix(v,y[i],p))).join(',')})`;}
 function wordFrom(u,source,t,start,end,colour){
  if(!source){show(u,phase(t,start,end));return;}const a=center(source),b=target(u),p=phase(t,start,end),v=bezier(a,b,p,45),s=box(source);
  u.glyph.style.transformOrigin='50% 50%';
  show(u,phase(t,start-.20,start+.14),v[0]-b[0],v[1]-b[1],0,mix(s.w/u.anchor.w,1,p),mix(s.h/u.anchor.h,1,p));u.glyph.style.color=colourMix(colour,u.baseColour,phase(t,end-.35,end+.25));
 }
 function assemble(r,t){
  for(const [j,a]of r.assemblies.entries())for(const item of a.items){
   const s=box(item.source.range),d=box(item.target.range),p=phase(t,item.start,item.end),v=bezier([s.x,s.y],[d.x,d.y],p,58),sy=mix(s.h/Math.max(d.h,.1),1,p),offset=d.y-item.unit.anchor.y,native=phase(t,a.end,a.end+.24),alpha=phase(t,item.start-.2,item.start)*(1-native);
   Object.assign(item.node.style,{left:d.x+'px',top:item.unit.anchor.y+'px',opacity:String(alpha),color:r.palette[1],transform:`translate(${v[0]-d.x}px,${v[1]-d.y+offset*(1-sy)}px) rotate(${(1-p)*(j%2?5:-5)}deg) scale(${mix(s.w/Math.max(d.w,.1),1,p)},${sy})`});
   r.linkStates.push({kind:'paragraph-letter',word:a.word,char:item.target.char,sourceChar:item.source.char,sourceText:item.source.element.textContent,from:[s.x,s.y],to:[d.x,d.y],progress:p,alpha});
  }
 }
 function prepare(r,section){
  r.section=section;r.linkStates=[];r.semanticSources=[];
  for(const u of r.units)u.anchor=box(u.glyph);
  const all=s=>[...section.querySelectorAll(s)],one=s=>section.querySelector(s);
  r.nodes={loopUI:one('[data-reaction-loop]'),conditionCount:one('.method-visuals > div:last-child strong'),conditionLabels:all('.conditions > span'),loopRun:one('[data-loop-run]'),choiceLabel:one('.idea.chosen span'),mode:one('.chart-aside .big'),within:one('.within-label'),trials:all('[data-restored-trial]'),addends:all('[data-addend]'),status:one('[data-practice-status]'),steps:all('[data-practice-step]'),results:all('[data-practice-result]'),chosen:one('.idea.chosen'),conditions:all('.conditions .dot'),band:one('.rule-band'),hist:one('.hist-img'),curve:one('[data-curve-guide]'),boxes:all('[data-box-body]'),means:all('[data-summary-kind]'),outlier:one('[data-outlier-label]'),sensitivity:all('.sensitivity-chart circle'),cards:all('.improvement .motion-icon'),counts:all('.conclusion-count b')};
  if(r.variant==='paired')return;
  const svg=create('svg',{viewBox:'0 0 1920 1080','aria-hidden':'true',class:'type-flow semantic-type-flow'});
  const paths=Array.from({length:8},()=>{const p=create('path',{fill:'none','stroke-width':'1.6','stroke-linecap':'round','stroke-linejoin':'round',pathLength:'1'});svg.appendChild(p);return p;});
  const trails=Array.from({length:2},()=>{const p=create('path',{fill:'none','stroke-width':'2','stroke-linecap':'round','stroke-linejoin':'round'});svg.appendChild(p);return p;});
  const rings=Array.from({length:4},()=>{const c=create('circle',{fill:'none','stroke-width':'1.4'});svg.appendChild(c);return c;});
  const dots=Array.from({length:4},()=>{const c=create('circle',{r:'4'});svg.appendChild(c);return c;});
  const labels=Array.from({length:2},()=>{const e=create('text',{'font-family':'Manrope,Arial,sans-serif','font-size':'26','font-weight':'600'});svg.appendChild(e);return e;});
  section.appendChild(svg);const html=document.createElement('div');html.className='semantic-carriers';html.setAttribute('aria-hidden','true');section.appendChild(html);r.flow={svg,html,paths,trails,rings,dots,labels};
  if(r.variant==='quartiles')r.pooledSource=wordRange(r.nodes.within,'pooled');
  r.summarySources=r.nodes.means.map((n,j)=>wordRange(n,j?'Median':'Mean'));
  r.assemblies=[];
  if(r.variant==='construct'){
   const selectors=['.study-design-note strong','.improvement:nth-child(4) p','.study-design-note','.improvement:nth-child(2) p'];
   r.units.forEach((u,j)=>{
    const source=one(selectors[j]),pool=letters(source),used=new Set(),dest=letters(u.glyph),items=[];
    dest.forEach((d,k)=>{
     const a=pool.find(v=>!used.has(v)&&v.char===d.char);
     if(!a)throw new Error('Missing visible source letter '+d.char+' for '+u.glyph.textContent);used.add(a);
     const node=document.createElement('span');node.className='type-carried-letter';node.textContent=d.char;const font=getComputedStyle(u.glyph);
     for(const key of ['fontFamily','fontStyle','fontWeight','fontSize','letterSpacing'])node.style[key]=font[key];node.style.lineHeight=u.anchor.h+'px';html.appendChild(node);
     items.push({source:a,target:d,node,unit:u,start:2.65+j*.90+k*.10,end:4.05+j*.90+k*.10});
    });
    u.assembly={word:u.glyph.textContent,source,items,start:items[0].start,end:items.at(-1).end};r.assemblies.push(u.assembly);
   });
  }
  if(r.variant==='write-question')for(const u of r.units){
   u.ghosts=[0,1].map(k=>{const d=u.glyph.cloneNode(true);d.className='title-decor semantic-outline';d.setAttribute('aria-hidden','true');Object.assign(d.style,{left:u.glyph.offsetLeft+'px',top:u.glyph.offsetTop+'px',color:r.palette[k+1],WebkitTextStroke:'1.1px '+r.palette[k+1],WebkitTextFillColor:'transparent'});u.word.appendChild(d);u.decor.push(d);return d;});
  }
  r.semanticSourceLabels={response:['Wait / Green / Respond on one closed rail; icon stations and travelling response use the monitor/mouse clock; no numeric result badges'],'write-question':['The complete question and visible Same task / Different response clauses; no floating point'],choices:['Conversation text in the selected candidate row'],conditions:['The visible 2 conditions count becomes Two; both condition labels respond'],'write-rule':['100–1000 ms analysis band'],screen:['Stable word shape refills along its real glyph strokes as the shared modal bins form'],distribution:['Cumulative scan and 50% reading guides at the reported 233.1 / 226.0 medians'],quartiles:['Median / IQR reveal; pooled word in the within-participant SD label'],balance:['All 30 real dot positions form Mean; the two central ranked dots form Median'],recall:['The full pooled-mean marker crosses the unchanged quiet reference when both long responses return'],construct:['Also note label','Balanced-order paragraph','Prespecified-exclusion note','Common-setup paragraph'],mixed:['left and right hands / 19 and 11 counts'],shutdown:['Keyboard title; no decorative screen-to-title line'],thanks:['rise / dance / closing bow']}[r.variant]||[];
 }
 function path(r,j,d,colour,alpha,progress=1,width=1.6){const p=r.flow.paths[j];p.setAttribute('d',d);p.setAttribute('stroke',colour);p.style.opacity=String(clamp(alpha));p.style.strokeWidth=String(width);p.style.strokeDasharray='1';p.style.strokeDashoffset=String(1-clamp(progress));}
 function connection(r,j,a,b,p,colour,alpha,arch=38){path(r,j,route(a,b,arch),colour,alpha,p);r.linkStates.push({slot:j,from:a,to:b,progress:p,alpha,kind:'content-to-word'});}
 function dot(r,j,p,colour,alpha,radius=4){const c=r.flow.dots[j];c.setAttribute('cx',String(p[0]));c.setAttribute('cy',String(p[1]));c.setAttribute('r',String(radius));c.setAttribute('fill',colour);c.style.opacity=String(clamp(alpha));}
 function ring(r,j,p,colour,progress,alpha=1){const c=r.flow.rings[j];c.setAttribute('cx',String(p[0]));c.setAttribute('cy',String(p[1]));c.setAttribute('r',String(6+progress*19));c.setAttribute('stroke',colour);c.style.opacity=String((1-progress)*alpha);}
 function tipPoint(u,progress){const p=window.DeckLetterInk.tip(u.ink,progress);return{...p,x:u.anchor.x+p.x,y:u.anchor.y+p.y,localX:p.x,localY:p.y};}
 function writerPoint(writer,t){
  const words=writer.words;let u=words[0];for(const word of words)if(t>=word.write.start)u=word;
  const first=tipPoint(words[0],0),last=tipPoint(words.at(-1),1),source=writer.liveSource||writer.source||[first.x+160,first.y+130];
  if(t<writer.start){const p=phase(t,writer.start-.95,writer.start),b=bezier(source,[first.x,first.y],p,42);return{x:b[0],y:b[1],pressure:.4,writing:false,mode:'approach',angle:-Math.PI/4};}
  if(t>writer.end){const p=phase(t,writer.end,writer.end+.65),b=bezier([last.x,last.y],source,p,30);return{x:b[0],y:b[1],pressure:.3*(1-p),writing:false,mode:'return',angle:Math.PI/4};}
  const end=u.write.start+u.write.span,j=words.indexOf(u),next=words[j+1];
  if(t>end&&next){const a=tipPoint(u,1),b=tipPoint(next,0),p=phase(t,end,next.write.start),v=bezier([a.x,a.y],[b.x,b.y],p,15);return{x:v[0],y:v[1],pressure:.3,writing:false,mode:'lift',angle:Math.atan2(b.y-a.y,b.x-a.x)};}
  const p=tipPoint(u,(t-u.write.start)/u.write.span);return{...p,mode:p.writing?'stroke':'lift',word:u.glyph.textContent};
 }
 function writers(r,t,context){
  for(const writer of r.writers||[]){
   const source=r.variant==='write-question'?(context.head||[1320,430]):r.nodes.sensitivity[writer.lane]?center(r.nodes.sensitivity[writer.lane]):writer.source;
   writer.liveSource=source;
   const p=writerPoint(writer,t),c=writer.lane?r.palette[2]:r.palette[1],a=pulse(t,writer.start-.95,writer.start-.55,writer.end+.35,writer.end+.65);
   writer.state={...p,expected:[p.x,p.y],source};
   dot(r,writer.lane,[p.x,p.y],c,a,2.6+2.1*(p.pressure||.3));
   const trail=r.flow.trails[writer.lane];
   if(p.writing&&a>0){const pts=Array.from({length:7},(_,j)=>writerPoint(writer,t-(6-j)*.012));trail.setAttribute('d',pts.map((v,j)=>(j?'L':'M')+v.x+','+v.y).join(' '));trail.setAttribute('stroke',c);trail.style.opacity=String(a*.34);}else trail.style.opacity='0';
   if(source){const entry=phase(t,writer.start-.95,writer.start-.45);ring(r,writer.lane,source,c,entry,a*.7);}
  }
 }
 function update(r,t,context){
  if(!r.flow)return;r.flow.svg.style.opacity=t>=r.duration?'0':'1';r.flow.html.style.opacity=t>=r.duration?'0':'1';r.linkStates=[];
  for(const e of [...r.flow.paths,...r.flow.dots,...r.flow.rings,...r.flow.trails,...r.flow.labels])e.style.opacity='0';
  if(r.nodes.choiceLabel)r.nodes.choiceLabel.style.opacity='1';
  for(const n of r.nodes.trials)n.style.color='';for(const n of r.nodes.addends)n.style.fill='';for(const n of r.nodes.means)n.style.fill='';
  if(r.nodes.mode){r.nodes.mode.style.transform='none';r.nodes.mode.style.color='';}
  for(const n of r.nodes.conditionLabels){n.style.transform='none';n.style.color='';n.style.opacity='1';}
  if(r.variant==='response'){
   window.ReactionLoop?.paint(r.nodes.loopUI,t);
   if(!r.nodes.loopUI&&r.nodes.status)r.nodes.status.textContent=window.ReactionPractice.sample(t).complete?'One simple task. A new question.':'Watch the cue. Click. Repeat.';
  }
  if(t>=r.duration)return;
  const word=pattern=>r.units.find(u=>pattern.test(u.glyph.textContent)),C=r.palette[1],A=r.palette[2];
  if(r.variant==='choices'&&r.nodes.choiceLabel){r.nodes.choiceLabel.style.opacity=String(1-.65*pulse(t,4,4.45,5.4,6.25));}
  else if(r.variant==='conditions'){
   r.nodes.conditionLabels.forEach((n,j)=>{n.style.opacity=String(phase(t,4.05+j*.12,4.65+j*.12));const q=pulse(t,4.05+j*.12,4.4+j*.12,4.65+j*.12,5.1+j*.12);n.style.transform=`translateY(${-q*6}px)`;n.style.color=colourMix(r.palette[0],j?A:C,q);});
   const u=word(/^Two$/i),source=r.nodes.conditionCount;if(u&&source){const p=phase(t,2.65,4.05),v=bezier(center(source),target(u),p,36),label=r.flow.labels[0];label.textContent='2';label.setAttribute('x',v[0]);label.setAttribute('y',v[1]);label.setAttribute('dominant-baseline','middle');label.setAttribute('text-anchor','middle');label.setAttribute('font-size',mix(60,95,p));label.setAttribute('fill',C);label.style.opacity=String(phase(t,2.4,2.65)*(1-phase(p,.25,.65)));}
  }else if(r.variant==='write-rule'&&r.nodes.band){
   const b=word(/^rule$/i).anchor,band=box(r.nodes.band),p=phase(t,.7,2.5),a=pulse(t,.5,.8,3.5,4.6),x0=mix(band.x,b.x-12,p),x1=mix(band.x+band.w,b.x+b.w+12,p),y=mix(band.y+band.h/2,b.y+b.h/2,p),h=mix(16,b.h*.55,p);
   path(r,0,`M${x0+13},${y-h}H${x0}V${y+h}H${x0+13}`,A,a,.45+.55*p,2);path(r,1,`M${x1-13},${y-h}H${x1}V${y+h}H${x1-13}`,A,a,.45+.55*p,2);
  }else if(r.variant==='screen'&&r.nodes.hist){
   const a=pulse(t,.35,.9,2.65,3.8);
   [[270,168,122,201],[270,476,122,283]].forEach(([x,y,w,h],j)=>{const p=svgPoint(r.nodes.hist,x,y),b=svgPoint(r.nodes.hist,x+w,y+h);path(r,j,`M${p[0]},${b[1]}V${p[1]}H${b[0]}V${b[1]}`,j?A:C,a*.85,phase(t,.4+j*.2,1.7+j*.2),3);});
   if(r.nodes.mode){r.nodes.mode.style.transform=`scale(${1+.065*a})`;r.nodes.mode.style.color=C;}
  }else if(r.variant==='distribution'&&r.nodes.curve){
   const chart=r.nodes.curve,alpha=pulse(t,2.7,3.35,4.9,5.8),zero=svgPoint(chart,171,243),end=svgPoint(chart,1618,243);
   path(r,0,`M${zero[0]},${zero[1]}H${mix(zero[0],end[0],phase(t,2.8,3.65))}`,C,alpha*.6,1,3);
   [233.1,226.0].forEach((v,j)=>{const x=171+(v-150)/600*1447,a=svgPoint(chart,x,243),b=svgPoint(chart,x,447);path(r,j+1,`M${a[0]},${a[1]}V${b[1]}`,j?A:C,alpha*.9,phase(t,3.25+j*.16,4.15+j*.16),3.5);ring(r,j,a,j?A:C,phase(t,3.25+j*.16,4.7+j*.16),alpha);});
   if(r.nodes.mode){r.nodes.mode.style.transform=`scale(${1+.10*alpha})`;r.nodes.mode.style.color=C;}
   r.linkStates.push({kind:'cumulative-reading',medianYPercent:50,medians:[233.1,226.0],alpha});
  }else if(r.variant==='balance'){
   r.nodes.means.forEach((n,j)=>{const a=pulse(t,2.9+j*.3,3.2+j*.3,4.65+j*.3,5.2+j*.3);if(a>.01)n.style.fill=j?A:C;});
  }else if(r.variant==='recall'){
   r.nodes.trials.forEach((n,j)=>{const a=pulse(t,.7+j*.55,1.1+j*.55,3.5,4.6);if(a>.01)n.style.color=A;});
  }else if(r.variant==='construct')assemble(r,t);
  else if(r.variant==='mixed'&&context.handL&&context.handR){
   const b=target(word(/mixed/i)),a=pulse(t,3.5,4.4,8.1,9.6);[context.handL,context.handR].forEach((p,j)=>dot(r,j,[b[0]+(j?28:-28),b[1]+(p[1]-(context.handL[1]+context.handR[1])/2)*.10],j?A:C,a*.7,3.5));
  }
 }
 function show(u,p,dx=0,dy=0,rotation=0,sx=1,sy=sx){u.glyph.style.opacity=String(clamp(p));u.glyph.style.transform=`translate(${dx}px,${dy}px) rotate(${rotation}deg) scale(${sx},${sy})`;}
 function from(u,a,p,angle=0,arch=32){const b=target(u),v=bezier(a,b,p,arch);show(u,phase(p,0,.40),v[0]-b[0],v[1]-b[1],angle*(1-p));}
 function ghosts(u,dx,dy,alpha){u.ghosts?.forEach((d,k)=>{const sign=k?1:-1;d.style.opacity=String(alpha);d.style.transform=`translate(${dx*sign}px,${dy*sign}px)`;});}
 function unit(r,u,j,t,context){
  const text=u.glyph.textContent,colour=r.palette[1],amber=r.palette[2];
  switch(r.variant){
   case'response':{const st=window.ReactionPractice.sample(t),p=phase(t,.12+j*.17,1.05+j*.17);show(u,p,0,(1-p)*18);if(/try/i.test(text)&&!st.complete){const click=(st.attempt-1)*window.ReactionPractice.cycle+window.ReactionPractice.waits[st.attempt-1]+window.ReactionPractice.examples[st.attempt-1]/1000,a=pulse(t,click-.20,click+.08,click+.34,click+.95);u.glyph.style.color=colourMix(u.baseColour,'#b7e4d0',a*.5);}return true;}
   case'write-question':{const start=/change/i.test(text)?1.05:.18+j*.13,p=phase(t,start,start+1.25);show(u,p,0,(1-p)*23,(1-p)*-2);if(/change/i.test(text)){const a=pulse(t,1.12,1.6,2.2,3.45);ghosts(u,30*a,8*a,a*.6);}return true;}
   case'choices':{if(/Conversation/i.test(text))wordFrom(u,r.nodes.choiceLabel,t,4.15,6.15,amber);else{const p=phase(t,.2+j*.15,1.25+j*.15);show(u,p,0,(1-p)*18);}return true;}
   case'conditions':{if(/^Two$/i.test(text)){const p=phase(t,2.65,4.05);wordFrom(u,r.nodes.conditionCount,t,2.65,4.05,colour);u.glyph.style.opacity=String(Number(u.glyph.style.opacity)*phase(p,.25,.65));}else if(/conditions/i.test(text)){const p=phase(t,3.35,4.7);show(u,p);u.glyph.style.transform=`perspective(700px) rotateX(${(1-p)*65}deg)`;}else{const p=phase(t,.2+j*.16,1.25+j*.16);show(u,p,0,(1-p)*20);if(/task/i.test(text))show(u,p,0,(1-p)*20+1.5*(context.typing||0));}return true;}
   case'write-rule':{const p=phase(t,/rule/i.test(text)?1:.2+j*.13,/rule/i.test(text)?2.8:1.25+j*.13);show(u,p,0,(1-p)*11,0,1+(1-p)*.06);if(/^rule$/i.test(text)&&t<3.8)u.glyph.style.color=amber;return true;}
   case'screen':{show(u,/cluster/i.test(text)?phase(t,3.15,3.45):1);return true;}
   case'distribution':{const p=phase(t,.18+j*.35,1.25+j*.35);show(u,p,0,(1-p)*14);if(u.letters){u.glyph.style.opacity='1';u.letters.forEach((n,k)=>n.style.opacity=String(phase(t,1+k*.12,1.8+k*.12)));}return true;}
   case'quartiles':{if(/Pooled/i.test(text))wordFrom(u,r.pooledSource,t,4.05,5.8,colour);else{const lower=/Lower/i.test(text),p=phase(t,lower?.25:1.3,lower?1.6:2.75);show(u,p,0,lower?-(1-p)*38:0,0,lower?1:1+(1-p)*.38,1);}return true;}
   case'balance':{const start=/^Mean$/i.test(text)?5.05:/^Median$/i.test(text)?5.70:/left/i.test(text)?5.30:5.95;show(u,phase(t,start,start+(/^(Mean|Median)$/.test(text)?.30:.45)),0,0);return true;}
   case'recall':{const p=phase(t,.15+j*.09,.95+j*.09);show(u,p,0,(1-p)*16);if(/reverse/i.test(text)){const restored=253+(276.3193-253)*phase(t,1.25,4.35),cross=phase(restored,259.5,264.1);u.glyph.style.color=colourMix(colour,amber,cross);}return true;}
   case'construct':{const a=u.assembly;show(u,a?phase(t,a.end,a.end+.24):phase(t,.2+j*.15,1.25+j*.15));return true;}
   case'mixed':{const p=phase(t,.25+j*.16,1.4+j*.16);show(u,p,0,(1-p)*18);if(/mixed/i.test(text)){const a=pulse(t,3.5,4.2,7.9,9.4),delta=Math.max(-1,Math.min(1,((context.handL?.[1]||0)-(context.handR?.[1]||0))/90));u.decor.forEach((d,k)=>{const sign=k?1:-1;d.style.opacity=String(a*.34);d.style.transform=`translate(${sign*a*5}px,${sign*a*delta*12}px) rotate(${sign*a*delta*.8}deg)`;});}return true;}
   case'shutdown':{let earlier=0;for(let n=0;n<j;n++)earlier+=r.units[n].letters.length;u.letters.forEach((l,k)=>{const p=phase(t,.3+(earlier+k)*.06,.5+(earlier+k)*.06);l.style.opacity=String(p);l.style.transform='none';});if(/test/i.test(text)&&t>5&&t<6.2)u.glyph.style.color=amber;return true;}
   case'thanks':{const p=phase(t,.4+j*.28,1.65+j*.28),bowClock=Number.isFinite(context.closingSecond)?context.closingSecond:window.ReactionBow?.clock(t)||0,nod=pulse(bowClock,6.35+j*.14,7.40+j*.14,8.1+j*.14,9.8+j*.14);show(u,p,0,(1-p)*17+nod*5,nod*(j?1.1:.6));return true;}
   default:return false;
  }
 }
 return Object.freeze({prepare,update,unit,writerPoint,box,center,svgPoint,letters,wordRange});
})();
