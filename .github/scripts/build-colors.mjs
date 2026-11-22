import {readFile,writeFile} from 'node:fs/promises';

const root='assets/';
const names=['すべて','おこめ','ざらめ','はなめ','やまめ','するめ','うるめ','ぐるめ','にしめ','わあめ','からめ','かため','めめめ','わけわかめ'];
const isHex=value=>typeof value==='string'&&/^#[0-9a-fA-F]{6}$/.test(value);
const filename=root+'initial-colors.js';

// Only fetch the public API. Never publish admin data, passwords, or spreadsheet IDs.
async function refresh(){
 const config=await readFile(root+'config.js','utf8');
 const baseUrl=config.match(/gasUrl\s*:\s*['"]([^'"]+\/exec)['"]/i)?.[1];
 if(!baseUrl)throw new Error('The GAS URL was not found in assets/config.js');
 const url=new URL(baseUrl);
 url.searchParams.set('action','public');
 url.searchParams.set('t',String(Date.now()));
 const response=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(25000),headers:{Accept:'application/json'}});
 if(!response.ok)throw new Error('Public GAS request returned HTTP '+response.status);
 const json=await response.json();
 if(json.ok===false)throw new Error('Public GAS response returned an error');
 const source=json?.data?.colors??json?.colors;
 if(!source || typeof source!=='object' || Array.isArray(source))throw new Error('Public colors missing');
 const colors={};
 for(const name of names){
  const item=source[name];
  const first=typeof item==='string'?item:item?.first;
  const second=typeof item==='string'?item:(item?.second??item?.first);
  const mode=item?.mode==='gradient'?'gradient':'solid';
  if(!isHex(first)||!isHex(second))throw new Error('Invalid color for '+name);
  colors[name]={mode,first:first.toLowerCase(),second:second.toLowerCase()};
 }
 const payload={syncedAt:new Date().toISOString(),colors};
 await writeFile(filename,'/* Public colors only. This file is generated for GitHub Pages. */\nwindow.SITE_D_BOOTSTRAP_COLORS = '+JSON.stringify(payload)+';\n','utf8');
 console.log('Refreshed',names.length,'public colors.');
}
try{await refresh();}
catch(error){
 // Keep the last committed palette if GAS is temporarily unavailable.
 console.warn('Public colors could not be refreshed; retaining the last published colors:',error.message);
}
