import sharp from 'sharp';
const [f,out]=process.argv.slice(2); const m=await sharp(f).metadata();
for(let i=0,y=0;y<m.height;i++,y+=1700){await sharp(f).extract({left:0,top:y,width:m.width,height:Math.min(1700,m.height-y)}).toFile(`${out}-${i}.jpg`)}
