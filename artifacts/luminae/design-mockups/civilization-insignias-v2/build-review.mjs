import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import sharp from 'sharp';

const root=path.dirname(fileURLToPath(import.meta.url));
const spec=JSON.parse(await fs.readFile(path.join(root,'prompts.json'),'utf8'));
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const wrap=(s,n=37)=>{const lines=[''];for(const word of s.split(' ')){let i=lines.length-1;if(lines[i].length+word.length+1>n){lines.push(word)}else{lines[i]+=(lines[i]?' ':'')+word}}return lines};
const assets=[];
for(const item of spec.items){
  const file=item.id+'.png';
  const buffer=await fs.readFile(path.join(root,file));
  const meta=await sharp(buffer).metadata();
  if(meta.format!=='png'||!meta.hasAlpha)throw new Error(file+' is not a transparent PNG');
  const {data,info}=await sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let clear=0, visible=0, minX=info.width,minY=info.height,maxX=-1,maxY=-1;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
    const alpha=data[(y*info.width+x)*info.channels+3];
    if(alpha===0)clear++;
    if(alpha>128){visible++;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}
  }
  if(clear===0||visible===0)throw new Error(file+' has no transparent background or no visible artwork');
  if(minX===0||minY===0||maxX===info.width-1||maxY===info.height-1)throw new Error(file+' artwork touches a canvas edge');
  assets.push({...item,file,width:meta.width,height:meta.height,bytes:buffer.length,sha256:crypto.createHash('sha256').update(buffer).digest('hex'),clearPixelFraction:Number((clear/(info.width*info.height)).toFixed(4)),visibleBounds:{minX,minY,maxX,maxY},uri:'data:image/png;base64,'+buffer.toString('base64')});
}
const image=(a,x,y,w,h,filter='')=>'<image x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" href="'+a.uri+'"'+(filter?' filter="url(#'+filter+')"':'')+'/>';
const text=(s,x,y,size=18,fill='#F1E8D7',anchor='start')=>'<text x="'+x+'" y="'+y+'" font-family="Arial, sans-serif" font-size="'+size+'" fill="'+fill+'" text-anchor="'+anchor+'">'+escape(s)+'</text>';
function start(w,h){return '<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'"><rect width="100%" height="100%" fill="#121918"/>'}
for(const family of ['dyad','triad']){
 const group=assets.filter(x=>x.family===family);
 if(group.length!==10)throw new Error('Expected 10 '+family+'s');
 let svg=start(1800,1200);
 svg+=text('LUMINAe',48,54,20,'#A8B3A8')+text(family==='dyad'?'Dyad civilizations':'Triad civilizations',48,104,38);
 svg+=text('Carved silhouettes · Concept set 02',1752,57,18,'#A8B3A8','end');
 svg+=text('Large symbol with 48 px / 24 px checks',1752,101,16,'#A8B3A8','end');
 for(let i=0;i<group.length;i++){
  const a=group[i],x=48+(i%5)*346,y=146+Math.floor(i/5)*510;
  svg+='<rect x="'+x+'" y="'+y+'" width="320" height="480" rx="10" fill="#1C2623"/>';
  svg+=image(a,x+18,y+16,284,260);
  svg+=text(a.name,x+160,y+305,27,'#F1E8D7','middle');
  svg+=text(a.affinities.join(' · '),x+160,y+330,13,'#A8B3A8','middle');
  const lines=wrap(a.meaning);
  lines.slice(0,3).forEach((line,j)=>{svg+=text(line,x+160,y+358+j*19,14,'#C4CABD','middle')});
  svg+=image(a,x+105,y+413,48,48)+image(a,x+200,y+425,24,24);
  svg+=text('48',x+88,y+444,11,'#88958B','end')+text('24',x+184,y+444,11,'#88958B','end');
 }
 svg+=text('Name-led pictograms · Single-color originals · Transparent PNG assets',48,1180,15,'#A8B3A8')+'</svg>';
 await sharp(Buffer.from(svg)).png().toFile(path.join(root,family+'s-sheet.png'));
}
let qa=start(1600,1350);
qa+='<defs><filter id="ink" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 0.06 0 0 0 0 0.09 0 0 0 0 0.08 0 0 0 1 0"/></filter></defs>';
qa+=text('Silhouette review · 48 px and 24 px on dark and light',35,49,26);
for(let i=0;i<assets.length;i++){
 const a=assets[i],x=35+(i%5)*310,y=83+Math.floor(i/5)*308;
 qa+=text(a.name,x+135,y+24,21,'#F1E8D7','middle');
 qa+='<rect x="'+x+'" y="'+(y+46)+'" width="270" height="106" rx="6" fill="#202B27"/>';
 qa+=image(a,x+56,y+74,48,48)+image(a,x+182,y+86,24,24);
 qa+='<rect x="'+x+'" y="'+(y+164)+'" width="270" height="106" rx="6" fill="#F1E8D7"/>';
 qa+=image(a,x+56,y+192,48,48,'ink')+image(a,x+182,y+204,24,24,'ink');
}
qa+='</svg>';
await sharp(Buffer.from(qa)).png().toFile(path.join(root,'size-and-contrast-review.png'));
const manifest={version:2,status:'concept draft',generator:'built-in image_gen',direction:spec.direction,assets:assets.map(({uri,prompt,geometry,...a})=>a)};
await fs.writeFile(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const cards=assets.map(a=>'<article><img class="hero" src="'+a.file+'" alt="'+escape(a.name)+' insignia"><h2>'+escape(a.name)+'</h2><p class="affinities">'+escape(a.affinities.join(' · '))+'</p><p>'+escape(a.meaning)+'</p><div class="scale"><img src="'+a.file+'" width="48" height="48" alt="'+escape(a.name)+' at 48 pixels"><img src="'+a.file+'" width="24" height="24" alt="'+escape(a.name)+' at 24 pixels"></div><a href="'+a.file+'" download>Download PNG</a></article>');
let html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LUMINAe · Civilization insignias</title><style>';
html+='*{box-sizing:border-box}body{margin:0;background:#121918;color:#F1E8D7;font:16px/1.5 system-ui,sans-serif;padding:40px;max-width:1800px;margin:auto}header{display:flex;flex-wrap:wrap;gap:20px;justify-content:space-between;align-items:center;margin-bottom:32px}h1{font-size:clamp(25px,4vw,40px);margin:0}header p{color:#A8B3A8;margin:4px 0}nav{display:flex;gap:12px;flex-wrap:wrap}a,button{color:inherit}button{background:transparent;border:1px solid #7a8e81;border-radius:24px;padding:10px 17px;font:inherit;cursor:pointer}a{font-size:14px}section{margin:40px 0}.grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:18px}article{background:#1C2623;border-radius:10px;padding:20px;text-align:center}img{object-fit:contain}.hero{width:100%;height:210px}h2{font-size:23px;margin:6px 0}.affinities{font-size:12px;color:#A8B3A8}article p{font-size:14px;min-height:42px}article .affinities{min-height:30px}.scale{height:75px;display:flex;align-items:center;justify-content:center;gap:40px}.light{background:#F1E8D7;color:#132019}.light article{background:#e3ddcd}.light .affinities,.light header p{color:#415749}.light img{filter:brightness(0)}@media(max-width:1100px){.grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:650px){body{padding:20px}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}article{padding:12px}.hero{height:160px}h2{font-size:18px}}@media print{nav,button{display:none}.grid{grid-template-columns:repeat(5,1fr)}section{break-after:page}body{padding:0}}';
html+='</style></head><body><header><div><h1>Civilization insignias</h1><p>LUMINAe · Carved silhouette concepts · 20 original marks</p></div><nav><button id="theme" aria-pressed="false">Light background</button><a href="dyads-sheet.png">Dyad sheet</a><a href="triads-sheet.png">Triad sheet</a></nav></header>';
for(const family of ['dyad','triad'])html+='<section><h2>'+ (family==='dyad'?'Dyads':'Triads')+'</h2><div class="grid">'+cards.filter((_,i)=>assets[i].family===family).join('')+'</div></section>';
html+='<script>document.getElementById("theme").addEventListener("click",function(){const light=document.body.classList.toggle("light");this.setAttribute("aria-pressed",String(light));this.textContent=light?"Dark background":"Light background"})</script></body></html>';
await fs.writeFile(path.join(root,'index.html'),html);
console.log(JSON.stringify({assets:assets.length,families:{dyads:10,triads:10},allTransparent:true,allUncropped:true,outputs:['dyads-sheet.png','triads-sheet.png','size-and-contrast-review.png','manifest.json','index.html']},null,2));

