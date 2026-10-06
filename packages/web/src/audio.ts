import {placeThemes,familyMotifs,classFamily,midiToHz,degree,type Place,type Lead,type Family} from './music.ts';
import {renderVariants,zhengNote,SR} from './sound-bank.ts';
import {soundsFor,type SoundEvent,type SoundShot} from './sound-events.ts';
import {SAMPLE_GROUPS,SAMPLE_LAYERS,leadIn} from './sound-samples.ts';
import type {Unit} from '../../core/src/index.ts';

export type Cue='select'|'move'|'attack'|'magic'|'turn'|'victory'|'somber'|'defeat'|'breach'|'repair';
export type {SoundEvent} from './sound-events.ts';
/** Pre-rendered recipes in rough order of first use, warmed in the background. */
const WARM=['ui-click','ui-open','page','swing','clash','armor-hit','evade','guard','march','gallop','bow-release','arrow-hit','shout','pain','death','war-drum','enemy-drum','horn','taiko','taiko-small','woodblock','cast','fire','wind','water','thunder','earth','confuse','heal','buff','stab','heavy-hit','neigh','crossbow-release','arrow-volley','robe','oars','wheels','catapult-launch','boulder-hit','ram-hit','repair','crumble','gong','temple-bell','battle-cry','cheer','fanfare','lament'];

/** Soundtrack and effects. Recorded CC0 samples (public/sfx, sound-samples.ts) are
 * layered where a close recording exists; everything else is synthesized offline
 * (sound-bank.ts). Every play varies take, pitch and gain, follows the unit's
 * screen position and shares a generated-hall reverb. */
export class Soundscape {
  private ctx:AudioContext|undefined;
  private master:GainNode|undefined;
  private music:GainNode|undefined;
  private duck:GainNode|undefined;
  private effects:GainNode|undefined;
  private reverb:GainNode|undefined;
  private timer:ReturnType<typeof setInterval>|undefined;
  private bank=new Map<string,AudioBuffer[]>();
  private notes=new Map<number,AudioBuffer>();
  private samples=new Map<string,AudioBuffer[]>();
  private lastTake=new Map<string,number>();
  /** Base URL for recorded samples; tests and offline renders can point elsewhere. */
  sampleBase='sfx/';
  private active=0;
  private beat=0;
  private next=0;
  private lastVariant=new Map<string,number>();
  enabled=true;
  musicVolume=.38;
  effectsVolume=.65;
  combat=false;
  scene:'title'|'camp'|'battle'|'boss'|'crisis'|'result'|'dream'='title';
  place:Place='camp';
  focus:Family|undefined;
  async start(){
    try{
      if(!this.ctx){
        const ctx=this.ctx=new AudioContext();this.master=ctx.createGain();this.master.connect(ctx.destination);
        const comp=ctx.createDynamicsCompressor();comp.threshold.value=-16;comp.ratio.value=3.5;comp.attack.value=.004;comp.release.value=.2;comp.connect(this.master);
        this.duck=ctx.createGain();this.duck.connect(comp);this.music=ctx.createGain();this.music.connect(this.duck);
        this.effects=ctx.createGain();this.effects.connect(comp);
        const conv=ctx.createConvolver();conv.buffer=this.hall(ctx,2.6);this.reverb=ctx.createGain();this.reverb.gain.value=.5;this.reverb.connect(conv);conv.connect(comp);
        this.next=ctx.currentTime+.1;this.timer=setInterval(()=>this.schedule(),100);
        this.warm(0);void this.loadSamples();
      }
      this.update();if(this.enabled)await this.ctx.resume();
    }catch{this.enabled=false;}
  }
  update(){
    if(!this.ctx)return;
    this.master?.gain.setTargetAtTime(this.enabled?.75:0,this.ctx.currentTime,.08);
    this.music?.gain.setTargetAtTime(this.musicVolume,this.ctx.currentTime,.1);
    this.effects?.gain.setTargetAtTime(this.effectsVolume,this.ctx.currentTime,.1);
  }
  async visibility(hidden:boolean){if(!this.ctx)return;if(hidden)await this.ctx.suspend();else if(this.enabled){await this.ctx.resume();this.next=this.ctx.currentTime+.1;}}

  /** Stereo impulse response: early reflections plus a damped noise tail. */
  private hall(ctx:BaseAudioContext,sec:number){
    const len=Math.floor(ctx.sampleRate*sec),ir=ctx.createBuffer(2,len,ctx.sampleRate);
    for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);let lp=0,seed=ch?7:13;
      for(let i=0;i<len;i++){seed=(seed*16807)%2147483647;const w=seed/1073741823.5-1,t=i/len;lp+=(w-lp)*(.5-.42*t);d[i]=lp*Math.exp(-t*6.5);}
      for(const [at,g] of [[.011,.6],[.019,.45],[.029,.35],[.043,.25]] as const){const i=Math.floor(at*(ch?1.13:1)*ctx.sampleRate);d[i]=d[i]!+g;}}
    return ir;
  }
  /** Fetch and decode the recorded groups in the background; synthesis covers the gap. */
  async loadSamples(){
    const trimmed=(ctx:AudioContext,b:AudioBuffer)=>{const skip=leadIn(b.getChannelData(0),b.sampleRate);if(!skip)return b;const out=ctx.createBuffer(b.numberOfChannels,b.length-skip,b.sampleRate);for(let c=0;c<b.numberOfChannels;c++)out.getChannelData(c).set(b.getChannelData(c).subarray(skip));return out;};
    const ctx=this.ctx;if(!ctx)return;
    await Promise.all(Object.entries(SAMPLE_GROUPS).map(async([group,{files}])=>{
      try{const takes=await Promise.all(files.map(async f=>trimmed(ctx,await ctx.decodeAudioData(await (await fetch(this.sampleBase+f)).arrayBuffer()))));this.samples.set(group,takes);}catch{/* keep the synthesized fallback */}
    }));
  }
  private take(group:string){const takes=this.samples.get(group)!;let k=Math.floor(Math.random()*takes.length);if(takes.length>1&&k===this.lastTake.get(group))k=(k+1)%takes.length;this.lastTake.set(group,k);return takes[k]!;}
  /** Render the next recipe in the warm list without blocking a frame for long. */
  private warm(i:number){if(i>=WARM.length)return;setTimeout(()=>{this.load(WARM[i]!);this.warm(i+1);},i<6?0:25);}
  private load(name:string){
    let takes=this.bank.get(name);if(takes||!this.ctx)return takes;
    takes=renderVariants(name,name==='cheer'||name==='battle-cry'?2:3).map(data=>{const b=this.ctx!.createBuffer(1,data.length,SR);b.getChannelData(0).set(data);return b;});
    this.bank.set(name,takes);return takes;
  }
  private note(m:number){
    let b=this.notes.get(m);if(b||!this.ctx)return b;const data=zhengNote(m);b=this.ctx.createBuffer(1,data.length,SR);b.getChannelData(0).set(data);this.notes.set(m,b);return b;
  }
  /** Play one take of a recipe. Takes rotate so the same take never repeats twice in a row. */
  play(name:string,opt:{at?:number;gain?:number;rate?:number;pan?:number;wet?:number;bus?:'effects'|'music';priority?:number}={}){
    const ctx=this.ctx;if(!ctx||!this.enabled)return;
    const layers=SAMPLE_LAYERS[name];
    if(layers&&layers.every(l=>l.synth||this.samples.has(l.group!))){
      const at=opt.at??ctx.currentTime;
      for(const l of layers){const o={...opt,at:at+(l.delay??0),gain:(opt.gain??1)*(l.gain??1),rate:(opt.rate??1)*(l.rate??1)};if(l.synth)this.synth(name,o);else this.voiceBuffer(this.take(l.group!),o);}
      return;
    }
    this.synth(name,opt);
  }
  private synth(name:string,opt:{at?:number;gain?:number;rate?:number;pan?:number;wet?:number;bus?:'effects'|'music';priority?:number}){
    const takes=this.load(name);if(!takes?.length)return;
    if(this.active>18&&(opt.priority??1)<2)return;
    let k=Math.floor(Math.random()*takes.length);if(takes.length>1&&k===this.lastVariant.get(name))k=(k+1)%takes.length;this.lastVariant.set(name,k);
    this.voiceBuffer(takes[k]!,opt);
  }
  private voiceBuffer(buffer:AudioBuffer,opt:{at?:number;gain?:number;rate?:number;pan?:number;wet?:number;bus?:'effects'|'music';priority?:number}){
    const ctx=this.ctx!;if(this.active>18&&(opt.priority??1)<2)return;
    const src=ctx.createBufferSource(),g=ctx.createGain(),pan=ctx.createStereoPanner(),t=opt.at??ctx.currentTime;
    src.buffer=buffer;src.playbackRate.value=(opt.rate??1)*(1+(Math.random()-.5)*.08);
    g.gain.value=(opt.gain??1)*(.88+Math.random()*.24);pan.pan.value=Math.max(-1,Math.min(1,opt.pan??0));
    src.connect(g);g.connect(pan);pan.connect(opt.bus==='music'?this.music!:this.effects!);
    const wet=ctx.createGain();wet.gain.value=opt.wet??.18;pan.connect(wet);wet.connect(this.reverb!);
    this.active++;src.onended=()=>{this.active--;src.disconnect();g.disconnect();pan.disconnect();wet.disconnect();};src.start(t);
  }
  /** Lower the score under a big moment so the hit lands. */
  private duckMusic(depth=.45,hold=.7){if(!this.ctx||!this.duck)return;const t=this.ctx.currentTime;this.duck.gain.cancelScheduledValues(t);this.duck.gain.setTargetAtTime(depth,t,.03);this.duck.gain.setTargetAtTime(1,t+hold,.35);}
  /** High-level battle event → layered sounds (see sound-events.ts). */
  event(e:SoundEvent){
    if(!this.ctx||!this.enabled)return;const t=this.ctx.currentTime;
    const shots:SoundShot[]=soundsFor(e,Math.random);
    for(const s of shots)this.play(s.name,{at:t+(s.delay??0),gain:s.gain??1,rate:s.rate??1,pan:e.pan??0,wet:s.wet??.18,priority:s.priority??1});
    if(shots.some(s=>s.duck))this.duckMusic();
  }

  // ---- music voices ---------------------------------------------------------
  private env(t:number,attack:number,d:number,v:number){const g=this.ctx!.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,v),t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+d);return g;}
  private out(node:AudioNode,bus:AudioNode,wet=0){node.connect(bus);if(wet&&this.reverb){const send=this.ctx!.createGain();send.gain.value=wet;node.connect(send);send.connect(this.reverb);}}
  private osc(type:OscillatorType,f:number,t:number,d:number){const o=this.ctx!.createOscillator();o.type=type;o.frequency.setValueAtTime(f,t);o.start(t);o.stop(t+d+.05);return o;}
  private vibrato(o:OscillatorNode,t:number,d:number,rate=5.2,depth=4){const l=this.osc('sine',rate,t,d),g=this.ctx!.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(depth,t+Math.min(.35,d*.5));l.connect(g);g.connect(o.frequency);}
  private noise(t:number,d:number,v:number,f:number,q:number,bus:AudioNode){
    if(!this.ctx)return;const len=Math.floor(this.ctx.sampleRate*Math.min(2,d+.05)),b=this.ctx.createBuffer(1,len,this.ctx.sampleRate),c=b.getChannelData(0);for(let i=0;i<len;i++)c[i]=Math.random()*2-1;
    const src=this.ctx.createBufferSource(),bq=this.ctx.createBiquadFilter();src.buffer=b;bq.type='bandpass';bq.frequency.value=f;bq.Q.value=q;const g=this.env(t,Math.min(.2,d*.3),d,v);src.connect(bq);bq.connect(g);this.out(g,bus,.3);src.start(t);
  }
  /** Guzheng from pre-rendered Karplus–Strong notes. */
  private zheng(m:number,t:number,v:number,bus=this.music,d=1.8){
    if(!this.ctx||!bus)return;
    // Recorded đàn tranh (a close cousin of the guzheng) when loaded, else Karplus–Strong.
    const rec=this.samples.get('zheng'),pitches=SAMPLE_GROUPS.zheng?.midi;let b:AudioBuffer|undefined,rate=1,gain=v*3;
    if(rec&&pitches){let best=0;pitches.forEach((p,i)=>{if(Math.abs(p-m)<Math.abs(pitches[best]!-m))best=i;});b=rec[best];rate=2**((m-pitches[best]!)/12);gain=v*2.2;}
    else b=this.note(Math.round(m));
    if(!b)return;const src=this.ctx.createBufferSource(),g=this.ctx.createGain();src.buffer=b;src.playbackRate.value=rate;g.gain.setValueAtTime(gain,t);g.gain.setTargetAtTime(.0001,t+d,.25);src.connect(g);this.out(g,bus,.35);src.start(t);src.stop(t+d+1.2);
  }
  private flute(f:number,t:number,d:number,v:number,bus=this.music){
    if(!this.ctx||!bus)return;const o=this.osc('sine',f,t,d),o3=this.osc('sine',f*2,t,d);this.vibrato(o,t,d,5.4,f*.012);
    const g=this.env(t,.08,d,v),g3=this.env(t,.1,d*.7,v*.12);o.connect(g);o3.connect(g3);this.out(g,bus,.5);this.out(g3,bus,.3);this.noise(t,.2,v*.3,f*2,6,bus);
  }
  private erhu(f:number,t:number,d:number,v:number,bus=this.music){
    if(!this.ctx||!bus)return;const o=this.osc('sawtooth',f,t,d),body=this.ctx.createBiquadFilter(),res=this.ctx.createBiquadFilter();
    body.type='lowpass';body.frequency.value=Math.min(3600,f*5);body.Q.value=1.5;res.type='peaking';res.frequency.value=1100;res.Q.value=3;res.gain.value=6;
    o.frequency.setValueAtTime(f*.96,t);o.frequency.linearRampToValueAtTime(f,t+.1);this.vibrato(o,t,d,6,f*.018);
    const g=this.env(t,.18,d,v*.6);o.connect(body);body.connect(res);res.connect(g);this.out(g,bus,.45);
  }
  private horn(f:number,t:number,d:number,v:number,bus=this.music){
    if(!this.ctx||!bus)return;const o=this.osc('sawtooth',f,t,d),o2=this.osc('sawtooth',f*1.004,t,d),lp=this.ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.setValueAtTime(300,t);lp.frequency.linearRampToValueAtTime(1400,t+.2);lp.frequency.linearRampToValueAtTime(700,t+d);
    const g=this.env(t,.12,d,v*.45);o.connect(lp);o2.connect(lp);lp.connect(g);this.out(g,bus,.35);
  }
  private bell(f:number,t:number,v:number,bus=this.music,d=2.6){
    if(!this.ctx||!bus)return;for(const [r,a] of [[1,1],[2.76,.45],[5.4,.22],[8.9,.1]] as const){if(f*r>this.ctx.sampleRate*.45)continue;const o=this.osc('sine',f*r,t,d/r**.3),g=this.env(t,.003,d/r**.3,v*a);o.connect(g);this.out(g,bus,.5);}
  }
  private voice(lead:Lead,f:number,t:number,d:number,v:number){
    const m=69+12*Math.log2(f/440);
    if(lead==='zheng')this.zheng(m,t,v,this.music,d);
    else if(lead==='pipa'){for(let k=0;k<3;k++)this.zheng(m,t+k*.07,v*(1-k*.25),this.music,.35);}
    else if(lead==='flute')this.flute(f,t,d,v);else if(lead==='erhu')this.erhu(f,t,d,v);else if(lead==='horn')this.horn(f,t,d,v);else this.bell(f,t,v,this.music,d);
  }
  private hit(name:string,t:number,v:number,rate=1){this.play(name,{at:t,gain:v*4,rate,bus:'music',wet:.25,priority:0});}

  // ---- score ----------------------------------------------------------------
  private schedule(){
    if(!this.ctx||this.ctx.state!=='running')return;
    if(this.next<this.ctx.currentTime)this.next=this.ctx.currentTime+.05;
    const placed=this.scene==='title'?'title':this.scene==='camp'||this.scene==='dream'?(this.scene==='dream'?'court':'camp'):this.place;
    const theme=placeThemes[placed],boss=this.scene==='boss',fighting=this.combat&&(this.scene==='battle'||this.scene==='crisis'||boss);
    const step=boss?theme.tempo*.85:this.scene==='crisis'?theme.tempo*.8:this.scene==='result'?theme.tempo*1.35:this.scene==='dream'?theme.tempo*1.2:theme.tempo;
    while(this.next<this.ctx.currentTime+.3){
      const t=this.next,b=this.beat,bar=b%16,phrase=theme.phrase,shift=this.scene==='crisis'?-1:0;
      const midi=degree(theme,phrase[b%phrase.length]!+shift)-(this.scene==='dream'?12:0);
      if(bar%8!==7&&(this.scene!=='result'||b%2===0))this.voice(theme.lead,midiToHz(midi),t,theme.lead==='horn'||theme.lead==='erhu'||theme.lead==='flute'?step*1.8:1.6,theme.lead==='bell'?.05:.09);
      if(bar>=8&&bar%4===2)this.voice(theme.counter,midiToHz(degree(theme,phrase[(b+3)%phrase.length]!+5)),t,step*2.4,.04);
      if(bar%4===0)this.zheng(degree(theme,phrase[b%phrase.length]!-5),t,.045,this.music,step*3.5);
      if(bar%8===0)this.pad(theme.pad,theme.root,t,step*8);
      if(fighting||theme.pulse==='patter'||theme.pulse==='temple')this.pulse(theme.pulse,bar,t,step,fighting);
      if(this.scene==='crisis'&&b%2===0){this.hit('taiko-small',t,.12);if(bar===0)this.hit('gong',t,.08,1.15);}
      if(this.scene==='dream'&&bar%8===0){this.flute(midiToHz(midi+12),t,step*4,.03);this.bell(midiToHz(midi+13),t+step*2,.025);}
      if(this.scene==='camp'&&bar===0)this.flute(midiToHz(theme.root+12),t,step*6,.035);
      // Boss: heavy drums on the beat, a gong and a low horn call each phrase.
      if(boss){if(b%2===0)this.hit('taiko',t,bar%8===0?.16:.09,bar%4===0?.9:1.05);if(bar===0){this.hit('gong',t,.09,.9);this.voice('horn',midiToHz(theme.root-12),t,step*6,.06);}if(bar===8)this.voice('horn',midiToHz(theme.root-5),t,step*4,.05);}
      // Title: slow gong and a high zheng answer over the drone.
      if(this.scene==='title'&&bar===0){this.hit('gong',t,.06,1);this.zheng(degree(theme,phrase[(b+5)%phrase.length]!+5),t+step*2,.035,this.music,step*4);}
      if(this.focus&&(this.scene==='battle'||this.scene==='crisis'||boss))this.motif(this.focus,theme.root,bar,t,step);
      this.beat++;this.next+=step;
    }
  }
  private pad(kind:'drone'|'water'|'wind'|'gong',root:number,t:number,len:number){
    if(!this.ctx||!this.music)return;
    if(kind==='water')this.noise(t,len,.025,500,.8,this.music);else if(kind==='wind')this.noise(t,len,.022,700,1.5,this.music);else if(kind==='gong')this.hit('gong',t,.05,midiToHz(root-24)/98);
    for(const m of [root-24,root-17]){const o=this.osc('triangle',midiToHz(m),t,len),g=this.env(t,len*.3,len,.03);o.connect(g);this.out(g,this.music,.25);}
  }
  private pulse(kind:string,bar:number,t:number,step:number,fighting:boolean){
    if(kind==='war'){if(bar%2===0)this.hit('taiko',t,.18);if(bar%4===3)this.hit('taiko-small',t+step/2,.1);if(bar===0)this.hit('gong',t,.06);}
    else if(kind==='march'){if(bar%4===0)this.hit('taiko',t,.15);if(bar%2===1)this.hit('taiko-small',t,.08);if(fighting&&bar%8===6)this.hit('woodblock',t+step/2,.05);}
    else if(kind==='oars'){if(bar%4===0||bar%4===2){this.hit('taiko',t,.16);this.noise(t+step*.35,step*.9,.03,600,1,this.music!);}if(bar===12)this.horn(midiToHz(47),t,step*3,.08);}
    else if(kind==='temple'){if(bar%8===0)this.hit('woodblock',t,.05,.8);if(bar===4)this.hit('temple-bell',t,.03);}
    else if(kind==='patter'){if(bar%2===1)this.hit('woodblock',t,.035);if(fighting&&bar%4===0)this.hit('taiko',t,.12);}
    else if(fighting&&bar%4===0)this.hit('taiko',t,.14);
  }
  private motif(family:Family,root:number,bar:number,t:number,step:number){
    const m=familyMotifs[family],hitOn=m.rhythm[bar%8];if(!hitOn)return;const note=root+m.notes[Math.floor(bar/2)%m.notes.length]!;
    if(family==='horse'){this.hit('woodblock',t,.06,.75);this.hit('woodblock',t+step/3,.04,.7);if(bar%8===0)this.horn(midiToHz(note),t,step*2,.06);}
    else if(family==='foot'){this.hit('taiko-small',t,.08);if(bar%8===0)this.erhu(midiToHz(note),t,step*2,.05);}
    else if(family==='bow')this.zheng(note+12,t,.05,this.music,.5);
    else if(family==='sage')this.bell(midiToHz(note+12),t,.03);
    else if(family==='siege')this.hit('taiko',t,.2,.8);
    else if(family==='boat'){this.noise(t,step*.8,.03,500,1,this.music!);this.zheng(note,t,.04,this.music,1);}
    else this.flute(midiToHz(note+12),t,step*2,.03);
  }

  // ---- compatibility ----------------------------------------------------------
  /** Select a unit: its family takes over the motif layer and answers with a short call. */
  select(cls?:string,pan=0){this.focus=classFamily(cls);this.event({kind:'select',unitClass:cls,pan});}
  cue(kind:Cue,cls?:string,target?:Pick<Unit,'id'|'unitClass'>){
    const map:Record<Cue,SoundEvent['kind']>={select:'select',move:'move',attack:'impact',magic:'strategy',turn:'turn',victory:'victory',somber:'somber',defeat:'defeat',breach:'breach',repair:'repair'};
    this.event({kind:map[kind],unitClass:cls,target,hit:true});
  }
  sfx(kind:Cue){this.cue(kind);}
}
