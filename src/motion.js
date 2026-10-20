/* Absolute-time SVG choreography: replay and reduced motion always end at the
 * original reported positions. Raster figures reuse their source pixels. */
window.DeckMotion = (() => {
  'use strict';
  const clamp=x=>Math.max(0,Math.min(1,x));
  const ease=x=>{x=clamp(x);return clamp(x*x*x*(x*(x*6-15)+10));};
  const phase=(t,start,duration)=>ease((t-start)/duration);
  const lerp=(a,b,p)=>p===1?b:a+(b-a)*p;
  const drawings={
    sleep:'<path d="M45 9a23 23 0 1 0 10 35A23 23 0 0 1 45 9Z"/><path d="m48 11 3 5 6 1-5 4 1 6-5-3-5 3 1-6-5-4 6-1Z"/>',
    practice:'<path d="M49 20a21 21 0 1 0 2 24M49 8v13H36"/><path d="m25 23 14 9-14 9Z"/>',
    clock:'<circle cx="32" cy="32" r="23"/><path d="M32 13v19l12 7" data-hand="clock"/>',
    device:'<rect x="7" y="10" width="50" height="35" rx="3"/><path d="M23 55h18M32 45v10M8 38h48"/>',
    conversation:'<path d="M11 11h42v30H29L17 52V41h-6Z"/><path d="M21 26v3m7-9v15m8-18v21m7-15v9" data-wave="1"/>',
    people:'<circle cx="24" cy="20" r="8"/><circle cx="46" cy="23" r="6"/><path d="M8 52v-7a16 16 0 0 1 32 0v7m3-17a12 12 0 0 1 13 12v5"/>',
    trials:'<circle cx="32" cy="35" r="22"/><path d="M25 5h14M32 5v8m16 7 6-6M32 23v12l9 5"/><path d="m18 48 3 3 6-7"/>',
    conditions:'<path d="M8 24h12l11-11v38L20 40H8ZM41 23v17m8-24v31m8-37v44"/>',
    distribution:'<path d="M8 52h49M13 52V37h8v15m5 0V15h9v37m5 0V29h8v23m5 0V43h6v9"/>',
    cumulative:'<path d="M9 9v45h47M14 48l8-3 7-10 9-15 8-5h10"/><circle cx="38" cy="20" r="3"/>',
    box:'<path d="M9 32h46M9 23v18m46-18v18"/><rect x="21" y="18" width="22" height="28"/><path d="M30 18v28"/>',
    paired:'<path d="M32 8v48M15 18h17m0 14h22m-35 14h13"/><circle cx="15" cy="18" r="3"/><circle cx="54" cy="32" r="3"/><circle cx="19" cy="46" r="3"/>',
    average:'<path d="M7 50h50M29 12v38m10-30v30"/><circle cx="13" cy="40" r="3"/><circle cx="22" cy="35" r="3"/><circle cx="36" cy="40" r="3"/><circle cx="46" cy="35" r="3"/><circle cx="55" cy="40" r="3"/>',
    sound:'<path d="M8 25h12l10-10v34L20 39H8Zm32-4a16 16 0 0 1 0 22m8-29a26 26 0 0 1 0 36"/>',
    shuffle:'<path d="M8 17h8c15 0 16 30 31 30h9m-8-8 8 8-8 8M8 47h8c15 0 16-30 31-30h9m-8-8 8 8-8 8"/>',
    power:'<path d="M32 7v26m-13-18a23 23 0 1 0 26 0"/>'
  };
  function icon(name,extra=''){
    return `<svg class="motion-icon ${extra}" data-icon="${name}" viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${drawings[name]||drawings.clock}</svg>`;
  }
  // Bounds of coloured source pixels (including their antialiased edges), not
  // estimated trial frequencies. Original PNGs remain unchanged and credited.
  const bars=[
    [147,184,123,185,0],[270,168,122,201,0],[392,259,122,110,0],[514,343,123,26,0],[637,318,123,51,0],[760,326,122,43,0],[1250,363,122,6,0],[1372,359,122,10,0],[1494,363,123,6,0],
    [147,611,123,148,1],[270,476,122,283,1],[392,678,122,81,1],[514,733,123,26,1],[637,733,123,26,1],[760,729,122,30,1],[882,729,122,30,1],[1004,754,123,5,1]
  ];
  function histogram(src){
    const defs=bars.map((b,i)=>`<clipPath id="hist-c-${i}"><rect data-bar-clip="${i}" data-baseline="${b[4]?759:369}" data-height="${b[3]}" data-row="${b[4]}" data-bin="${Math.round((b[0]-147)/122.5)}" x="${b[0]-3}" y="${b[4]?759:369}" width="${b[2]+6}" height="0"/></clipPath>`).join('');
    const holes=bars.map(b=>`<rect x="${b[0]-3}" y="${b[1]}" width="${b[2]+6}" height="${b[3]}" fill="black"/>`).join('');
    return `<svg class="chart-img hist-img raster-motion" preserveAspectRatio="xMinYMid meet" viewBox="0 0 1677 897" role="img" aria-label="Original source histograms, animated from their original pixels"><rect width="1677" height="897" fill="white"/><defs><image id="hist-source" width="1677" height="897" href="${src}"/>${defs}<mask id="hist-axes"><rect width="1677" height="897" fill="white"/>${holes}</mask></defs><use data-hist-base="1" href="#hist-source" mask="url(#hist-axes)"/><g data-hist-grid="1" fill="none"><path d="M147 213H1618M147 603H1618" stroke="#e0e0e0" stroke-width="2"/><path d="M147 24V370M147 415V760" stroke="#646464" stroke-width="3"/></g>${bars.map((b,i)=>`<g data-bar="${i}" data-baseline="${b[4]?759:369}" data-row="${b[4]}" data-bin="${Math.round((b[0]-147)/122.5)}"><g clip-path="url(#hist-c-${i})"><use href="#hist-source"/></g></g>`).join('')}</svg>`;
  }
  function cumulative(src){return `<svg class="chart-img raster-motion" viewBox="0 0 1677 585" role="img" aria-label="Original cumulative relative frequency curves, traced from left to right"><rect width="1677" height="585" fill="white"/><defs><image id="curve-source" width="1677" height="585" href="${src}"/><clipPath id="curve-reveal"><rect data-curve-clip="1" x="171" y="29" width="0" height="417"/></clipPath><mask id="curve-axes"><rect width="1677" height="585" fill="white"/><rect x="171" y="29" width="1447" height="417" fill="#111"/></mask></defs><use data-curve-base="1" href="#curve-source" mask="url(#curve-axes)"/><use data-curve-source="1" href="#curve-source" clip-path="url(#curve-reveal)"/><line data-curve-guide="1" x1="171" x2="171" y1="30" y2="447" stroke="#7b989f" stroke-width="2" stroke-dasharray="8 9"/></svg>`;}
  const durations={0:18,1:14,2:18,3:10,4:5.5,5:3.6,6:4.2,7:4.8,8:3.5,9:4.4,10:5.4,11:3.5,12:10,13:8,14:12};
  // Slide DOM is fixed after preparation. Resolve animation selectors once,
  // then reuse the same nodes instead of querying every chart every frame.
  const nodeCache=new WeakMap();
  function nodes(section,selector){let cache=nodeCache.get(section);if(!cache){cache=new Map();nodeCache.set(section,cache);}if(!cache.has(selector))cache.set(selector,section.querySelectorAll(selector));return cache.get(selector);}
  function sample(section,index,seconds){
    if(!section)return;
    const t=Math.max(0,Number(seconds)||0),all=s=>nodes(section,s);
    all('.motion-icon').forEach((svg,j)=>{
      const p=phase(t,.2+j*.16,1.6);
      svg.style.opacity=String(.25+.75*p);
      svg.style.transform=`translateY(${(1-p)*8}px)`;
      nodes(svg,'path,circle,rect').forEach(path=>{path.style.strokeDasharray='200';path.style.strokeDashoffset=String((1-p)*200);});
      nodes(svg,'[data-wave]').forEach(path=>{const pulse=t>1.8&&t<5.4?Math.sin((t-1.8)*Math.PI*2)*.12:0;path.style.transformOrigin='32px 28px';path.style.transform=`scale(1,${1+pulse})`;});
    });
    all('[data-reveal]').forEach((el,j)=>{const p=phase(t,Number(el.dataset.reveal)||j*.14,.9);el.style.opacity=String(p);el.style.transform=`translateY(${(1-p)*16}px)`;});
    all('.idea').forEach((el,j)=>{const p=phase(t,.4+j*.58,1);el.style.opacity=String(p);el.style.transform=`translateY(${(1-p)*16}px)`;el.classList.toggle('selected',j===4&&t>=4.2);});
    if(index===5){
      const done=t>=3.6;
      all('[data-hist-base]').forEach(el=>done?el.removeAttribute('mask'):el.setAttribute('mask','url(#hist-axes)'));
      all('[data-bar-clip]').forEach(el=>{const p=phase(t,.25+Number(el.dataset.bin)*.07+Number(el.dataset.row)*.48,1.7),height=Number(el.dataset.height)*p;el.setAttribute('height',String(height));el.setAttribute('y',String(Number(el.dataset.baseline)-height));});
      all('[data-bar],[data-hist-grid]').forEach(el=>el.style.opacity=done?'0':'1');
    }
    if(index===6){
      const p=phase(t,.25,3.25),done=t>=4.2;
      all('[data-curve-clip]').forEach(el=>el.setAttribute('width',String(1447*p)));
      all('[data-curve-base]').forEach(el=>done?el.removeAttribute('mask'):el.setAttribute('mask','url(#curve-axes)'));
      all('[data-curve-source]').forEach(el=>el.style.opacity=done?'0':'1');
      all('[data-curve-guide]').forEach(el=>{el.setAttribute('x1',String(171+1447*p));el.setAttribute('x2',String(171+1447*p));el.style.opacity=String(p>0&&p<1?.55:0);});
    }
    // Build the box plot as statistical parts. Never scale the series group:
    // strokes, medians and caps retain their shape throughout the reveal.
    all('[data-box-series]').forEach(el=>{el.removeAttribute('transform');el.style.opacity='1';});
    all('[data-box-median]').forEach(el=>{
      const j=Number(el.dataset.boxMedian),p=phase(t,.2+j*.42,.65),y=Number(el.dataset.center);
      el.setAttribute('y1',String(y-22*p));el.setAttribute('y2',String(y+22*p));
      el.style.opacity=String(p);
    });
    all('[data-box-body]').forEach(el=>{
      const j=Number(el.dataset.boxBody),p=phase(t,.75+j*.42,1.1),mid=Number(el.dataset.median),left=lerp(mid,Number(el.dataset.left),p),right=lerp(mid,Number(el.dataset.right),p);
      el.setAttribute('x',String(left));el.setAttribute('width',String(right-left));el.style.opacity=String(p);
    });
    all('[data-box-whisker]').forEach(el=>{
      const j=Number(el.dataset.series),p=phase(t,1.55+j*.42,1.15),inner=Number(el.dataset.inner),outer=lerp(inner,Number(el.dataset.outer),p);
      el.setAttribute(el.dataset.boxWhisker==='left'?'x1':'x2',String(outer));el.style.opacity=String(p);
    });
    all('[data-box-cap]').forEach(el=>{
      const p=phase(t,2.72+Number(el.dataset.series)*.42,.45),y=Number(el.dataset.center);
      el.setAttribute('y1',String(y-18*p));el.setAttribute('y2',String(y+18*p));el.style.opacity=String(p);
    });
    all('[data-box-label]').forEach(el=>{
      const p=phase(t,3.25+Number(el.dataset.boxLabel)*.42,.65);el.style.opacity=String(p);el.style.transform=`translateY(${(1-p)*-10}px)`;
    });
    all('[data-chart-label]').forEach((el,j)=>{el.style.opacity=String(phase(t,1.8+j*.10,.8));});
    all('[data-paired-line]').forEach(el=>{const p=phase(t,.15+Number(el.dataset.rank)*.035,1.35),x=lerp(Number(el.dataset.zero),Number(el.dataset.target),p);el.setAttribute('x2',String(x));});
    all('[data-paired-dot]').forEach(el=>{const p=phase(t,.15+Number(el.dataset.rank)*.035,1.35);el.setAttribute('cx',String(lerp(Number(el.dataset.zero),Number(el.dataset.target),p)));el.style.opacity=String(Math.min(1,p*5));});
    all('[data-paired-value]').forEach(el=>{el.style.opacity=String(phase(t,1.4+Number(el.dataset.rank)*.025,.7));});
    all('[data-dot]').forEach((el,j)=>{const p=phase(t,.2+j*.025,1.8),x=lerp(Number(el.dataset.zero),Number(el.dataset.x),p);el.setAttribute('cx',String(x));el.setAttribute('cy',String(Number(el.dataset.y)-Math.sin(Math.PI*p)*22));el.style.opacity=String(Math.min(1,p*4));});
    all('[data-mean-marker]').forEach(el=>{const p=phase(t,2.2,.95);el.style.opacity=String(p);el.style.transform=`translateY(${(1-p)*-12}px)`;});
    all('[data-outlier-label]').forEach(el=>{el.style.opacity=String(phase(t,3.0,.9));});
    all('.qline>div').forEach((el,j)=>{el.style.opacity=String(phase(t,3.8+j*.12,.6));});
    if(index===10){
      const p=phase(t,1.25,3.10);all('[data-restored-mean]').forEach(el=>el.setAttribute('cx',String(lerp(Number(el.dataset.start),Number(el.dataset.target),p))));
      all('[data-restored-line]').forEach(el=>el.setAttribute('x2',String(lerp(Number(el.dataset.start),Number(el.dataset.target),p))));
      all('[data-restored-label]').forEach(el=>el.style.opacity=String(phase(t,4.35,.55)));
    }
    if(index===8)all('.pair-count>div').forEach((el,j)=>{el.style.opacity=String(phase(t,2.0+j*.2,.8));});
  }
  return Object.freeze({icon,histogram,cumulative,sample,duration:i=>durations[i]||0,bars});
})();
