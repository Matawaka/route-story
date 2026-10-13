/** Required source credits remain visible independently of optional captions. */
export function drawVideoCredits(ctx:CanvasRenderingContext2D,sources:readonly string[],width:number,height:number):void {
  const credits=[...new Set(sources.filter(Boolean))];if(!credits.length)return;
  const unit=Math.min(width,height),pad=unit*.065,font=Math.max(8,unit*.018),lineHeight=font*1.35,maxWidth=width-pad*2;
  ctx.save();ctx.font=`500 ${font}px system-ui`;ctx.textAlign='left';ctx.textBaseline='bottom';
  const lines:string[]=[];
  for(const credit of credits){let line='';for(const word of credit.split(' ')){const next=line?`${line} ${word}`:word;if(line&&ctx.measureText(next).width>maxWidth){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);}
  const textWidth=Math.min(maxWidth,Math.max(...lines.map(line=>ctx.measureText(line).width))),bottom=height-unit*.03;
  ctx.fillStyle='rgba(7,21,33,.78)';ctx.fillRect(pad-4,bottom-lines.length*lineHeight-3,textWidth+8,lines.length*lineHeight+7);
  ctx.fillStyle='#fff5e5';lines.forEach((line,i)=>ctx.fillText(line,pad,bottom-(lines.length-1-i)*lineHeight,maxWidth));ctx.restore();
}
