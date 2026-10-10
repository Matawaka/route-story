import * as T from 'three';
import { StoryTimeline } from './timeline';
import { createTerrainCameraPlan,getTerrainCameraStateAt,requiredVisibleAltitude } from './terrain-camera';
import { TerrainDataset,type TerrainXY } from './terrain';
import { haversine,wrapDelta } from './geo';
import { metricLabel,formatDistance } from './renderer';
import type { Route } from './route';
import type { StoryConfig } from './story';
import {imageryUV,imageryCoversTerrain,imageryDetailWeight,type PreparedImagery} from './imagery';

/** Bounded genuine DEM mesh; one WebGL surface, synchronously captured into the
 * existing Canvas/WebCodecs pipeline. Optional resident regional photo texture;
 * no remote tiles or pre-captured frame store. */
export class TerrainRenderer {
  readonly timeline:StoryTimeline;
  readonly config:Readonly<StoryConfig>;
  readonly plan;
  readonly scene=new T.Scene();
  readonly camera:T.PerspectiveCamera;
  readonly gpu:T.WebGLRenderer;
  readonly terrainGeometry:T.BufferGeometry;
  private readonly disposables:{dispose:()=>void}[]=[];
  private readonly marker:T.Mesh;
  private readonly start:T.Mesh;
  private readonly finish:T.Mesh;
  private readonly routeMaterial:T.ShaderMaterial;
  private lost=false;
  private disposed=false;
  private readonly title:string;
  readonly preparedMs:number;
  private readonly detailWeight={value:0};
  private detailBox?:T.Box3;
  private readonly frustum=new T.Frustum();
  private readonly viewProjection=new T.Matrix4();
  constructor(route:Route,readonly terrain:TerrainDataset,readonly width:number,readonly height:number,config:StoryConfig,readonly imagery?:PreparedImagery){
    const begin=performance.now();this.timeline=new StoryTimeline(route,config);this.config=this.timeline.config;
    try{this.plan=createTerrainCameraPlan(this.timeline,terrain,width,height);}catch(error){imagery?.dispose();throw error;}
    const canvas=document.createElement('canvas');
    try{this.gpu=new T.WebGLRenderer({canvas,antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'default'});}
    catch{imagery?.dispose();throw Error('На этом устройстве недоступен WebGL 2 для рельефа. Выберите «Кино · 2D».');}
    this.gpu.setPixelRatio(1);this.gpu.setSize(width,height,false);this.gpu.outputColorSpace=T.SRGBColorSpace;
    this.gpu.debug.onShaderError=()=>{throw Error('Не удалось подготовить 3D-шейдер. Экспорт остановлен; выберите 2D.');};
    canvas.addEventListener('webglcontextlost',this.onLost);
    const night=config.visualStyle==='night';this.scene.background=new T.Color(night?'#071421':'#b9ced2');
    this.scene.fog=new T.Fog(night?'#071421':'#b9ced2',24000,65000);
    this.camera=new T.PerspectiveCamera(46,width/height,5,100000);
    this.camera.setViewOffset(width,height,0,Math.min(width,height)*.04,width,height);
    try{
      if(this.config.terrainSurface==='photo'&&!imagery)throw Error('Снимок не подготовлен. Выберите поверхность DEM.');
      if(imagery){this.disposables.push(imagery);if(!imageryCoversTerrain(imagery.manifest,terrain)||Math.max(imagery.bitmap.width,imagery.bitmap.height,imagery.detailBitmap?.width??0,imagery.detailBitmap?.height??0)>this.gpu.capabilities.maxTextureSize||!!imagery.manifest.detail!==!!imagery.detailBitmap)throw Error('Снимок не покрывает DEM или превышает возможности GPU. Выберите поверхность DEM.');}
      const {level,manifest,heights}=terrain,count=level.width*level.height,positions=new Float32Array(count*3),colors=new Float32Array(count*3),indices=new Uint32Array((level.width-1)*(level.height-1)*6);let indexCount=0;
      const low=new T.Color(night?'#102f3b':'#4e735f'),mid=new T.Color(night?'#31546a':'#9b9e7d'),high=new T.Color(night?'#6c8795':'#dbd9c4'),water=new T.Color(night?'#092431':'#4c91a4');
      for(let y=0;y<level.height;y++)for(let x=0;x<level.width;x++){
        const i=y*level.width+x,h=heights[i];positions.set([manifest.westMeters+x*level.spacingMeters,h===manifest.noData?0:h,-manifest.southMeters-y*level.spacingMeters],i*3);
        // Near-zero cells are styled as the DEM surface, not classified as known
        // water. No lakes/roads/places are invented from height alone.
        const a=h<650?low:mid,b=h<650?mid:high,t=h<650?Math.max(0,h)/650:Math.min(1,(h-650)/800);
        colors[i*3]=h<2?water.r:a.r+(b.r-a.r)*t;colors[i*3+1]=h<2?water.g:a.g+(b.g-a.g)*t;colors[i*3+2]=h<2?water.b:a.b+(b.b-a.b)*t;
        if(x<level.width-1&&y<level.height-1){const corners=[i,i+1,i+level.width,i+level.width+1];if(corners.every(j=>heights[j]!==manifest.noData)){indices.set([i,i+1,i+level.width,i+1,i+level.width+1,i+level.width],indexCount);indexCount+=6;}}
      }
      this.terrainGeometry=new T.BufferGeometry();this.terrainGeometry.setAttribute('position',new T.BufferAttribute(positions,3));this.terrainGeometry.setAttribute('color',new T.BufferAttribute(colors,3));this.terrainGeometry.setIndex(new T.BufferAttribute(indices.subarray(0,indexCount),1));this.terrainGeometry.computeVertexNormals();this.disposables.push(this.terrainGeometry);
      let photo:T.Texture|undefined,detail:T.Texture|undefined;
      const texture=(bitmap:ImageBitmap)=>{const t=new T.Texture(bitmap);t.flipY=false;t.colorSpace=T.SRGBColorSpace;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.wrapS=t.wrapT=T.ClampToEdgeWrapping;t.anisotropy=Math.min(4,this.gpu.capabilities.getMaxAnisotropy());t.generateMipmaps=true;t.needsUpdate=true;this.disposables.push(t);return t;};
      if(imagery){const uv=new Float32Array(count*2);for(let i=0;i<count;i++)uv.set(imageryUV(imagery.manifest,[positions[i*3],-positions[i*3+2]]),i*2);this.terrainGeometry.setAttribute('uv',new T.BufferAttribute(uv,2));photo=texture(imagery.bitmap);
        if(imagery.detailBitmap){detail=texture(imagery.detailBitmap);const b=imagery.manifest.detail!.bounds;this.detailBox=new T.Box3(new T.Vector3(b[0],terrain.min,-b[3]),new T.Vector3(b[2],terrain.max,-b[1]));}
      }
      const terrainMaterial=new T.MeshLambertMaterial({vertexColors:!photo,map:photo??null,side:T.FrontSide});
      terrainMaterial.onBeforeCompile=shader=>{
        shader.uniforms.bounds={value:new T.Vector4(manifest.westMeters,manifest.southMeters,manifest.eastMeters,manifest.northMeters)};shader.uniforms.edgeColor={value:this.scene.background};
        if(detail){shader.uniforms.detailMap={value:detail};shader.uniforms.detailBounds={value:new T.Vector4(...imagery!.manifest.detail!.bounds as [number,number,number,number])};shader.uniforms.detailWeight=this.detailWeight;}
        shader.vertexShader='varying vec3 demPosition;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ndemPosition=position;');
        shader.fragmentShader='varying vec3 demPosition;uniform vec4 bounds;uniform vec3 edgeColor;\n'+shader.fragmentShader
          .replace('#include <color_fragment>',photo?'#include <color_fragment>':`#include <color_fragment>\nfloat contour=abs(fract(demPosition.y/100.0+0.5)-0.5);float aa=max(fwidth(demPosition.y/100.0),0.006);float line=1.0-smoothstep(0.0,aa*1.1,contour);if(demPosition.y>15.0)diffuseColor.rgb=mix(diffuseColor.rgb,${night?'vec3(0.19,0.29,0.33)':'vec3(0.10,0.16,0.12)'},line*${night?'0.23':'0.17'});`)
          .replace('#include <opaque_fragment>','#include <opaque_fragment>\nfloat boundary=min(min(demPosition.x-bounds.x,bounds.z-demPosition.x),min(-demPosition.z-bounds.y,bounds.w+demPosition.z));gl_FragColor.rgb=mix(edgeColor,gl_FragColor.rgb,smoothstep(0.0,1800.0,boundary));');
        if(detail){shader.fragmentShader='uniform sampler2D detailMap;uniform vec4 detailBounds;uniform float detailWeight;\n'+shader.fragmentShader.replace('#include <map_fragment>',`vec4 photograph=texture2D(map,vMapUv);vec2 geographic=vec2(demPosition.x,-demPosition.z);vec2 fineUv=vec2((geographic.x-detailBounds.x)/(detailBounds.z-detailBounds.x),(detailBounds.w-geographic.y)/(detailBounds.w-detailBounds.y));float edge=min(min(geographic.x-detailBounds.x,detailBounds.z-geographic.x),min(geographic.y-detailBounds.y,detailBounds.w-geographic.y));float blend=detailWeight*smoothstep(0.0,450.0,edge);if(blend>0.0)photograph=mix(photograph,texture2D(detailMap,fineUv),blend);diffuseColor*=photograph;`);}
      };
      this.disposables.push(terrainMaterial);this.scene.add(new T.Mesh(this.terrainGeometry,terrainMaterial));
      this.scene.add(new T.HemisphereLight(night?0x9bbdda:0xf8f4db,night?0x03151f:0x344337,night?.8:1));
      const light=new T.DirectionalLight(night?0xa6c8e5:0xfff1d7,night?1.25:1.5);light.position.set(-6000,8000,4500);this.scene.add(light);
      const vertices:number[]=[],distances:number[]=[],triangles:number[]=[];let travelled=0;
      const ribbon=(a:TerrainXY,b:TerrainXY,da:number,db:number)=>{
        const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);if(length===0)return;
        const offset=9,ox=-dy/length*offset,oy=dx/length*offset,base=vertices.length/3;
        for(const [point,d,sign] of [[a,da,-1],[a,da,1],[b,db,-1],[b,db,1]] as const){const xy:TerrainXY=[point[0]+ox*sign,point[1]+oy*sign],h=terrain.meshElevation(xy);if(h===undefined)throw Error('Высоты пути неполны. Выберите 2D.');vertices.push(xy[0],h+10,-xy[1]);distances.push(d);}
        triangles.push(base,base+1,base+2,base+1,base+3,base+2);
      };
      for(const segment of route.segments)for(let i=1;i<segment.length;i++){
        const a=terrain.world(segment[i-1]),b=terrain.world(segment[i]),length=haversine(segment[i-1],segment[i]),steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/(level.spacingMeters/8)));
        if(vertices.length/3+steps*4>400000)throw Error('3D-путь превышает лимит 400 000 вершин. Выберите 2D без изменения GPX.');
        for(let j=0;j<steps;j++)ribbon([a[0]+(b[0]-a[0])*j/steps,a[1]+(b[1]-a[1])*j/steps],[a[0]+(b[0]-a[0])*(j+1)/steps,a[1]+(b[1]-a[1])*(j+1)/steps],travelled+length*j/steps,travelled+length*(j+1)/steps);
        travelled+=length;
      }
      const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setAttribute('routeDistance',new T.Float32BufferAttribute(distances,1));geometry.setIndex(triangles);this.disposables.push(geometry);
      this.routeMaterial=new T.ShaderMaterial({side:T.DoubleSide,depthTest:true,depthWrite:true,uniforms:{progress:{value:0},traceColor:{value:new T.Color(night?'#ffcd69':'#ff682f')},quietColor:{value:new T.Color(night?'#8facb9':'#d6dfc9')}},vertexShader:'attribute float routeDistance; varying float distanceAlong; void main(){distanceAlong=routeDistance;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'uniform float progress;uniform vec3 traceColor;uniform vec3 quietColor;varying float distanceAlong;void main(){gl_FragColor=vec4(distanceAlong<=progress?traceColor:quietColor,1.0);\n#include <colorspace_fragment>\n}'});this.disposables.push(this.routeMaterial);this.scene.add(new T.Mesh(geometry,this.routeMaterial));
      // A depth-tested one-pixel centre trace keeps the metric ribbon legible
      // at overview scale. Independent pairs cannot bridge GPX segments. This
      // adds at most200k vertices, reuses the same progress shader and does not
      // project a screen-space path through occluding mountains.
      const centres=new Float32Array(vertices.length/2),centreDistances=new Float32Array(distances.length/2);
      for(let i=0;i<distances.length;i+=2){for(let axis=0;axis<3;axis++)centres[i/2*3+axis]=(vertices[i*3+axis]+vertices[(i+1)*3+axis])/2;centreDistances[i/2]=distances[i];}
      const centreGeometry=new T.BufferGeometry();centreGeometry.setAttribute('position',new T.BufferAttribute(centres,3));centreGeometry.setAttribute('routeDistance',new T.BufferAttribute(centreDistances,1));this.disposables.push(centreGeometry);this.scene.add(new T.LineSegments(centreGeometry,this.routeMaterial));
      const sphere=new T.SphereGeometry(1,20,12),markerMaterial=new T.MeshBasicMaterial({color:night?'#ffe1a0':'#fff7d8'}),endpointMaterial=new T.MeshBasicMaterial({color:night?'#84d4dc':'#124d54'});this.disposables.push(sphere,markerMaterial,endpointMaterial);
      this.marker=new T.Mesh(sphere,markerMaterial);this.start=new T.Mesh(sphere,endpointMaterial);this.finish=new T.Mesh(sphere,markerMaterial);this.scene.add(this.marker,this.start,this.finish);
      const point=(p:typeof route.segments[0][0],mesh:T.Mesh)=>{const xy=terrain.world(p);mesh.position.set(xy[0],terrain.meshElevation(xy)!+24,-xy[1]);};point(route.segments[0][0],this.start);point(route.segments.at(-1)!.at(-1)!,this.finish);
      const ctx=document.createElement('canvas').getContext('2d')!,unit=Math.min(width,height);ctx.font=`650 ${unit*.059}px ${night?'system-ui':'Georgia'}`;
      const chars=Array.from(config.title),original=chars.length;while(chars.length&&ctx.measureText(chars.join('')+(chars.length<original?'…':'')).width>width-unit*.16)chars.pop();this.title=chars.join('')+(chars.length<original?'…':'');
      // Compile and draw the actual destination-resolution scene before exposing
      // export. No async textures or shader compilation are deferred to a frame.
      const readiness=document.createElement('canvas');try{this.draw(readiness,0);}finally{readiness.width=readiness.height=0;}this.preparedMs=performance.now()-begin;
    }catch(error){this.dispose();throw error;}
  }
  private readonly onLost=(event:Event)=>{event.preventDefault();this.lost=true;};
  draw(canvas:HTMLCanvasElement,seconds:number):void{
    if(this.disposed||this.lost||this.gpu.getContext().isContextLost())throw Error('3D-контекст потерян. Переключите камеру на 2D или выберите 3D повторно.');
    const state=this.timeline.at(seconds),pose=getTerrainCameraStateAt(seconds,this.plan),night=this.config.visualStyle==='night';
    this.camera.position.set(pose.position[0],pose.position[2],-pose.position[1]);this.camera.up.set(0,1,0);this.camera.lookAt(pose.target[0],pose.target[2],-pose.target[1]);
    if(this.imagery){this.camera.updateMatrixWorld();this.viewProjection.multiplyMatrices(this.camera.projectionMatrix,this.camera.matrixWorldInverse);this.frustum.setFromProjectionMatrix(this.viewProjection);this.detailWeight.value=imageryDetailWeight(this.imagery.manifest,Math.hypot(...pose.position.map((v,i)=>v-pose.target[i])),pose.fov,this.height,!!this.detailBox&&this.frustum.intersectsBox(this.detailBox));}
    const xy=this.terrain.world(state.point);this.marker.position.set(xy[0],this.terrain.meshElevation(xy)!+24,-xy[1]);this.routeMaterial.uniforms.progress.value=state.travelledKm;
    for(const mesh of [this.marker,this.start,this.finish])mesh.scale.setScalar(this.camera.position.distanceTo(mesh.position)*.009);
    this.marker.visible=state.markerOpacity>.1;this.finish.visible=state.phase==='OUTRO'||state.routeProgress>.9;
    this.gpu.render(this.scene,this.camera);
    const gl=this.gpu.getContext();if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('3D-кадр не готов.');
    const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('Canvas 2D недоступен.');
    if(canvas.width!==this.width||canvas.height!==this.height){canvas.width=this.width;canvas.height=this.height;}
    ctx.resetTransform();ctx.globalAlpha=1;ctx.drawImage(this.gpu.domElement,0,0);
    const w=this.width,h=this.height,u=Math.min(w,h),p=u*.075,ink=night?'#fff3d6':'#fff9ed';
    const gradient=ctx.createLinearGradient(0,0,0,h*.35);gradient.addColorStop(0,night?'#06111fea':'#173d4be6');gradient.addColorStop(1,'#173d4b00');ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h*.35);
    ctx.fillStyle=ink;ctx.font=`650 ${u*.023}px system-ui`;ctx.fillText('ROUTE STORY  /  TERRAIN',p,p);
    ctx.font=`650 ${u*(state.phase==='INTRO'?.059:.043)}px ${night?'system-ui':'Georgia'}`;ctx.fillText(this.title,p,p+u*.071);
    ctx.font=`500 ${u*.026}px system-ui`;ctx.fillText(state.phase==='INTRO'?'Реальный рельеф · камера над маршрутом':state.phase==='OUTRO'?'Маршрут целиком':`Сегмент ${state.segment+1} / ${this.timeline.route.segments.length}`,p,p+u*.116);
    if(state.phase!=='ROUTE_REPLAY')for(const [mesh,text] of [[this.start,'Старт'],[this.finish,'Финиш']] as const){
      if(!mesh.visible)continue;const v=mesh.position.clone().project(this.camera),x=(v.x+1)*w/2,y=(1-v.y)*h/2;
      if(v.z>1||x<p||x>w-p||y<u*.25||y>h-u*.28||requiredVisibleAltitude(this.terrain,pose.position,[mesh.position.x,-mesh.position.z,mesh.position.y])>pose.position[2]+.01)continue;
      ctx.font=`650 ${u*.022}px system-ui`;const tw=ctx.measureText(text).width,lx=Math.max(p,Math.min(w-p-tw-12,x+u*.023)),ly=y-u*.018;
      ctx.fillStyle=night?'#071521d9':'#173d4bd9';ctx.fillRect(lx-5,ly-u*.026,tw+10,u*.035);ctx.fillStyle=ink;ctx.fillText(text,lx,ly);
    }
    const bottom=ctx.createLinearGradient(0,h-u*.3,0,h);bottom.addColorStop(0,'#07152100');bottom.addColorStop(1,'#071521ed');ctx.fillStyle=bottom;ctx.fillRect(0,h-u*.3,w,u*.3);
    ctx.fillStyle=ink;ctx.font=`650 ${u*.045}px system-ui`;ctx.fillText(`${formatDistance(state.travelledKm,state.totalKm)} / ${formatDistance(state.totalKm)}`,p,h-u*.16);
    ctx.font=`500 ${u*.025}px system-ui`;ctx.fillText(metricLabel(this.timeline.route),p,h-u*.111);
    ctx.font=`500 ${u*.019}px system-ui`;ctx.fillText(`© Kartverket · CC BY 4.0 · DEM ${this.terrain.level.spacingMeters} м · масштаб 1:1`,p,h-u*.063);
    if(this.imagery){ctx.font=`500 ${u*.017}px system-ui`;ctx.fillText(this.imagery.manifest.attribution,p,h-u*.085);}
    ctx.fillStyle=night?'#ffd477':'#ed9a67';ctx.fillRect(p,h-u*.035,(w-p*2)*state.timelineProgress,u*.004);ctx.font=`500 ${u*.017}px system-ui`;ctx.textAlign='right';ctx.fillStyle=ink;ctx.fillText('Matawaka',w-p,h-u*.063);ctx.textAlign='left';
    if(state.markerOpacity<.4&&state.phase==='ROUTE_REPLAY'){ctx.fillStyle=`rgba(7,21,33,${(.4-state.markerOpacity)*2})`;ctx.fillRect(0,0,w,h);}
  }
  dispose():void{
    if(this.disposed)return;this.disposed=true;for(const resource of this.disposables)resource.dispose();this.scene.clear();
    if(this.gpu){this.gpu.domElement.removeEventListener('webglcontextlost',this.onLost);if(!this.gpu.getContext().isContextLost())this.gpu.forceContextLoss();this.gpu.dispose();this.gpu.domElement.width=this.gpu.domElement.height=0;}
  }
}
