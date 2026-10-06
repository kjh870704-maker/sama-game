/**
 * 이야기 무대의 도트 인물 — 고전 조조전의 이벤트 인물처럼 작은 2등신 반 인물을 도트로 그린다.
 * 그림 파일 없이 이름·병종으로 옷·관모·투구·수염·지닌 물건을 정해 한 장의 시트로 만든다(한 번 만들고 재사용).
 *
 * 시트: 칸 24×32, 가로 8칸 × 세로 3줄.
 *   줄: 0 앞(비스듬히 오른쪽 아래를 봄) · 1 뒤(오른쪽 위) · 2 옆(오른쪽). 왼쪽은 CSS로 뒤집는다.
 *   칸: 0 서기 · 1 걸음 A · 2 걸음 B · 3 말하기(손을 듦) · 4 절(읍) · 5 무릎 꿇기 · 6 놀람(두 팔) · 7 가리키기(부채·손)
 */
import type {Look} from './scenario-types.ts';
import {factionOf} from './officer-art.ts';

export const PX_W=24,PX_H=32,PX_COLS=8,PX_ROWS=3;
export type PxDir='front'|'back'|'side';
export const PX_ROW:Record<PxDir,number>={front:0,back:1,side:2};
export const PX_POSE={stand:0,walkA:1,walkB:2,talk:3,bow:4,kneel:5,surprise:6,point:7} as const;
export type PxPose=keyof typeof PX_POSE;

type Body='robe'|'armor'|'light'|'monk'|'dress';
type Hat='guan'|'crown'|'helm'|'band'|'bun'|'hood'|'lun'|'hairF'|'bald'|'none';
type Item='fan'|'spear'|'sword'|'bow'|'staff'|'scroll'|'none';
interface Cfg {body:Body;hat:Hat;item:Item;main:string;trim:string;sash:string;skin:string;hair:string;plume:string;beard:'none'|'short'|'long';old:boolean;cape?:string}

const nameHash=(s:string)=>{let h=0;for(const ch of s)h=(h*31+ch.charCodeAt(0))>>>0;return h;};
const pick=<T,>(h:number,xs:readonly T[])=>xs[(h>>>0)%xs.length]!;

/** 이름이 정해진 인물(그린 초상·전신과 같은 옷차림으로). */
const NAMED:Record<string,Partial<Cfg>>={
  '사마의':{body:'robe',hat:'guan',item:'fan',main:'#2c3a6a',trim:'#c8ccd8',sash:'#1a2040',beard:'short'},
  '소년 사마의':{body:'robe',hat:'bun',item:'scroll',main:'#2f4a7a',trim:'#d8dce8',sash:'#1a2a4a',beard:'none'},
  '사마랑':{body:'robe',hat:'guan',item:'none',main:'#4a5a2e',trim:'#d8c890',sash:'#2a3418',beard:'short'},
  '사마방':{body:'robe',hat:'guan',item:'none',main:'#6a4a22',trim:'#e0c070',sash:'#3a2410',beard:'long',old:true},
  '사마사':{body:'armor',hat:'helm',item:'sword',main:'#3a4a7a',trim:'#c0a050',sash:'#1a2040',plume:'#2a3a9a',beard:'none'},
  '사마소':{body:'light',hat:'band',item:'spear',main:'#4a5a8a',trim:'#c0a050',sash:'#22284a',beard:'none'},
  '사마부':{body:'robe',hat:'guan',item:'none',main:'#5a3a5a',trim:'#d8c8a0',sash:'#2a1a2a',beard:'long'},
  '장춘화':{body:'dress',hat:'hairF',item:'none',main:'#8a3a4a',trim:'#e8c8a0',sash:'#4a1a22',beard:'none'},
  '조진':{body:'armor',hat:'helm',item:'sword',main:'#3a4a5a',trim:'#c8a040',sash:'#1a2a30',plume:'#c02a1a',cape:'#1f6a6a',beard:'short'},
  '조조':{body:'robe',hat:'crown',item:'sword',main:'#8a1e14',trim:'#e0b040',sash:'#3a0a06',beard:'short'},
  '조비':{body:'robe',hat:'guan',item:'none',main:'#5a2a7a',trim:'#e0c060',sash:'#2a1040',beard:'none'},
  '조예':{body:'robe',hat:'crown',item:'none',main:'#c8a028',trim:'#8a1e14',sash:'#6a4a10',beard:'none'},
  '조상':{body:'robe',hat:'guan',item:'none',main:'#7a2a2a',trim:'#e0c060',sash:'#3a1010',beard:'short'},
  '허저':{body:'armor',hat:'bald',item:'sword',main:'#4a4a52',trim:'#b03020',sash:'#7a1a10',beard:'long'},
  '장합':{body:'armor',hat:'helm',item:'spear',main:'#33507a',trim:'#c0a050',sash:'#1a2a40',plume:'#2a5ac0',beard:'short'},
  '곽회':{body:'armor',hat:'helm',item:'bow',main:'#3a5a6a',trim:'#c0a050',sash:'#1a3040',plume:'#3a8a9a',beard:'short'},
  '제갈량':{body:'robe',hat:'lun',item:'fan',main:'#e8e4d8',trim:'#3a5a8a',sash:'#2a3a5a',beard:'short'},
  '원소':{body:'armor',hat:'crown',item:'sword',main:'#8a6a20',trim:'#e0c060',sash:'#5a1a10',plume:'#e0c060',beard:'short'},
  '문추':{body:'armor',hat:'helm',item:'spear',main:'#6a5a2a',trim:'#c0a050',sash:'#3a2a10',plume:'#e0c060',beard:'long'},
  '여포':{body:'armor',hat:'helm',item:'spear',main:'#8a2a1a',trim:'#e0b040',sash:'#3a0a06',plume:'#d02a1a',beard:'none'},
  '맹달':{body:'armor',hat:'helm',item:'sword',main:'#3a6a3a',trim:'#c0a050',sash:'#1a3a1a',plume:'#4a9a4a',beard:'short'},
  '강유':{body:'armor',hat:'helm',item:'spear',main:'#2e6a4a',trim:'#c0a050',sash:'#143a24',plume:'#e8e8e0',beard:'none'},
  '등애':{body:'armor',hat:'helm',item:'sword',main:'#4a4a6a',trim:'#c0a050',sash:'#22223a',plume:'#2a3a9a',beard:'short'},
  '손권':{body:'robe',hat:'crown',item:'sword',main:'#9a2a20',trim:'#e0c060',sash:'#4a0e0a',beard:'short'},
  '유비':{body:'robe',hat:'guan',item:'sword',main:'#2e6a3a',trim:'#e0c060',sash:'#143a1a',beard:'short'},
  '헌제':{body:'robe',hat:'crown',item:'none',main:'#c8a028',trim:'#8a1e14',sash:'#6a4a10',beard:'none'},
  '황제':{body:'robe',hat:'crown',item:'none',main:'#c8a028',trim:'#8a1e14',sash:'#6a4a10',beard:'none'},
  '천자':{body:'robe',hat:'crown',item:'none',main:'#c8a028',trim:'#8a1e14',sash:'#6a4a10',beard:'none'},
};
const FACTION_COLOR:Record<string,string>={wei:'#33507a',shu:'#2e6a3a',wu:'#8a2a20',yan:'#6a5a2a'};

/** 이름·병종에서 옷차림을 정한다. */
export function pxConfig(name:string,look:Look):Cfg{
  const h=nameHash(name),f=factionOf(name);
  const team=f?FACTION_COLOR[f]!:pick(h,['#33507a','#3a4a7a','#2e4a6a']);
  const robeCols=['#2c3a6a','#4a5a2e','#5a3a5a','#6a4a22','#2e5a5a','#7a2a2a','#3a3a4a','#5a4a3a'];
  const base:Cfg=(()=>{switch(look){
    case 'strategist':return {body:'robe',hat:'guan',item:'fan',main:pick(h,robeCols),trim:'#d8d0b8',sash:'#1a1a2a'} as Cfg;
    case 'civil':return {body:'robe',hat:'guan',item:'scroll',main:pick(h>>>2,robeCols),trim:'#d8c890',sash:'#2a2010'} as Cfg;
    case 'sage':case 'taoist':return {body:'robe',hat:'lun',item:'staff',main:'#3a6a5a',trim:'#e8e0c8',sash:'#1a3a2a'} as Cfg;
    case 'physician':return {body:'robe',hat:'hood',item:'none',main:'#e0dccc',trim:'#4a8a5a',sash:'#2a5a3a'} as Cfg;
    case 'lady':case 'shaman':return {body:'dress',hat:'hairF',item:'none',main:look==='lady'?'#e8e0d8':'#4a3a5a',trim:'#b03030',sash:'#7a2020'} as Cfg;
    case 'monk':return {body:'monk',hat:'bald',item:'none',main:'#9a6a3a',trim:'#e0c070',sash:'#2a1a10'} as Cfg;
    case 'bandit':case 'assassin':return {body:'light',hat:'band',item:'sword',main:look==='assassin'?'#2a2a30':'#7a4a2a',trim:'#c8b080',sash:'#3a1a10'} as Cfg;
    case 'archer':case 'crossbow':return {body:'light',hat:'helm',item:'bow',main:team,trim:'#c0a050',sash:'#1a2030'} as Cfg;
    case 'spear':return {body:'light',hat:'helm',item:'spear',main:team,trim:'#c0a050',sash:'#1a2030'} as Cfg;
    case 'engineer':return {body:'light',hat:'band',item:'none',main:'#6a5a3a',trim:'#c0a060',sash:'#3a2a10'} as Cfg;
    case 'heavy':case 'cavalry':case 'horseArcher':case 'elephant':return {body:'armor',hat:'helm',item:look==='horseArcher'?'bow':'sword',main:team,trim:'#c0a050',sash:'#1a2030'} as Cfg;
    default:return {body:'light',hat:'helm',item:'sword',main:team,trim:'#c0a050',sash:'#1a2030'} as Cfg;
  }})();
  const plume=pick(h>>>3,['#c02a1a','#2a3a9a','#e0c060','#e8e8e0']);
  const old=/노|늙은|원로|어른/.test(name);
  const cfg:Cfg={...base,skin:pick(h>>>5,['#f0c8a0','#e8bc94','#f2cca8']),hair:old?'#c8c8c0':'#1a1412',plume,beard:/아이|소년|여|녀|부인|아가씨|하녀|시녀/.test(name)?'none':pick(h>>>4,['none','short','short','long'] as const),old,...NAMED[name]};
  if(/여인|부인|시녀|하녀|무녀|아가씨|장춘화|초선/.test(name)&&cfg.body!=='dress'){cfg.body='dress';cfg.hat='hairF';cfg.beard='none';}
  if(cfg.old)cfg.hair='#c8c8c0';
  if(/적군|적병|촉군|오군|붉은/.test(name)&&!NAMED[name]){cfg.main=/촉군/.test(name)?'#2e6a3a':'#8a2a20';cfg.plume='#e8e8e0';}
  return cfg;
}

// ─────────────────────────────────────────────── 그리기
type Px=(x:number,y:number,w:number,h:number,c:string)=>void;
const shadeHex=(hex:string,k:number)=>{const n=parseInt(hex.slice(1),16),f=(v:number)=>Math.max(0,Math.min(255,Math.round(v*k))).toString(16).padStart(2,'0');return `#${f(n>>16&255)}${f(n>>8&255)}${f(n&255)}`;};

/** 한 칸을 그린다. ox·oy는 칸의 왼쪽 위. */
function drawFrame(g:CanvasRenderingContext2D,ox:number,oy:number,c:Cfg,dir:PxDir,pose:PxPose){
  const p:Px=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(ox+x,oy+y,w,h);};
  const dark=shadeHex(c.main,0.62),light=shadeHex(c.main,1.25),skinD=shadeHex(c.skin,0.8);
  const kneel=pose==='kneel',bow=pose==='bow';
  const drop=kneel?6:bow?2:0;                 // 머리·몸이 내려가는 만큼
  const step=pose==='walkA'?1:pose==='walkB'?-1:0;
  const bob=step?-1:0;
  const side=dir==='side',back=dir==='back';
  // ── 다리·발
  if(!kneel){
    if(side){
      const fx=step===1?14:step===-1?9:11,bx=step===1?9:step===-1?14:13;
      p(bx,27,3,3,'#2a1e18');p(fx,28+bob+1,4,2,'#1a1210');
      if(c.body!=='robe'&&c.body!=='dress'){p(bx,24,3,4,dark);p(fx,24,3,5+bob,shadeHex(c.main,0.7));}
    }else{
      const l=step===1?2:0,r=step===-1?2:0;
      if(c.body!=='robe'&&c.body!=='dress'){p(8,24-l,3,5,dark);p(13,24-r,3,5,dark);}
      p(8-(step===1?1:0),28-l+(step===-1?1:0),3,2,'#1a1210');p(13+(step===-1?1:0),28-r+(step===1?1:0),3,2,'#1a1210');
    }
  }
  // ── 몸통
  const top=13+drop+bob;
  const robeLong=c.body==='robe'||c.body==='dress'||c.body==='monk';
  if(c.cape&&!kneel){if(back)p(6,top,12,13,c.cape);else{p(5,top+1,2,11,shadeHex(c.cape,0.8));p(17,top+1,2,11,shadeHex(c.cape,0.8));}}
  if(side){
    const bottom=kneel?29:robeLong?28:24;
    for(let y=top;y<bottom;y++){const t=(y-top)/(bottom-top),half=robeLong?3+Math.round(t*2):3;p(12-half,y,half*2,1,y===bottom-1?dark:c.main);}
    p(9,top,6,1,light);
    if(robeLong)p(14+(step===1?1:0),bottom-3,2,3,dark);
  }else{
    const bottom=kneel?29:robeLong?28:24;
    for(let y=top;y<bottom;y++){const t=(y-top)/(bottom-top),half=robeLong?5+Math.round(t*(kneel?3:2)):5,sway=robeLong&&t>0.7?step:0;
      p(12-half+sway,y,half*2,1,c.main);p(12-half+sway,y,1,1,dark);p(12+half-1+sway,y,1,1,shadeHex(c.main,0.8));if(y>top+1)p(12-half+1+sway,y,1,1,light);}
    // 아래 단·옷주름·발밑 그늘
    p(12-(robeLong?7:5),bottom-1,robeLong?14:10,1,dark);
    if(robeLong){p(10,top+6,1,bottom-top-7,shadeHex(c.main,0.85));if(step)p(12+step*3,bottom-3,2,2,dark);}
    if(!back){
      // 깃(V)과 띠
      p(11,top,2,1,c.trim);p(10,top+1,1,2,c.trim);p(13,top+1,1,2,c.trim);p(11,top+1,2,3,c.body==='armor'||c.body==='light'?shadeHex(c.main,0.85):c.skin);
      p(7,top+6,10,2,c.sash);p(11,top+6,2,2,c.trim);
      if(c.body==='armor'){for(let y=top+2;y<top+6;y+=2)p(8,y,8,1,shadeHex(c.main,1.35));p(6,top,3,3,c.trim);p(15,top,3,3,c.trim);}
      if(c.body==='light')p(8,top+2,8,1,shadeHex(c.main,1.3));
      if(c.body==='dress'){p(8,top+9,8,1,c.trim);}
    }else{p(7,top+6,10,2,c.sash);if(c.body==='armor')p(8,top+1,8,4,shadeHex(c.main,1.15));}
  }
  // ── 팔·손
  const armY=top+1;
  const hand=(x:number,y:number)=>p(x,y,2,2,c.skin);
  const sleeve=(x:number,y:number,len:number)=>{p(x,y,3,len,c.body==='armor'?shadeHex(c.main,0.9):c.main);p(x,y+len-1,3,1,c.trim);};
  if(side){
    if(pose==='talk'||pose==='point'){p(13,armY+1,6,2,c.main);hand(19,armY+1);}
    else if(pose==='surprise'){p(12,armY-5,2,6,c.main);hand(12,armY-7);}
    else if(bow||kneel){p(12,armY+3,4,2,c.main);hand(15,armY+3);}
    else{const sw=step;sleeve(11+sw,armY,7);hand(11+sw,armY+7);}
  }else if(pose==='surprise'){
    p(4,armY-6,3,7,c.main);p(17,armY-6,3,7,c.main);hand(4,armY-8);hand(18,armY-8);
  }else if(bow||kneel){
    // 두 손을 모아 읍한다
    sleeve(6,armY,5);sleeve(15,armY,5);p(9,armY+4,6,3,c.main);hand(11,armY+5);
  }else if(pose==='talk'){
    sleeve(4,armY,8);hand(4,armY+8);p(15,armY+1,4,3,c.main);hand(14,armY+3);
  }else if(pose==='point'){
    sleeve(4,armY,8);hand(4,armY+8);p(16,armY+1,5,2,c.main);hand(20,armY+1);
  }else{
    const sw=step;sleeve(4,armY+(sw>0?-1:0),8);sleeve(17,armY+(sw<0?-1:0),8);
    hand(4,armY+8+(sw>0?-1:0));hand(18,armY+8+(sw<0?-1:0));
  }
  // ── 머리
  const hy=3+drop+bob+(bow?1:0);
  if(side){
    p(8,hy+1,9,9,c.skin);p(8,hy,9,3,c.hair);p(8,hy+1,4,7,c.hair);p(16,hy+6,1,1,skinD);
    p(14,hy+5,1,2,'#1a1210');p(17,hy+6,1,1,c.skin);p(13,hy+8,3,1,skinD);
    if(c.beard!=='none')p(12,hy+9,5,c.beard==='long'?5:2,c.old?'#d8d8d0':c.hair);
  }else if(back){
    p(7,hy,10,10,c.hair);p(8,hy+8,8,2,shadeHex(c.hair,1.3));p(7,hy+2,1,6,shadeHex(c.hair,0.7));
  }else{
    p(7,hy+1,10,9,c.skin);p(7,hy+9,10,1,skinD);p(16,hy+3,1,6,skinD);
    p(7,hy,10,3,c.hair);p(7,hy+1,1,6,c.hair);p(16,hy+1,1,4,c.hair);p(8,hy+3,2,1,c.hair);
    if(!bow){p(9,hy+5,2,2,'#1a1210');p(14,hy+5,1,2,'#1a1210');p(9,hy+5,1,1,'#ffffff');if(pose==='surprise'){p(11,hy+8,2,1,'#6a2a20');}else p(11,hy+8,2,1,shadeHex(c.skin,0.72));}
    else{p(9,hy+6,2,1,'#3a2a20');p(14,hy+6,1,1,'#3a2a20');}
    p(8,hy+7,1,1,'#e8a090');p(15,hy+7,1,1,'#e8a090');
    if(c.beard!=='none'){const bc=c.old?'#d8d8d0':c.hair;p(9,hy+9,6,c.beard==='long'?5:2,bc);p(8,hy+7,1,3,bc);p(15,hy+7,1,3,bc);if(c.beard==='long')p(10,hy+14,4,1,bc);}
  }
  // ── 머리에 쓰는 것
  const hx=side?9:8,hw=side?8:10;
  switch(c.hat){
    case 'guan':p(hx+2,hy-3,5,4,'#141210');p(hx,hy,hw-1,1,'#2a2622');p(hx+3,hy-4,3,1,'#141210');p(hx+3,hy-2,1,2,'#3a3632');break;
    case 'crown':p(hx-2,hy-3,14,2,'#141210');p(hx+1,hy-1,7,2,'#c8a028');p(hx+3,hy-4,3,1,'#c8a028');for(let i=0;i<5;i++)p(hx-1+i*2+(side?1:0),hy-1,1,i%2?3:2,'#e8c858');break;
    case 'helm':p(hx-1,hy-2,hw,5,'#7a7e88');p(hx-1,hy-2,hw,1,'#a8acb4');p(hx-1,hy+2,hw,1,'#4a4e58');p(hx+3,hy-4,2,2,c.plume);p(hx+2,hy-5,4,1,c.plume);p(hx+4,hy-1,1,2,'#c0a050');if(!side&&!back){p(hx-1,hy+3,1,4,'#5a5e68');p(hx+hw-2,hy+3,1,4,'#5a5e68');}break;
    case 'band':p(hx-1,hy+2,hw,1,'#a02a1a');if(side||back)p(hx-1,hy+3,2,3,'#a02a1a');break;
    case 'bun':p(hx+3,hy-1,3,2,c.hair);p(hx+4,hy-2,1,1,'#e0c060');break;
    case 'hood':p(hx-1,hy-1,hw+1,4,'#8a7a5a');p(hx-1,hy+3,1,5,'#8a7a5a');if(!side)p(hx+8,hy+3,1,5,'#8a7a5a');break;
    case 'lun':p(hx+1,hy-1,6,2,'#3a4a5a');p(hx+2,hy-2,4,1,'#3a4a5a');if(back||side)p(hx+(side?-1:3),hy+1,2,5,'#3a4a5a');break;
    case 'hairF':p(hx,hy,side?7:8,3,c.hair);p(hx+(side?0:-1),hy+2,2,9,c.hair);if(!side)p(hx+7,hy+2,2,9,c.hair);p(hx+5,hy-1,2,1,'#e0c060');p(hx+2,hy,1,1,'#c03040');break;
    case 'bald':p(hx+1,hy+1,6,1,shadeHex(c.skin,1.08));break;
    default:break;
  }
  // ── 지닌 물건
  const front=!side&&!back;
  if(c.item==='spear'&&!kneel&&!bow){const x=side?17:(front?20:3);p(x,1+bob,1,29,'#6a4a24');p(x-1,0+bob,3,2,'#d8dce4');p(x,2+bob,1,1,'#ffffff');p(x-1,3+bob,3,1,'#b02a1a');}
  if(c.item==='staff'&&!kneel){const x=side?17:20;p(x,4+bob,1,25,'#5a3a1a');p(x-1,3+bob,3,2,'#8a6a3a');}
  if(c.item==='fan'&&front&&!bow&&!kneel){const fx=pose==='point'?20:pose==='talk'?14:18,fy=pose==='point'?armY-2:pose==='talk'?armY:armY+6;p(fx,fy,3,4,'#f4f2ec');p(fx+1,fy+4,1,2,'#6a4a24');p(fx,fy,3,1,'#d8d4c8');}
  if(c.item==='fan'&&side&&(pose==='talk'||pose==='point')){p(20,armY-2,3,4,'#f4f2ec');}
  if(c.item==='sword'&&!kneel){if(front)p(16,top+7,1,6,'#3a2a1a');if(side)p(9,top+7,1,6,'#3a2a1a');if(back)p(7,top+7,1,6,'#3a2a1a');}
  if(c.item==='bow'&&back){g.strokeStyle='#6a4a24';g.lineWidth=1;g.beginPath();g.arc(ox+12,oy+top+6,7,Math.PI*1.1,Math.PI*1.9);g.stroke();}
  if(c.item==='scroll'&&front&&!kneel&&!bow){p(16,armY+7,4,2,'#efe4c4');p(16,armY+7,1,2,'#8a5a2a');}
}
/** 칸마다 바깥 테두리(진한 갈색 1px)를 두른다 — 도트 인물이 배경에서 떠오르게. */
function outline(g:CanvasRenderingContext2D,w:number,h:number){
  const img=g.getImageData(0,0,w,h),d=img.data,out=new Uint8ClampedArray(d);
  const at=(x:number,y:number)=>x>=0&&y>=0&&x<w&&y<h&&d[(y*w+x)*4+3]!>0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){if(at(x,y))continue;if(at(x-1,y)||at(x+1,y)||at(x,y-1)||at(x,y+1)){const i=(y*w+x)*4;out[i]=26;out[i+1]=18;out[i+2]=14;out[i+3]=255;}}
  img.data.set(out);g.putImageData(img,0,0);
}

const sheets=new Map<string,string>();
/** 인물 시트(data URL). 같은 옷차림은 한 번만 그린다. */
export function pxSheet(name:string,look:Look):string{
  const cfg=pxConfig(name,look),key=JSON.stringify(cfg);
  const hit=sheets.get(key);if(hit)return hit;
  const cv=document.createElement('canvas');cv.width=PX_W*PX_COLS;cv.height=PX_H*PX_ROWS;
  const g=cv.getContext('2d')!;g.imageSmoothingEnabled=false;
  (['front','back','side'] as const).forEach((dir,row)=>(Object.keys(PX_POSE) as PxPose[]).forEach(pose=>drawFrame(g,PX_POSE[pose]*PX_W,row*PX_H,cfg,dir,pose)));
  outline(g,cv.width,cv.height);
  const url=cv.toDataURL('image/png');sheets.set(key,url);return url;
}
/** 시트에서 한 칸을 보이는 CSS. */
export function pxStyle(url:string,dir:PxDir,pose:PxPose){
  return `background-image:url(${url});background-size:${PX_COLS*100}% ${PX_ROWS*100}%;background-position:${PX_POSE[pose]/(PX_COLS-1)*100}% ${PX_ROW[dir]/(PX_ROWS-1)*100}%`;
}

const frames=new Map<string,HTMLCanvasElement>();
/** 배경에 그려 넣는 도트 인물 한 칸(전장의 병사 대열·진영의 보초 등). x·y는 발 디딤 자리. */
export function drawPxFigure(g:CanvasRenderingContext2D,x:number,y:number,name:string,look:Look,dir:PxDir,pose:PxPose,scale:number,flip=false){
  const cfg=pxConfig(name,look),key=JSON.stringify(cfg)+dir+pose;
  let cv=frames.get(key);
  if(!cv){cv=document.createElement('canvas');cv.width=PX_W;cv.height=PX_H;const fg=cv.getContext('2d')!;drawFrame(fg,0,0,cfg,dir,pose);outline(fg,PX_W,PX_H);frames.set(key,cv);}
  g.save();g.imageSmoothingEnabled=false;g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(x,y,8*scale,2.5*scale,0,0,7);g.fill();
  g.translate(Math.round(x),Math.round(y-30*scale));if(flip)g.scale(-1,1);g.drawImage(cv,-12*scale,0,PX_W*scale,PX_H*scale);g.restore();
}
