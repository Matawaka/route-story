import type { TerrainRenderer } from './terrain-renderer';
import { prepareMontage, type PreparedMontage } from './montage-camera';
import { automaticMontage, MontageHistory, MontagePlayback, compileScenes, editShot, editDuration, highlightRoute, parseProject, saveProject, MAX_PROJECT_BYTES, SHOT_NAMES, type EditShot, type Montage, type StoryProject } from './montage';
import type { StoryConfig } from './story';
import { FPS } from './story';

interface EditorHooks {
  settings():Readonly<StoryConfig>;
  seek(seconds:number):void;
  time():number;
  stop():void;
  playScene(from:number,to:number):void;
  stateChanged():void;
  restoreSettings(settings:Readonly<StoryConfig>):void;
  chooseGpx():void;
  prepareDirector():Promise<void>;
}
const el=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const seconds=(f:number)=>(f/FPS).toFixed(2).replace(/\.00$/,'');
/** UI component only; geography, renderer, clock and exporter remain owned by main. */
export class StoryboardEditor {
  private renderer?:TerrainRenderer;
  private digest?:string;
  private history?:MontageHistory;
  private selected='';
  private op?:AbortController;
  private pending?:StoryProject;
  private thumbnails:string[]=[];
  private alternatives=new Map<EditShot,PreparedMontage>();
  private expanded=false;
  private active=false;
  private externalBusy=false;
  private preparing=false;
  private conflict=false;
  get busy():boolean{return this.preparing;}
  get blocking():boolean{return this.conflict;}
  get model():Montage|undefined{return this.history?.current;}
  constructor(private readonly hooks:EditorHooks){
    el('edit-story').addEventListener('click',()=>{if(this.renderer&&this.renderer.config.cameraMode!=='director'){this.expanded=true;void this.hooks.prepareDirector();}else void this.open();});
    el('automatic-story').addEventListener('click',()=>this.automatic());
    el('collapse-storyboard').addEventListener('click',()=>{this.expanded=false;this.ui();});
    el('cancel-montage').addEventListener('click',()=>this.cancel());
    el('apply-scene-duration').addEventListener('click',()=>this.change(()=>editDuration(this.model!,this.selected,Math.round(Number(el<HTMLInputElement>('scene-duration').value)*FPS))));
    el<HTMLSelectElement>('scene-shot').addEventListener('change',()=>{const shot=el<HTMLSelectElement>('scene-shot').value as EditShot;this.change(()=>editShot(this.model!,this.selected,this.hooks.settings().aspectRatio,shot),this.alternatives.get(shot),true);});
    el('reset-scene').addEventListener('click',()=>this.change(()=>editShot(this.model!,this.selected,this.hooks.settings().aspectRatio,'auto')));
    el('reset-montage').addEventListener('click',()=>this.change(()=>automaticMontage(this.renderer!.timeline)));
    el('apply-highlight').addEventListener('click',()=>this.change(()=>highlightRoute(this.model!,this.renderer!.timeline,Number(el<HTMLInputElement>('highlight-start').value)/100,Number(el<HTMLInputElement>('highlight-end').value)/100)));
    el('preview-scene').addEventListener('click',()=>{const scene=this.playback()?.scenes.find(s=>s.id===this.selected);if(scene)this.hooks.playScene(scene.startFrame/FPS,scene.endFrame/FPS);});
    el('undo-edit').addEventListener('click',()=>void this.historyMove('undo'));
    el('redo-edit').addEventListener('click',()=>void this.historyMove('redo'));
    el('save-project').addEventListener('click',()=>this.save());
    el('open-project').addEventListener('click',()=>el<HTMLInputElement>('project-file').click());
    el('project-gpx').addEventListener('click',()=>this.hooks.chooseGpx());
    el<HTMLInputElement>('project-file').addEventListener('change',async()=>{const input=el<HTMLInputElement>('project-file'),file=input.files?.[0];input.value='';if(!file||this.externalBusy)return;try{if(file.size>MAX_PROJECT_BYTES)throw Error('Проект превышает 128 КиБ.');this.pending=parseProject(await file.text());if(this.pending.gpxSha256===this.digest){this.expanded=true;this.hooks.restoreSettings(this.pending.settings);}else{this.message('Проект открыт. Выберите исходный GPX: его SHA-256 должен совпадать. Сам маршрут в проекте не хранится.');el('project-gpx').hidden=false;}}catch(error){this.message(error instanceof Error?error.message:'Не удалось открыть проект.',true);}});
    el('scene-strip').addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;const buttons=Array.from(el('scene-strip').querySelectorAll<HTMLButtonElement>('button'));let i=buttons.indexOf(document.activeElement as HTMLButtonElement);i=event.key==='Home'?0:event.key==='End'?buttons.length-1:Math.max(0,Math.min(buttons.length-1,i+(event.key==='ArrowRight'?1:-1)));event.preventDefault();buttons[i]?.focus();buttons[i]?.click();});
    document.addEventListener('keydown',event=>{if(!this.expanded||this.externalBusy||this.busy||!(event.ctrlKey||event.metaKey)||event.key.toLowerCase()!=='z'||/INPUT|TEXTAREA|SELECT/.test((event.target as HTMLElement)?.tagName))return;event.preventDefault();void this.historyMove(event.shiftKey?'redo':'undo');});
  }
  projectForRoute(digest:string):StoryProject|undefined{return this.pending?.gpxSha256===digest?this.pending:undefined;}
  resetRoute():void{this.detach();this.history=undefined;this.active=false;this.expanded=false;this.conflict=false;this.selected='';this.ui();}
  detach():void{this.op?.abort();this.op=undefined;this.preparing=false;this.renderer=undefined;this.thumbnails=[];this.alternatives.clear();el('scene-strip').replaceChildren();this.ui();}
  async bind(renderer:TerrainRenderer|undefined,digest:string|undefined):Promise<void>{
    this.renderer=renderer;this.digest=digest;
    if(!renderer){this.active=false;this.expanded=false;this.ui();return;}
    if(this.pending){
      if(this.pending.gpxSha256!==digest){this.message('Контрольная сумма GPX не совпадает с проектом. Выберите соответствующий файл.',true);el('project-gpx').hidden=false;this.ui();return;}
      this.history=new MontageHistory(this.pending.montage);this.pending=undefined;this.active=this.expanded=true;this.conflict=false;el('project-gpx').hidden=true;
    }
    if(this.history&&this.history.current.duration!==renderer.config.durationSeconds){this.history=undefined;this.message('Длительность изменилась: подготовлен новый автоматический монтаж.');}
    this.ui();if(this.active||this.expanded)await this.open();
  }
  lock(busy:boolean):void{this.externalBusy=busy;if(busy&&this.preparing)this.cancel();this.ui();}
  private message(text:string,error=false):void{const node=el('montage-status');node.hidden=!text;node.textContent=text;node.classList.toggle('error',error);}
  private playback():MontagePlayback|undefined{return this.renderer?.montageSnapshot?.playback;}
  private begin():AbortController{this.op?.abort();const op=new AbortController();this.op=op;this.preparing=true;this.hooks.stop();this.message('Проверяем ракурсы и непрерывные переходы…');this.ui();this.hooks.stateChanged();return op;}
  cancel():void{this.op?.abort();this.op=undefined;this.preparing=false;this.message('Подготовка монтажа отменена. Предыдущая история сохранена.');this.ui();this.hooks.stateChanged();}
  private async open():Promise<void>{
    if(!this.renderer||this.externalBusy)return;this.expanded=true;
    try{this.history??=new MontageHistory(automaticMontage(this.renderer.timeline));await this.apply(this.history.current,false);}
    catch(error){this.message(error instanceof Error?error.message:'Редактор недоступен.',true);this.ui();}
  }
  automatic():void{if(this.externalBusy)return;this.cancel();this.renderer?.setMontage();this.active=false;this.expanded=false;this.conflict=false;this.ui();this.hooks.seek(this.hooks.time());this.message('Автоматическая история восстановлена. Монтаж можно открыть снова.');}
  private change(make:()=>Montage,ready?:PreparedMontage,preview=false):void{if(!this.renderer||!this.history||this.externalBusy)return;const id=this.selected;try{void this.apply(make(),true,ready).then(ok=>{const scene=this.playback()?.scenes.find(s=>s.id===id);if(ok&&preview&&scene&&this.selected===id)this.hooks.seek((scene.startFrame+scene.endFrame)/2/FPS);});}catch(error){this.message((error as Error).message,true);}}
  private async historyMove(direction:'undo'|'redo'):Promise<void>{
    if(!this.history||this.externalBusy||this.busy)return;
    const previous=this.history.current,next=direction==='undo'?this.history.peekUndo():this.history.peekRedo();
    if(next===previous)return;
    // The saved model is CPU-only. Revalidate after route/render settings changes.
    await this.apply(next,false,undefined,direction);this.ui();
  }
  private async apply(model:Montage,record:boolean,ready?:PreparedMontage,historyAction?:'undo'|'redo'):Promise<boolean>{
    const renderer=this.renderer;if(!renderer||!this.history)return false;const op=this.begin(),start=performance.now(),previous=renderer.montageSnapshot,oldSelection=this.selected;let prepared:PreparedMontage|undefined,committed=false;
    try{
      prepared=ready&&JSON.stringify(ready.playback.model)===JSON.stringify(model)&&ready.playback.timeline===renderer.timeline?ready:await prepareMontage(model,renderer.plan,renderer.imagery?.manifest,op.signal,renderer.montageSnapshot);
      op.signal.throwIfAborted();if(this.renderer!==renderer||this.op!==op)return false;
      renderer.setMontage(prepared);
      if(!model.scenes.some(s=>s.id===this.selected))this.selected=model.scenes.find(s=>s.phase==='ROUTE_REPLAY')?.id??model.scenes[0].id;
      await this.cards(op,model);op.signal.throwIfAborted();if(this.op!==op)return false;if(record)this.history.commit(model);if(historyAction)this.history[historyAction]();this.active=true;this.conflict=false;committed=true;this.hooks.seek(this.hooks.time());this.message(`Монтаж готов · ${model.scenes.length} сцен · ${model.duration} с. Ракурсы и переходы проверены. Подготовка ${(performance.now()-start).toFixed(0)} мс.`);
      this.preparing=false;this.ui();this.hooks.stateChanged();await this.choices(op);return true;
    }catch(error){if(this.op!==op||op.signal.aborted)return false;this.conflict=!previous;this.message(error instanceof Error?error.message:'Монтаж не прошёл проверку.',true);return false;}
    finally{
      if(!committed&&this.renderer===renderer&&prepared&&renderer.montageSnapshot===prepared){renderer.setMontage(previous);if(!this.op||this.op===op)this.selected=oldSelection;}
      if(this.op===op){this.preparing=false;this.ui();this.hooks.stateChanged();}else if(!this.op&&this.renderer===renderer){this.ui();this.hooks.stateChanged();}
    }
  }
  private async cards(op:AbortController,model:Montage):Promise<void>{
    const renderer=this.renderer!,scenes=this.playback()!.scenes,strip=el('scene-strip'),thumb=document.createElement('canvas'),fragment=document.createDocumentFragment(),thumbnails:string[]=[];thumb.width=160;thumb.height=90;
    try{for(const [i,s]of scenes.entries()){
      op.signal.throwIfAborted();renderer.captureFrame((s.startFrame+s.endFrame)/2/FPS);const ctx=thumb.getContext('2d',{willReadFrequently:true})!;ctx.fillStyle='#e0e8d9';ctx.fillRect(0,0,160,90);const source=renderer.encodingCanvas,scale=Math.min(160/source.width,90/source.height);ctx.drawImage(source,(160-source.width*scale)/2,(90-source.height*scale)/2,source.width*scale,source.height*scale);const image=thumb.toDataURL('image/jpeg',.75);if(image.length>65536)throw Error('Миниатюра превысила безопасный предел.');thumbnails.push(image);
      const button=document.createElement('button');button.className='scene-card';button.type='button';button.dataset.scene=s.id;button.setAttribute('aria-label',`Эпизод ${i+1}: ${this.sceneName(s.id,model)}, ${seconds(s.startFrame)}–${seconds(s.endFrame)} секунд`);
      const img=document.createElement('img');img.src=image;img.alt='Кадр текущей географической сцены';const name=document.createElement('strong');name.textContent=`${i+1}. ${this.sceneName(s.id,model)}${s.highlight?' · акцент':''}`;const time=document.createElement('span');time.textContent=`${seconds(s.startFrame)}–${seconds(s.endFrame)} с · ${seconds(s.frames)} с`;button.append(img,name,time);button.addEventListener('click',()=>{if(this.externalBusy)return;this.selected=s.id;this.hooks.seek(s.startFrame/FPS);this.ui();void this.choices(this.op??new AbortController());});fragment.append(button);if(i%3===0)await new Promise(resolve=>setTimeout(resolve,0));
    }op.signal.throwIfAborted();if(this.op!==op)return;this.thumbnails=thumbnails;strip.replaceChildren(fragment);}finally{thumb.width=thumb.height=0;}
  }
  private sceneName(id:string,model=this.model):string{
    const scene=model?.scenes.find(s=>s.id===id);if(!scene)return 'Эпизод';if(scene.phase==='INTRO')return 'Обзор';if(scene.phase==='OUTRO')return 'Финал';const shot=scene.shots[this.hooks.settings().aspectRatio];if(shot!=='auto')return SHOT_NAMES[shot];
    const interval=this.playback()?.scenes.find(s=>s.id===id),time=interval?(interval.sourceStart+interval.sourceEnd)/2:0,keys=this.renderer?.montageSnapshot?.director.diagnostics.keys.filter(k=>k.segment===scene.segment&&k.kind!=='establishing'&&k.kind!=='finale')??[],nearest=[...keys].sort((a,b)=>Math.abs(a.time-time)-Math.abs(b.time-time))[0];return nearest?SHOT_NAMES[nearest.kind]:'Сопровождение';
  }
  private async choices(parent:AbortController):Promise<void>{
    if(!this.renderer||!this.model||parent.signal.aborted||this.externalBusy)return;
    const renderer=this.renderer,model=this.model,id=this.selected,scene=model.scenes.find(s=>s.id===id)!,aspect=this.hooks.settings().aspectRatio,select=el<HTMLSelectElement>('scene-shot');this.alternatives.clear();select.replaceChildren();
    const current=scene.shots[aspect],option=document.createElement('option');option.value=current;option.textContent=SHOT_NAMES[current];select.append(option);select.disabled=true;
    el('shot-note').textContent='Подбираем допустимые альтернативы для этого эпизода…';
    const types:EditShot[]=scene.phase==='INTRO'?['auto','establishing']:scene.phase==='OUTRO'?['auto','finale']:['auto','smooth-follow','scenic-side','mountain-reveal'];
    const keys=renderer.montageSnapshot!.director.diagnostics.keys;if(scene.phase==='ROUTE_REPLAY'&&keys.some(k=>k.progress>=scene.from&&k.progress<=scene.to&&k.curvature>.45))types[2]='curve-showcase';
    const skipped:string[]=[];
    for(const shot of types){
      if(this.selected!==id||this.renderer!==renderer||this.model!==model||parent.signal.aborted||this.externalBusy)return;
      try{const next=editShot(model,id,aspect,shot),prepared=shot===current?renderer.montageSnapshot!:await prepareMontage(next,renderer.plan,renderer.imagery?.manifest,parent.signal);
        if(this.selected!==id||this.model!==model||this.renderer!==renderer||parent.signal.aborted)return;
        if(shot!==current){const times=[.25,.5,.75].map(f=>prepared.playback.scenes.find(s=>s.id===id)!.sourceStart+(prepared.playback.scenes.find(s=>s.id===id)!.sourceEnd-prepared.playback.scenes.find(s=>s.id===id)!.sourceStart)*f);if(times.every(t=>JSON.stringify(prepared.director.at(t))===JSON.stringify(renderer.montageSnapshot!.director.at(t))))continue;}
        this.alternatives.set(shot,prepared);if(shot!==current){const o=document.createElement('option');o.value=shot;const help=shot==='scenic-side'?' · дорога под другим углом':shot==='mountain-reveal'?' · выше над ландшафтом':shot==='curve-showcase'?' · изгиб дороги':shot==='smooth-follow'?' · сдержанное движение':'';o.textContent=SHOT_NAMES[shot]+help;select.append(o);}
      }catch(error){if(parent.signal.aborted)return;skipped.push((error as Error).message);}
    }
    if(this.selected!==id||this.model!==model||parent.signal.aborted)return;select.value=current;select.disabled=this.externalBusy||this.busy||this.alternatives.size<2;
    select.title=skipped.length?'Недоступные варианты исключены: '+skipped.join(' '):'Каждый вариант прошёл полную проверку камеры.';
    el('shot-note').textContent=this.alternatives.size<2?'Другие ракурсы этого эпизода не прошли проверку или не меняют кадр. Сохранён безопасный вариант.':`Доступны только проверенные варианты. ${aspect==='portrait'?'Композиция для 9:16 подготовлена отдельно.':'Ракурсы вертикальной версии можно выбрать отдельно.'}`;
  }
  sync(time:number):void{const scene=this.playback()?.sceneAt(time);for(const card of el('scene-strip').querySelectorAll<HTMLElement>('[data-scene]'))card.dataset.playing=String(card.dataset.scene===scene?.id);}
  private ui():void{
    const blocked=this.externalBusy||this.busy;el<HTMLButtonElement>('edit-story').disabled=!this.renderer||this.externalBusy;el('edit-story').setAttribute('aria-pressed',String(this.active));el('automatic-story').setAttribute('aria-pressed',String(!this.active));el('storyboard').hidden=!this.expanded;el('cancel-montage').hidden=!this.busy;
    document.body.dataset.montage=this.preparing?'preparing':this.active&&this.renderer?.montageSnapshot?'edited':'automatic';el('montage-format').textContent=this.hooks.settings().aspectRatio==='portrait'?'9:16 · отдельные ракурсы':'16:9 · отдельные ракурсы';
    for(const id of ['automatic-story','open-project','save-project','reset-montage','apply-highlight','apply-scene-duration','preview-scene','reset-scene'])el<HTMLButtonElement>(id).disabled=blocked||!this.model&&['save-project','reset-montage','apply-highlight','apply-scene-duration','preview-scene','reset-scene'].includes(id);
    el<HTMLButtonElement>('undo-edit').disabled=blocked||!this.history?.canUndo;el<HTMLButtonElement>('redo-edit').disabled=blocked||!this.history?.canRedo;
    el<HTMLFieldSetElement>('scene-settings').disabled=blocked;for(const input of el('storyboard').querySelectorAll<HTMLInputElement>('input'))input.disabled=blocked;
    const scene=this.model?.scenes.find(s=>s.id===this.selected);if(scene){el('selected-scene-name').textContent=this.sceneName(scene.id);el<HTMLInputElement>('scene-duration').value=(scene.frames/FPS).toFixed(2);}
    for(const button of el('scene-strip').querySelectorAll<HTMLButtonElement>('button')){button.disabled=blocked;button.setAttribute('aria-pressed',String(button.dataset.scene===this.selected));}
  }
  private save():void{if(!this.model||!this.digest||this.externalBusy)return;try{const text=saveProject(this.hooks.settings(),this.model,this.digest),url=URL.createObjectURL(new Blob([text],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='route-story.rstory.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);this.message('Проект сохранён без GPX и координат. При открытии потребуется исходный GPX; свои картинки не вложены.');}catch(error){this.message((error as Error).message,true);}}
}
