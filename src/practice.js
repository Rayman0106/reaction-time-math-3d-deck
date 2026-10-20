/* Fixed animation examples, never participant measurements. One clock controls
 * the illustrated mouse, monitor and presentation caption. */
window.ReactionPractice = (() => {
  'use strict';
  const examples=Object.freeze([248,231,267,219,243]);
  const waits=Object.freeze([1.18,1.56,.98,1.38,1.24]);
  const cycle=3.1,duration=18,clamp=x=>Math.max(0,Math.min(1,x));
  function sample(seconds) {
    const time=Math.max(0,Number(seconds)||0),attempt=Math.min(4,Math.floor(time/cycle));
    const local=time-attempt*cycle,clickAt=waits[attempt]+examples[attempt]/1000;
    const complete=time>=cycle*5;
    const phase=complete?'COMPLETE':local<waits[attempt]?'WAIT':local<clickAt?'GREEN':'CLICK';
    const clicked=phase==='CLICK'||complete,pressTime=local-clickAt;
    const press=pressTime>=-.025&&pressTime<=.225?Math.sin(clamp((pressTime+.025)/.25)*Math.PI)**2:0;
    return {phase,attempt:attempt+1,checks:attempt+Number(clicked),result:examples[attempt],press,
      clickAge:clicked?Math.min(.45,Math.max(0,pressTime)):-1,complete};
  }
  function paint(q,st){
    const waiting=st.phase==='WAIT',ready=st.phase==='GREEN',result=!waiting&&!ready;
    const ink='#213b49',muted='#71818d',blue='#356f9f',panel=waiting?'#b74b58':ready?'#68c69a':blue;
    const round=(x,y,w,h,r,fill)=>{q.beginPath();q.roundRect(x,y,w,h,r);q.fillStyle=fill;q.fill();};
    q.fillStyle='#f7f9fb';q.fillRect(0,0,1024,600);
    q.fillStyle='#e5eaf0';q.fillRect(0,0,1024,38);
    ['#d68e90','#d9bc7b','#90b8a2'].forEach((color,j)=>{q.beginPath();q.arc(24+j*19,19,5,0,Math.PI*2);q.fillStyle=color;q.fill();});
    round(99,5,237,33,9,'#f7f9fb');
    q.textAlign='left';q.font='500 15px Manrope, sans-serif';q.fillStyle=ink;q.fillText('Reaction Lab',122,27);
    q.fillStyle='#71818d';q.font='13px Manrope, sans-serif';q.fillText('Visual response test',378,25);
    q.fillStyle=ink;q.font='700 28px Manrope, sans-serif';q.fillText('Reaction Lab',28,84);
    q.textAlign='right';q.fillStyle=muted;q.font='16px Manrope, sans-serif';q.fillText('Visual reaction time',994,82);
    round(24,111,976,352,16,panel);
    q.textAlign='center';q.fillStyle=ready?'#173f32':'#ffffff';
    if(result){
      q.font='500 22px Manrope, sans-serif';q.fillText('Your reaction time',512,202);
      q.font='600 112px Manrope, sans-serif';q.fillText(String(st.result||examples[4])+' ms',512,317);
      round(353,350,318,49,25,'#ffffff');q.fillStyle=blue;q.font='600 19px Manrope, sans-serif';
      q.fillText(st.phase==='COMPLETE'?'Five attempts complete':'Click to try again',512,382);
    }else{
      q.strokeStyle=ready?'#173f32':'#ffffff';q.lineWidth=4;q.beginPath();q.arc(512,190,25,0,Math.PI*2);q.stroke();
      q.beginPath();q.moveTo(512,173);q.lineTo(512,191);q.lineTo(526,199);q.stroke();
      q.font='600 66px Manrope, sans-serif';q.fillText(waiting?'Wait for green':'Click!',512,302);
      q.font='21px Manrope, sans-serif';q.fillText(waiting?'When the colour changes, click as fast as you can.':'Now — respond to the visual cue.',512,355);
    }
    // The cursor and finger press are driven by the same finite timeline.
    q.save();q.translate(710,382);q.beginPath();q.moveTo(0,0);q.lineTo(0,31);q.lineTo(8,24);q.lineTo(15,38);q.lineTo(22,34);q.lineTo(15,21);q.lineTo(26,20);q.closePath();
    q.fillStyle='#ffffff';q.fill();q.strokeStyle='#244158';q.lineWidth=2;q.stroke();q.restore();
    if(result&&st.clickAge>=0&&st.clickAge<.45){q.beginPath();q.arc(712,384,10+st.clickAge*70,0,Math.PI*2);q.strokeStyle='rgba(255,255,255,'+(1-st.clickAge/.45)*.65+')';q.lineWidth=3;q.stroke();}
    q.textAlign='left';q.fillStyle=muted;q.font='15px Manrope, sans-serif';q.fillText('Recent',28,518);q.fillText('attempts',28,541);
    for(let j=0;j<5;j++){
      const x=160+j*165,done=j<st.checks;round(x,486,151,69,10,done?'#e7eef5':'#edf1f5');
      q.fillStyle=muted;q.font='13px Manrope, sans-serif';q.fillText('Attempt '+(j+1),x+14,507);
      q.fillStyle=done?ink:'#a3afb8';q.font='600 24px Manrope, sans-serif';q.fillText(done?examples[j]+' ms':'—',x+14,538);
    }
    q.textAlign='center';q.fillStyle=muted;q.font='15px Manrope, sans-serif';q.fillText('Animated demonstration · example timings, not study data',512,583);
  }
  return Object.freeze({examples,waits,cycle,duration,sample,paint});
})();
