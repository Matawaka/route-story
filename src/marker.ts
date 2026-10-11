/** Small, local-only route marker assets. Never loads external URLs or SVG. */
export type MarkerStyle = 'dot' | 'unicycle' | 'custom';
export const MAX_MARKER_BYTES=1024*1024;
export const MAX_MARKER_SOURCE_SIDE=1024;
export const MARKER_TEXTURE_SIDE=256;

export function markerFormat(bytes:Uint8Array):'image/png'|'image/webp' {
  const png=bytes.length>=8 && [137,80,78,71,13,10,26,10].every((value,i)=>bytes[i]===value);
  if(png)return 'image/png';
  const webp=bytes.length>=12 && String.fromCharCode(...bytes.subarray(0,4))==='RIFF' && String.fromCharCode(...bytes.subarray(8,12))==='WEBP';
  if(webp)return 'image/webp';
  throw Error('Значок должен быть PNG или WebP (SVG не поддерживается).');
}

export async function loadMarker(file:File):Promise<ImageBitmap> {
  if(file.size<12||file.size>MAX_MARKER_BYTES)throw Error('Размер значка: от 12 байт до 1 МиБ.');
  const header=new Uint8Array(await file.slice(0,12).arrayBuffer());
  const detected=markerFormat(header);
  if(file.type && file.type!==detected)throw Error('Тип файла значка не соответствует содержимому.');
  let source:ImageBitmap|undefined;
  try{
    source=await createImageBitmap(file,{imageOrientation:'none',colorSpaceConversion:'none'});
    if(source.width<1||source.height<1||source.width>MAX_MARKER_SOURCE_SIDE||source.height>MAX_MARKER_SOURCE_SIDE)throw Error('Размеры изображения значка не должны превышать 1024 × 1024.');
    const canvas=document.createElement('canvas');
    canvas.width=canvas.height=MARKER_TEXTURE_SIDE;
    try{
      const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas для значка недоступен.');
      const factor=Math.min((MARKER_TEXTURE_SIDE-16)/source.width,(MARKER_TEXTURE_SIDE-16)/source.height);
      const width=source.width*factor,height=source.height*factor;
      ctx.drawImage(source,(MARKER_TEXTURE_SIDE-width)/2,(MARKER_TEXTURE_SIDE-height)/2,width,height);
      return await createImageBitmap(canvas);
    }finally{canvas.width=canvas.height=0;}
  }catch(e){if(e instanceof Error)throw e;throw Error('Не удалось декодировать изображение значка.');}
  finally{source?.close();}
}

/** Unique small black/light silhouette: a person with backpack on a single wheel. */
export function createUnicycleMarker():HTMLCanvasElement {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const c=canvas.getContext('2d')!;c.lineCap='round';c.lineJoin='round';
  const stroke=(width:number,color:string)=>{c.strokeStyle=color;c.lineWidth=width;c.stroke();};
  c.beginPath();c.arc(64,94,22,0,Math.PI*2);c.fillStyle='#162b35';c.fill();stroke(6,'#fff9ec');
  c.beginPath();c.arc(64,94,9,0,Math.PI*2);c.fillStyle='#71c2c5';c.fill();stroke(2,'#162b35');
  c.beginPath();c.moveTo(64,69);c.lineTo(64,87);stroke(7,'#fff9ec');
  c.beginPath();c.moveTo(42,82);c.lineTo(53,82);c.moveTo(75,82);c.lineTo(88,82);stroke(8,'#fff9ec');
  c.beginPath();c.moveTo(42,82);c.lineTo(53,82);c.moveTo(75,82);c.lineTo(88,82);stroke(4,'#162b35');
  c.beginPath();c.moveTo(55,75);c.lineTo(59,58);c.lineTo(68,42);c.lineTo(62,31);stroke(14,'#fff9ec');stroke(8,'#162b35');
  c.beginPath();c.moveTo(65,47);c.lineTo(79,64);stroke(11,'#fff9ec');stroke(6,'#162b35');
  c.beginPath();c.moveTo(58,72);c.lineTo(54,87);c.moveTo(66,72);c.lineTo(75,86);stroke(12,'#fff9ec');stroke(7,'#162b35');
  c.beginPath();c.arc(62,23,11,0,Math.PI*2);c.fillStyle='#162b35';c.fill();stroke(4,'#fff9ec');
  c.beginPath();c.roundRect(70,39,17,25,5);c.fillStyle='#bb7849';c.fill();stroke(3,'#fff9ec');
  // Small rear luggage rack distinct from the backpack.
  c.beginPath();c.moveTo(83,79);c.lineTo(100,79);c.lineTo(100,71);stroke(5,'#fff9ec');stroke(3,'#162b35');
  return canvas;
}

export function drawRouteMarker(ctx:CanvasRenderingContext2D, image:CanvasImageSource,x:number,y:number,size:number):void {
  if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(size)||size<=0)return;
  ctx.drawImage(image,x-size/2,y-size/2,size,size);
}
