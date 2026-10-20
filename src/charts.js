/* Figures reconstructed only from the report's published summary tables.
   Paired differences are preserved as reported, rather than recalculated from
   rounded participant means. The sensitivity calculation is approximate. */
(function () {
  'use strict';
  const Q = '#75b6dc', C = '#efad6d', INK = '#19343c', MUTED = '#657274', GRID = '#d7ddda';
  const rows = [
    ['P01',188.3,199.8,11.5],['P02',213.0,222.6,9.6],['P03',205.7,238.7,33.0],
    ['P04',245.9,207.6,-38.3],['P05',344.1,372.6,28.6],['P06',211.5,217.5,5.9],
    ['P07',243.3,243.4,0.1],['P08',323.5,369.4,45.8],['P09',272.8,250.5,-22.3],
    ['P10',378.6,340.9,-37.7],['P11',254.3,265.7,11.4],['P12',211.6,219.0,7.4],
    ['P13',306.9,266.4,-40.5],['P14',466.3,327.7,-138.7],['P15',318.5,215.9,-102.6],
    ['P16',349.0,330.7,-18.2],['P17',206.7,210.1,3.4],['P18',211.1,263.0,51.9],
    ['P19',166.2,172.4,6.2],['P20',195.7,223.3,27.6],['P21',289.7,203.6,-86.1],
    ['P22',190.8,200.5,9.7],['P23',213.0,236.0,23.1],['P24',323.8,374.1,50.3],
    ['P25',233.5,223.1,-10.4],['P26',355.6,355.7,0.1],['P27',230.0,240.2,10.2],
    ['P28',299.8,209.9,-89.9],['P29',174.2,196.9,22.7],['P30',230.8,219.3,-11.4]
  ];
  const stats = [
    ['Retained trials (n)','150','148'], ['Minimum','154.3','151.4'],
    ['First quartile (Q1)','196.6','202.4'], ['Median','233.1','226.0'],
    ['Third quartile (Q3)','283.4','260.7'], ['Maximum','712.0','501.4'],
    ['Mean','261.8','253.0'], ['Range','557.7','350.0'],
    ['Interquartile range','86.8','58.3'], ['Sample standard deviation','102.5','80.9']
  ];
  const signed = n => (n < 0 ? '−' : '+') + Math.abs(n).toFixed(1);
  const text = (x,y,s,size=22,fill=INK,anchor='start',extra='') => `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="${anchor}" ${extra}>${s}</text>`;
  const line = (x1,y1,x2,y2,color=GRID,width=1,extra='') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" ${extra}/>`;
  const svg = (name,h,inner,description,w=1000) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${name}" style="display:block;overflow:visible;font-family:Manrope,Arial,sans-serif"><title>${name}</title><desc>${description || name}</desc>${inner}</svg>`;

  function boxplot() {
    const sx = v => 176 + (v-150)/600*764;
    let s='';
    for(let t=150;t<=750;t+=100) {
      s += line(sx(t),35,sx(t),230,GRID,1) + text(sx(t),258,t,22,MUTED,'middle');
    }
    [
      {name:'Quiet',v:[154.3,196.6,233.1,283.4,712.0],y:80,c:Q},
      {name:'Conversation',v:[151.4,202.4,226.0,260.7,501.4],y:185,c:C}
    ].forEach((d,j)=>{
      const [min,q1,med,q3,max]=d.v, y=d.y;
      s += text(0,y+8,d.name,25,INK,'start','font-weight="700"');
      s += `<g data-box-series="${j}" data-origin="${sx(med)}">`;
      s += line(sx(min),y,sx(q1),y,INK,2.6,`data-box-whisker="left" data-series="${j}" data-inner="${sx(q1)}" data-outer="${sx(min)}"`);
      s += line(sx(q3),y,sx(max),y,INK,2.6,`data-box-whisker="right" data-series="${j}" data-inner="${sx(q3)}" data-outer="${sx(max)}"`);
      for(const value of [min,max])s += line(sx(value),y-18,sx(value),y+18,INK,2.6,`data-box-cap="1" data-series="${j}" data-center="${y}"`);
      s += `<rect data-box-body="${j}" data-median="${sx(med)}" data-left="${sx(q1)}" data-right="${sx(q3)}" x="${sx(q1)}" y="${y-22}" width="${sx(q3)-sx(q1)}" height="44" fill="${d.c}" stroke="${INK}" stroke-width="2" rx="1"/>`;
      s += line(sx(med),y-22,sx(med),y+22,INK,3.5,`data-box-median="${j}" data-center="${y}"`);
      s += `</g><g data-box-label="${j}">`+text(sx(med),y-30,`Median ${med.toFixed(1)}`,22,INK,'middle','font-weight="700"')+`</g>`;
    });
    s += line(sx(150),230,sx(750),230,INK,1.5);
    s += text(558,285,'Reaction time (ms)',24,INK,'middle');
    return svg('Reaction time box plots: Quiet and Conversation',300,s,'Both boxes use a common 150 to 750 ms scale. Whiskers span minimum to maximum. Quiet: minimum 154.3, Q1 196.6, median 233.1, Q3 283.4, maximum 712.0 ms. Conversation: minimum 151.4, Q1 202.4, median 226.0, Q3 260.7, maximum 501.4 ms.');
  }

  function paired() {
    const sorted=rows.slice().sort((a,b)=>a[3]-b[3]);
    let s='';
    [0,1].forEach(panel=>{
      const ox=panel?820:0, sx=v=>ox+88+(v+150)/210*570;
      s += text(ox+8,29,panel?'RANKS 16–30':'RANKS 1–15',23,MUTED,'start','letter-spacing="1.2"');
      s += text(ox+760,29,'Δ ms',23,MUTED,'end');
      [-150,-100,-50,0,50].forEach(t=>{
        s += line(sx(t),50,sx(t),447,t===0?INK:GRID,t===0?2.5:1);
        s += text(sx(t),480,t<0?'−'+Math.abs(t):t>0?'+'+t:'0',24,t===0?INK:MUTED,'middle');
      });
      sorted.slice(panel*15,panel*15+15).forEach((d,i)=>{
        const y=76+i*25, color=d[3]<0?Q:C;
        s += text(ox+5,y+7,d[0],23,INK);
        s += line(sx(0),y,sx(d[3]),y,color,9,`stroke-linecap="round" data-paired-line="1" data-zero="${sx(0)}" data-target="${sx(d[3])}" data-rank="${panel*15+i}"`);
        s += `<circle cx="${sx(d[3])}" cy="${y}" r="4.5" fill="${INK}" data-paired-dot="1" data-zero="${sx(0)}" data-target="${sx(d[3])}" data-rank="${panel*15+i}" data-panel="${panel}" data-particle-color="${color}"/>`;
        s += `<g data-paired-value="1" data-rank="${panel*15+i}">`+text(ox+760,y+7,signed(d[3]),23,INK,'end','font-variant-numeric="tabular-nums"')+'</g>';
      });
      s += text(ox+245,517,'← faster',25,INK,'middle') + text(ox+607,517,'slower →',25,INK,'middle');
    });
    s += text(800,559,'Difference = Conversation mean − Quiet mean · same scale in both panels',25,MUTED,'middle');
    return svg('Ranked paired differences for all 30 participants',570,s,'All 30 reported differences, ranked from −138.7 to +51.9 ms across two panels with identical scales. Eleven negative differences mean faster with conversation; nineteen positive differences mean slower.',1600);
  }

  function meanMedian() {
    const sx=v=>110+(v+150)/210*1340;
    const sorted=rows.slice().sort((a,b)=>a[3]-b[3]);
    const lanes=[]; let s='';
    [-150,-100,-50,0,50].forEach(t=>{
      s += line(sx(t),120,sx(t),280,t===0?INK:GRID,t===0?2:1);
      s += text(sx(t),316,t<0?'−'+Math.abs(t):t>0?'+'+t:'0',28,MUTED,'middle');
    });
    sorted.forEach((d,j)=>{
      const x=sx(d[3]);
      let lane=0;
      while(lanes[lane]!==undefined && x-lanes[lane]<29) lane++;
      lanes[lane]=x;
      const y=253-lane*28;
      s+=`<circle data-dot="${j}" data-x="${x}" data-y="${y}" data-zero="${sx(0)}" cx="${x}" cy="${y}" r="12" fill="${d[3]<0?Q:C}" stroke="${INK}" stroke-width="1.5"><title>${d[0]}: ${signed(d[3])} ms</title></circle>`;
      if(d[0]==='P14'){
        s += '<g data-outlier-label="1">';
        s += line(x,y-15,x,192,INK,1.5);
        s += text(x+22,164,'P14',30,INK,'start','font-weight="700"');
        s += text(x+22,199,'−138.7 ms',29,INK)+'</g>'; 
      }
    });
    const xm=sx(-7.9), xmed=sx(6.1);
    s += '<g data-mean-marker="1">';
    s += line(xm,279,xm,50,INK,2,'stroke-dasharray="6 6"');
    s += line(xmed,279,xmed,91,INK,2,'stroke-dasharray="6 6"');
    s += line(xm,50,xm-170,50,INK,1.5);
    s += text(xm-184,44,'Mean −7.9 ms',32,INK,'end','font-weight="700" data-summary-kind="mean"');
    s += line(xmed,91,1540,91,INK,1.5);
    s += text(1540,81,'Median +6.1 ms',32,INK,'end','font-weight="700" data-summary-kind="median"');
    s += '</g>';
    s += line(110,280,1450,280,INK,1.5);
    s += text(800,356,'Paired difference (ms)',30,INK,'middle');
    s += text(800,392,'One dot = one participant · dots stack only to prevent overlap',24,MUTED,'middle');
    return svg('Paired difference dot plot with mean and median',400,s,'Thirty reported participant differences shown at their exact horizontal positions. Mean −7.9 ms, median +6.1 ms. P14 has a difference of −138.7 ms. Stacking is only for legibility, with no vertical data dimension.',1600);
  }

  function sensitivity() {
    const sx=v=>460+(v-240)/45*1020;
    let s='';
    [240,250,260,270,280].forEach(t=>s+=line(sx(t),50,sx(t),270,GRID,1)+text(sx(t),306,t,27,MUTED,'middle'));
    s+=line(sx(261.8),45,sx(261.8),270,Q,3,'stroke-dasharray="7 6"');
    s+=text(sx(261.8),30,'Quiet 261.8',30,INK,'middle','font-weight="700"');
    const list=[{y:112,label:'Restricted: 100–1000 ms',v:253.0,value:'253.0 ms',n:'148 conversation trials'}, {y:225,label:'Full: both trials restored',v:276.3193,value:'≈276.3 ms',n:'150 trials · approximate'}];
    list.forEach((d,j)=>{
      s+=text(0,d.y-2,d.label,30,INK,'start',`font-weight="700" ${j?'data-restored-case="1"':''}`);
      s+=text(0,d.y+33,d.n,26,MUTED);
      s+=line(sx(261.8),d.y,sx(d.v),d.y,C,9,`stroke-linecap="round" ${j?'data-restored-line="1" data-start="'+sx(253)+'" data-target="'+sx(d.v)+'"':''}`);
      s+=`<circle ${j?`data-restored-mean="1" data-start="${sx(253)}" data-target="${sx(d.v)}"`:""} cx="${sx(d.v)}" cy="${d.y}" r="12" fill="${C}" stroke="${INK}" stroke-width="2"/>`;
      s+=text(sx(d.v),d.y-28,d.value,32,INK,'middle',`font-weight="700" ${j?'data-restored-label="1"':''}`);
    });
    s+=line(sx(240),270,sx(285),270,INK,1.5);
    s+=text(970,350,'Mean reaction time (ms) · focused axis',29,INK,'middle');
    s+=text(800,399,'(148 × 253.0 + <tspan data-addend="0">2030.5</tspan> + <tspan data-addend="1">1973.4</tspan>) ÷ 150 ≈ 276.3 ms',30,INK,'middle');
    s+=text(800,441,'Approximation uses the rounded reported mean; no raw-trial distribution is inferred.',24,MUTED,'middle');
    return svg('Sensitivity of the pooled conversation mean to two excluded trials',450,s,'Quiet stays at 261.8 ms. Conversation is 253.0 ms with two long trials excluded, and approximately 276.3 ms when 2030.5 and 1973.4 ms are reinstated. The focused axis starts at 240 ms, and this is a position plot, not a zero-based bar chart.',1600);
  }

  const tableStyle='width:100%;border-collapse:collapse;color:#19343c;font-family:Manrope,Arial,sans-serif;font-variant-numeric:tabular-nums';
  const cellStyle='border-bottom:1px solid #d7ddda;padding:10px 18px;text-align:right';
  function pooledTable() {
    return `<div class="pooled-data-table"><table style="${tableStyle};font-size:22px"><thead><tr><th scope="col" style="${cellStyle};text-align:left;font-weight:700">Measure (ms except n)</th><th scope="col" style="${cellStyle};background:#75b6dc33">Quiet</th><th scope="col" style="${cellStyle};background:#efad6d33">Conversation</th></tr></thead><tbody>${stats.map(r=>`<tr><th scope="row" style="${cellStyle};text-align:left;font-weight:400">${r[0]}</th><td style="${cellStyle}">${r[1]}</td><td style="${cellStyle}">${r[2]}</td></tr>`).join('')}</tbody></table><p style="font-size:16px;color:#657274;margin:14px 18px 0">Quartiles: inclusive linear interpolation. SD: sample standard deviation (n − 1). Reported timings rounded to 0.1 ms.</p><div class="within-appendix"><div><strong>Estimated pooled within-participant SD</strong><span><b class="blue">83.1</b> / <b class="amber">61.9</b> ms · Quiet / Conversation</span></div><p>√(SSwithin / (n − 30)) · Quiet: √(827941.3 / 120) · Conversation: √(452476.3 / 118)<br>From rounded report summaries; restricted data only. Not the average of participants’ SDs.</p></div></div>`;
  }

  function participantTable() {
    const half = data=>`<table style="${tableStyle};font-size:17px"><thead><tr>${['ID','Quiet','Conversation','Δ'].map((x,i)=>`<th scope="col" style="${cellStyle};padding:8px 10px;${i===0?'text-align:left;':''}${i===1?'background:#75b6dc33;':i===2?'background:#efad6d33;':''}">${x}</th>`).join('')}</tr></thead><tbody>${data.map(r=>`<tr><th scope="row" style="${cellStyle};padding:7px 10px;text-align:left;font-weight:400">${r[0]}${r[0]==='P08'||r[0]==='P11'?'*':''}</th>${r.slice(1).map((v,i)=>`<td style="${cellStyle};padding:7px 10px;${i===2?'font-weight:700;':''}">${i===2?signed(v):v.toFixed(1)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    return `<div class="participant-data-table"><div style="display:grid;grid-template-columns:1fr 1fr;gap:38px">${half(rows.slice(0,15))}${half(rows.slice(15))}</div><p style="font-family:Manrope,Arial,sans-serif;font-size:16px;color:#657274;margin:14px 10px 0">All values in ms. Δ = Conversation mean − Quiet mean. * P08 and P11: four retained conversation trials; all other condition totals: five. Differences are as reported and may differ by 0.1 ms from subtracting rounded displayed means.</p></div>`;
  }

  window.DeckCharts = {boxplot, paired, meanMedian, sensitivity, pooledTable, participantTable};
})();
