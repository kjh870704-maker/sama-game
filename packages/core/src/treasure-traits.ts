import {defineTrait,combine,type DamageContext} from './traits.ts';
import type {Unit} from './types.ts';
import {familyOf} from './classes.ts';
type Condition='always'|'physical'|'strategy'|'melee'|'ranged'|'wounded'|'healthy'|'mounted'|'armored'|'caster'|'stationary'|'moving';
type Effect='power'|'pierce'|'critical'|'accuracy'|'reduction'|'evade'|'safe'|'hp'|'mp'|'rough'|'counter';
type Rule=readonly [Effect,number,Condition?];
// Ordered independently of UI catalogues: the first 60 are stable 6 × 10 atlas positions.
export const treasurePowers:Array<{id:string;name:string;rules:Rule[]}>=([
 ['silverarmor','백은 수호',[['reduction',12,'physical']]],
 ['yitian','군주의 검',[['power',12,'healthy']]],
 ['dunjia','기문 보행',[['rough',1],['mp',1]]],
 ['taiping','청령의 숨결',[['hp',4]]],
 ['sevenstar','칠성 관통',[['pierce',18,'physical']]],
 ['dilu','위기 탈출',[['evade',15,'wounded']]],
 ['mengde','용병의 지혜',[['mp',2],['power',5,'strategy']]],
 ['qinggang','청강 파갑',[['pierce',25,'physical']]],
 ['greenDragon','청룡 참격',[['power',18,'mounted']]],
 ['serpentSpear','장판의 기세',[['power',16,'wounded']]],
 ['halberd','무쌍의 예봉',[['critical',15,'physical']]],
 ['bow','보조 조준',[['accuracy',12,'ranged']]],
 ['redHare','질풍 돌격',[['power',12,'moving']]],
 ['fan','백우 운책',[['power',12,'strategy']]],
 ['seal','옥새의 위엄',[['reduction',8],['mp',1]]],
 ['ironArmor','철갑 전열',[['reduction',7,'melee']]],
 ['doubleSwords','쌍검 연계',[['critical',10,'melee'],['accuracy',5,'melee']]],
 ['ancientBlade','강동의 예기',[['power',14,'healthy']]],
 ['leatherArmor','가벼운 피갑',[['evade',7,'ranged']]],
 ['warDrum','진군의 북',[['power',6,'moving']]],
 ['ironSpear','기마 저지',[['power',12,'mounted']]],
 ['flyingBlade','비도 견제',[['safe',1,'ranged']]],
 ['chainArmor','쇄환 방호',[['reduction',12,'ranged']]],
 ['militarySeal','군령 유지',[['mp',1],['reduction',4,'healthy']]],
 ['phoenixSpear','봉황의 예봉',[['pierce',15,'armored']]],
 ['crescentBlade','월아 압박',[['critical',12,'melee']]],
 ['scaleArmor','어린 방진',[['reduction',10,'stationary']]],
 ['swiftSaddle','우회 기동',[['evade',9,'moving']]],
 ['ironBow','강궁 파갑',[['pierce',18,'ranged']]],
 ['repeatingCrossbow','연노 제압',[['power',14,'stationary']]],
 ['rattanArmor','등갑 방호',[['reduction',18,'physical'],['reduction',-12,'strategy']]],
 ['sunzi','허실 간파',[['power',9,'strategy'],['accuracy',7,'strategy']]],
 ['threePointBlade','삼첨 압도',[['power',12,'armored']]],
 ['steelWhip','강편 파쇄',[['pierce',12,'melee'],['accuracy',4,'physical']]],
 ['brightArmor','명광 호신',[['reduction',12,'strategy']]],
 ['sixTeachings','육도 준비',[['mp',2],['accuracy',5,'strategy']]],
 ['longbow','양유 원사',[['power',10,'ranged'],['accuracy',5,'ranged']]],
 ['ironAxe','개산 강타',[['power',15,'armored']]],
 ['blackArmor','현철 버팀',[['reduction',18,'wounded']]],
 ['threeStrategies','삼략 정진',[['mp',3]]],
 ['dragonSpear','용담 돌파',[['safe',1,'moving']]],
 ['twinHalberds','쌍극 응수',[['counter',2]]],
 ['tigerArmor','호위 결의',[['reduction',14,'melee']]],
 ['shadowHorse','그림자 회피',[['evade',12,'ranged']]],
 ['goldHammer','유금 격쇄',[['pierce',22,'armored']]],
 ['moonSword','월광 정밀',[['critical',18,'healthy']]],
 ['craneRobe','학창 명상',[['mp',2],['reduction',6,'strategy']]],
 ['yellowHorse','조황 선회',[['evade',10,'physical']]],
 ['jadeSword','백옥 영기',[['power',10,'strategy'],['accuracy',6,'strategy']]],
 ['tigerSpear','호두 위압',[['power',16,'caster']]],
 ['cloudRobe','운금 유연',[['evade',12,'strategy']]],
 ['qingshu','청낭 양생',[['hp',7]]],
 ['sevenStarFlag','칠성 집중',[['accuracy',15,'strategy']]],
 ['formationScroll','팔진 대응',[['reduction',15,'stationary'],['mp',1]]],
 ['dragonArmor','용린 강건',[['reduction',16,'physical']]],
 ['goldArmor','황금 불굴',[['reduction',20,'wounded'],['hp',2]]],
 ['springAutumn','춘추 대의',[['power',10,'healthy'],['mp',1]]],
 ['jadePendant','백옥 안정',[['hp',3],['mp',1]]],
 ['tigerTally','호부 결전',[['power',14,'wounded'],['accuracy',5,'physical']]],
 ['strategistRobe','군사 정심',[['reduction',15,'strategy'],['mp',1]]],
 // 아래는 그림 판(6×10) 밖의 보물: 그림은 public/treasures/<id>.webp 낱장을 쓴다.
 ['rattanShield','등패 막이',[['reduction',10,'ranged']]],
 ['hujia','호가의 가락',[['hp',2],['mp',1]]],
 ['meteorHammer','유성 강타',[['power',14,'armored']]],
 ['phoenixHelm','봉시의 투구',[['reduction',9,'physical']]],
 ['hookSpear','구겸 걸기',[['power',18,'mounted']]],
 ['baguaMirror','팔괘 반사',[['reduction',14,'strategy']]],
 ['purpleGourd','자금 단약',[['mp',2],['hp',3]]],
 ['bearCloak','흑웅의 가죽',[['reduction',10,'wounded'],['hp',2]]],
 ['phoenixHairpin','봉황의 비녀',[['evade',8],['mp',1]]],
 ['swiftBoots','신행의 걸음',[['rough',1],['evade',6,'moving']]],
 ['zhanmaDao','참마의 일격',[['power',20,'mounted'],['critical',5,'physical']]],
 ['tigerShield','호두 방벽',[['reduction',18,'melee']]],
 ['lionHelm','사자의 위용',[['reduction',12],['hp',3]]],
 ['tortoiseToken','현무의 영패',[['reduction',10,'stationary'],['counter',2]]],
 // 반복 퀘스트(보물 사냥)·도전 퀘스트 보물
 ['bronzeSword','고검의 손맛',[['accuracy',8,'melee']]],
 ['hornBowSmall','각궁 겨냥',[['accuracy',10,'ranged']]],
 ['hideShield','가죽 방패',[['reduction',8,'melee']]],
 ['strawCape','도롱이 엉킴',[['evade',6,'ranged']]],
 ['copperBell','방울 경계',[['mp',1]]],
 ['travelPouch','행낭의 양식',[['hp',2]]],
 ['ringBlade','환수 베기',[['critical',8,'physical']]],
 ['ironRod','철곤 울림',[['power',10,'armored']]],
 ['lamellarVest','미늘 막이',[['reduction',8,'physical']]],
 ['wolfHelm','낭두의 기개',[['reduction',8,'strategy']]],
 ['bambooSlips','죽간의 계책',[['power',8,'strategy']]],
 ['ponyBridle','청총마 박차',[['evade',6,'moving']]],
 ['snakeBlade','사검 파고들기',[['critical',10,'melee']]],
 ['armorPiercer','파갑',[['pierce',15,'physical']]],
 ['boltQuiver','연사 견제',[['accuracy',12,'ranged']]],
 ['mountainArmor','산문 철벽',[['reduction',12,'melee']]],
 ['fireproofRobe','화완 불침',[['reduction',14,'strategy']]],
 ['beaconToken','봉화의 경보',[['reduction',6,'stationary'],['counter',2]]],
 ['wuhuanBow','오환 기사',[['power',12,'ranged']]],
 ['cavalrySaber','마상 환도',[['power',12,'moving']]],
 ['feltArmor','모전 누빔',[['reduction',10,'ranged']]],
 ['horseBarding','마갑 돌파',[['reduction',12,'physical']]],
 ['eagleFeather','해동청의 눈',[['evade',10]]],
 ['nomadSteed','초원의 발굽',[['rough',1],['evade',6,'moving']]],
 ['poisonDarts','독침',[['critical',12,'physical']]],
 ['tuskSpear','상아 관통',[['power',16,'armored']]],
 ['rattanHelm','등투구',[['reduction',14,'ranged']]],
 ['shuBrocade','촉금의 결',[['reduction',12],['hp',3]]],
 ['bronzeDrum','동고의 울림',[['power',8]]],
 ['spiritBead','벽사',[['reduction',16,'strategy'],['mp',1]]],
 ['initiateBadge','첫 문의 각오',[['power',6]]],
 ['sharpSpearhead','예리한 창끝',[['pierce',12,'physical']]],
 ['riverShield','다리목 방패',[['reduction',12,'ranged']]],
 ['summitBanner','정상의 깃발',[['accuracy',10]]],
 ['gatekeeperHalberd','수문장의 극',[['critical',15,'physical'],['power',8,'healthy']]],
 ['gatekeeperArmor','수문장의 갑',[['reduction',15,'melee']]],
 ['courtSeal','정위의 법',[['power',12,'strategy']]],
 ['cliffSandals','잔도 걸음',[['rough',1],['evade',8]]],
 ['fordHorse','도하',[['evade',10,'moving']]],
 ['hundredPaceBow','백보천양',[['accuracy',15,'ranged'],['critical',8,'physical']]],
 ['peerlessSword','천하제일',[['power',15],['critical',10,'physical']]],
 ['overlordArmor','패왕의 기개',[['reduction',18,'physical'],['counter',2]]]
] as Array<[string,string,Rule[]]>).map(([id,name,rules])=>({id,name,rules}));
const conditionText:Record<Condition,string>={always:'',physical:'물리 공격 시 ',strategy:'책략 공격 시 ',melee:'인접 교전 시 ',ranged:'거리 2칸 이상 교전 시 ',wounded:'자신의 HP 50% 이하 시 ',healthy:'자신의 HP 80% 이상 시 ',mounted:'기병 계열 상대 시 ',armored:'보병·창병·중기병·충차 상대 시 ',caster:'책략 병종 상대 시 ',stationary:'이번 차례 이동 전 ',moving:'이번 차례 이동 후 '};
function matches(c:Condition,ctx:DamageContext,self:Unit){switch(c){
 case 'physical':return ctx.kind==='physical';case 'strategy':return ctx.kind==='strategy';case 'melee':return ctx.distance===1;case 'ranged':return ctx.distance>=2;
 case 'wounded':return self.hp<=self.stats.maxHp*.5;case 'healthy':return self.hp>=self.stats.maxHp*.8;
 case 'mounted':return ctx.kind==='physical'&&['cavalry','heavyCav','horseArcher'].includes(familyOf(ctx.defender.unitClass));
 case 'armored':return ctx.kind==='physical'&&['infantry','spearman','heavyCav','ram'].includes(familyOf(ctx.defender.unitClass));
 case 'caster':return ctx.kind==='physical'&&['strategist','fengshui','shaman','taoist','maiden'].includes(familyOf(ctx.defender.unitClass));
 case 'stationary':return !self.movedThisTurn;case 'moving':return !!self.movedThisTurn;default:return true;
}}
export function treasurePowerText(id:string){return treasurePowers.find(t=>t.id===id)?.rules.map(([effect,n,when='always'])=>{
 if(effect==='hp'||effect==='mp')return '자기 차례 시작 '+effect.toUpperCase()+' '+n+' 회복';
 if(effect==='rough')return '험지 이동 비용 무시 (통행 가능 지형만)';
 if(effect==='counter')return '진영 차례마다 반격 최대 '+n+'회';
 const label={power:'공격 위력 +',pierce:'방어 관통 ',critical:'회심 확률 +',accuracy:'명중 +',reduction:n<0?'받는 피해 증가 ':'받는 피해 감소 ',evade:'상대 명중 -',safe:'반격 억제'}[effect];
 return conditionText[when]+label+(effect==='safe'?'':Math.abs(n)+(effect==='accuracy'||effect==='evade'||effect==='critical'?'%p':'%'));
}).join(' · ')??'';}
for(const item of treasurePowers)defineTrait({id:'treasure:'+item.id,name:item.name,description:treasurePowerText(item.id),hooks:{
 onAttack(ctx,self){for(const [effect,n,when='always'] of item.rules)if(matches(when,ctx,self)){if(effect==='power')ctx.attackMul*=1+n/100;if(effect==='pierce')ctx.defenseIgnore=Math.max(ctx.defenseIgnore,n/100);if(effect==='critical')ctx.criticalChance+=n;if(effect==='accuracy')ctx.accuracyMod+=n;if(effect==='safe'&&ctx.kind==='physical')ctx.suppressCounter=true;}},
 onDefend(ctx,self){for(const [effect,n,when='always'] of item.rules)if(matches(when,ctx,self)){if(effect==='reduction')ctx.reduction=n>=0?combine(ctx.reduction,n/100):1-(1-ctx.reduction)*(1-n/100);if(effect==='evade')ctx.accuracyMod-=n;}},
 onTurnStart(self){for(const [effect,n] of item.rules){if(effect==='hp')self.hp=Math.min(self.stats.maxHp,self.hp+n);if(effect==='mp')self.mp=Math.min(self.stats.maxMp,self.mp+n);}},
 ...(item.rules.some(r=>r[0]==='rough')?{ignoresRoughTerrain:true}:{}),
 ...(item.rules.some(r=>r[0]==='counter')?{counterLimit:()=>2}:{})
}});
