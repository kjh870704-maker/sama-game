/**
 * 병종 그림(CSS 배경)을 필요할 때만 자른다.
 * 예전에는 첫 화면에서 병종 시트 약 40장을 한꺼번에 잘라 캔버스로 들고 있었다 — 휴대폰(특히 iOS Safari)은
 * 캔버스 메모리 한도를 넘겨 그림이 깨지거나 전장 준비가 실패했다. 이제 화면에 `var(--<시트>-atlas)`가 나타날 때
 * 그 시트 하나만 잘라 CSS 변수로 건다.
 */
import {spriteAtlas,type AtlasFit} from './sprite-atlas.ts';
import {troopSheets,classSheets,loadClassSheets} from './troops.ts';
import type {UnitClass} from '../../core/src/index.ts';

const started=new Set<string>();
const atlasUrl=(canvas:HTMLCanvasElement)=>new Promise<string>(resolve=>canvas.toBlob(blob=>resolve(blob?URL.createObjectURL(blob):canvas.toDataURL())));
type SheetDef={id:string;url:string;rows:number;union?:boolean;alphaCutoff?:number;strictGrid?:boolean;fit?:AtlasFit};

/** `--<id>-atlas`를 아직 걸지 않았으면 그 시트를 잘라 건다(병종 시트·전용 채색 시트만). */
export function needCssAtlas(id:string){
  if(started.has(id)||typeof document==='undefined')return;
  const def=(troopSheets as readonly SheetDef[]).find(s=>s.id===id);
  if(!def&&!id.startsWith('own-'))return;
  started.add(id);
  const cut=def?spriteAtlas(def.url,def.rows,4,!!def.union,def.alphaCutoff??8,!!def.strictGrid,def.fit)
    :loadClassSheets().then(()=>{const url=classSheets.get(id.slice(4) as UnitClass);if(!url)throw new Error('no sheet');return spriteAtlas(url,3);});
  void cut.then(async c=>document.documentElement.style.setProperty('--'+id+'-atlas','url('+await atlasUrl(c)+')')).catch(()=>{started.delete(id);});
}
const VAR=/var\(--([\w-]+?)-atlas\)/g;
function scan(el:Element){
  const st=el.getAttribute('style');if(st&&st.includes('-atlas)'))for(const m of st.matchAll(VAR))needCssAtlas(m[1]!);
}
/** 화면에 새로 붙는 요소의 인라인 스타일을 보고 필요한 병종 그림을 자른다. */
export function watchCssAtlases(root:Element=document.body){
  const walk=(n:Node)=>{if(n.nodeType!==1)return;const el=n as Element;scan(el);el.querySelectorAll('[style*="-atlas)"]').forEach(scan);};
  walk(root);
  new MutationObserver(list=>{for(const m of list){if(m.type==='attributes')scan(m.target as Element);else m.addedNodes.forEach(walk);}})
    .observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['style']});
}
