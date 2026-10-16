import { FPS, validateStoryConfig, type AspectRatio, type StoryConfig, type StoryDuration } from './story';
import type { StoryPhase, StoryState, StoryTimeline } from './timeline';
import type { ShotKind } from './camera-director';

export const PROJECT_SCHEMA = 'route-story.project/v1';
export const MAX_PROJECT_BYTES = 128 * 1024;
export const MAX_SCENES = 24;
export const MAX_UNDO = 40;
export type EditShot = 'auto' | ShotKind;
export const SHOT_NAMES: Readonly<Record<EditShot, string>> = Object.freeze({auto:'Автоматический выбор',establishing:'Общий план','smooth-follow':'Плавное сопровождение','scenic-side':'Боковой вид','curve-showcase':'Красивый поворот','mountain-reveal':'Раскрытие пейзажа',finale:'Финальный отлёт'});
export interface EditScene {
  readonly id: string;
  readonly phase: StoryPhase;
  readonly segment: number;
  /** Fractions of original cumulative distance, never geographic coordinates. */
  readonly from: number;
  readonly to: number;
  readonly frames: number;
  readonly shots: Readonly<Record<AspectRatio, EditShot>>;
  readonly highlight: boolean;
}
export interface Montage {
  readonly schema: 1;
  readonly duration: Exclude<StoryDuration,4>;
  readonly scenes: readonly EditScene[];
}
export interface CompiledScene extends EditScene {
  readonly startFrame: number;
  readonly endFrame: number;
  readonly sourceStart: number;
  readonly sourceEnd: number;
}
export interface StoryProject {
  readonly schema: typeof PROJECT_SCHEMA;
  readonly compatibility: 'mvp1.7';
  readonly gpxSha256: string;
  readonly settings: Readonly<StoryConfig>;
  readonly montage: Montage;
  readonly resources: {readonly customMarkerRequired: boolean};
}
const phases: readonly StoryPhase[] = ['INTRO','ROUTE_REPLAY','OUTRO'];
const shots = Object.keys(SHOT_NAMES);
const clamp = (v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const close = (a:number,b:number)=>Math.abs(a-b)<1e-9;
const fail = (message:string):never=>{throw Error(message);};
function object(v:unknown):Record<string,unknown> {
  if(!v||typeof v!=='object'||Array.isArray(v))return fail('В проекте ожидался объект.');
  return v as Record<string,unknown>;
}
function keys(v:Record<string,unknown>,allowed:readonly string[]):void {
  if(Object.keys(v).some(k=>!allowed.includes(k)))fail('В проекте есть неизвестные поля.');
}
export function validateMontage(input:unknown):Montage {
  const value=object(input);keys(value,['schema','duration','scenes']);
  if(value.schema!==1||![10,20,30,60].includes(value.duration as number))fail('Неизвестная версия монтажа или длительность.');
  if(!Array.isArray(value.scenes)||!value.scenes.length||value.scenes.length>MAX_SCENES)fail(`Монтаж: от 1 до ${MAX_SCENES} сцен.`);
  const ids=new Set<string>();let total=0,lastPhase=-1,lastDistance=0,lastSegment=-1;
  const scenes=(value.scenes as unknown[]).map(item=>{
    const s=object(item);keys(s,['id','phase','segment','from','to','frames','shots','highlight']);
    if(typeof s.id!=='string'||!/^[a-z0-9-]{1,64}$/.test(s.id)||ids.has(s.id))fail('Некорректный или повторный идентификатор сцены.');ids.add(s.id as string);
    const phase=phases.indexOf(s.phase as StoryPhase);
    if(phase<0||phase<lastPhase)fail('Порядок сцен истории нарушен.');lastPhase=phase;
    if(!Number.isSafeInteger(s.segment)||Number(s.segment)<0||Number(s.segment)>49999)fail('Некорректный GPX-сегмент.');
    if(!Number.isFinite(s.from)||!Number.isFinite(s.to)||Number(s.from)<0||Number(s.to)>1||Number(s.to)<Number(s.from))fail('Некорректные границы участка.');
    if(!Number.isSafeInteger(s.frames)||Number(s.frames)<1||Number(s.frames)>Number(value.duration)*FPS)fail('Продолжительность сцены должна содержать целое положительное число кадров.');
    if(s.phase!=='ROUTE_REPLAY'&&Number(s.frames)>3*FPS)fail('Вступление и финал: не более трёх секунд.');
    if(s.phase==='INTRO'&&(s.from!==0||s.to!==0)||s.phase==='OUTRO'&&(s.from!==1||s.to!==1))fail('Вступление и финал не перемещают маршрут.');
    if(s.phase==='ROUTE_REPLAY'){
      if(!close(Number(s.from),lastDistance)||Number(s.segment)<lastSegment)fail('Монтаж пропускает, повторяет или переставляет исходный маршрут.');
      lastDistance=Number(s.to);lastSegment=Number(s.segment);
    }
    if(typeof s.highlight!=='boolean')fail('Некорректная отметка интересного участка.');
    const choice=object(s.shots);keys(choice,['landscape','portrait']);
    for(const format of ['landscape','portrait'])if(!shots.includes(choice[format] as string))fail('Неизвестный ракурс сцены.');
    for(const shot of Object.values(choice))if(s.phase==='INTRO'&&!['auto','establishing'].includes(shot as string)||s.phase==='OUTRO'&&!['auto','finale'].includes(shot as string)||s.phase==='ROUTE_REPLAY'&&['establishing','finale'].includes(shot as string))fail('Этот ракурс не относится к выбранной фазе.');
    total+=Number(s.frames);
    return Object.freeze({...s,shots:Object.freeze({landscape:choice.landscape,portrait:choice.portrait})}) as unknown as EditScene;
  });
  if(total!==Number(value.duration)*FPS||!close(lastDistance,1))fail('Монтаж должен показывать весь маршрут и точно совпадать с длительностью видео.');
  if(scenes.filter(s=>s.phase==='INTRO').length>1||scenes.filter(s=>s.phase==='OUTRO').length>1)fail('Повторное вступление или финал.');
  return Object.freeze({schema:1,duration:value.duration as Montage['duration'],scenes:Object.freeze(scenes)});
}
export function segmentRanges(timeline:StoryTimeline):readonly {segment:number;from:number;to:number}[] {
  const ranges:{segment:number;from:number;to:number}[]=[];
  if(!timeline.path.total)return [{segment:0,from:0,to:1}];
  for(const edge of timeline.path.edges){const last=ranges.at(-1);if(last?.segment===edge.segment)last.to=edge.end/timeline.path.total;else ranges.push({segment:edge.segment,from:edge.start/timeline.path.total,to:edge.end/timeline.path.total});}
  return ranges;
}
export function sourceTimeAtProgress(timeline:StoryTimeline,progress:number):number {
  const c=timeline.config,replay=c.durationSeconds-c.introSeconds-c.outroSeconds;
  return c.introSeconds+replay*(c.replayPacing==='terrain'?timeline.dynamics.timeProgressAt(progress):progress);
}
function allocated(weights:readonly number[],total:number,min=1):number[] {
  if(weights.length*min>total)fail('Слишком много коротких сцен для выбранной длительности.');
  const sum=weights.reduce((a,b)=>a+b,0)||1,remaining=total-weights.length*min,raw=weights.map(v=>remaining*v/sum),result=raw.map(v=>min+Math.floor(v));
  const order=raw.map((v,i)=>({i,f:v-Math.floor(v)})).sort((a,b)=>b.f-a.f||a.i-b.i);
  for(let i=0,n=total-result.reduce((a,b)=>a+b,0);i<n;i++)result[order[i].i]++;
  return result;
}
export function automaticMontage(timeline:StoryTimeline):Montage {
  const c=timeline.config;if(c.durationSeconds===4)fail('Редактор доступен для 10, 20, 30 и 60 секунд.');
  const ranges=segmentRanges(timeline),count=c.durationSeconds===10?1:c.durationSeconds===20?3:c.durationSeconds===30?4:6;
  const scenes:EditScene[]=[];
  const add=(phase:StoryPhase,segment:number,from:number,to:number,frames:number)=>scenes.push({id:`${phase.toLowerCase().replace('_','-')}-${segment}-${Math.round(from*1e9)}-${Math.round(to*1e9)}`,phase,segment,from,to,frames,shots:{landscape:'auto',portrait:'auto'},highlight:false});
  if(c.introSeconds)add('INTRO',ranges[0].segment,0,0,Math.round(c.introSeconds*FPS));
  for(const range of ranges){const points=[range.from,...Array.from({length:count-1},(_,i)=>(i+1)/count).filter(p=>p>range.from+1e-9&&p<range.to-1e-9),range.to];for(let i=1;i<points.length;i++)add('ROUTE_REPLAY',range.segment,points[i-1],points[i],1);}
  const replay=scenes.filter(s=>s.phase==='ROUTE_REPLAY'),frames=allocated(replay.map(s=>sourceTimeAtProgress(timeline,s.to)-sourceTimeAtProgress(timeline,s.from)),(c.durationSeconds-c.introSeconds-c.outroSeconds)*FPS);
  for(let i=0;i<replay.length;i++)scenes[scenes.indexOf(replay[i])]={...replay[i],frames:frames[i]};
  if(c.outroSeconds)add('OUTRO',ranges.at(-1)!.segment,1,1,Math.round(c.outroSeconds*FPS));
  return validateMontage({schema:1,duration:c.durationSeconds,scenes});
}
export function compileScenes(model:Montage,timeline:StoryTimeline):readonly CompiledScene[] {
  const m=validateMontage(model),c=timeline.config,ranges=segmentRanges(timeline);if(m.duration!==c.durationSeconds)fail('Монтаж рассчитан на другую длительность.');
  let frame=0;
  const result=m.scenes.map(s=>{
    const range=ranges.find(r=>r.segment===s.segment);if(!range)fail('В исходном GPX нет сегмента сцены.');
    if(s.phase==='ROUTE_REPLAY'&&(s.from<range!.from-1e-9||s.to>range!.to+1e-9||s.to<=s.from))fail('Сцена пересекает разрыв между GPX-сегментами.');
    if(s.phase==='INTRO'&&(!c.introSeconds||s.segment!==ranges[0].segment)||s.phase==='OUTRO'&&(!c.outroSeconds||s.segment!==ranges.at(-1)!.segment))fail('Фаза монтажа не соответствует исходной истории.');
    const sourceStart=s.phase==='INTRO'?0:s.phase==='OUTRO'?c.durationSeconds-c.outroSeconds:sourceTimeAtProgress(timeline,s.from),sourceEnd=s.phase==='INTRO'?c.introSeconds:s.phase==='OUTRO'?c.durationSeconds:sourceTimeAtProgress(timeline,s.to);
    const scene=Object.freeze({...s,startFrame:frame,endFrame:frame+s.frames,sourceStart,sourceEnd});frame+=s.frames;return scene;
  });
  if(c.introSeconds&&!result.some(s=>s.phase==='INTRO')||c.outroSeconds&&!result.some(s=>s.phase==='OUTRO'))fail('Вступление или финал отсутствуют в проекте.');
  return Object.freeze(result);
}
/** Monotone C1 Hermite retiming. A time-only reparameterization visits exactly
 * the already-proven spatial trajectory with the SAME marker and camera time. */
export class MontagePlayback {
  readonly scenes:readonly CompiledScene[];
  private readonly x:number[];private readonly y:number[];private readonly slopes:number[];
  constructor(readonly model:Montage,readonly timeline:StoryTimeline){
    this.model=validateMontage(model);this.scenes=compileScenes(this.model,timeline);
    this.x=[0,...this.scenes.map(s=>s.endFrame/FPS)];this.y=[0,...this.scenes.map(s=>s.sourceEnd)];
    const h=this.x.slice(1).map((v,i)=>v-this.x[i]),d=h.map((v,i)=>(this.y[i+1]-this.y[i])/v);
    this.slopes=[d[0],...d.slice(1).map((v,i)=>{if(!v||!d[i])return 0;const w1=2*h[i+1]+h[i],w2=h[i+1]+2*h[i];return(w1+w2)/(w1/d[i]+w2/v);}),d.at(-1)!];
    Object.freeze(this.x);Object.freeze(this.y);Object.freeze(this.slopes);Object.freeze(this);
  }
  sourceTime(seconds:number):number {
    if(!Number.isFinite(seconds))fail('Некорректное время монтажа.');const time=clamp(seconds,0,this.model.duration);
    let i=0;while(i<this.scenes.length-1&&time>=this.x[i+1])i++;
    const h=this.x[i+1]-this.x[i],u=(time-this.x[i])/h,u2=u*u,u3=u2*u;
    return clamp((2*u3-3*u2+1)*this.y[i]+(u3-2*u2+u)*h*this.slopes[i]+(-2*u3+3*u2)*this.y[i+1]+(u3-u2)*h*this.slopes[i+1],this.y[i],this.y[i+1]);
  }
  at(seconds:number):StoryState {const t=clamp(seconds,0,this.model.duration);return {...this.timeline.at(this.sourceTime(seconds)),timeSeconds:t,timelineProgress:t/this.model.duration};}
  sceneAt(seconds:number):CompiledScene {const f=clamp(seconds,0,this.model.duration)*FPS;return this.scenes.find(s=>f<s.endFrame)??this.scenes.at(-1)!;}
}
export function editShot(model:Montage,id:string,aspect:AspectRatio,shot:EditShot):Montage {
  if(!model.scenes.some(s=>s.id===id))fail('Сцена не найдена.');
  return validateMontage({...model,scenes:model.scenes.map(s=>s.id===id?{...s,shots:{...s.shots,[aspect]:shot}}:s)});
}
export function editDuration(model:Montage,id:string,frames:number):Montage {
  const scene=model.scenes.find(s=>s.id===id);if(!scene)fail('Сцена не найдена.');
  if(!Number.isSafeInteger(frames)||frames<1||scene!.phase!=='ROUTE_REPLAY'&&frames>72)fail('Некорректная продолжительность сцены.');
  // Reserve intro/outro; compensate with other replay scenes only.
  const others=model.scenes.filter(s=>s.id!==id&&s.phase==='ROUTE_REPLAY'),fixed=model.scenes.filter(s=>s.id!==id&&s.phase!=='ROUTE_REPLAY').reduce((n,s)=>n+s.frames,0),remaining=model.duration*FPS-frames-fixed;
  if(!others.length&&remaining!==0)fail('В этой истории нет другой сцены для перераспределения времени.');
  const allocation=allocated(others.map(s=>s.frames),remaining),map=new Map(others.map((s,i)=>[s.id,allocation[i]]));
  return validateMontage({...model,scenes:model.scenes.map(s=>({...s,frames:s.id===id?frames:map.get(s.id)??s.frames}))});
}
/** Splits only at true route fractions; every original segment stays in order. */
export function highlightRoute(model:Montage,timeline:StoryTimeline,from:number,to:number):Montage {
  if(!Number.isFinite(from)||!Number.isFinite(to)||from<0||to>1||to-from<.005)fail('Выберите участок от 0 до 100%, длиной хотя бы 0,5% маршрута.');
  const replay:EditScene[]=[];
  for(const scene of model.scenes.filter(s=>s.phase==='ROUTE_REPLAY')){
    const points=[scene.from,...[from,to].filter(p=>p>scene.from+1e-9&&p<scene.to-1e-9),scene.to];
    for(let i=1;i<points.length;i++)replay.push({...scene,id:`route-replay-${scene.segment}-${Math.round(points[i-1]*1e9)}-${Math.round(points[i]*1e9)}`,from:points[i-1],to:points[i],frames:1,highlight:points[i-1]>=from-1e-9&&points[i]<=to+1e-9});
  }
  if(replay.length+model.scenes.filter(s=>s.phase!=='ROUTE_REPLAY').length>MAX_SCENES)fail('Слишком много сцен. Сбросьте предыдущий монтаж перед новым акцентом.');
  const frames=allocated(replay.map(s=>(sourceTimeAtProgress(timeline,s.to)-sourceTimeAtProgress(timeline,s.from))*(s.highlight?2.5:1)),model.scenes.filter(s=>s.phase==='ROUTE_REPLAY').reduce((n,s)=>n+s.frames,0));
  return validateMontage({...model,scenes:[...model.scenes.filter(s=>s.phase==='INTRO'),...replay.map((s,i)=>({...s,frames:frames[i]})),...model.scenes.filter(s=>s.phase==='OUTRO')]});
}
export class MontageHistory {
  private back:Montage[]=[];private forward:Montage[]=[];
  constructor(public current:Montage){this.current=validateMontage(current);}
  get canUndo():boolean{return this.back.length>0;}
  get canRedo():boolean{return this.forward.length>0;}
  peekUndo():Montage{return this.back.at(-1)??this.current;}
  peekRedo():Montage{return this.forward.at(-1)??this.current;}
  commit(next:Montage):void{const m=validateMontage(next);if(JSON.stringify(m)===JSON.stringify(this.current))return;this.back.push(this.current);if(this.back.length>MAX_UNDO)this.back.shift();this.current=m;this.forward=[];}
  undo():Montage{if(this.back.length){this.forward.push(this.current);this.current=this.back.pop()!;}return this.current;}
  redo():Montage{if(this.forward.length){this.back.push(this.current);this.current=this.forward.pop()!;}return this.current;}
}
const settingKeys=['durationSeconds','introSeconds','outroSeconds','title','visualStyle','aspectRatio','qualityPreset','cameraMode','terrainSurface','terrainFlight','routeColor','replayPacing','marker','markerPresentation','markerSize','captionMode'];
export function parseProject(text:string):StoryProject {
  if(new TextEncoder().encode(text).length>MAX_PROJECT_BYTES)fail('Проект превышает 128 КиБ.');
  let raw:unknown;try{raw=JSON.parse(text);}catch{fail('Проект повреждён: ожидается JSON.');}
  let nodes=0;function inspect(v:unknown,depth=0):void{if(++nodes>2000||depth>8)fail('Слишком сложный файл проекта.');if(typeof v==='string'&&(v.length>200||/https?:|javascript:|data:|blob:|file:/i.test(v)))fail('Ссылки и исполняемое содержимое в проекте запрещены.');if(v&&typeof v==='object'){for(const [k,a]of Object.entries(v)){if(['__proto__','constructor','prototype'].includes(k))fail('Недопустимое поле проекта.');inspect(a,depth+1);}}}inspect(raw);
  const p=object(raw);keys(p,['schema','compatibility','gpxSha256','settings','montage','resources']);
  if(p.schema!==PROJECT_SCHEMA||p.compatibility!=='mvp1.7')fail('Версия проекта не поддерживается.');
  if(typeof p.gpxSha256!=='string'||!/^[a-f0-9]{64}$/.test(p.gpxSha256))fail('В проекте нет корректной контрольной суммы GPX.');
  const settings=object(p.settings);keys(settings,settingKeys);const config=validateStoryConfig(settings as unknown as StoryConfig,false),montage=validateMontage(p.montage);
  if(montage.duration!==config.durationSeconds)fail('Длительность проекта и видео различается.');
  const resources=object(p.resources);keys(resources,['customMarkerRequired']);if(typeof resources.customMarkerRequired!=='boolean'||resources.customMarkerRequired!==(config.marker==='custom'))fail('Некорректные сведения о картинке путешественника.');
  return Object.freeze({schema:PROJECT_SCHEMA,compatibility:'mvp1.7',gpxSha256:p.gpxSha256 as string,settings:config,montage,resources:Object.freeze({customMarkerRequired:resources.customMarkerRequired as boolean})});
}
export function saveProject(config:StoryConfig,model:Montage,gpxSha256:string):string {
  const text=JSON.stringify({schema:PROJECT_SCHEMA,compatibility:'mvp1.7',gpxSha256,settings:validateStoryConfig(config,false),montage:validateMontage(model),resources:{customMarkerRequired:config.marker==='custom'}},null,2);parseProject(text);return text;
}
export async function checksum(bytes:BufferSource):Promise<string>{return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');}
