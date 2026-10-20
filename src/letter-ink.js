/* Per-letter pen order clipped to the actual loaded font glyphs.
 * Independent path-length implementation informed by github.com/maxwellito/vivus.
 * The pen skeletons encode writing direction; the font canvas supplies the shape.
 */
window.DeckLetterInk=(()=>{
 const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10);},out=x=>1-(1-clamp(x))**3;
 const oval=(x,y,rx,ry,a=-1.2,b=a+Math.PI*2)=>Array.from({length:25},(_,j)=>[x+rx*Math.cos(a+(b-a)*j/24),y+ry*Math.sin(a+(b-a)*j/24)]);
 const pen={
  a:[oval(.45,.58,.40,.36),[[.88,.22],[.88,.97]]],
  b:[[[.12,0],[.12,.98]],oval(.49,.66,.39,.32,Math.PI,Math.PI*3)],
  c:[oval(.52,.51,.45,.46,-.70,-5.55)],
  d:[oval(.46,.67,.38,.31),[[.86,0],[.86,.99]]],
  e:[[[.10,.53],[.87,.53],[.85,.34],[.69,.13],[.43,.06],[.20,.17],[.07,.45],[.12,.77],[.36,.96],[.66,.94],[.91,.79]]],
  f:[[[.84,.08],[.64,.02],[.40,.10],[.30,.31],[.30,1]],[[.03,.39],[.81,.39]]],
  g:[oval(.48,.31,.36,.27),[[.86,.07],[.86,.70],[.75,.93],[.49,1],[.16,.90]]],
  h:[[[.13,0],[.13,.99]],[[.13,.58],[.34,.36],[.58,.32],[.84,.49],[.87,.99]]],
  i:[[[.48,.28],[.48,1]],[[.48,.04],[.50,.05]]],
  j:[[[.78,.26],[.78,.82],[.59,.98],[.31,.99],[.12,.90]],[[.78,.04],[.80,.05]]],
  k:[[[.13,0],[.13,1]],[[.91,.30],[.15,.71]],[[.48,.53],[.95,.99]]],
  l:[[[.46,0],[.46,1]]],
  m:[[[.09,.07],[.09,1]],[[.10,.39],[.25,.07],[.43,.08],[.49,.37],[.49,1]],[[.49,.39],[.66,.07],[.85,.10],[.93,.39],[.93,1]]],
  n:[[[.12,.04],[.12,1]],[[.13,.38],[.32,.08],[.57,.04],[.82,.20],[.88,.49],[.88,1]]],
  o:[oval(.50,.50,.43,.45)],
  p:[[[.13,0],[.13,1]],oval(.50,.33,.38,.29,Math.PI,Math.PI*3)],
  q:[oval(.46,.32,.38,.28),[[.85,.02],[.85,1]]],
  r:[[[.13,.02],[.13,1]],[[.15,.40],[.39,.12],[.62,.06],[.92,.16]]],
  s:[[[.91,.15],[.72,.04],[.38,.04],[.10,.24],[.15,.42],[.48,.54],[.78,.65],[.91,.83],[.70,.96],[.38,.97],[.08,.84]]],
  t:[[[.52,0],[.52,.82],[.64,.97],[.86,.93]],[[.06,.30],[.94,.30]]],
  u:[[[.12,0],[.12,.69],[.28,.94],[.53,.98],[.84,.72]],[[.87,0],[.87,1]]],
  v:[[[.05,.02],[.49,.98],[.95,.02]]],w:[[[.04,.01],[.27,.99],[.51,.24],[.74,.99],[.96,.01]]],
  x:[[[.07,.02],[.93,.98]],[[.93,.02],[.07,.98]]],
  y:[[[.06,0],[.48,.65]],[[.94,0],[.39,.87],[.19,.99],[.07,.96]]],z:[[[.04,.05],[.93,.05],[.05,.95],[.96,.95]]],
  A:[[[.04,.98],[.49,.02],[.95,.98]],[[.25,.61],[.75,.61]]],
  B:[[[.12,1],[.12,0]],[[.12,.03],[.64,.03],[.90,.16],[.89,.33],[.65,.48],[.15,.48]],[[.15,.48],[.73,.49],[.94,.68],[.86,.88],[.62,.97],[.12,.97]]],
  C:[oval(.53,.50,.46,.46,-.70,-5.55)],D:[[[.10,.99],[.10,.01]],[[.10,.02],[.53,.02],[.84,.19],[.96,.49],[.83,.80],[.53,.98],[.10,.98]]],
  E:[[[.14,.02],[.14,.98]],[[.14,.02],[.94,.02]],[[.14,.48],[.80,.48]],[[.14,.98],[.96,.98]]],
  F:[[[.14,.02],[.14,.99]],[[.14,.02],[.95,.02]],[[.14,.48],[.80,.48]]],G:[oval(.51,.50,.45,.46,-.70,-5.55),[[.96,.51],[.63,.51]],[[.94,.51],[.94,.81]]],
  H:[[[.10,0],[.10,1]],[[.90,0],[.90,1]],[[.10,.50],[.90,.50]]],I:[[[.50,0],[.50,1]],[[.06,.02],[.94,.02]],[[.06,.98],[.94,.98]]],
  J:[[[.85,.01],[.85,.75],[.69,.94],[.39,.98],[.12,.82]]],K:[[[.10,0],[.10,1]],[[.94,.01],[.12,.57]],[[.48,.33],[.95,.99]]],
  L:[[[.13,0],[.13,.98],[.97,.98]]],M:[[[.07,1],[.07,.02],[.50,.82],[.93,.02],[.93,1]]],N:[[[.10,1],[.10,0],[.91,1],[.91,0]]],O:[oval(.50,.50,.44,.46)],
  P:[[[.13,1],[.13,0]],[[.13,.02],[.62,.02],[.91,.17],[.87,.42],[.62,.54],[.13,.54]]],
  Q:[oval(.47,.45,.41,.42),[[.53,.67],[.99,.99]]],R:[[[.12,1],[.12,0]],[[.12,.02],[.62,.02],[.91,.18],[.85,.40],[.60,.52],[.12,.52]],[[.53,.52],[.96,.99]]],
  S:[[[.92,.14],[.70,.03],[.33,.05],[.08,.24],[.16,.43],[.49,.54],[.82,.68],[.90,.84],[.65,.98],[.30,.95],[.05,.82]]],
  T:[[[.04,.02],[.97,.02]],[[.50,.02],[.50,1]]],U:[[[.10,0],[.10,.69],[.22,.91],[.50,.98],[.78,.91],[.91,.69],[.91,0]]],
  V:[[[.04,.01],[.50,.99],[.96,.01]]],W:[[[.03,.01],[.25,.99],[.50,.20],[.74,.99],[.97,.01]]],X:[[[.06,.01],[.94,.99]],[[.94,.01],[.06,.99]]],
  Y:[[[.04,.01],[.50,.51],[.96,.01]],[[.50,.51],[.50,1]]],Z:[[[.05,.02],[.95,.02],[.05,.98],[.95,.98]]],
  '?':[[[.10,.15],[.34,.02],[.65,.03],[.89,.21],[.82,.43],[.51,.60],[.47,.74]],[[.47,.96],[.49,.97]]],'.':[[[.47,.49],[.53,.51]]],',':[[[.68,.04],[.63,.59],[.20,.97]]]
 };
 const make=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
 const inverseEase=Array.from({length:2049},(_,i)=>{let a=0,b=1;for(let n=0;n<18;n++){const m=(a+b)/2;if(ease(m)<i/2048)a=m;else b=m;}return (a+b)/2;});
 const unEase=x=>inverseEase[Math.round(clamp(x)*2048)];
 function curved(points){
  if(points.length<3)return points;
  const result=[];
  for(let i=0;i<points.length-1;i++)for(let j=0;j<8;j++){
   const p0=points[Math.max(0,i-1)],p1=points[i],p2=points[i+1],p3=points[Math.min(points.length-1,i+2)],t=j/8;
   result.push([0,1].map(k=>.5*((2*p1[k])+(-p0[k]+p2[k])*t+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*t*t+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*t*t*t)));
  }
  result.push(points.at(-1));return result;
 }

 // Every nontransparent pixel is assigned a pen arrival time up front. Corners,
 // terminals and serifs belong to their nearest stroke: there is no late box fill.
 function create(unit){
  const style=getComputedStyle(unit.glyph),pad=58,w=Math.ceil(unit.glyph.offsetWidth+pad*2),h=Math.ceil(unit.glyph.offsetHeight+pad*2);
  const make=()=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
  const source=make(),q=source.getContext('2d',{willReadFrequently:true}),font=`${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  q.font=font;q.textBaseline='alphabetic';q.fontKerning='normal';if('letterSpacing'in q)q.letterSpacing=style.letterSpacing;
  const text=unit.glyph.textContent,m=q.measureText(text),size=parseFloat(style.fontSize),ascent=m.fontBoundingBoxAscent||size*.8,descent=m.fontBoundingBoxDescent||size*.2,baseline=pad+(unit.glyph.offsetHeight-ascent-descent)/2+ascent;
  q.fillStyle='#fff';q.fillText(text,pad,baseline);
  const letters=[...text].map((char,j)=>{const m=q.measureText(char),advance=q.measureText(text.slice(0,j+1)).width-m.width;return {char,paths:pen[char]||pen[char.toLowerCase()]||pen.o,box:{x:pad+advance-m.actualBoundingBoxLeft,y:baseline-m.actualBoundingBoxAscent,w:Math.max(2,m.actualBoundingBoxLeft+m.actualBoundingBoxRight),h:Math.max(2,m.actualBoundingBoxAscent+m.actualBoundingBoxDescent)}};});
  const strokes=[];let clock=0;
  for(const l of letters){l.strokes=[];for(const path of l.paths){
   const pts=curved(path.map(v=>[l.box.x+v[0]*l.box.w,l.box.y+v[1]*l.box.h])),lens=pts.slice(1).map((v,j)=>Math.hypot(v[0]-pts[j][0],v[1]-pts[j][1])),length=lens.reduce((a,b)=>a+b,0),duration=.42+Math.sqrt(length/size);
   const timeLens=lens.map((len,j)=>{const a=pts[Math.max(0,j-1)],b=pts[j+1],c=pts[Math.min(pts.length-1,j+2)],u=[b[0]-a[0],b[1]-a[1]],v=[c[0]-b[0],c[1]-b[1]],bend=1-(u[0]*v[0]+u[1]*v[1])/(Math.hypot(...u)*Math.hypot(...v)||1);return len*(1+Math.max(0,bend)*1.5);});
   const travel=timeLens.reduce((a,b)=>a+b,0),stroke={pts,lens,length,timeLens,travel,start:clock,duration};strokes.push(stroke);l.strokes.push(stroke);clock+=duration+.24;
  }clock+=.18;}
  // Allocate time by actual travel, including pen-up distance. Equal tiny
  // pauses between all strokes made the nib teleport across a wide letter.
  clock=0;
  strokes.forEach((st,i)=>{const next=strokes[i+1],gap=next?Math.hypot(next.pts[0][0]-st.pts.at(-1)[0],next.pts[0][1]-st.pts.at(-1)[1]):0;st.start=clock;st.duration=.18+st.travel/size;clock+=st.duration+(next ? .12+gap/size*.75 : 0);});
  const span=clock||1;for(const st of strokes){st.start=.025+st.start/span*.90;st.duration=st.duration/span*.90;}
  const data=q.getImageData(0,0,w,h),indices=[],alpha=[],arrival=[];let alphaSum=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const index=(y*w+x)*4,a=data.data[index+3];if(!a)continue;
   let chosen=letters[0],distance=Infinity;
   for(const l of letters){const dx=Math.max(l.box.x-x,0,x-(l.box.x+l.box.w));if(dx<distance){distance=dx;chosen=l;}}
   let best=Infinity,at=0;
   for(const st of chosen.strokes){let length=0;for(let j=0;j<st.lens.length;j++){
    const a=st.pts[j],b=st.pts[j+1],dx=b[0]-a[0],dy=b[1]-a[1],u=clamp(((x+.5-a[0])*dx+(y+.5-a[1])*dy)/(dx*dx+dy*dy||1)),d=(x+.5-a[0]-dx*u)**2+(y+.5-a[1]-dy*u)**2;
    if(d<best){best=d;at=st.start+st.duration*unEase((length+st.timeLens[j]*u)/(st.travel||1));}length+=st.timeLens[j];
   }}
   indices.push(index);alpha.push(a);arrival.push(at);alphaSum+=a;
  }
  const c=make();c.className='title-ink';c.setAttribute('aria-hidden','true');Object.assign(c.style,{left:unit.glyph.offsetLeft-pad+'px',top:unit.glyph.offsetTop-pad+'px',width:w+'px',height:h+'px'});unit.word.appendChild(c);
  const ctx=c.getContext('2d',{willReadFrequently:true});
  return {canvas:c,ctx,source,letters,strokes,strokeCount:strokes.length,travelWeight:span,font,fontSize:size,pad,baseline,w,h,indices:new Uint32Array(indices),alpha:new Uint8Array(alpha),arrival:new Float32Array(arrival),pixels:ctx.createImageData(w,h),alphaSum,complete:.98,colour:null};
 }
 function tip(p,t){
  let st=p.strokes[0];for(const candidate of p.strokes){if(t>=candidate.start)st=candidate;else break;}
  const next=p.strokes[p.strokes.indexOf(st)+1];
  if(next&&t>st.start+st.duration){const a=st.pts.at(-1),b=next.pts[0],u=ease((t-st.start-st.duration)/(next.start-st.start-st.duration)),rise=Math.min(18,5+Math.hypot(b[0]-a[0],b[1]-a[1])*.18);return {x:a[0]+(b[0]-a[0])*u-p.pad,y:a[1]+(b[1]-a[1])*u-Math.sin(Math.PI*u)*rise-p.pad,angle:Math.atan2(b[1]-a[1],b[0]-a[0]),pressure:.35,writing:false};}
  const progress=clamp((t-st.start)/st.duration);let left=ease(progress)*st.travel;
  for(let j=0;j<st.timeLens.length;j++){if(left<=st.timeLens[j]||j===st.timeLens.length-1){const u=clamp(left/(st.timeLens[j]||1)),a=st.pts[j],b=st.pts[j+1];return {x:a[0]+(b[0]-a[0])*u-p.pad,y:a[1]+(b[1]-a[1])*u-p.pad,angle:Math.atan2(b[1]-a[1],b[0]-a[0]),pressure:.55+.45*Math.sin(Math.PI*progress),writing:t>=st.start&&t<=st.start+st.duration};}left-=st.timeLens[j];}
  return {x:0,y:0,writing:false};
 }
 function sample(p,t,colour){
  const {ctx,pixels}=p;if(p.colour!==colour){ctx.fillStyle=colour;ctx.fillRect(0,0,1,1);const rgb=ctx.getImageData(0,0,1,1).data;for(const index of p.indices){pixels.data[index]=rgb[0];pixels.data[index+1]=rgb[1];pixels.data[index+2]=rgb[2];}p.colour=colour;}
  let sum=0;for(let j=0;j<p.indices.length;j++){const a=Math.round(p.alpha[j]*ease((t-p.arrival[j])/.045));pixels.data[p.indices[j]+3]=a;sum+=a;}
  ctx.putImageData(pixels,0,0);p.coverage=sum/p.alphaSum;p.canvas.style.opacity='1';p.canvas.style.visibility='visible';p.tip=tip(p,t);return p.tip;
 }
 function audit(p){sample(p,p.complete,'#183e40');let holes=0;for(let j=0;j<p.indices.length;j++)if(p.pixels.data[p.indices[j]+3]!==p.alpha[j])holes++;return {pixels:p.indices.length,holes,coverage:p.coverage,complete:p.complete,pass:holes===0};}
 return {create,sample,tip,audit};
})();
