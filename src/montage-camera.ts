import { prepareCameraDirector, type DirectorPlan, type DirectorEdit } from './camera-director';
import { createTerrainCameraPlan, type TerrainCameraPlan } from './terrain-camera';
import { MontagePlayback, type Montage } from './montage';
import type { ImageryManifest } from './imagery';
import { StoryTimeline } from './timeline';

export interface PreparedMontage {readonly playback:MontagePlayback;readonly director:DirectorPlan;readonly validation:'continuous-certified';readonly aspect:number}
const certificates=new WeakSet<object>();
export function isPreparedMontage(value:unknown):value is PreparedMontage{return !!value&&typeof value==='object'&&certificates.has(value);}
/** CPU-only, canonical reference; prepared geography and GPU resources are reused. */
export async function prepareMontage(model:Montage,original:TerrainCameraPlan,imagery:Readonly<ImageryManifest>|undefined,signal:AbortSignal,previous?:PreparedMontage):Promise<PreparedMontage> {
  signal.throwIfAborted();
  const timeline=new StoryTimeline(original.timeline.route,{...original.timeline.config,cameraMode:'director'},original.timeline.dynamics),aspect=timeline.config.aspectRatio;
  const base=createTerrainCameraPlan(timeline,original.terrain,aspect==='portrait'?720:1280,aspect==='portrait'?1280:720,original.options,original.sourceDetailMeters);
  const playback=new MontagePlayback(model,original.timeline),edits:DirectorEdit[]=model.scenes.filter(s=>s.shots[aspect]!=='auto').map(s=>({segment:s.segment,from:s.from,to:s.to,kind:s.shots[aspect] as DirectorEdit['kind']}));
  const cameraIdentity=(m:Montage)=>JSON.stringify(m.scenes.filter(s=>s.shots[aspect]!=='auto').map(s=>[s.segment,s.from,s.to,s.shots[aspect]]));
  const cached=previous?.playback.timeline===original.timeline&&cameraIdentity(previous.playback.model)===cameraIdentity(model)?previous.director:!edits.length&&original.director?.diagnostics.status==='selected'?original.director:undefined;
  const director=cached??await prepareCameraDirector(base,imagery,signal,edits);signal.throwIfAborted();
  if(director.diagnostics.status!=='selected')throw Error(`Этот монтажный ракурс недоступен: ${director.diagnostics.reason} Выберите автоматический вариант.`);
  const result=Object.freeze({playback,director,validation:'continuous-certified' as const,aspect:original.aspect});certificates.add(result);return result;
}
