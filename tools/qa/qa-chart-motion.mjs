// Motion geometry and replay QA. Source pixels and original table values are
// preserved; a separate real-browser pass verifies rendering and layout.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('../../',import.meta.url),ctx=vm.createContext({window:{}});
for(const f of ['src/charts.js','src/motion.js'])vm.runInContext(fs.readFileSync(new URL(f,root),'utf8'),ctx);
const {DeckCharts:C,DeckMotion:M}=ctx.window;
class Node {
 constructor(tag,attrs){this.tag=tag;this.attributes={...attrs};this.style={};this.dataset={};this.classList={toggle(){}};for(const [k,v] of Object.entries(attrs))if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=v;}
 setAttribute(k,v){this.attributes[k]=String(v);}removeAttribute(k){delete this.attributes[k];}querySelectorAll(){return [];}
}
function section(html){const nodes=[...html.matchAll(/<(\w+)([^>]*?)>/g)].map(m=>{const attrs=Object.fromEntries([...m[2].matchAll(/([\w-]+)="([^"]*)"/g)].map(a=>[a[1],a[2]]));return new Node(m[1],attrs);});return {nodes,querySelectorAll(selector){if(selector.includes(','))return selector.split(',').flatMap(s=>this.querySelectorAll(s));if(selector[0]==='['){const k=selector.slice(1,-1);return nodes.filter(n=>k in n.attributes);}if(selector[0]==='.')return nodes.filter(n=>(n.attributes.class||'').split(' ').includes(selector.slice(1)));return [];}};}
const cases=[[5,M.histogram('source.png')],[6,M.cumulative('source.png')],[7,C.boxplot()],[8,C.paired()],[9,C.meanMedian()],[10,C.sensitivity()]];
const results=[];
for(const [index,html] of cases){
 const s=section(html),state=()=>JSON.stringify(s.nodes.map(n=>({a:n.attributes,s:n.style})));
 M.sample(s,index,0);const initial=state();
 M.sample(s,index,M.duration(index)/2);const middle=state();
 M.sample(s,index,M.duration(index));const final=state();assert.notEqual(initial,final);assert.notEqual(middle,final);
 M.sample(s,index,.23);M.sample(s,index,M.duration(index));assert.equal(state(),final,'Replay must end identically');
 M.sample(s,index,M.duration(index)+20);assert.equal(state(),final,'Finished charts must hold');
 if(index===5){assert.equal(s.querySelectorAll('[data-bar]').length,17);for(const b of s.querySelectorAll('[data-bar-clip]'))assert.equal(Number(b.attributes.height),Number(b.dataset.height));assert(!s.querySelectorAll('[data-hist-base]')[0].attributes.mask);assert(s.querySelectorAll('[data-bar]').every(n=>n.style.opacity==='0'));}
 if(index===6){assert.equal(Number(s.querySelectorAll('[data-curve-clip]')[0].attributes.width),1447);assert(!s.querySelectorAll('[data-curve-base]')[0].attributes.mask);}
 if(index===7){
  assert.equal(s.querySelectorAll('[data-box-series]').length,2);
  assert(s.querySelectorAll('[data-box-series]').every(n=>!n.attributes.transform),'Series must never scale as a group');
  for(const b of s.querySelectorAll('[data-box-body]')){assert.equal(Number(b.attributes.x),Number(b.dataset.left));assert.equal(Number(b.attributes.width),Number(b.dataset.right)-Number(b.dataset.left));}
  for(const w of s.querySelectorAll('[data-box-whisker]'))assert.equal(Number(w.attributes[w.dataset.boxWhisker==='left'?'x1':'x2']),Number(w.dataset.outer));
  M.sample(s,index,.65);assert(s.querySelectorAll('[data-box-median]').some(n=>Number(n.style.opacity)>0));assert(s.querySelectorAll('[data-box-body]').every(n=>Number(n.attributes.width)===0));
  M.sample(s,index,2);assert(s.querySelectorAll('[data-box-body]').some(n=>Number(n.attributes.width)>0));assert(s.querySelectorAll('[data-box-cap]').every(n=>Number(n.style.opacity)===0));
  M.sample(s,index,M.duration(index));assert.equal(state(),final);
 }

 if(index===8){const lines=s.querySelectorAll('[data-paired-line]'),dots=s.querySelectorAll('[data-paired-dot]');assert.equal(lines.length,30);assert.equal(dots.length,30);for(const l of lines)assert.equal(Number(l.attributes.x2),Number(l.dataset.target));for(const d of dots)assert.equal(Number(d.attributes.cx),Number(d.dataset.target));}
 if(index===9){const dots=s.querySelectorAll('[data-dot]');assert.equal(dots.length,30);for(const d of dots){assert.equal(Number(d.attributes.cx),Number(d.dataset.x));assert.equal(Number(d.attributes.cy),Number(d.dataset.y));}assert.equal(s.querySelectorAll('[data-mean-marker]')[0].style.opacity,'1');}
 if(index===10){const dot=s.querySelectorAll('[data-restored-mean]')[0],line=s.querySelectorAll('[data-restored-line]')[0];assert(dot&&line);assert.equal(Number(dot.attributes.cx),Number(dot.dataset.target));const positions=[];for(let j=0;j<=120;j++){M.sample(s,index,j/20);positions.push(Number(dot.attributes.cx));}assert(positions.every((x,j)=>j===0||x>=positions[j-1]));assert(positions[0]<Number(line.attributes.x1)&&positions.at(-1)>Number(line.attributes.x1),'Restored comparison must cross the unchanged quiet reference');}
 results.push({slide:index+1,initialMidFinalDistinct:true,deterministicReplay:true,finalGeometryPreserved:true});
}
const result={pass:true,results};fs.writeFileSync(new URL('tools/qa/qa-chart-motion-results.json',root),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
