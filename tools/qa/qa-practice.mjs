import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),context=vm.createContext({window:{}});
vm.runInContext(fs.readFileSync(path.join(base,'src/practice.js'),'utf8'),context);
const practice=context.window.ReactionPractice,checks=[];
const text=[];const q=new Proxy({fillText(value){text.push(String(value));}},{get:(o,key)=>o[key]??(()=>{})});
for(let j=0;j<practice.examples.length;j++){
  const greenAt=j*practice.cycle+practice.waits[j],clickAt=greenAt+practice.examples[j]/1000;
  assert.equal(practice.sample(greenAt-1e-6).phase,'WAIT');
  assert.equal(practice.sample(greenAt+1e-6).phase,'GREEN');
  assert.equal(practice.sample(clickAt-1e-6).phase,'GREEN');
  const result=practice.sample(clickAt+1e-6);assert.equal(result.phase,'CLICK');assert.equal(result.checks,j+1);assert(result.press>0);
  const labels=[];q.fillText=value=>labels.push(String(value));practice.paint(q,result);
  assert(labels.includes(practice.examples[j]+' ms'));
  assert(labels.some(label=>label.includes('not study data')));
  checks.push({attempt:j+1,greenAt,clickAt,shownMs:result.result,greenDurationMs:(clickAt-greenAt)*1000});
}
assert.equal(practice.sample(practice.duration).phase,'COMPLETE');
assert.equal(practice.sample(practice.duration).checks,5);
for(let frame=0;frame<=practice.duration*120;frame++){
  const state=practice.sample(frame/120);assert(Number.isFinite(state.press)&&state.press>=0&&state.press<=1);
  assert.equal(JSON.stringify(state),JSON.stringify(practice.sample(frame/120)));
}
const result={pass:true,scope:'Fixed illustration timings, cue-to-click agreement, displayed ms, source label and deterministic replay.',checks,sampledFrames:practice.duration*120+1};
fs.writeFileSync(path.join(base,'tools/qa/qa-practice-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
