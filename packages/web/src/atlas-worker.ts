/// <reference lib="webworker" />
import {isolateFrames,outlineFrames,type AtlasFit,type AtlasBody} from './sprite-atlas.ts';

/** Cuts and outlines a sprite sheet off the main thread so the menu stays responsive. */
self.onmessage=async(e:MessageEvent<{id:number;url:string;blob?:Blob;rows:number;columns:number;union?:boolean;alphaCutoff?:number;strictGrid?:boolean;fit?:AtlasFit;body?:AtlasBody}>)=>{
  const {id,url,blob,rows,columns,union,alphaCutoff,strictGrid,fit,body}=e.data;
  try{
    const bitmap=await createImageBitmap(blob??await (await fetch(url)).blob());
    const canvas=new OffscreenCanvas(bitmap.width,bitmap.height),g=canvas.getContext('2d',{willReadFrequently:true})!;g.drawImage(bitmap,0,0);bitmap.close();
    const plain=isolateFrames(g.getImageData(0,0,canvas.width,canvas.height),rows,columns,!!union,alphaCutoff??8,!!strictGrid,fit,body),rim=outlineFrames(plain);
    (self as unknown as DedicatedWorkerGlobalScope).postMessage({id,width:plain.width,height:plain.height,plain:plain.data.buffer,rim:rim.data.buffer},[plain.data.buffer,rim.data.buffer]);
  }catch(error){(self as unknown as DedicatedWorkerGlobalScope).postMessage({id,error:String(error)});}
};
