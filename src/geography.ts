/** Trusted, locally bundled geography. Uploaded routes never select a remote URL. */
export interface GeographyPack {
  readonly schema:1;
  readonly name:string;
  readonly extent:readonly [number,number,number,number];
  readonly land:readonly number[][][][];
  readonly lakes:readonly number[][][][];
  readonly coast:readonly number[][][];
  readonly rivers:readonly number[][][];
  readonly labels:readonly {point:readonly [number,number];text:string;rank:number}[];
}
export type CinematicGeography=Readonly<{world:GeographyPack;region:GeographyPack}>;
let ready:Promise<CinematicGeography>|undefined;
export function validateGeography(value:unknown):GeographyPack {
  const p=value as GeographyPack;let coordinates=0;
  const point=(p:unknown)=>{if(!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||Math.abs(p[0])>180||Math.abs(p[1])>90||++coordinates>200_000)throw new Error('Некорректные или слишком большие локальные слои карты.');};
  if(!p||p.schema!==1||typeof p.name!=='string'||p.name.length>100||!Array.isArray(p.extent)||p.extent.length!==4||!p.extent.every(Number.isFinite)||p.extent[0]>=p.extent[2]||p.extent[1]>=p.extent[3])throw new Error('Некорректный пакет карты.');
  for(const key of ['land','lakes'] as const){if(!Array.isArray(p[key]))throw new Error('Отсутствует слой карты.');for(const polygon of p[key]){if(!Array.isArray(polygon)||!polygon.length)throw new Error('Некорректный полигон карты.');for(const ring of polygon){if(!Array.isArray(ring)||ring.length<4)throw new Error('Некорректный контур карты.');for(const xy of ring)point(xy);}}}
  for(const key of ['coast','rivers'] as const){if(!Array.isArray(p[key]))throw new Error('Отсутствует слой карты.');for(const line of p[key]){if(!Array.isArray(line)||line.length<2)throw new Error('Некорректная линия карты.');for(const xy of line)point(xy);}}
  if(!Array.isArray(p.labels)||p.labels.length>5000)throw new Error('Некорректные подписи карты.');
  for(const label of p.labels){point(label.point);if(typeof label.text!=='string'||!label.text.trim()||label.text.length>80||/[\u0000-\u001f\u007f]/.test(label.text)||!Number.isFinite(label.rank))throw new Error('Некорректная подпись карты.');}
  return Object.freeze(p);
}
export function loadGeography():Promise<CinematicGeography> {
  if(!ready)ready=Promise.all(['world-50m.json','fjords-10m.json'].map(async name=>{
    const response=await fetch(`${import.meta.env.BASE_URL}maps/${name}`);if(!response.ok)throw new Error('Не удалось загрузить локальные слои карты. Экспорт недоступен до их готовности.');
    const bytes=await response.arrayBuffer();if(bytes.byteLength>4*1024*1024)throw new Error('Пакет карты превысил лимит.');return validateGeography(JSON.parse(new TextDecoder().decode(bytes)));
  })).then(([world,region])=>Object.freeze({world,region})).catch(error=>{ready=undefined;throw error;});
  return ready;
}
