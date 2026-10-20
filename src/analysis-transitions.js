/* Chart-led interludes: original pixel traces and real SVG data positions.
 * Intermediate shapes illustrate a change of view, not new observations. */
window.DeckAnalysisTransitions=(()=>{
 'use strict';
 const W=1920,H=1080,Q='#75b6dc',A='#efad6d',INK='#19343c';
 const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10);};
 const phase=(p,a,b)=>ease((p-a)/(b-a)),mix=(a,b,p)=>a+(b-a)*p;
 const kinds=['frequency-flow','quantile-fold','paired-unfurl','same-people','long-responses','next-test'];
 const durations=[2800,3200,3800,4000,2700,3100];
 const labels=['FREQUENCY → CUMULATIVE','DISTRIBUTION → SPREAD','POOLED TRIALS → 30 PAIRED PEOPLE','THE SAME 30 PEOPLE. A NEW VIEW.','',''];
 const backLabels=['BACK TO FREQUENCY','BACK TO THE FULL DISTRIBUTION','PAIRED PEOPLE → POOLED TRIALS','ONE DISTRIBUTION → INDIVIDUAL PEOPLE','',''];
 function timing(from,to){const k=Math.abs(to-from)===1?Math.min(from,to)-5:-1,native=k>=4,boxDissolve=from===6&&to===7,retractLines=from===8&&to===9;return{duration:boxDissolve?4800:retractLines?5200:durations[k]||1900,incomingAt:boxDissolve?.70:retractLines?.72:native?(to===10?.78:.62):.87,moveEnd:boxDissolve?.62:.80,boxDissolve,retractLines};}
 const floor=index=>({5:3.6,6:4.2,7:4.8,8:3.5,9:4.4,10:0,11:3.5}[index]||0);
 const rect=(node,stage)=>{const a=stage.getBoundingClientRect(),b=node.getBoundingClientRect(),k=W/a.width;return{x:(b.left-a.left)*k,y:(b.top-a.top)*k,w:b.width*k,h:b.height*k};};
 function outline(points,count){
  const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1])),total=lengths.reduce((a,b)=>a+b,0);
  return Array.from({length:count},(_,i)=>{let d=total*i/(count-1);for(let j=0;j<lengths.length;j++){if(d<=lengths[j]||j===lengths.length-1){const u=d/(lengths[j]||1);return[mix(points[j][0],points[j+1][0],u),mix(points[j][1],points[j+1][1],u)];}d-=lengths[j];}return points.at(-1);});
 }
 // Centre each coloured column; interpolate only actual dashed gaps. Keep
 // the original coloured pixels separately for an exact raster handoff.
 function traceCurves(image){
  const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
  const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
  return[0,1].map(group=>{const mask=document.createElement('canvas');mask.width=canvas.width;mask.height=canvas.height;const mq=mask.getContext('2d'),pixels=mq.createImageData(mask.width,mask.height),columns=[],points=[];let matched=0,pixelCount=0;
   for(let x=171;x<=1617;x++){let sum=0,weight=0;
    for(let y=30;y<=447;y++){if(x>1040&&y>250)continue;const at=(y*canvas.width+x)*4,r=data[at],g=data[at+1],b=data[at+2],hit=group?r-b>9&&r-g>5&&g>45&&b<245:b-r>7&&b-g>3&&b>65&&r<245;
     if(!hit)continue;const w=group?r-b:b-r;sum+=y*w;weight+=w;pixels.data.set(data.subarray(at,at+4),at);pixelCount++;
    }columns.push(weight?sum/weight:null);if(weight)matched++;
   }
   if(matched<800)throw new Error('Cannot trace the original cumulative curves.');
   const nativeColumns=columns.slice();let previous=columns.findIndex(v=>v!==null);for(let i=0;i<previous;i++)columns[i]=columns[previous];
   for(let i=previous+1;i<columns.length;i++)if(columns[i]!==null){const a=columns[previous],b=columns[i];for(let k=previous+1;k<i;k++)columns[k]=mix(a,b,(k-previous)/(i-previous));previous=i;}
   for(let i=previous+1;i<columns.length;i++)columns[i]=columns[previous];
   for(let i=0;i<columns.length;i+=2)points.push([171+i,columns[i]]);if(points.at(-1)[0]!==1617)points.push([1617,columns.at(-1)]);
   mq.putImageData(pixels,0,0);return{points,matched,mask,pixelCount,nativeColumns};
  });
 }
 function create(sections){
  const stage=document.querySelector('#stage'),layer=document.querySelector('#presentation-layer'),canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;canvas.className='analysis-transition-canvas';canvas.setAttribute('aria-hidden','true');layer.appendChild(canvas);
  const ctx=canvas.getContext('2d'),records=new Map(),plans=new Map(),overrides=new Map();let curves=null,last=null;
  const pt=(svg,x,y)=>window.DeckTypeChoreography.svgPoint(svg,x,y);
  const tagged=(p,group,id=null,r=3,fill=null,strokeWidth=0)=>({x:p[0],y:p[1],group,id,r,fill:fill||(group?A:Q),strokeWidth});
  const affine=svg=>{const origin=pt(svg,0,0),x=pt(svg,1,0),y=pt(svg,0,1);return{a:x[0]-origin[0],b:x[1]-origin[1],c:y[0]-origin[0],d:y[1]-origin[1],e:origin[0],f:origin[1]};};
  function textAnchor(node,group){
   const style=getComputedStyle(node),fontSize=parseFloat(style.fontSize),weight=style.fontWeight||'400',spacing=parseFloat(style.letterSpacing)||0,label=node.textContent;
   ctx.font=`${weight} ${fontSize}px Manrope, sans-serif`;if('letterSpacing'in ctx)ctx.letterSpacing=spacing+'px';const metrics=ctx.measureText(label);let b;
   if(document.createRange){const range=document.createRange();range.selectNodeContents(node);b=rect(range,stage);range.detach?.();}
   else{b=rect(node,stage);b.w=metrics.width;}
   if('letterSpacing'in ctx)ctx.letterSpacing='0px';
   const baseline=((metrics.fontBoundingBoxAscent||fontSize*.8)-(metrics.fontBoundingBoxDescent||fontSize*.2))/2;
   return{x:b.x+b.w/2,y:b.y+b.h/2,label,fontSize,weight,spacing,baseline,group,w:b.w,h:b.h};
  }
  function geometry(index,current=false){
   const section=sections[index],all=s=>[...section.querySelectorAll(s)],one=s=>section.querySelector(s),points=[],lines=[],polylines=[],text=[],panels=[];let raster=null;
   // Read each live SVG transform once, rather than forcing a DOM matrix
   // query for every one of the 1,400+ cumulative-path samples.
   const matrices=new Map(),pt=(svg,x,y)=>{let m=matrices.get(svg);if(!m){m=affine(svg);matrices.set(svg,m);}return[m.a*x+m.c*y+m.e,m.b*x+m.d*y+m.f];};
   if(index===5){const svg=one('.hist-img'),clips=all('[data-bar-clip]');window.DeckMotion.bars.forEach(([x,y,w,h,group],j)=>{if(current&&clips[j]){h=Number(clips[j].getAttribute('height'));y=Number(clips[j].getAttribute('y'));}const corners=[[x,y+h],[x,y],[x+w,y],[x+w,y+h],[x,y+h]].map(p=>pt(svg,...p));outline(corners,16).forEach(p=>points.push(tagged(p,group)));});}
   else if(index===6){const svg=one('.raster-motion'),limit=current?171+Number(one('[data-curve-clip]').getAttribute('width')):Infinity;raster={matrix:affine(svg),limit};curves.forEach((curve,group)=>{const visible=curve.points.filter(([x])=>x<=limit),last=visible.at(-1)||curve.points[0],path=curve.points.map(([x,y])=>pt(svg,...(x<=limit?[x,y]:last)));polylines.push({group,points:path});path.forEach(p=>points.push(tagged(p,group)));});}
   else if(index===7){all('[data-box-body]').forEach((node,group)=>{const svg=node.ownerSVGElement,x=current?Number(node.getAttribute('x')):Number(node.dataset.left),right=current?x+Number(node.getAttribute('width')):Number(node.dataset.right),y=Number(node.getAttribute('y')),h=Number(node.getAttribute('height')),mid=Number(node.dataset.median),cy=y+h/2,origin=pt(svg,0,0),unit=pt(svg,1,0),scale=Math.hypot(unit[0]-origin[0],unit[1]-origin[1]);const corners=[[x,y],[right,y],[right,y+h],[x,y+h],[x,y]].map(p=>pt(svg,...p));polylines.push({group,points:corners,width:2*scale});outline(corners,54).forEach(p=>points.push(tagged(p,group)));const median=[pt(svg,mid,y),pt(svg,mid,y+h)];polylines.push({group,points:median,width:3.5*scale});outline(median,10).forEach(p=>points.push(tagged(p,group)));const whiskers=all('[data-box-whisker]').filter(n=>Number(n.dataset.series)===group);for(const n of whiskers){const ends=[pt(svg,Number(n.getAttribute('x1')),cy),pt(svg,Number(n.getAttribute('x2')),cy)];outline(ends,12).forEach(p=>points.push(tagged(p,group)));polylines.push({group,points:ends,width:2.6*scale});}for(const n of all('[data-box-cap]').filter(n=>Number(n.dataset.series)===group)){const cx=Number(n.getAttribute('x1'));polylines.push({group,points:[pt(svg,cx,cy-18),pt(svg,cx,cy+18)],width:2.6*scale});}});}
   else if(index===8){all('[data-paired-dot]').forEach((node,j)=>{const svg=node.ownerSVGElement,group=node.dataset.particleColor==='#75b6dc'?0:1,y=Number(node.getAttribute('cy')),x=current?Number(node.getAttribute('cx')):Number(node.dataset.target),p=pt(svg,x,y),zero=pt(svg,Number(node.dataset.zero),y),edge=pt(svg,x+4.5,y),scale=Math.hypot(edge[0]-p[0],edge[1]-p[1])/4.5;points.push(tagged(p,group,j,4.5*scale,INK));lines.push({a:zero,b:p,group,id:j,width:9*scale});});}
   else if(index===9){all('[data-dot]').forEach((node,j)=>{const svg=node.ownerSVGElement,group=node.getAttribute('fill')==='#75b6dc'?0:1,x=current?Number(node.getAttribute('cx')):Number(node.dataset.x),y=current?Number(node.getAttribute('cy')):Number(node.dataset.y),p=pt(svg,x,y),edge=pt(svg,x+12,y),scale=Math.hypot(edge[0]-p[0],edge[1]-p[1])/12;points.push(tagged(p,group,j,12*scale,node.getAttribute('fill'),1.5*scale));});}
   else if(index===10){const svg=one('.sensitivity-chart svg')||all('[data-restored-mean]')[0]?.ownerSVGElement,plot=svg&&rect(svg,stage);if(plot)panels.push({...plot,node:svg});all('[data-restored-trial]').forEach(node=>{const v=textAnchor(node,1);text.push(v);points.push(tagged([v.x,v.y],1));});}
   else if(index===11){all('.improvement').forEach((node,j)=>panels.push({...rect(node,stage),node,group:j%2}));all('.improvement h2').forEach((node,j)=>{const v=textAnchor(node,j%2);text.push(v);points.push(tagged([v.x,v.y],j%2));});}
   if(!points.length)throw new Error('Missing authored chart anchors for page '+(index+1));return{index,points,lines,polylines,text,panels,raster};
  }
  function makePlan(from,to,source){
   const target=records.get(to),kindIndex=Math.abs(to-from)===1?Math.min(from,to)-5:-1,kind=kinds[kindIndex]||'evidence-prism',items=[],reverse=to<from,profile=timing(from,to);
   if(kindIndex===0||kindIndex===1){for(const group of[0,1]){const a=source.points.filter(p=>p.group===group),b=target.points.filter(p=>p.group===group),count=kindIndex===0?160:128;for(let i=0;i<count;i++)items.push({s:a[Math.round(i*(a.length-1)/(count-1))],t:b[Math.round(i*(b.length-1)/(count-1))],group,delay:(i%11)*.003,arc:(group?1:-1)*(38+12*Math.sin(i*.2)),z:80+(i%7)*9});}}
   else if(kindIndex===2||kindIndex===3){for(let i=0;i<30;i++){const a=source.points.find(p=>p.id===i)||source.points[Math.floor(i/30*source.points.length)],b=target.points.find(p=>p.id===i)||target.points[Math.floor(i/30*target.points.length)];items.push({s:a,t:b,group:kindIndex===3?a.group:b.group,delay:(i%7)*.006,arc:(i%2?1:-1)*(35+i%5*9),z:60+(i%5)*12,id:i});}}
   else if(kindIndex===4||kindIndex===5){/* Native chart/card reveal; never invent flying number/heading origins. */}
   else{const count=Math.max(source.points.length,target.points.length);for(let i=0;i<count;i++)items.push({s:source.points[i%source.points.length],t:target.points[i%target.points.length],group:i%2,delay:(i%9)*.004,arc:Math.sin(i)*55,z:100});}
   const all=items.flatMap(item=>[item.s,item.t]),xs=all.map(p=>p.x),ys=all.map(p=>p.y),left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys),focus=items.length?{x:(left+right)/2,y:(top+bottom)/2,zoom:Math.min(1.28,1450/Math.max(1,right-left))}:null;
   for(const item of items){item.focus=focus;item.sourceLine=source.lines.find(line=>line.id===item.id);item.targetLine=target.lines.find(line=>line.id===item.id);item.moveEnd=profile.moveEnd;item.retractLine=profile.retractLines&&!!item.sourceLine;if(item.retractLine)item.delay=(item.id%15)*.004;}
   const native=kindIndex>=4;return{from,to,kind,kindIndex,reverse,items,source,target,native,chartFloor:floor(to),...profile,caption:native?'':kindIndex<0?'ANOTHER VIEW OF THE EVIDENCE':reverse?backLabels[kindIndex]:labels[kindIndex]};
  }
  async function prepare(images,{yieldControl=()=>Promise.resolve()}={}){
   curves=traceCurves(images.cumulative);await yieldControl();
   for(let i=5;i<=11;i++){window.DeckMotion.sample(sections[i],i,6);records.set(i,geometry(i));await yieldControl();}
   for(let i=5;i<11;i++)for(const[a,b]of[[i,i+1],[i+1,i]])plans.set(a+':'+b,makePlan(a,b,records.get(a)));
   clear();return{curveSamples:curves.map(c=>c.matched),pages:records.size,kinds:kinds.slice(),plans:plans.size};
  }
  function restore(){for(const[node,style]of overrides)Object.assign(node.style,style);overrides.clear();}
  function own(node){if(!overrides.has(node))overrides.set(node,{opacity:node.style.opacity||'',transform:node.style.transform||'',clipPath:node.style.clipPath||''});}
  function begin(from,to){clear();return makePlan(from,to,geometry(from,true));}
  // All endpoints have a still interval. Depth/focus are internal to the
  // transfer, never a CSS transform on a page participating in a handoff.
  function progress(item,p){return phase(p,.24+item.delay,(item.moveEnd||.80)+item.delay);}
  function project(item,x,y,q){const lift=Math.sin(Math.PI*q),scale=900/(900-item.z*lift);y+=item.arc*lift;if(item.focus){x=mix(x,960+(x-item.focus.x)*item.focus.zoom,lift);y=mix(y,610+(y-item.focus.y)*item.focus.zoom,lift);}return{x:960+(x-960)*scale,y:565+(y-565)*scale,q,scale};}
  function position(item,p){
   if(item.retractLine){
    const d=item.delay,zero=item.sourceLine.a,r=phase(p,.24+d,.43+d);
    // Consume the authored bar backwards on its own axis. No lift, arc or
    // focus projection is allowed until its endpoint reaches the origin.
    if(p<=.43+d)return{x:mix(item.s.x,zero[0],r),y:mix(item.s.y,zero[1],r),q:0,scale:1,retract:r};
    // Two ranked columns fold into one plot in the same flat coordinate
    // plane. Bounded Bezier controls avoid the old zoom/scatter/overshoot.
    const u=phase(p,.43+d,.64+d),v=1-u,dx=item.t.x-zero[0],x=v*v*v*zero[0]+3*v*v*u*(zero[0]+dx*.32)+3*v*u*u*(item.t.x-dx*.32)+u*u*u*item.t.x,y=mix(zero[1],item.t.y,u*u*(3-2*u));
    return{x,y,q:u,scale:1,retract:1};
   }
   const q=progress(item,p);return project(item,mix(item.s.x,item.t.x,q),mix(item.s.y,item.t.y,q),q);
  }
  function lineGeometry(item,p){
   if(!item.sourceLine&&!item.targetLine)return null;
   if(item.retractLine){const b=position(item,p),a={x:item.sourceLine.a[0],y:item.sourceLine.a[1]};return{a,b,width:item.sourceLine.width,alpha:p<.43+item.delay?1:0};}
   const q=progress(item,p),s=item.sourceLine?.a||[item.s.x,item.s.y],t=item.targetLine?.a||[item.t.x,item.t.y],a=project(item,mix(s[0],t[0],q),mix(s[1],t[1],q),q),b=position(item,p);
   return{a,b,width:mix(item.sourceLine?.width||0,item.targetLine?.width||0,q)*b.scale,alpha:item.sourceLine&&item.targetLine?1:item.sourceLine?1-q:q};
  }
  function colourAt(a,b,p){const ah=parseInt(a.slice(1),16),bh=parseInt(b.slice(1),16);return'#'+[16,8,0].map(shift=>Math.round(mix((ah>>shift)&255,(bh>>shift)&255,p)).toString(16).padStart(2,'0')).join('');}
  function drawRaster(record,alpha){if(!record.raster||alpha<=0)return;const{matrix:m,limit}=record.raster;ctx.save();ctx.setTransform(m.a,m.b,m.c,m.d,m.e,m.f);ctx.globalAlpha=alpha;ctx.beginPath();ctx.rect(171,29,Math.max(0,Math.min(1447,limit-171)),418);ctx.clip();for(const curve of curves)ctx.drawImage(curve.mask,0,0);ctx.restore();}
  // These reveals operate on the authored SVG/cards themselves; no numbers
  // or headings are cloned into an unrelated screen-space arrangement.
  function decorate(plan,p){
   if(!plan.native)return;
   if(plan.to===10){const panel=plan.target.panels[0];if(panel){own(panel.node);const u=phase(p,.29,.82);panel.node.style.clipPath=u===1?'':`inset(0 ${(1-u)*100}% 0 0)`;}}
   if(plan.to===11)for(const[rank,panel]of plan.target.panels.entries()){own(panel.node);const u=phase(p,.27+rank*.115,.50+rank*.115);panel.node.style.opacity=String(u);panel.node.style.transform=`translateY(${20*(1-u)}px)`;panel.node.style.clipPath=u===1?'':`inset(0 ${(1-u)*100}% 0 0)`;}
  }
  function sample(plan,p){
   p=clamp(p);const materialize=plan.boxDissolve||plan.retractLines,out=1-phase(p,plan.native?.12:.08,plan.native?.52:.25),incoming=materialize?phase(p,plan.incomingAt,1):phase(p,plan.native?.25:.87,plan.native?.62:.99),alpha=phase(p,.02,.15)*(1-phase(p,materialize?.975:plan.native?.72:.87,materialize?1:plan.native?.94:.99));ctx.clearRect(0,0,W,H);canvas.style.opacity=String(alpha);canvas.style.visibility=alpha>0?'visible':'hidden';
   const styles={fromOpacity:out,toOpacity:incoming,fromTransform:'none',toTransform:'none',canvasAlpha:alpha};
   if(alpha>0){
    if(plan.caption){ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='600 27px Manrope, sans-serif';ctx.fillStyle=INK;ctx.globalAlpha=phase(p,.12,.25)*(1-phase(p,materialize?.60:plan.native?.40:.65,materialize?.70:plan.native?.66:.82));if('letterSpacing'in ctx)ctx.letterSpacing='1.2px';ctx.fillText(plan.caption,960,290);if('letterSpacing'in ctx)ctx.letterSpacing='0px';}
    drawRaster(plan.source,1-phase(p,.22,.30));drawRaster(plan.target,phase(p,.836,.87));
    const particleAlpha=(plan.source.raster?phase(p,.22,.30):1)*(plan.target.raster?1-phase(p,.836,.87):1)*(plan.boxDissolve?1-incoming:1);
    if(plan.kindIndex<2)for(const group of[0,1]){ctx.globalAlpha=.42*phase(p,.26,.40)*(1-phase(p,plan.boxDissolve?.54:.68,plan.boxDissolve?.65:.80));ctx.strokeStyle=group?A:Q;ctx.lineWidth=3.8;ctx.beginPath();let first=true;for(let i=0;i<plan.items.length;i+=2){const item=plan.items[i];if(item.group!==group)continue;const v=position(item,p);first?ctx.moveTo(v.x,v.y):ctx.lineTo(v.x,v.y);first=false;}ctx.stroke();}
    // A fixed vector outline bridges the settled particles to the actual
    // filled diagram. The page fills in over 1.44 s while dots shrink away.
    if(plan.boxDissolve&&incoming>0){ctx.save();ctx.globalAlpha=incoming;ctx.strokeStyle=INK;ctx.lineCap='butt';ctx.lineJoin='round';for(const poly of plan.target.polylines){ctx.lineWidth=poly.width;ctx.beginPath();poly.points.forEach((v,i)=>i?ctx.lineTo(...v):ctx.moveTo(...v));ctx.stroke();}ctx.restore();}
    ctx.lineCap='round';
    for(const item of plan.items){const point=position(item,p),previous=position(item,Math.max(0,p-.065)),colour=item.group?A:Q;
     const trailAlpha=item.retractLine?0:.30*phase(p,.28,.40)*(1-phase(p,plan.boxDissolve?.54:.68,plan.boxDissolve?.65:.80))*particleAlpha;
     ctx.strokeStyle=colour;ctx.globalAlpha=trailAlpha;ctx.lineWidth=(plan.kindIndex<2?4.5:5)*point.scale;ctx.beginPath();ctx.moveTo(previous.x,previous.y);ctx.lineTo(point.x,point.y);ctx.stroke();
     const line=lineGeometry(item,p);if(line&&line.width>0&&line.alpha>0){ctx.globalAlpha=line.alpha;ctx.lineWidth=line.width;ctx.beginPath();ctx.moveTo(line.a.x,line.a.y);ctx.lineTo(line.b.x,line.b.y);ctx.stroke();}
     const lift=item.retractLine?0:Math.sin(Math.PI*point.q),emphasis=1+lift*(plan.kindIndex<2?1.15:.35),radius=mix(item.s.r,item.t.r,point.q)*point.scale*emphasis*(plan.boxDissolve?1-.5*incoming:1);
     ctx.fillStyle=colour;ctx.globalAlpha=.12*lift*particleAlpha;ctx.beginPath();ctx.arc(point.x,point.y,radius*1.55,0,Math.PI*2);ctx.fill();
     const fill=point.q<.5?colourAt(item.s.fill,colour,ease(point.q*2)):colourAt(colour,item.t.fill,ease(point.q*2-1));ctx.fillStyle=plan.boxDissolve?colourAt(fill,INK,incoming):fill;ctx.globalAlpha=particleAlpha;ctx.beginPath();ctx.arc(point.x,point.y,radius,0,Math.PI*2);ctx.fill();
     const border=mix(item.s.strokeWidth,item.t.strokeWidth,point.q)*point.scale;if(border>0){ctx.strokeStyle=INK;ctx.lineWidth=border;ctx.stroke();}
    }
    if(plan.native){const record=plan.to===10||plan.to===11?plan.target:plan.source,opening=phase(p,.24,.82);for(const panel of record.panels){const a=.45*phase(p,.15,.30)*(1-phase(p,.62,.86));ctx.globalAlpha=a;ctx.strokeStyle=panel.group?A:Q;ctx.lineWidth=2;ctx.beginPath();const length=20;for(const[x,y,sx,sy]of[[panel.x,panel.y,1,1],[panel.x+panel.w,panel.y,-1,1],[panel.x,panel.y+panel.h,1,-1],[panel.x+panel.w,panel.y+panel.h,-1,-1]]){ctx.moveTo(x+sx*length,y);ctx.lineTo(x,y);ctx.lineTo(x,y+sy*length);}ctx.stroke();if(record.index===10&&opening<1){ctx.globalAlpha=a*.7;const x=panel.x+panel.w*opening;ctx.beginPath();ctx.moveTo(x,panel.y);ctx.lineTo(x,panel.y+panel.h);ctx.stroke();}}}
    ctx.globalAlpha=1;
   }
   last={kind:plan.kind,from:plan.from,to:plan.to,p,particles:plan.items.length,caption:plan.caption,...styles};return styles;
  }
  function clear(){restore();ctx.clearRect(0,0,W,H);canvas.style.opacity='0';canvas.style.visibility='hidden';last=null;}
  function inspect(){return{active:last?{...last}:null,plans:plans.size,kinds:[...new Set([...plans.values()].map(p=>p.kind))],curveSamples:curves?.map(c=>c.matched)||[],canvasHidden:canvas.style.visibility==='hidden',ownedNodes:overrides.size};}
  return{prepare,begin,sample,decorate,clear,inspect,position,lineGeometry,curveData:()=>curves,plan:(from,to)=>plans.get(from+':'+to)};
 }
 return Object.freeze({create,kinds,timing,duration:(from,to)=>timing(from,to).duration});
})();
