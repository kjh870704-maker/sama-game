/**
 * Offline sound synthesis for the battle soundtrack. Every function here is pure
 * DSP on Float32Arrays (no Web Audio), seeded for repeatable variants, so sounds
 * can be unit-tested and pre-rendered into AudioBuffers once at start.
 *
 * Building blocks: Karplus–Strong plucked strings, modal synthesis for metal,
 * wood, bells and gongs, membrane drums, formant voices for shouts and the horse,
 * and filtered-noise textures for fire, wind, water and thunder.
 */
export const SR=32000;
export type Rng=()=>number;
export function rng(seed:number):Rng{let a=seed>>>0||1;return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
const n=(sec:number)=>Math.max(1,Math.ceil(sec*SR));
const TAU=Math.PI*2;
const range=(r:Rng,a:number,b:number)=>a+(b-a)*r();

/** RBJ biquad; coefficients can be retuned while running for sweeps. */
export class Biquad{
  private b0=1;private b1=0;private b2=0;private a1=0;private a2=0;private x1=0;private x2=0;private y1=0;private y2=0;
  constructor(public type:'lowpass'|'highpass'|'bandpass'|'peak',f:number,q=.707,gainDb=0){this.set(f,q,gainDb);}
  set(f:number,q=.707,gainDb=0){
    const w=TAU*Math.min(f,SR*.45)/SR,cs=Math.cos(w),al=Math.sin(w)/(2*q),A=10**(gainDb/40);let b0,b1,b2,a0,a1,a2;
    if(this.type==='lowpass'){b0=(1-cs)/2;b1=1-cs;b2=(1-cs)/2;a0=1+al;a1=-2*cs;a2=1-al;}
    else if(this.type==='highpass'){b0=(1+cs)/2;b1=-(1+cs);b2=(1+cs)/2;a0=1+al;a1=-2*cs;a2=1-al;}
    else if(this.type==='bandpass'){b0=al;b1=0;b2=-al;a0=1+al;a1=-2*cs;a2=1-al;}
    else{b0=1+al*A;b1=-2*cs;b2=1-al*A;a0=1+al/A;a1=-2*cs;a2=1-al/A;}
    this.b0=b0/a0;this.b1=b1/a0;this.b2=b2/a0;this.a1=a1/a0;this.a2=a2/a0;return this;
  }
  run(x:number){const y=this.b0*x+this.b1*this.x1+this.b2*this.x2-this.a1*this.y1-this.a2*this.y2;this.x2=this.x1;this.x1=x;this.y2=this.y1;this.y1=y;return y;}
}

export function noise(sec:number,r:Rng){const out=new Float32Array(n(sec));for(let i=0;i<out.length;i++)out[i]=r()*2-1;return out;}
/** Filter a buffer with a cutoff that follows `f(t)` (t in 0..1), retuned every 32 samples. */
export function sweep(src:Float32Array,type:Biquad['type'],f:(t:number)=>number,q=.707):Float32Array{
  const out=new Float32Array(src.length),bq=new Biquad(type,f(0),q);
  for(let i=0;i<src.length;i++){if(i%32===0)bq.set(f(i/src.length),q);out[i]=bq.run(src[i]!);}
  return out;
}
/** Amplitude envelope: attack seconds, then exponential decay to -60 dB over `decay` seconds. */
export function env(buf:Float32Array,attack:number,decay:number,hold=0){
  const a=n(attack),h=n(hold),k=Math.log(1000)/Math.max(1,n(decay));
  for(let i=0;i<buf.length;i++)buf[i]=buf[i]!*(i<a?i/a:i<a+h?1:Math.exp(-(i-a-h)*k));
  return buf;
}
export function mix(len:number,...parts:Array<[Float32Array,number,number?]>){
  const out=new Float32Array(len);
  for(const [buf,gain,at=0] of parts){const o=n(at);for(let i=0;i<buf.length&&i+o<len;i++)out[i+o]=out[i+o]!+buf[i]!*gain;}
  return out;
}
export function normalize(buf:Float32Array,peak=.9){let m=0;for(const v of buf)m=Math.max(m,Math.abs(v));if(m>0)for(let i=0;i<buf.length;i++)buf[i]=buf[i]!/m*peak;return buf;}
/** Soft clip keeps layered impacts loud without hard digital clipping. */
export function saturate(buf:Float32Array,drive=1.5){for(let i=0;i<buf.length;i++)buf[i]=Math.tanh(buf[i]!*drive)/Math.tanh(drive);return buf;}

/** Sine with a frequency curve f(t) and exponential decay. */
export function tone(sec:number,f:(t:number)=>number,decay=sec,attack=.002){
  const out=new Float32Array(n(sec));let ph=0;
  for(let i=0;i<out.length;i++){ph+=TAU*f(i/out.length)/SR;out[i]=Math.sin(ph);}
  return env(out,attack,decay);
}
/** Modal synthesis: a bank of damped sinusoids (metal, wood, bells, gongs). */
export function modal(sec:number,modes:Array<[freq:number,amp:number,decay:number]>,r?:Rng,attack=.001){
  const out=new Float32Array(n(sec));
  for(const [f,a,d] of modes){
    if(f>=SR*.45)continue;const k=Math.log(1000)/n(d),ph0=r?r()*TAU:0,w=TAU*f/SR,at=n(attack);
    for(let i=0;i<out.length;i++){const e=Math.exp(-i*k)*(i<at?i/at:1);if(i>at&&e<1e-4)break;out[i]=out[i]!+a*e*Math.sin(ph0+w*i);}
  }
  return out;
}
/** Karplus–Strong plucked string with brightness and pluck-position comb. */
export function pluck(freq:number,sec:number,r:Rng,brightness=.5,damping=.996){
  const out=new Float32Array(n(sec)),p=Math.max(2,Math.round(SR/freq)),line=new Float32Array(p);
  const lp=new Biquad('lowpass',800+brightness*9000,.6);
  for(let i=0;i<p;i++)line[i]=lp.run(r()*2-1);
  let idx=0,prev=0;
  for(let i=0;i<out.length;i++){const cur=line[idx]!,next=(cur+prev)*.5*damping;prev=cur;line[idx]=next;out[i]=cur;idx=(idx+1)%p;}
  // Pluck position: subtract a delayed copy to carve the comb of a real string.
  const d=Math.round(p*.18);for(let i=out.length-1;i>=d;i--)out[i]=out[i]!-out[i-d]!*.5;
  return env(out,.001,sec,0);
}
/** Taiko-like membrane: falling fundamental, inharmonic modes and a stick click. */
export function drum(f0:number,sec:number,r:Rng,click=.4){
  const body=new Float32Array(n(sec));
  for(const [ratio,amp,dec] of [[1,1,sec],[1.59,.45,sec*.5],[2.14,.3,sec*.35],[2.65,.18,sec*.25]] as const){
    let ph=r()*TAU;const k=Math.log(1000)/n(dec);
    for(let i=0;i<body.length;i++){const f=f0*ratio*(1+.35*Math.exp(-i/n(.03)));ph+=TAU*f/SR;body[i]=body[i]!+amp*Math.exp(-i*k)*Math.sin(ph);}
  }
  const hit=env(sweep(noise(.06,r),'bandpass',()=>1800,1.2),.0005,.04);
  return mix(body.length,[body,1],[hit,click]);
}

const VOWELS:Record<string,[number,number,number]>={a:[730,1090,2440],o:[570,840,2410],u:[300,870,2240],e:[530,1840,2480],i:[270,2290,3010],eu:[350,1350,2400],h:[500,1500,2500]};
/**
 * Formant voice: a jittered glottal saw through three vowel resonances.
 * `pitch(t)` and `vowel(t)` (index blend over the sequence) describe the cry.
 */
export function voice(sec:number,r:Rng,pitch:(t:number)=>number,vowels:string[],opts:{breath?:number;rasp?:number;attack?:number;decay?:number;vibrato?:number;vibratoDepth?:number}={}){
  const len=n(sec),src=new Float32Array(len),seq=vowels.map(v=>VOWELS[v]!);let ph=0,jitter=0;
  for(let i=0;i<len;i++){
    const t=i/len;jitter=jitter*.995+(r()-.5)*.02;
    const vib=Math.sin(TAU*(opts.vibrato??5.5)*i/SR)*(opts.vibratoDepth??.015);
    ph+=pitch(t)*(1+jitter+vib)/SR;ph-=Math.floor(ph);
    const saw=2*ph-1,pulse=ph<.4?1:-.6;
    src[i]=(saw*.6+pulse*.4)*(1+(r()-.5)*(opts.rasp??.15))+(r()*2-1)*(opts.breath??.08);
  }
  const out=new Float32Array(len),filters=[0,1,2].map(k=>new Biquad('bandpass',seq[0]![k]!,6));
  for(let i=0;i<len;i++){
    if(i%32===0){const pos=(i/len)*(seq.length-1),a=Math.floor(pos),b=Math.min(seq.length-1,a+1),f=pos-a;
      filters.forEach((bq,k)=>bq.set(seq[a]![k]!*(1-f)+seq[b]![k]!*f,k===0?5:k===1?7:9));}
    out[i]=filters[0]!.run(src[i]!)*1+filters[1]!.run(src[i]!)*.7+filters[2]!.run(src[i]!)*.35;
  }
  return env(out,opts.attack??.04,opts.decay??sec*.7,sec*.25);
}

// ---------------------------------------------------------------- recipes
type Recipe=(r:Rng)=>Float32Array;
const whoosh=(r:Rng,sec:number,lo:number,hi:number,q=1.4)=>env(sweep(noise(sec,r),'bandpass',t=>lo+(hi-lo)*Math.sin(Math.PI*t),q),sec*.35,sec*.6);
const metal=(r:Rng,base:number,sec:number)=>modal(sec,[1,1.47,2.09,2.56,3.2,4.1,5.3].map((k,i)=>[base*k*range(r,.97,1.03),[1,.7,.55,.4,.3,.2,.12][i]!,sec*[1,.8,.6,.45,.35,.25,.18][i]!] as [number,number,number]),r);
const wood=(r:Rng,base:number,sec:number)=>modal(sec,[[base,1,sec],[base*2.3,.5,sec*.6],[base*3.9,.3,sec*.4],[base*5.4,.15,sec*.3]].map(([f,a,d])=>[f!*range(r,.95,1.05),a!,d!] as [number,number,number]),r);
const thump=(r:Rng,f:number,sec:number)=>tone(sec,t=>f*(1+.8*Math.exp(-t*25))*range(r,.97,1.03),sec*.8);
const crunch=(r:Rng,sec:number,f=900)=>env(sweep(noise(sec,r),'lowpass',t=>f*(1-t*.6),.8),.001,sec*.7);
const clicks=(r:Rng,sec:number,count:number,f=3000)=>{const out=new Float32Array(n(sec));for(let k=0;k<count;k++){const at=Math.floor(r()*out.length*.9),c=env(sweep(noise(.012,r),'bandpass',()=>f*range(r,.6,1.4),3),.0003,.01);for(let i=0;i<c.length&&at+i<out.length;i++)out[at+i]=out[at+i]!+c[i]!*range(r,.3,1);}return out;};
const gallop=(r:Rng,beats=3)=>{const len=.38*beats+.2,parts:Array<[Float32Array,number,number]>=[];for(let b=0;b<beats;b++)for(const o of [0,.08,.16])parts.push([mix(n(.12),[thump(r,range(r,110,150),.09),.9],[env(sweep(noise(.05,r),'bandpass',()=>range(r,900,1600),1.5),.0005,.03),.6]),range(r,.6,1),b*.38+o+range(r,-.012,.012)]);parts.push([env(sweep(noise(len,r),'lowpass',()=>500),.1,len),.15,0]);return mix(n(len),...parts);};
const shout=(r:Rng,f0:number,sec:number)=>voice(sec,r,t=>f0*(1+.25*Math.sin(Math.min(1,t*3)*Math.PI/2))*(1-.15*t),['h','a','a','o'],{breath:.2,rasp:.25,attack:.02,decay:sec*.6});
const crowd=(r:Rng,sec:number,voices=7)=>mix(n(sec+.3),...Array.from({length:voices},()=>[voice(sec,r,t=>range(r,110,190)*(1+.3*Math.min(1,t*4))*(1-.1*t),['u','a','a','a'],{breath:.25,rasp:.3,attack:.08,decay:sec*.5}),range(r,.4,.8),range(r,0,.25)] as [Float32Array,number,number]));
const splashes=(r:Rng,sec:number,count:number)=>{const out=new Float32Array(n(sec));for(let k=0;k<count;k++){const at=Math.floor(r()*out.length*.7),f=range(r,350,1100),b=tone(range(r,.02,.05),t=>f*(1+t*1.5),.03);for(let i=0;i<b.length&&at+i<out.length;i++)out[at+i]=out[at+i]!+b[i]!*range(r,.2,.6);}return out;};
const rumble=(r:Rng,sec:number,f=140)=>{const b=sweep(noise(sec,r),'lowpass',()=>f,.9),out=new Float32Array(b.length);let a=0;for(let i=0;i<b.length;i++){if(i%800===0)a=range(r,.3,1);out[i]=b[i]!*a;}return env(sweep(out,'lowpass',()=>f*1.5),.05,sec*.85);};
const bell=(r:Rng,f:number,sec:number)=>modal(sec,[[f,1,sec],[f*2.76,.45,sec*.6],[f*5.4,.22,sec*.35],[f*8.93,.1,sec*.2]],r);
const pentatonic=[0,2,4,7,9,12,14,16];
const midi=(m:number)=>440*2**((m-69)/12);

export const recipes:Record<string,Recipe>={
  // Melee: swing, contact and the armour/blade ring underneath.
  swing:r=>normalize(whoosh(r,.28,500,3200,1.6),.8),
  'clash':r=>normalize(saturate(mix(n(.9),[metal(r,range(r,1700,2500),.8),.55],[env(sweep(noise(.03,r),'highpass',()=>2500),.0003,.02),.8],[thump(r,180,.12),.4],[whoosh(r,.12,1500,4000,2),.3])),.9),
  'stab':r=>normalize(mix(n(.45),[whoosh(r,.16,800,2600,2),.5],[thump(r,150,.15),.9],[crunch(r,.18,1400),.6],[metal(r,range(r,2800,3600),.2),.15,.05]),.9),
  'armor-hit':r=>normalize(saturate(mix(n(.6),[thump(r,95,.25),1],[crunch(r,.25,1200),.7],[metal(r,range(r,1100,1500),.35),.25,.01],[clicks(r,.4,5,4200),.3,.03])),.9),
  'heavy-hit':r=>normalize(saturate(mix(n(1.1),[thump(r,60,.5),1.2],[crunch(r,.45,700),.8],[clicks(r,.9,14,2500),.35,.04],[metal(r,range(r,700,900),.6),.25])),.95),
  'evade':r=>normalize(mix(n(.4),[whoosh(r,.22,900,4500,2.2),.8],[whoosh(r,.18,600,2400,1.5),.4,.08]),.7),
  'guard':r=>normalize(saturate(mix(n(.7),[wood(r,range(r,170,220),.25),1],[metal(r,range(r,1300,1700),.5),.35],[thump(r,120,.15),.6])),.9),
  // Ranged.
  'bow-release':r=>normalize(mix(n(.5),[pluck(range(r,95,120),.35,r,.8,.985),.7],[whoosh(r,.3,1200,4200,1.8),.45,.04]),.8),
  'crossbow-release':r=>normalize(mix(n(.5),[wood(r,900,.05),.6],[clicks(r,.06,2,5000),.5],[pluck(range(r,140,170),.25,r,.9,.98),.6,.02],[whoosh(r,.25,1500,5000,2),.4,.05]),.85),
  'arrow-hit':r=>normalize(mix(n(.45),[wood(r,range(r,280,360),.18),.9],[crunch(r,.08,2000),.5],[thump(r,130,.08),.4]),.8),
  'arrow-volley':r=>normalize(mix(n(.9),...Array.from({length:6},(_,k)=>[whoosh(r,.3,1200+k*200,4500,2),.4,k*.05+r()*.03] as [Float32Array,number,number]),[mix(n(.5),...Array.from({length:4},(_,k)=>[wood(r,range(r,260,380),.12),.5,k*.06+r()*.03] as [Float32Array,number,number])),.8,.45]),.85),
  // Siege engines.
  'catapult-launch':r=>normalize(mix(n(1),[wood(r,90,.4),.8],[clicks(r,.3,6,1800),.4],[thump(r,70,.3),.9,.05],[whoosh(r,.6,250,1400,1.2),.6,.1]),.9),
  'boulder-hit':r=>normalize(saturate(mix(n(1.4),[thump(r,48,.7),1.3],[crunch(r,.6,600),.9],[clicks(r,1.2,22,2200),.45,.05],[rumble(r,1.2,120),.5,.05])),.95),
  'ram-hit':r=>normalize(saturate(mix(n(1.5),[thump(r,42,.8),1.4],[wood(r,70,.6),.9],[crunch(r,.5,500),.7],[metal(r,range(r,500,650),1),.3],[clicks(r,1.2,16,1600),.4,.05]),2),.95),
  'wheels':r=>{const len=.9,out=mix(n(len),[rumble(r,len,90),.8],[clicks(r,len,10,700),.5]);const creak=sweep(noise(len,r),'bandpass',t=>320+120*Math.sin(t*TAU*3),12);return normalize(mix(n(len),[out,1],[env(creak,.1,len),.4]),.8);},
  // Mounts and feet.
  'gallop':r=>normalize(gallop(r,3),.85),
  'neigh':r=>normalize(mix(n(1.2),[voice(1,r,t=>(t<.25?700+t*1200:1000-(t-.25)*700)*range(r,.95,1.05),['i','e','e','a'],{breath:.25,rasp:.4,vibrato:16,vibratoDepth:.06,attack:.03,decay:.7}),1],[env(sweep(noise(.25,r),'lowpass',()=>900),.01,.2),.4,.95]),.75),
  'march':r=>{const parts:Array<[Float32Array,number,number]>=[];for(let k=0;k<4;k++){parts.push([mix(n(.15),[thump(r,range(r,85,110),.1),.8],[crunch(r,.08,1000),.4]),range(r,.6,.9),k*.17+range(r,0,.02)]);parts.push([clicks(r,.1,3,5200),.25,k*.17+.02]);}return normalize(mix(n(.85),...parts),.75);},
  'robe':r=>normalize(env(sweep(noise(.5,r),'bandpass',t=>2500+1500*Math.sin(t*Math.PI),.9),.12,.3),.5),
  'oars':r=>normalize(mix(n(1),[wood(r,240,.15),.4],[env(sweep(noise(.5,r),'lowpass',t=>1800-t*1200),.02,.4),.7,.05],[splashes(r,.6,10),.5,.08],[wood(r,240,.15),.35,.5],[env(sweep(noise(.4,r),'lowpass',t=>1600-t*1000),.02,.35),.5,.55]),.8),
  // Voices.
  'shout':r=>normalize(shout(r,range(r,150,210),range(r,.28,.4)),.8),
  'pain':r=>normalize(voice(.35,r,t=>range(r,190,240)*(1+.3*t),['eu','a'],{breath:.25,rasp:.35,attack:.01,decay:.25}),.75),
  'death':r=>normalize(voice(.9,r,t=>(t<.2?260+t*500:360-(t-.2)*250)*range(r,.92,1.08),['eu','a','a','o'],{breath:.3,rasp:.45,attack:.01,decay:.6,vibrato:7,vibratoDepth:.04}),.8),
  'battle-cry':r=>normalize(saturate(crowd(r,1.4,8),1.3),.85),
  'cheer':r=>normalize(saturate(mix(n(2),[crowd(r,1.6,9),1],[crowd(r,1.2,6),.6,.4])),.85),
  // Elements (strategies).
  'fire':r=>{const len=1.6;const roar=env(sweep(noise(len,r),'lowpass',t=>500+900*Math.sin(Math.min(1,t*2)*Math.PI/2)*(1-t*.5),.9),.15,len*.8,.2);return normalize(saturate(mix(n(len),[whoosh(r,.5,250,3500,1),.8],[roar,1],[clicks(r,len,45,3500),.5,.1],[thump(r,70,.3),.5])),.9);},
  'wind':r=>{const len=1.5;const gust=env(sweep(noise(len,r),'bandpass',t=>400+1400*Math.sin(t*Math.PI)**2,5),.3,len*.7,.2);const whistle=env(sweep(noise(len,r),'bandpass',t=>900+800*Math.sin(t*TAU),28),.3,len*.6,.2);return normalize(mix(n(len),[gust,1],[whistle,.6],[whoosh(r,.6,300,2000,1),.4,.6]),.85);},
  'water':r=>{const len=2;return normalize(saturate(mix(n(len),[env(sweep(noise(.6,r),'lowpass',t=>4000-t*3000,.8),.005,.5),1],[splashes(r,1.2,40),.6,.05],[rumble(r,1.6,160),.7,.1],[env(sweep(noise(len,r),'bandpass',t=>900-t*500,1.2),.3,len*.8),.5,.2])),.9);},
  'thunder':r=>{const len=2.6;const crack=env(sweep(noise(.25,r),'highpass',()=>900,.7),.0005,.18);return normalize(saturate(mix(n(len),[crack,1],[clicks(r,.4,20,4000),.6],[rumble(r,len,110),1.2,.05],[thump(r,45,.6),.6,.02]),1.8),.95);},
  'earth':r=>{const len=1.4;const chains=mix(n(len),...Array.from({length:10},()=>[metal(r,range(r,2200,3400),.15),range(r,.1,.3),range(r,0,len*.7)] as [Float32Array,number,number]));return normalize(mix(n(len),[rumble(r,len,220),1],[clicks(r,len,30,900),.6],[chains,.6],[thump(r,55,.4),.6]),.9);},
  'confuse':r=>{const len=1.4,out=new Float32Array(n(len)),top=range(r,800,1050),wob=range(r,5,9);let ph=0,ph2=0;for(let i=0;i<out.length;i++){const t=i/out.length,f=top-500*t+80*Math.sin(TAU*wob*i/SR);ph+=TAU*f/SR;ph2+=TAU*f*1.013/SR;out[i]=(Math.sin(ph)+Math.sin(ph2)*.8)*Math.min(1,t*6)*(1-t);}return normalize(mix(n(len),[out,.6],[bell(r,midi(72+Math.floor(r()*3)),1.2),.25,.1],[bell(r,midi(71+Math.floor(r()*3)),1.2),.25,.4]),.75);},
  'heal':r=>{const len=1.8,root=79+[0,2,-3][Math.floor(r()*3)]!,parts:Array<[Float32Array,number,number]>=pentatonic.slice(2).map((s,k)=>[bell(r,midi(root+s),1.1),.35,k*range(r,.055,.085)]);const pad=env(mix(n(len),[tone(len,()=>midi(67),len),1],[tone(len,()=>midi(74),len),.7],[tone(len,()=>midi(79),len),.4]),.35,len*.8,.2);return normalize(mix(n(len),[pad,.5],...parts,[clicks(r,len,25,7000),.12,.2]),.8);},
  'buff':r=>normalize(mix(n(2),[modal(2,[[110,1,2],[155,.6,1.6],[209,.5,1.2],[255,.35,1],[322,.25,.8]],r,.08),.8],[drum(85,.8,r,.3),.6],...pentatonic.slice(0,4).map((s,k)=>[bell(r,midi(74+s),.8),.3,.25+k*.08] as [Float32Array,number,number])),.85),
  'repair':r=>normalize(mix(n(1),...[0,.28,.56].map(t=>[mix(n(.3),[wood(r,range(r,600,760),.15),.8],[metal(r,range(r,2500,3000),.12),.25]),1,t] as [Float32Array,number,number])),.8),
  'cast':r=>normalize(mix(n(.8),[whoosh(r,.7,300,2200,3),.5],...pentatonic.slice(0,5).map((s,k)=>[bell(r,midi(84+s),.35),.18,k*.06] as [Float32Array,number,number])),.7),
  // Structures and ceremony.
  'crumble':r=>normalize(saturate(mix(n(2),[rumble(r,1.8,180),1],[clicks(r,1.8,60,1600),.7],[wood(r,90,.5),.6,.1],[thump(r,45,.8),1])),.95),
  'gong':r=>normalize(modal(4,[1,1.41,1.9,2.32,2.76,3.3,3.9,4.6,5.5].flatMap((k,i)=>[[98*k,1/(i+1),4/(1+i*.4)],[98*k*1.006,.6/(i+1),3.5/(1+i*.4)]] as Array<[number,number,number]>),r,.01),.85),
  'war-drum':r=>normalize(mix(n(1.6),[drum(range(r,68,78),1.1,r),1],[drum(range(r,68,78),1,r),.8,.32],[drum(range(r,72,82),1.2,r),1,.62]),.9),
  'enemy-drum':r=>normalize(mix(n(1.8),[drum(range(r,55,62),1.4,r,.25),1],[drum(range(r,55,62),1.4,r,.25),.9,.5]),.9),
  'horn':r=>{const len=range(r,1.6,2),base=range(r,165,190),out=new Float32Array(n(len));let ph=0;for(let i=0;i<out.length;i++){const t=i/out.length,f=(t<.15?base*.83+t*base*1.1:base)*(1+.006*Math.sin(TAU*5*i/SR));ph+=f/SR;ph-=Math.floor(ph);out[i]=(2*ph-1);}return normalize(env(sweep(out,'lowpass',t=>500+1400*Math.min(1,t*4)*(1-t*.5),1.2),.12,len*.7,.6),.8);},
  'fanfare':r=>{const notes=[0,4,7,12,16];return normalize(mix(n(3),...notes.map((s,k)=>{const len=k===notes.length-1?1.4:.5,out=new Float32Array(n(len));let ph=0;for(let i=0;i<out.length;i++){ph+=midi(55+s)/SR;ph-=Math.floor(ph);out[i]=2*ph-1;}return [env(sweep(out,'lowpass',()=>2200,1),.03,len*.8,len*.3),.5,k*.18] as [Float32Array,number,number];}),[modal(2.5,[[110,1,2.5],[156,.6,2],[210,.4,1.5]],r,.01),.5,.75],[drum(70,1,r),.8,.75]),.9);},
  'lament':r=>normalize(mix(n(3),...[0,-2,-5,-9].map((s,k)=>[voice(.8,r,()=>midi(62+s),['o','u'],{breath:.15,rasp:.05,vibrato:6,vibratoDepth:.02,attack:.12,decay:.6}),.5,k*.5] as [Float32Array,number,number]),[modal(2.5,[[73,1,2.5],[103,.6,2]],r,.02),.4,1.6]),.85),
  // Score percussion: single strokes the music scheduler places on the beat.
  'taiko':r=>normalize(drum(range(r,66,76),1.1,r,.35),.9),
  'taiko-small':r=>normalize(drum(range(r,120,140),.45,r,.5),.8),
  'woodblock':r=>normalize(wood(r,range(r,820,980),.09),.7),
  'temple-bell':r=>normalize(bell(r,midi(81+Math.floor(r()*3)),2.2),.7),
  // Interface.
  'ui-click':r=>normalize(wood(r,range(r,1100,1300),.06),.5),
  'ui-open':r=>normalize(mix(n(.6),...[0,2,4].map((s,k)=>[pluck(midi(74+pentatonic[s]!),.5,r,.7),.5,k*.04] as [Float32Array,number,number])),.6),
  'page':r=>normalize(env(sweep(noise(.35,r),'highpass',t=>2500+2000*t,.7),.05,.25),.4),
};
export const recipeNames=Object.keys(recipes);
/** Render `variants` takes of a recipe with distinct seeds. */
export function renderVariants(name:string,variants=3,seed=1):Float32Array[]{
  const make=recipes[name];if(!make)throw new Error('알 수 없는 효과음: '+name);
  let h=seed;for(const c of name)h=(h*31+c.charCodeAt(0))>>>0;
  return Array.from({length:variants},(_,k)=>make(rng(h+k*7919)));
}
/** One guzheng note for the score. */
export function zhengNote(m:number,sec=2.2,seed=1){const r=rng(seed*97+m);return normalize(mix(n(sec),[pluck(midi(m),sec,r,.55,.9975),1],[pluck(midi(m)*2.003,sec*.5,r,.3,.995),.12]),.8);}
