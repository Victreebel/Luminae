import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
const root=path.dirname(fileURLToPath(import.meta.url));
const items=JSON.parse(await fs.readFile(path.join(root,'anchors.json'),'utf8'));
const W=1400,H=670;
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
let svg='<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="'+W+'" height="'+H+'"><rect width="100%" height="100%" fill="#141919"/><text x="40" y="51" font-family="Arial" font-size="28" fill="#F1E8D7">LUMINAe · Carved silhouettes</text><text x="40" y="81" font-family="Arial" font-size="16" fill="#929e99">Four reference marks · large, 48 px and 24 px</text>';
for (let i=0;i<items.length;i++){
 const item=items[i],x=40+i*340, uri='data:image/png;base64,'+(await fs.readFile(path.join(root,item.file))).toString('base64');
 svg+='<rect x="'+x+'" y="116" width="320" height="500" rx="9" fill="#1b2321"/>';
 svg+='<image x="'+(x+20)+'" y="135" width="280" height="300" xlink:href="'+uri+'"/>';
 svg+='<text x="'+(x+160)+'" y="467" text-anchor="middle" font-family="Arial" font-size="24" fill="#F1E8D7">'+esc(item.name)+'</text>';
 svg+='<image x="'+(x+111)+'" y="506" width="48" height="48" xlink:href="'+uri+'"/><image x="'+(x+193)+'" y="518" width="24" height="24" xlink:href="'+uri+'"/>';
 svg+='<text x="'+(x+135)+'" y="580" text-anchor="middle" font-family="Arial" font-size="13" fill="#929e99">48 px</text><text x="'+(x+205)+'" y="580" text-anchor="middle" font-family="Arial" font-size="13" fill="#929e99">24 px</text>';
}
svg+='</svg>';
await fs.writeFile(path.join(root,'anchors-sheet.svg'),svg);
await sharp(Buffer.from(svg)).png().toFile(path.join(root,'anchors-sheet.png'));
console.log('Rendered four unmodified originals on the labeled review sheet.');

