/* Semantic title timelines. References: github.com/maxwellito/vivus,
 * github.com/juliangarnier/anime. Independent absolute-time implementation. */
window.DeckTypography = (() => {
  'use strict';
  const records=new WeakMap(),byIndex=[];
  const variants=['response','write-question','choices','conditions','write-rule','screen','distribution','quartiles','paired','balance','recall','construct','mixed','shutdown','thanks','appendix','appendix'];
  const durations={response:18,'write-question':4.0,choices:6.8,conditions:5.2,'write-rule':4.8,screen:4.2,distribution:6.2,quartiles:6.2,paired:6.8,balance:6.8,recall:5.6,construct:8.4,mixed:10,shutdown:8,thanks:24,appendix:1.1};
  const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10);};
  const out=x=>1-Math.pow(1-clamp(x),4),random=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
  const fontSpec=s=>`${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
  const phase=(t,a,b)=>ease((t-a)/(b-a)),pulse=(t,a,b,c,d)=>phase(t,a,b)*(1-phase(t,c,d)),mix=(a,b,p)=>a+(b-a)*p;
  function stageBox(el){const a=document.querySelector('#stage').getBoundingClientRect(),b=el.getBoundingClientRect(),k=1920/a.width;return {x:(b.left-a.left)*k,y:(b.top-a.top)*k,w:b.width*k,h:b.height*k};}
  function centre(el){const b=stageBox(el);return [b.x+b.w/2,b.y+b.h/2];}
  function decoration(unit,className){
    const node=unit.glyph.cloneNode(true);node.className='title-decor '+className;
    node.setAttribute('aria-hidden','true');node.style.left=unit.glyph.offsetLeft+'px';node.style.top=unit.glyph.offsetTop+'px';
    unit.word.appendChild(node);unit.decor.push(node);return node;
  }
  function particleMask(unit,seed,palette){
    const s=getComputedStyle(unit.glyph),pad=58,w=Math.ceil(unit.glyph.offsetWidth+pad*2),h=Math.ceil(unit.glyph.offsetHeight+pad*2);
    const mask=document.createElement('canvas');mask.width=w;mask.height=h;
    const m=mask.getContext('2d',{willReadFrequently:true});m.font=fontSpec(s);m.textBaseline='alphabetic';m.fillStyle='#fff';m.fontKerning='normal';
    if('letterSpacing' in m)m.letterSpacing=s.letterSpacing;
    const metrics=m.measureText(unit.glyph.textContent),ascent=metrics.fontBoundingBoxAscent||parseFloat(s.fontSize)*.8,descent=metrics.fontBoundingBoxDescent||parseFloat(s.fontSize)*.2;
    const baseline=(unit.glyph.offsetHeight-ascent-descent)/2+ascent;
    m.fillText(unit.glyph.textContent,pad,pad+baseline);
    const pixels=m.getImageData(0,0,w,h).data,points=[];
    for(let y=pad-8;y<h-pad+12;y+=3)for(let x=pad-8;x<w-pad+12;x+=3){const alpha=pixels[(y*w+x)*4+3];if(alpha>35){
      const n=seed+points.length*1.73,r=random(n),a=random(n+7);
      points.push({x,y,alpha:alpha/255,dx:(random(n+2)-.5)*100,dy:(random(n+4)-.5)*80,arc:(random(n+5)-.5)*35,delay:r*.28,size:1.4+random(n+9)*.9,colour:a<.8?0:a<.9?1:2});
    }}
    const canvas=document.createElement('canvas');canvas.className='title-particles';canvas.width=w;canvas.height=h;canvas.setAttribute('aria-hidden','true');
    canvas.style.left=unit.glyph.offsetLeft-pad+'px';canvas.style.top=unit.glyph.offsetTop-pad+'px';canvas.style.width=w+'px';canvas.style.height=h+'px';unit.word.appendChild(canvas);
    return {canvas,ctx:canvas.getContext('2d',{alpha:true,willReadFrequently:true}),points,palette,font:fontSpec(s),sourcePoints:points.length};
  }
  async function prepare(sections,options={}){
    await Promise.all([...new Set(sections.map(s=>s.querySelector('h1')).filter(Boolean).map(t=>fontSpec(getComputedStyle(t))))].map(font=>document.fonts.load(font)));
    await document.fonts.ready;
    for(const [index,section]of sections.entries()){
      const title=section.querySelector('h1');if(!title||records.has(section))continue;
      const copy=title.cloneNode(true);copy.querySelectorAll('br').forEach(br=>br.replaceWith(' '));const label=copy.textContent.replace(/\s+/g,' ').trim();
      const {words}=window.Splitting({target:title,by:'words'})[0],variant=variants[index]||'appendix',dark=section.classList.contains('dark');
      const palette=dark?['#f0f5f4','#7bc3cc','#e0ae7d']:['#183e40','#187c88','#b35d32'];
      title.setAttribute('aria-label',label);title.classList.add('kinetic-title');title.dataset.typeEffect=variant;
      const units=words.map((word,j)=>{
        const glyph=document.createElement('span');glyph.className='title-glyph';while(word.firstChild)glyph.appendChild(word.firstChild);word.appendChild(glyph);word.setAttribute('aria-hidden','true');
        const unit={word,glyph,decor:[],start:j*.11,baseColour:getComputedStyle(glyph).color,box:stageBox(word)};
        if(variant==='paired'&&j>=2||variant==='balance'&&/^(Mean|Median)$/.test(glyph.textContent))unit.stat=particleMask(unit,index*900+j*97,palette);
        if(variant==='screen'&&/cluster/i.test(glyph.textContent))unit.ink=window.DeckLetterInk.create(unit);
        if(variant==='mixed'&&/mixed/i.test(glyph.textContent))for(const [k,name]of['title-cyan','title-amber'].entries()){
          const layer=decoration(unit,name);layer.style.color=palette[k+1];
        }
        if(variant==='shutdown'||variant==='distribution'&&/distribution/i.test(glyph.textContent)){const text=glyph.textContent;glyph.textContent='';unit.letters=[...text].map(ch=>{const l=document.createElement('span');l.className='type-key';l.textContent=ch;glyph.appendChild(l);return l;});}
        return unit;
      });
      const record={title,units,variant,duration:durations[variant],label,time:0,index,palette,context:{},flow:null};
      window.DeckTypeChoreography.prepare(record,section);
      if(variant==='paired'||variant==='balance'){
        const c=document.createElement('canvas');c.width=1920;c.height=1080;c.className='title-particle-scene';c.setAttribute('aria-hidden','true');section.appendChild(c);
        const paired=variant==='paired',dots=[...section.querySelectorAll(paired?'[data-paired-dot]':'[data-dot]')],left=paired?dots.filter(d=>Number(d.dataset.rank)<15):[],right=paired?dots.filter(d=>Number(d.dataset.rank)>=15):[];
        if(paired&&(left.length!==15||right.length!==15))throw new Error('Paired title requires all fifteen real source dots in each panel.');
        // Alternate left/right origins for EACH word, rather than filling one
        // word from the first panel and the other from the remaining panel.
        const both=paired?left.flatMap((dot,j)=>[dot,right[j]]):dots,groups=units.filter(u=>u.stat).map((u,k)=>{
          const second=paired?k===1:/Median/.test(u.glyph.textContent),sources=paired?both:second?dots.slice(14,16):dots,points=u.stat.points.filter((_,j)=>j%2===0).map((p,j)=>({...p,x:u.anchor.x+p.x-58,y:u.anchor.y+p.y-58,source:sources[j%sources.length]}));
          if(!sources.length)throw new Error('Statistical title requires real source dots.');
          u.stat.canvas.style.display='none';return {word:u.glyph.textContent,start:second?3.55:2.9,arrival:second?5.70:5.05,sources,points};
        });
        record.statParticle={canvas:c,ctx:c.getContext('2d',{willReadFrequently:true}),groups};
      }
      if(variant==='choices')record.source=centre(section.querySelector('.idea.chosen'));
      if(variant==='recall')record.sources=[...section.querySelectorAll('.sensitivity-chart circle')].map(centre);
      if(units.some(u=>u.ink)&&variant!=='screen'){
        const split=variant==='recall',groups=split?[units.filter(u=>/^(Two|trials)/i.test(u.glyph.textContent)),units.filter(u=>/^story/i.test(u.glyph.textContent))]:[units.filter(u=>u.ink)];
        record.writers=groups.map((group,lane)=>{
          const total=group.reduce((n,u)=>n+u.ink.travelWeight,0),budget=split?(lane?3.7:4.5):3.6,gap=.45,start=split?1.1+lane*.45:2.05;
          let at=start;
          const words=group.map(u=>{const span=(budget-gap*(group.length-1))*u.ink.travelWeight/total;u.write={start:at,span,lane};at+=span+gap;return u;});
          return {words,start,end:at-gap,source:record.sources?.[lane],lane};
        });
        record.duration=Math.max(record.duration,...record.writers.map(w=>w.end+.70));
      }
      records.set(section,record);byIndex[index]=record;sample(section,0);
      options.onProgress?.(index+1,sections.length);await options.yieldControl?.();
    }
  }
  function clearParticle(p){p.ctx.clearRect(0,0,p.canvas.width,p.canvas.height);p.canvas.style.opacity='0';p.canvas.style.visibility='hidden';}
  function settle(unit){
    Object.assign(unit.glyph.style,{transform:'none',filter:'none',opacity:'1',clipPath:'none',color:unit.baseColour,transformOrigin:'50% 100%'});
    for(const layer of unit.decor)Object.assign(layer.style,{opacity:'0',transform:'none',clipPath:'none'});
    if(unit.particle)clearParticle(unit.particle);
    if(unit.ink)clearParticle(unit.ink);
    if(unit.stat)clearParticle(unit.stat);
    if(unit.letters)unit.letters.forEach(l=>{l.style.opacity='1';l.style.transform='none';});
  }
  // Pages 9 and 10 share the same density, easing, arc, stagger and native
  // handoff. Live DOM centers include the SVG's actual aspect-ratio inset.
  function drawStatistics(p,t){
    if(t<2.9||t>=6.05){clearParticle(p);return;}
    const {ctx,canvas}=p;ctx.clearRect(0,0,canvas.width,canvas.height);canvas.style.opacity='1';canvas.style.visibility='visible';
    for(const g of p.groups){const alpha=phase(t,g.start,g.start+.2)*(1-phase(t,g.arrival,g.arrival+.30));if(alpha<=0)continue;
      const sources=new Map(g.sources.map(n=>[n,centre(n)]));
      for(const dot of g.points){const q=ease((t-g.start-dot.delay)/1.8),a=sources.get(dot.source),x=mix(a[0],dot.x,q),y=mix(a[1],dot.y,q)+Math.sin(Math.PI*q)*dot.arc;
        const sourceColour=dot.source.dataset.particleColor||dot.source.getAttribute('fill');ctx.fillStyle=q>.76?'#183e40':sourceColour==='#75b6dc'?'#4b819c':'#aa713f';ctx.globalAlpha=Math.max(.75,dot.alpha)*alpha;ctx.fillRect(x,y,dot.size+1.5,dot.size+1.5);
      }
    }ctx.globalAlpha=1;
  }
  function sampleFlow(r,t){window.DeckTypeChoreography.update(r,t,r.context);}
  // Stable native title positions after the shared particle gathering.
  function show(u,p,dx=0,dy=0,rotation=0,scale=1){u.glyph.style.opacity=String(clamp(p));u.glyph.style.transform=`translate(${dx}px,${dy}px) rotate(${rotation}deg) scale(${scale})`;}
  function semantic(r,u,j,t,context){
    if(window.DeckTypeChoreography.unit(r,u,j,t,context))return;
    const p=phase(t-u.start,0,.85);
    u.glyph.style.opacity=String(p);u.glyph.style.transform=`translateY(${(1-p)*9}px)`;
  }
  function sample(section,seconds,context={}){
    const r=records.get(section);if(!r)return;const t=Math.max(0,Number(seconds)||0);r.time=t;r.context=context;sampleFlow(r,t);
    if(r.statParticle)drawStatistics(r.statParticle,t);
    for(const [j,unit]of r.units.entries()){
      const local=t-unit.start,g=unit.glyph;
      if(t>=r.duration){settle(unit);continue;}
      Object.assign(g.style,{transform:'none',filter:'none',clipPath:'none',opacity:'1',color:unit.baseColour,transformOrigin:'50% 100%'});
      for(const layer of unit.decor)Object.assign(layer.style,{opacity:'0',transform:'none',clipPath:'none'});
      if(r.variant==='paired'){
        if(unit.stat){const start=/^slowed$/i.test(g.textContent)?5.05:5.70;g.style.opacity=String(phase(t,start,start+.30));clearParticle(unit.stat);}else{const p=phase(t,.18+j*.16,1.0+j*.16);show(unit,p,0,(1-p)*12);}
      }else if(r.variant==='screen'&&unit.ink){
        const done=phase(t,3.15,3.45);window.DeckLetterInk.sample(unit.ink,(t-.70)/2.45,unit.baseColour);
        // Reveal only the arriving strokes; the complete native word takes
        // over after the ink is filled, without a full-word preview at t=0.
        g.style.opacity=String(done);unit.ink.canvas.style.opacity=String(1-done);if(done===1)clearParticle(unit.ink);
      }else if(unit.ink){
        const progress=(t-unit.write.start)/unit.write.span,complete=unit.write.start+unit.write.span;
        window.DeckLetterInk.sample(unit.ink,progress,unit.baseColour);
        const native=phase(t,complete,complete+.18);g.style.opacity=String(native);unit.ink.canvas.style.opacity=String(1-native);
        if(native===1)clearParticle(unit.ink);
      }else semantic(r,unit,j,t,context);
    }
    r.title.dataset.typeState=t>=r.duration?'complete':'revealing';
  }
  function signature(r){return JSON.stringify({flow:r.flow?{svg:r.flow.svg.style.opacity,html:r.flow.html.style.opacity,links:r.linkStates,letters:r.assemblies.flatMap(a=>a.items.map(i=>i.node.getAttribute('style')))}:null,statistics:r.statParticle?pixelSum(r.statParticle):null,stage:r.stageParticle?pixelSum(r.stageParticle):null,units:r.units.map(u=>({g:u.glyph.getAttribute('style'),d:u.decor.map(d=>d.getAttribute('style')),letters:u.letters?.map(l=>l.style.opacity),pixels:u.particle?pixelSum(u.particle):u.ink?pixelSum(u.ink):null}))});}
  function pixelSum(p){const a=p.ctx.getImageData(0,0,p.canvas.width,p.canvas.height).data;let sum=0;for(let i=3;i<a.length;i+=4)sum+=a[i];return sum;}
  function audit(sections){
    const titles=[];
    for(const section of sections){const r=records.get(section);if(!r)continue;const saved=r.time,context=r.context,w=r.title.offsetWidth,h=r.title.offsetHeight,mid=r.writers?(r.writers[0].start+r.writers[0].end)/2:({paired:3.9,construct:4.65,balance:3.9,quartiles:4.9,screen:1.4,recall:2.5}[r.variant]||.85);
      sample(section,mid);const middle=signature(r),alpha=(r.stageParticle?pixelSum(r.stageParticle):0)+(r.statParticle?pixelSum(r.statParticle):0)+r.units.reduce((n,u)=>n+(u.particle?pixelSum(u.particle):u.ink?pixelSum(u.ink):0),0);
      sample(section,r.duration);const clean=(!r.statParticle||pixelSum(r.statParticle)===0)&&(!r.stageParticle||pixelSum(r.stageParticle)===0)&&(!r.flow||r.flow.svg.style.opacity==='0'&&r.flow.html.style.opacity==='0')&&r.units.every(u=>u.glyph.style.opacity==='1'&&u.glyph.style.transform==='none'&&u.glyph.style.filter==='none'&&u.glyph.style.clipPath==='none'&&u.decor.every(d=>d.style.opacity==='0')&&(!u.particle||pixelSum(u.particle)===0)&&(!u.ink||pixelSum(u.ink)===0)&&(!u.letters||u.letters.every(l=>l.style.opacity==='1')));
      sample(section,mid);const deterministic=signature(r)===middle,layout=r.title.offsetWidth===w&&r.title.offsetHeight===h;
      const points=r.units.reduce((n,u)=>n+(u.particle?.points.length||u.stat?.points.length||0),0),font=getComputedStyle(r.units[0].glyph),fontLoaded=document.fonts.check(fontSpec(font));
      const penLetters=r.units.reduce((n,u)=>n+(u.ink?.letters.length||0),0),penStrokes=r.units.reduce((n,u)=>n+(u.ink?.strokeCount||0),0);
      const nibLinks=(r.writers||[]).map(w=>{
        const d=r.flow.dots[w.lane],expected=w.state.expected,actual=[Number(d.getAttribute('cx')),Number(d.getAttribute('cy'))],distance=Math.hypot(actual[0]-expected[0],actual[1]-expected[1]);
        return {lane:w.lane,word:w.state.word,mode:w.state.mode,source:w.state.source,expected,actual,distance,pass:distance<.1};
      });
      const coverage=r.units.filter(u=>u.ink).map(u=>({word:u.glyph.textContent,...window.DeckLetterInk.audit(u.ink)}));
      const pairedSourceCounts=r.variant==='paired'?r.statParticle.groups.map(g=>{const used=[...new Set(g.points.map(p=>p.source))];return {word:g.word,left:used.filter(d=>Number(d.dataset.rank)<15).length,right:used.filter(d=>Number(d.dataset.rank)>=15).length};}):[];
      const result={page:r.index+1,effect:r.variant,label:r.title.getAttribute('aria-label'),font:font.fontFamily,fontLoaded,points,statisticalSourceCounts:r.statParticle?.groups.map(g=>({word:g.word,sources:g.sources.length}))||[],pairedSourceCounts,particleRenderer:r.statParticle?'shared-statistical-gather':null,penLetters,penStrokes,midCanvasAlpha:alpha,inkCoverage:coverage,nibLinks,penNibs:r.writers?.length||0,assembledLetters:r.assemblies?.reduce((n,a)=>n+a.items.length,0)||0,semanticSources:r.semanticSourceLabels||[],settledClean:clean,layoutStable:layout,deterministic,pass:fontLoaded&&clean&&layout&&deterministic&&coverage.every(c=>c.pass)&&nibLinks.every(n=>n.pass)&&pairedSourceCounts.every(g=>g.left===15&&g.right===15)&&(!(points||penStrokes)||alpha>0)};
      titles.push(result);sample(section,saved,context);
    }
    return {scope:'Live DOM and loaded font masks; per-letter pen paths, stable layout, native-text completion and deterministic replay. Semantic source, timing and cleanup checks; normal-speed browser appearance is a separate verification.',titles,pass:titles.every(t=>t.pass)};
  }
  return Object.freeze({prepare,sample,audit,duration:index=>byIndex[index]?.duration||durations[variants[index]]||1.6});
})();
