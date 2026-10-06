/**
 * 전투 특수효과 — 조조전 온라인 전투 화면처럼 한 번 칠 때마다 화면이 살아 움직이게.
 * 모든 효과는 전장 좌표(px)에서 그려지고, 저마다 ticker로 흘러가다 스스로 사라진다.
 *  · 베기 궤적(초승달 칼빛), 찌르기 섬광, 돌격 충격파
 *  · 방어 방패막(푸른 육각 방패), 회피 잔상
 *  · 책략: 불(화염 기둥·불덩이·불티·그을음), 물(물기둥·물보라·물결 고리), 바람(회오리·나뭇잎),
 *          번개(하늘에서 내리치는 번개·섬광), 땅(솟는 바위·흙먼지), 계략(보랏빛 부적 고리), 회복(초록 빛기둥·반짝임)
 *  · 시전 진(발밑 마법진), 대상 표시(금빛 역삼각), 화면 섬광, 격파 연기
 */
import {Container,Graphics,Text,type Application} from 'pixi.js';

export type Element='fire'|'water'|'wind'|'thunder'|'earth'|'support'|'heal';
type P={x:number;y:number};
const TAU=Math.PI*2;
let seed=1;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};

export class BattleFx {
  constructor(private app:Application,private layer:Container,private overlay:Container,private reduced:boolean){}
  /** ms 동안 매 틀 draw(t: 0→1)를 부르고 끝나면 지운다. */
  private run(ms:number,draw:(g:Graphics,t:number)=>void,blend:'add'|'normal'='add',z=998){
    if(this.reduced)return Promise.resolve();
    const g=new Graphics();g.zIndex=z;g.blendMode=blend;this.layer.addChild(g);const born=performance.now();
    return new Promise<void>(res=>{const tick=()=>{if(g.destroyed){this.app.ticker.remove(tick);res();return;}const t=Math.min(1,(performance.now()-born)/ms);g.clear();draw(g,t);if(t>=1){this.app.ticker.remove(tick);g.destroy();res();}};this.app.ticker.add(tick);});
  }
  /** 입자 무리: 각 입자는 (x,y,vx,vy,size,color,life). */
  private particles(p:P,n:number,o:{speed:number;up:number;gravity:number;life:number;size:[number,number];colors:number[];spread?:number;rise?:number},blend:'add'|'normal'='add'){
    const parts=Array.from({length:n},()=>{const a=rnd()*TAU,v=o.speed*(.35+rnd()*.8);return {x:p.x+(rnd()-.5)*(o.spread??10),y:p.y+(rnd()-.5)*(o.spread??10)*.5,vx:Math.cos(a)*v,vy:Math.sin(a)*v*.55-o.up*(.5+rnd()),s:o.size[0]+rnd()*(o.size[1]-o.size[0]),c:o.colors[Math.floor(rnd()*o.colors.length)]!,l:.6+rnd()*.4};});
    return this.run(o.life,(g,t)=>{const s=t*o.life/1000;for(const q of parts){const k=Math.min(1,t/q.l);if(k>=1)continue;g.circle(q.x+q.vx*s,q.y+q.vy*s+o.gravity*s*s-(o.rise??0)*s,q.s*(1-k*.6)).fill({color:q.c,alpha:(1-k)*.95});}},blend);
  }
  /** 화면 전체가 번쩍인다(번개·회심·큰 책략). */
  screenFlash(color:number,alpha=.55,ms=220){
    if(this.reduced)return;const g=new Graphics();g.rect(0,0,this.app.screen.width,this.app.screen.height).fill(color);g.alpha=alpha;g.blendMode='add';this.overlay.addChild(g);const born=performance.now();
    const tick=()=>{if(g.destroyed){this.app.ticker.remove(tick);return;}const t=(performance.now()-born)/ms;g.alpha=alpha*(1-t);if(t>=1){this.app.ticker.remove(tick);g.destroy();}};this.app.ticker.add(tick);
  }
  /** 대상 위에 금빛 역삼각(겨눔 표시). */
  targetMark(p:P,ms=520){return this.run(ms,(g,t)=>{const bob=Math.sin(t*TAU*2)*3,y=p.y-78+bob,s=1+Math.sin(Math.min(1,t*3)*Math.PI)*.25,a=t<.8?1:1-(t-.8)/.2;
    g.circle(p.x,y,22*s).fill({color:0xffc04a,alpha:.18*a});g.poly([p.x-13*s,y-9*s,p.x+13*s,y-9*s,p.x,y+12*s]).fill({color:0xff4a2a,alpha:a}).stroke({color:0xffe8a0,width:2.5,alpha:a});
    g.poly([p.x-6*s,y-5*s,p.x+6*s,y-5*s,p.x,y+5*s]).fill({color:0xffe8a0,alpha:a});for(let i=0;i<4;i++){const r=26+t*30;g.moveTo(p.x,y-r).lineTo(p.x,y-r-10).stroke({color:0xffd27a,width:2,alpha:a*.6});void i;}});}
  /** 시전자 발밑의 마법진: 두 겹 고리 + 돌아가는 부적 글자 + 솟는 빛. */
  castCircle(p:P,color:number,ms=620){return this.run(ms,(g,t)=>{const a=t<.15?t/.15:t>.75?1-(t-.75)/.25:1,r=30+t*8,rot=t*3;
    g.ellipse(p.x,p.y+6,r,r*.42).stroke({color,width:3,alpha:a});g.ellipse(p.x,p.y+6,r*.72,r*.3).stroke({color:0xffffff,width:1.5,alpha:a*.7});
    for(let i=0;i<8;i++){const q=rot+i/8*TAU;g.rect(p.x+Math.cos(q)*r*.86-2,p.y+6+Math.sin(q)*r*.36-2,4,4).fill({color,alpha:a});}
    for(let i=0;i<6;i++){const q=i/6*TAU+rot;const h=(t*90+i*15)%60;g.circle(p.x+Math.cos(q)*r*.6,p.y+6+Math.sin(q)*r*.25-h,2).fill({color:0xffffff,alpha:a*(1-h/60)});}
    g.ellipse(p.x,p.y+6,r*.9,r*.38).fill({color,alpha:.12*a});});}
  /** 베기: 공격 방향으로 휘두른 초승달 칼빛(두 겹) + 흰 섬광. */
  slash(p:P,dir:number,big=1){const cx=p.x,cy=p.y-26;return this.run(300,(g,t)=>{const a=1-t,sweep=Math.min(1,t*2.2),r=34*big;
    const start=dir-1.4,end=start+2.8*sweep;g.arc(cx,cy,r,start,end).stroke({color:0xffffff,width:9*a*big,alpha:a});g.arc(cx,cy,r*.82,start+.2,end).stroke({color:0xbfe8ff,width:4*a*big,alpha:a*.8});
    if(t<.35)g.circle(cx,cy,(14+t*40)*big).fill({color:0xffffff,alpha:(.35-t)*1.6});});}
  /** 찌르기: 길게 뻗는 창날 섬광. */
  thrust(p:P,ux:number,uy:number,big=1){const cx=p.x,cy=p.y-24;return this.run(260,(g,t)=>{const a=1-t,l=(40+50*t)*big;g.moveTo(cx-ux*l*.6,cy-uy*l*.6).lineTo(cx+ux*l*.5,cy+uy*l*.5).stroke({color:0xffffff,width:7*a,alpha:a});g.moveTo(cx-ux*l*.4,cy-uy*l*.4).lineTo(cx+ux*l*.6,cy+uy*l*.6).stroke({color:0xffe3a0,width:3*a,alpha:a});g.star(cx+ux*l*.5,cy+uy*l*.5,4,14*a*big,4).fill({color:0xffffff,alpha:a});});}
  /** 돌격·둔기: 땅을 치는 충격파 고리 + 흙먼지. */
  shock(p:P,big=1){void this.particles({x:p.x,y:p.y+4},18,{speed:90*big,up:30,gravity:160,life:620,size:[2,5],colors:[0xc9b58a,0xa08c64,0xe8dcc0],spread:20},'normal');
    return this.run(420,(g,t)=>{const a=1-t;g.ellipse(p.x,p.y+8,(18+60*t)*big,(7+22*t)*big).stroke({color:0xfff0c8,width:6*a,alpha:a});g.ellipse(p.x,p.y+8,(10+40*t)*big,(4+14*t)*big).stroke({color:0xd9c39a,width:4*a,alpha:a*.8});});}
  /** 방어 성공: 푸른 육각 방패막. */
  shield(p:P){const cx=p.x,cy=p.y-26;void this.particles({x:cx,y:cy},12,{speed:70,up:10,gravity:0,life:520,size:[1.5,3],colors:[0xbfe8ff,0xffffff,0x6ab8ff]});
    return this.run(560,(g,t)=>{const a=t<.15?t/.15:1-(t-.15)/.85,s=.85+Math.min(1,t*4)*.15,w=30*s,h=36*s;
      const hex=[cx,cy-h,cx+w,cy-h*.5,cx+w,cy+h*.5,cx,cy+h,cx-w,cy+h*.5,cx-w,cy-h*.5];g.poly(hex).fill({color:0x6ab8ff,alpha:.28*a}).stroke({color:0xd8f2ff,width:3,alpha:a});
      g.poly(hex.map((v,i)=>i%2?cy+(v-cy)*.62:cx+(v-cx)*.62)).stroke({color:0x9fd8ff,width:1.5,alpha:a*.8});g.circle(cx,cy,(10+t*40)).stroke({color:0xffffff,width:2,alpha:a*.5});});}
  /** 회피: 하얀 잔상 줄. */
  evade(p:P){return this.run(320,(g,t)=>{const a=1-t;for(let i=0;i<3;i++){const y=p.y-38+i*12;g.moveTo(p.x-18-t*20,y).lineTo(p.x+8-t*20,y).stroke({color:0xffffff,width:2.5,alpha:a*.8});}});}
  /** 격파: 쓰러진 자리에서 피어오르는 연기와 불티. */
  defeat(p:P){void this.particles({x:p.x,y:p.y-10},14,{speed:40,up:60,gravity:-20,life:900,size:[4,9],colors:[0x6a6058,0x8a8078,0x4a4440]},'normal');
    void this.particles({x:p.x,y:p.y-14},10,{speed:60,up:40,gravity:-40,life:700,size:[1.5,3],colors:[0xffb050,0xffe080]});
    return this.run(700,(g,t)=>{g.circle(p.x,p.y-14,10+t*36).fill({color:0xfff0c8,alpha:.3*(1-t)});});}
  /** 회심: 큰 별빛 + 붉은 빛살. */
  critical(p:P){const cx=p.x,cy=p.y-26;return this.run(380,(g,t)=>{const a=1-t;for(let i=0;i<10;i++){const q=i/10*TAU+t;const r1=14,r2=(40+60*t);g.moveTo(cx+Math.cos(q)*r1,cy+Math.sin(q)*r1).lineTo(cx+Math.cos(q)*r2,cy+Math.sin(q)*r2*.7).stroke({color:i%2?0xffe066:0xff5a2a,width:4*a,alpha:a});}
    g.star(cx,cy,8,(24+20*t),10).fill({color:0xfff6c0,alpha:a});});}

  /** 책략(속성별). big: 큰 책략(범위·고위)일수록 크게. */
  element(p:P,el:Element,big=1){
    const cx=p.x,cy=p.y;
    switch(el){
      case 'fire':{
        this.screenFlash(0xff7a20,.18*big,260);
        void this.particles({x:cx,y:cy-20},Math.round(34*big),{speed:120*big,up:80,gravity:-60,life:900,size:[2,5],colors:[0xffd060,0xff8a2a,0xff5a1a,0xfff0a0]});
        void this.particles({x:cx,y:cy-30},10,{speed:30,up:50,gravity:-50,life:1200,size:[6,12],colors:[0x4a3a30,0x6a5a50]},'normal');
        void this.run(900,(g,t)=>{const a=t<.15?t/.15:1-(t-.15)/.85;g.ellipse(cx,cy+6,(26+20*t)*big,(10+8*t)*big).fill({color:0x2a1408,alpha:.35*a});},'normal',990);
        return this.run(900,(g,t)=>{const a=t<.1?t/.1:1-(t-.1)/.9,h=(50+60*Math.min(1,t*3))*big;
          g.circle(cx,cy-24,(18+34*Math.min(1,t*2.5))*big).fill({color:0xff6a1a,alpha:.45*a});g.circle(cx,cy-24,(12+20*Math.min(1,t*2.5))*big).fill({color:0xffd060,alpha:.6*a});
          for(let i=0;i<7;i++){const ox=(i-3)*9*big,w=(10-Math.abs(i-3)*1.6)*big,hh=h*(1-Math.abs(i-3)*.12)*(0.85+Math.sin(t*20+i)*.15);
            g.moveTo(cx+ox-w,cy).quadraticCurveTo(cx+ox-w*1.2,cy-hh*.5,cx+ox+Math.sin(t*14+i)*6,cy-hh).quadraticCurveTo(cx+ox+w*1.2,cy-hh*.5,cx+ox+w,cy).fill({color:i%2?0xff8a2a:0xffb040,alpha:.75*a});}
          g.circle(cx,cy-18,10*big).fill({color:0xfff6c0,alpha:.8*a});});}
      case 'water':{
        void this.particles({x:cx,y:cy-30},Math.round(30*big),{speed:110*big,up:140,gravity:420,life:900,size:[2,4.5],colors:[0xbfe8ff,0x6ab8ff,0xffffff]});
        return this.run(900,(g,t)=>{const a=1-t,col=Math.min(1,t*3),h=(90*big)*(t<.4?col:1-(t-.4)/.6*.7);
          g.roundRect(cx-14*big,cy-h,28*big,h,12).fill({color:0x4aa0e0,alpha:.55*a});g.roundRect(cx-7*big,cy-h,14*big,h,7).fill({color:0xd8f2ff,alpha:.6*a});
          for(let k=0;k<3;k++){const q=Math.max(0,t-k*.12);g.ellipse(cx,cy+6,(16+70*q)*big,(6+26*q)*big).stroke({color:0xbfe8ff,width:3*(1-q),alpha:(1-q)*.9});}});}
      case 'wind':{
        void this.particles({x:cx,y:cy-20},Math.round(20*big),{speed:140*big,up:60,gravity:-20,life:900,size:[2,4],colors:[0x8fcf6a,0xc9e89a,0xffffff]});
        return this.run(900,(g,t)=>{const a=t<.15?t/.15:1-(t-.15)/.85;for(let i=0;i<7;i++){const y=cy-10-i*14*big,r=(14+i*7)*big*(0.8+Math.sin(t*10+i)*.1),rot=t*14+i*.7;
          g.ellipse(cx+Math.sin(t*8+i)*4,y,r,r*.32).stroke({color:i%2?0xe8fff0:0xbfeccf,width:3,alpha:a*.85});g.circle(cx+Math.cos(rot)*r,y+Math.sin(rot)*r*.32,2.5).fill({color:0xffffff,alpha:a});}});}
      case 'thunder':{
        this.screenFlash(0xe8f4ff,.6,180);
        void this.particles({x:cx,y:cy-12},Math.round(24*big),{speed:150*big,up:40,gravity:200,life:600,size:[1.5,3.5],colors:[0xfff6a0,0xffffff,0x9fd8ff]});
        const bolt=(seedX:number)=>{const pts:number[]=[cx+seedX,cy-260];let x=cx+seedX,y=cy-260;while(y<cy-20){y+=24+rnd()*20;x+=(rnd()-.5)*34;pts.push(x,Math.min(y,cy-18));}return pts;};
        const b1=bolt(0),b2=bolt(-30);
        return this.run(520,(g,t)=>{const a=t<.5?1:1-(t-.5)/.5,fl=Math.floor(t*12)%2?1:.55;
          for(const [b,w] of [[b1,6],[b2,3]] as const){g.moveTo(b[0]!,b[1]!);for(let i=2;i<b.length;i+=2)g.lineTo(b[i]!,b[i+1]!);g.stroke({color:0x9fd8ff,width:w*2.4*big,alpha:a*.5*fl});g.moveTo(b[0]!,b[1]!);for(let i=2;i<b.length;i+=2)g.lineTo(b[i]!,b[i+1]!);g.stroke({color:0xffffff,width:w*big,alpha:a*fl});}
          g.circle(cx,cy-18,(20+40*t)*big).fill({color:0xd8f2ff,alpha:.4*a});g.ellipse(cx,cy+6,(20+50*t)*big,(8+18*t)*big).stroke({color:0xfff6a0,width:3,alpha:a});});}
      case 'earth':{
        void this.particles({x:cx,y:cy},Math.round(26*big),{speed:120*big,up:120,gravity:380,life:900,size:[2.5,6],colors:[0x8a7a60,0x6a5a44,0xb8a888]},'normal');
        // 대상을 둘러싸고 솟는 바위 가시: 뒤줄부터 그려 겹침이 맞고, 빛 받는 왼면·그늘진 오른면으로 입체감.
        const spikes=Array.from({length:8},(_,i)=>{const q=i/8*TAU+.2,rx=30*big,ry=13*big;return {x:cx+Math.cos(q)*rx,y:cy+6+Math.sin(q)*ry,h:(30+rnd()*28)*big*(Math.sin(q)>0?1.1:.85),w:(8+rnd()*5)*big,lean:(rnd()-.5)*8*big,d:i*.035};}).sort((a,b)=>a.y-b.y);
        const cracks=Array.from({length:7},(_,i)=>{const q=i/7*TAU+rnd()*.4;return [Math.cos(q),Math.sin(q)*.42,24+rnd()*22] as const;});
        void this.run(900,(g,t)=>{const a=1-t;g.ellipse(cx,cy+6,(22+50*t)*big,(8+18*t)*big).fill({color:0xbfae8a,alpha:.35*a});
          const k=Math.min(1,t*5);for(const [dx,dy,l] of cracks){g.moveTo(cx,cy+6).lineTo(cx+dx*l*k*big*.6,cy+6+dy*l*k*big*.6+2).lineTo(cx+dx*l*k*big,cy+6+dy*l*k*big).stroke({color:0x2a2016,width:2.5,alpha:.75*(t<.7?1:1-(t-.7)/.3)});}},'normal',990);
        return this.run(950,(g,t)=>{const a=t<.72?1:1-(t-.72)/.28;for(const s of spikes){const up=Math.max(0,Math.min(1,(t-s.d)*5));if(!up)continue;const over=up<1?up:1+Math.sin(Math.min(1,(t-s.d-.2)*6)*Math.PI)*.08;const h=s.h*over,tx=s.x+s.lean,ty=s.y-h;
          g.poly([s.x-s.w,s.y,tx,ty,s.x+s.w*.15,s.y+2]).fill({color:0xb39d78,alpha:a});
          g.poly([s.x+s.w*.15,s.y+2,tx,ty,s.x+s.w,s.y]).fill({color:0x5e4c38,alpha:a});
          g.poly([s.x-s.w,s.y,tx,ty,s.x+s.w,s.y,s.x+s.w*.15,s.y+2]).stroke({color:0x2a2016,width:1.6,alpha:a});
          g.moveTo(s.x-s.w*.55,s.y-h*.25).lineTo(tx-s.w*.08,ty+h*.12).stroke({color:0xe8dcc0,width:1.4,alpha:a*.8});
          g.ellipse(s.x,s.y+1,s.w*1.1,s.w*.35).fill({color:0x1a140c,alpha:.35*a});}},'normal',999);}
      case 'support':{
        void this.particles({x:cx,y:cy-10},16,{speed:40,up:60,gravity:-40,life:900,size:[2,4],colors:[0xc9a0ff,0xff9ae0,0xffffff]});
        return this.run(900,(g,t)=>{const a=t<.15?t/.15:1-(t-.15)/.85,r=(30+10*t)*big,rot=-t*4;
          g.ellipse(cx,cy+4,r,r*.42).stroke({color:0xb070ff,width:3,alpha:a});for(let i=0;i<6;i++){const q=rot+i/6*TAU;const x=cx+Math.cos(q)*r*.8,y=cy+4+Math.sin(q)*r*.34;g.rect(x-5,y-14-Math.sin(t*6+i)*4,10,14).fill({color:0xf0e0b0,alpha:a}).stroke({color:0x8a2a2a,width:1.5,alpha:a});}
          for(let i=0;i<5;i++){const y=cy-20-((t*80+i*20)%70);g.circle(cx+Math.sin(i*2+t*6)*14,y,3).fill({color:0xe0b0ff,alpha:a*.8});}});}
      case 'heal':{
        void this.particles({x:cx,y:cy-10},Math.round(22*big),{speed:30,up:70,gravity:-50,life:1000,size:[1.5,3.5],colors:[0xb8ffb0,0xffffff,0xfff6a0],spread:30});
        return this.run(1000,(g,t)=>{const a=t<.2?t/.2:1-(t-.2)/.8;g.roundRect(cx-18*big,cy-110*big,36*big,114*big,18).fill({color:0x8af0a0,alpha:.22*a});g.roundRect(cx-8*big,cy-110*big,16*big,114*big,8).fill({color:0xe8fff0,alpha:.35*a});
          g.ellipse(cx,cy+4,(26+14*t)*big,(10+5*t)*big).stroke({color:0xb8ffb0,width:3,alpha:a});
          for(let i=0;i<4;i++){const y=cy-30-((t*90+i*24)%90),x=cx+Math.sin(i*1.7)*16;g.rect(x-6,y-1.5,12,3).fill({color:0xe8fff0,alpha:a});g.rect(x-1.5,y-6,3,12).fill({color:0xe8fff0,alpha:a});}});}
    }
  }
  /** 큰 피해 숫자: 붉은 글씨 흰 테(회심은 금빛, 회복은 초록). 튀어 올랐다 가라앉는다. */
  number(p:P,value:string,kind:'hurt'|'crit'|'heal'|'miss',offset=0){
    const item=new Container();item.zIndex=1000;item.position.set(p.x+offset,p.y-40);
    const fill=kind==='crit'?0xffd040:kind==='heal'?0x8aff9a:kind==='miss'?0xd8e6f0:0xff4a3a,size=kind==='crit'?40:kind==='miss'?22:32;
    const label=new Text({text:value,style:{fontFamily:'Georgia,"Malgun Gothic",serif',fontSize:size,fontWeight:'900',fill,stroke:{color:kind==='heal'?0x0a3010:0x2a0606,width:6},dropShadow:{color:0x000000,blur:3,distance:3,alpha:.8},letterSpacing:-1}});label.anchor.set(.5);item.addChild(label);
    if(kind==='crit'){const tag=new Text({text:'회심!',style:{fontFamily:'Malgun Gothic',fontSize:15,fontWeight:'900',fill:0xfff6d0,stroke:{color:0x8a2a08,width:4}}});tag.anchor.set(.5);tag.y=-30;item.addChild(tag);}
    this.layer.addChild(item);
    if(this.reduced){setTimeout(()=>item.destroy({children:true}),900);return;}
    const born=performance.now(),tick=()=>{if(item.destroyed){this.app.ticker.remove(tick);return;}const t=(performance.now()-born)/1100;
      const s=t<.1?.3+t/.1*1.3:t<.22?1.6-(t-.1)/.12*.6:1;item.scale.set(s);item.y=p.y-40-Math.min(t,.22)/.22*22-Math.max(0,t-.6)*36;item.x=p.x+offset+(kind==='crit'?Math.sin(t*40)*(1-Math.min(1,t*4))*4:0);item.alpha=t<.7?1:1-(t-.7)/.3;
      if(t>=1){this.app.ticker.remove(tick);item.destroy({children:true});}};this.app.ticker.add(tick);
  }
}
