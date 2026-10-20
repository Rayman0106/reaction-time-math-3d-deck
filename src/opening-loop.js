/* The opening UI retains a real three-step loop. Its cue, response and return
 * all use the monitor/mouse clock; no CSS animation or accumulating timers. */
window.ReactionLoop=(()=>{
 'use strict';
 const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10);},phase=(t,a,b)=>ease((t-a)/(b-a)),mix=(a,b,p)=>a+(b-a)*p;
 const track='M96 88H544C592 88 612 108 612 132C612 156 592 180 544 180H96C48 180 28 156 28 132C28 108 48 88 96 88';
 const points=[[96,88],[544,88]];
 const curve=(a,b,c,d)=>{for(let i=1;i<=96;i++){const t=i/96,q=1-t;points.push([q*q*q*a[0]+3*q*q*t*b[0]+3*q*t*t*c[0]+t*t*t*d[0],q*q*q*a[1]+3*q*q*t*b[1]+3*q*t*t*c[1]+t*t*t*d[1]]);}};
 curve([544,88],[592,88],[612,108],[612,132]);curve([612,132],[612,156],[592,180],[544,180]);points.push([96,180]);curve([96,180],[48,180],[28,156],[28,132]);curve([28,132],[28,108],[48,88],[96,88]);
 const distances=[0];for(let i=1;i<points.length;i++)distances.push(distances[i-1]+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]));
 const length=distances.at(-1),greenDistance=224,clickDistance=448;
 function at(distance){distance=Math.max(0,Math.min(length,distance));let i=1;while(i<distances.length-1&&distances[i]<distance)i++;const p=(distance-distances[i-1])/(distances[i]-distances[i-1]);return points[i].map((v,j)=>mix(points[i-1][j],v,p));}
 function sample(seconds){
  const t=Math.max(0,Number(seconds)||0),P=window.ReactionPractice,s=P.sample(t),local=t-(s.attempt-1)*P.cycle,wait=P.waits[s.attempt-1],click=wait+P.examples[s.attempt-1]/1000;
  if(s.complete)return {complete:true,phase:s.phase,progress:1,point:at(length),energy:[.28,.45,.35],pulse:0,beadAlpha:0,status:'One simple task. A new question.'};
  const fade=phase(local,P.cycle-.26,P.cycle),waitOut=phase(local,wait,wait+.13),response=phase(local,click,click+.18);
  const energy=[(1-waitOut)+fade,waitOut*(1-response),response*(1-fade)];
  const distance=local<wait?mix(0,greenDistance,phase(local,.08,wait)):local<click?mix(greenDistance,clickDistance,phase(local,wait,click)):local<click+.36?clickDistance:mix(clickDistance,length,phase(local,click+.36,P.cycle));
  const pulse=s.phase==='WAIT'?.10+.07*(.5+.5*Math.sin(local*3.8)):s.phase==='GREEN'?.42:.20*(1-phase(local,click+.18,click+.68));
  return {complete:false,phase:s.phase,progress:distance/length,point:at(distance),energy,pulse,beadAlpha:.9,status:'Watch the cue. Click. Repeat.'};
 }
 const icons=[
  '<circle r="10.5"/><path d="M0-6V0L5 3"/><path d="M-2-15H2M-15-2V2M-2 15H2M15-2V2" opacity=".4"/>',
  '<circle r="8"/><circle r="3" fill="currentColor" stroke="none"/><path d="M0-16V-13M0 13V16M-16 0H-13M13 0H16M-11-11L-9-9M9 9L11 11M11-11L9-9M-9 9L-11 11"/>',
  '<path d="M-8-13V11L-2 5L3 16L8 13L3 3H13Z" stroke-linejoin="round"/>'
 ];
 function markup(){return `<svg class="reaction-loop-ui" data-reaction-loop="1" viewBox="0 0 640 226" role="img" aria-label="Reaction loop: wait for green, respond, then repeat the same task" xmlns="http://www.w3.org/2000/svg">
 <defs>
  <linearGradient id="reaction-loop-panel" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#18333e" stop-opacity=".86"/><stop offset="1" stop-color="#0a1d26" stop-opacity=".94"/></linearGradient>
  <linearGradient id="reaction-loop-rim" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#b0d9dc" stop-opacity=".30"/><stop offset=".5" stop-color="#608d9d" stop-opacity=".12"/><stop offset="1" stop-color="#a4c0c9" stop-opacity=".19"/></linearGradient>
  <linearGradient id="reaction-loop-node" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#213e49"/><stop offset="1" stop-color="#102833"/></linearGradient>
  <radialGradient id="reaction-loop-aura"><stop stop-color="#a8edcd" stop-opacity=".34"/><stop offset=".45" stop-color="#a8edcd" stop-opacity=".13"/><stop offset="1" stop-color="#a8edcd" stop-opacity="0"/></radialGradient>
 </defs>
 <rect x=".5" y=".5" width="639" height="225" rx="24" fill="url(#reaction-loop-panel)" stroke="url(#reaction-loop-rim)"/>
 <path d="M25 1H615" stroke="#b3d7dc" stroke-opacity=".12"/>
 <text x="31" y="29" fill="#96b6c1" font-family="Manrope,Arial,sans-serif" font-weight="500" font-size="10.5" letter-spacing="2.1">THE REACTION LOOP</text>
 <text x="609" y="29" text-anchor="end" fill="#7696a2" font-family="Manrope,Arial,sans-serif" font-size="11">Same task. Another try.</text>
 <g fill="none" stroke-linecap="round" stroke-linejoin="round">
  <path d="${track}" stroke="#07161e" stroke-width="4"/>
  <path d="${track}" stroke="#42606c" stroke-opacity=".65" stroke-width="1.2"/>
  <path data-loop-trail="1" d="${track}" stroke="#a1dfc3" stroke-width="5" stroke-opacity=".11" stroke-dasharray="${length*.065} ${length*.935}"/>
  <path data-loop-run="1" d="${track}" stroke="#b5e7d0" stroke-width="1.7" stroke-dasharray="${length*.065} ${length*.935}"/>
  <path d="M202 85L206 88L202 91M426 85L430 88L426 91M326 177L322 180L326 183M314 177L310 180L314 183" stroke="#789aa3" stroke-width="1.3" stroke-opacity=".55"/>
 </g>
 <g data-loop-bead="1" transform="translate(96 88)"><circle r="12" fill="url(#reaction-loop-aura)"/><circle r="3.2" fill="#d2f4e1"/></g>
 ${['Wait','Green','Respond'].map((label,j)=>`<g data-practice-step="${['wait','green','click'][j]}" transform="translate(${96+j*224} 88)" style="color:#8da9b4">
  <circle data-loop-glow="1" r="44" fill="url(#reaction-loop-aura)" opacity="0"/>
  <circle r="29" fill="#091b24" stroke="#42606c" stroke-opacity=".38"/>
  <circle r="25" fill="url(#reaction-loop-node)" stroke="url(#reaction-loop-rim)"/>
  <circle data-loop-ring="1" r="29" fill="none" stroke="currentColor" stroke-width="1.3" opacity="0"/>
  <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${icons[j]}</g>
  <text y="55" text-anchor="middle" fill="currentColor" font-family="Manrope,Arial,sans-serif" font-size="20" font-weight="500">${label}</text>
 </g>`).join('')}
 <text data-practice-status="1" x="320" y="207" text-anchor="middle" fill="#9cb8c2" font-family="Manrope,Arial,sans-serif" font-size="13.5">Watch the cue. Click. Repeat.</text>
 </svg>`;}
 function paint(root,seconds){if(!root)return;const s=sample(seconds),nodes=[...root.querySelectorAll('[data-practice-step]')];
  nodes.forEach((n,j)=>{const e=clamp(s.energy[j]),base=[122,153,166],lit=j===1?[169,245,202]:[218,237,233];n.style.color=`rgb(${base.map((v,k)=>Math.round(mix(v,lit[k],e))).join(',')})`;n.dataset.active=String(!s.complete&&s.phase===['WAIT','GREEN','CLICK'][j]);
   const glow=n.querySelector('[data-loop-glow]'),ring=n.querySelector('[data-loop-ring]');if(glow)glow.style.opacity=String(.12+e*(.45+s.pulse));if(ring)ring.style.opacity=String(.08+e*.62);
  });
  for(const p of root.querySelectorAll('[data-loop-run],[data-loop-trail]')){p.style.strokeDashoffset=String((.065-s.progress)*length);p.style.opacity=String(s.beadAlpha);}
  const bead=root.querySelector('[data-loop-bead]');if(bead){bead.setAttribute('transform',`translate(${s.point[0]} ${s.point[1]})`);bead.style.opacity=String(s.beadAlpha);}
  const status=root.querySelector('[data-practice-status]');if(status)status.textContent=s.status;
  root.dataset.loopPhase=s.phase;
 }
 return Object.freeze({markup,sample,paint,track,length,at});
})();
