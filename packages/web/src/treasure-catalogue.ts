import type {Treasure,GearSlot} from './progression.ts';
// Four discoveries per side story. Stable IDs preserve equipment saves.
const entries:Array<[string,string,GearSlot,number,number,string]>=[
 ['doubleSwords','쌍고검','weapon',3,1,'Q01'],['ancientBlade','고정도','weapon',3,4,'Q01'],['leatherArmor','피갑','armor',1,15,'Q01'],['warDrum','진군고','accessory',1,14,'Q01'],
 ['ironSpear','철척사모','weapon',2,9,'Q02'],['flyingBlade','비도','weapon',2,7,'Q02'],['chainArmor','쇄자갑','armor',2,0,'Q02'],['militarySeal','장군인','accessory',2,14,'Q02'],
 ['phoenixSpear','봉취도','weapon',3,9,'Q03'],['crescentBlade','월아극','weapon',3,10,'Q03'],['scaleArmor','어린갑','armor',2,15,'Q03'],['swiftSaddle','비운안','accessory',2,5,'Q03'],
 ['ironBow','철태궁','weapon',3,11,'Q04'],['repeatingCrossbow','원융노','weapon',3,11,'Q04'],['rattanArmor','등갑','armor',3,15,'Q04'],['sunzi','손자병법','accessory',3,6,'Q04'],
 ['threePointBlade','삼첨도','weapon',3,8,'Q05'],['steelWhip','강편','weapon',2,9,'Q05'],['brightArmor','명광개','armor',3,0,'Q05'],['sixTeachings','육도','accessory',3,3,'Q05'],
 ['longbow','양유궁','weapon',3,11,'Q06'],['ironAxe','개산부','weapon',2,10,'Q06'],['blackArmor','현철갑','armor',3,15,'Q06'],['threeStrategies','삼략','accessory',3,2,'Q06'],
 ['dragonSpear','용담창','weapon',4,9,'Q07'],['twinHalberds','쌍철극','weapon',3,10,'Q07'],['tigerArmor','호위갑','armor',3,0,'Q07'],['shadowHorse','절영','accessory',4,12,'Q07'],
 ['goldHammer','유금추','weapon',3,10,'Q08'],['moonSword','월광검','weapon',3,7,'Q08'],['craneRobe','학창의','armor',3,0,'Q08'],['yellowHorse','조황비전','accessory',4,5,'Q08'],
 ['jadeSword','백옥검','weapon',4,1,'Q09'],['tigerSpear','호두창','weapon',3,9,'Q09'],['cloudRobe','운금포','armor',3,0,'Q09'],['qingshu','청낭서','accessory',4,3,'Q09'],
 ['sevenStarFlag','칠성기','accessory',4,13,'Q10'],['formationScroll','팔진도','accessory',4,2,'Q10'],['dragonArmor','용린갑','armor',4,15,'Q10'],['goldArmor','황금갑','armor',4,0,'Q10'],
 ['springAutumn','춘추좌씨전','accessory',4,6,'Q11'],['jadePendant','백옥환','accessory',3,14,'Q11'],['tigerTally','호부','accessory',4,14,'Q11'],['strategistRobe','군사포','armor',4,0,'Q11'],
];
export const extraTreasures:Treasure[]=entries.map(([id,name,slot,grade,icon,quest],i)=>{
 const bonus:Treasure['bonus']=slot==='weapon'?{attack:2+grade, ...(i%2?{agility:2}:{maxHp:4})}:slot==='armor'?{defense:grade+1,maxHp:grade*3}:i%3===0?{maxMp:grade*2,intellect:grade}:i%3===1?{spirit:grade+1,agility:grade}:{maxHp:grade*3,agility:grade};
 const names:Record<string,string>={attack:'공격',defense:'방어',maxHp:'최대 체력',maxMp:'최대 MP',intellect:'지력',spirit:'정신',agility:'민첩'};
 return {id,name,slot,grade,icon,quest,stage:quest,glyph:slot==='weapon'?'무':slot==='armor'?'갑':'보',bonus,effect:Object.entries(bonus).map(([k,v])=>names[k]+' +'+v).join(' · '),description:['흩어진 병장기를 되찾아 장인의 손에서 되살린 보물.','험한 길을 함께 넘은 이들이 신뢰의 증표로 건넨 보물.','전란 속에서 지켜 낸 기록과 기술이 담긴 보물.'][i%3]!};
});

/**
 * 연무장(훈련) 첫 승리에 얻는 새 형태의 보물: 방패·투구·암기·거울·호로·비녀·신발·영패 등.
 * 그림 판(treasures-v2.webp) 밖이라 그림은 public/treasures/<id>.webp 낱장을 쓴다(treasure-art.ts).
 */
const trainingEntries:Array<[string,string,GearSlot,number,string,Treasure['bonus'],string]>=[
 ['rattanShield','등패','armor',1,'T01',{defense:2,maxHp:4},'등나무를 엮어 만든 가벼운 방패. 화살을 튕겨 내는 데 쓴다.'],
 ['hujia','호가십팔박','accessory',1,'T01',{spirit:2,maxMp:2},'흉노 땅에서 돌아온 채염이 지었다는 호가의 노래.'],
 ['meteorHammer','유성추','weapon',2,'T02',{attack:4,agility:2},'쇠사슬 끝에 쇠망치를 단 암기. 갑옷 위로 내리친다.'],
 ['phoenixHelm','봉시투구','armor',2,'T02',{defense:3,maxHp:6},'봉황의 깃을 꽂은 장수의 투구.'],
 ['hookSpear','구겸창','weapon',3,'T03',{attack:5,maxHp:4},'갈고리 낫을 단 창. 말의 다리를 걸어 기병을 넘어뜨린다.'],
 ['baguaMirror','팔괘경','accessory',3,'T03',{spirit:4,intellect:2},'뒷면에 팔괘를 새긴 청동 거울. 요사스러운 술수를 되비춘다.'],
 ['purpleGourd','자금호로','accessory',3,'T07',{maxMp:6,maxHp:6},'붉은 금빛 호리병. 도사가 단약을 담아 다녔다.'],
 ['bearCloak','흑웅피 망토','armor',2,'T07',{defense:2,maxHp:9},'검은 곰 가죽으로 지은 망토. 강바람과 칼끝을 함께 막는다.'],
 ['phoenixHairpin','봉황비녀','accessory',3,'T04',{agility:3,spirit:2},'봉황을 새긴 금비녀. 지닌 이를 날래게 한다는 말이 있다.'],
 ['swiftBoots','신행화','accessory',3,'T04',{agility:4,maxHp:3},'먼 길을 하루에 간다는 신행태보의 가죽신.'],
 ['zhanmaDao','참마도','weapon',4,'T05',{attack:6,maxHp:6},'말과 사람을 한 번에 벤다는 긴 자루의 큰 칼.'],
 ['tigerShield','호두패','armor',4,'T05',{defense:5,maxHp:10},'범의 머리를 새긴 큰 방패. 정면 교전에서 무너지지 않는다.'],
 ['lionHelm','사자투구','armor',4,'T06',{defense:4,maxHp:12},'금빛 사자 머리 투구. 장수의 위용을 드러낸다.'],
 ['tortoiseToken','현무영패','accessory',4,'T06',{defense:2,spirit:4},'북방 현무를 새긴 영패. 진을 지키는 장수에게 내린다.'],
];
/**
 * 반복 퀘스트(보물 사냥 R01~R05)의 보물 꾸러미와 도전 퀘스트(C01~C10) 돌파 보물.
 * 보물 사냥은 이길 때마다 꾸러미에서 아직 없는 보물 하나, 도전은 단계를 처음 넘을 때 받는다(5·10단계는 둘).
 */
const questEntries:Array<[string,string,GearSlot,number,string,Treasure['bonus'],string]>=[
 ['bronzeSword','백리검','weapon',1,'R01',{attack:3,agility:1},'손권이 지녔다는 여섯 명검(백홍·자전·벽사·유성·청명·백리) 가운데 하나.'],
 ['hornBowSmall','이광궁','weapon',2,'R01',{attack:4,agility:2},'한의 비장군 이광의 활. 바위에 화살촉이 박혔다는 고사가 전한다.'],
 ['hideShield','피패','armor',1,'R01',{defense:2,maxHp:5},'소가죽을 씌운 나무 방패. 칼날이 미끄러진다.'],
 ['strawCape','도롱이','armor',1,'R01',{defense:1,maxHp:6,agility:1},'짚으로 엮은 비옷. 화살이 엉켜 힘을 잃는다.'],
 ['copperBell','감녕의 방울','accessory',1,'R01',{spirit:2,maxMp:2},'감녕은 젊어서 방울을 차고 다녀, 방울 소리만 들려도 사람들이 그가 온 줄 알았다.'],
 ['travelPouch','금낭','accessory',2,'R01',{maxHp:6,agility:1},'위급할 때 열어 보라며 계책을 넣어 준 비단 주머니.'],
 ['ringBlade','환수도','weapon',2,'R02',{attack:5,maxHp:3},'자루 끝에 고리를 단 한나라 군도.'],
 ['ironRod','철곤','weapon',2,'R02',{attack:5,defense:1},'쇠를 씌운 몽둥이. 갑옷 위로 뼈를 울린다.'],
 ['lamellarVest','양당개','armor',2,'R02',{defense:3,maxHp:6},'가슴과 등을 두 장의 판으로 막는 갑옷. 조식의 상소에 하사품으로 이름이 오른다.'],
 ['wolfHelm','낭두 투구','armor',2,'R02',{defense:3,maxHp:4,spirit:1},'이리 머리 장식을 단 투구. 요술에 흔들리지 않는다.'],
 ['bambooSlips','오자병법','accessory',2,'R02',{intellect:3,maxMp:3},'전국 시대 오기가 남긴 병법. 손자와 나란히 병가의 으뜸으로 꼽힌다.'],
 ['ponyBridle','대완마','accessory',3,'R02',{agility:3,maxHp:4},'서역 대완에서 난다는 한혈마. 하루에 천 리를 달린다.'],
 ['snakeBlade','청명검','weapon',3,'R03',{attack:6,agility:2},'손권의 여섯 명검 가운데 하나. 푸른 하늘빛이 감도는 칼날.'],
 ['armorPiercer','파갑추','weapon',3,'R03',{attack:6,maxHp:4},'끝이 뾰족한 쇠망치. 갑옷을 뚫으려고 만들었다.'],
 ['boltQuiver','노전통','weapon',3,'R03',{attack:5,agility:3},'짧은 쇠뇌 살을 가득 담은 통과 손쇠뇌.'],
 ['mountainArmor','산문갑','armor',3,'R03',{defense:4,maxHp:9},'산(山) 자 무늬로 미늘을 맞춘 갑옷.'],
 ['fireproofRobe','화완포','armor',3,'R03',{defense:3,maxHp:6,spirit:2},'불에 넣으면 때만 타고 깨끗해진다는 옷감.'],
 ['beaconToken','봉화 영전','accessory',3,'R03',{spirit:3,defense:1},'봉화대 수장이 차는 화살 모양 영패.'],
 ['wuhuanBow','오환 각궁','weapon',4,'R04',{attack:7,agility:3},'북방 기마민의 큰 각궁. 달리며 쏘아도 곧게 날아간다.'],
 ['cavalrySaber','기병 환도','weapon',3,'R04',{attack:6,agility:2,maxHp:3},'말 위에서 휘두르기 좋게 휜 칼.'],
 ['feltArmor','모전갑','armor',3,'R04',{defense:4,maxHp:10},'두껍게 누빈 양털 갑옷. 화살이 박혀도 들어오지 않는다.'],
 ['horseBarding','마개','armor',4,'R04',{defense:5,maxHp:10},'말에 입히는 쇠갑옷. 조식이 선제에게 받은 마개를 바치겠다고 상소했다.'],
 ['eagleFeather','해동청 깃','accessory',4,'R04',{agility:4,spirit:2},'북방 매의 깃을 꽂은 장식. 몸놀림이 가벼워진다.'],
 ['nomadSteed','오환마','accessory',4,'R04',{agility:4,maxHp:6},'오환의 땅에서 난 준마. 조조가 백랑산에서 오환을 꺾고 얻었다.'],
 ['poisonDarts','독침 통','weapon',4,'R05',{attack:7,agility:4},'남만 사냥꾼의 대롱과 독침.'],
 ['tuskSpear','상아 창','weapon',4,'R05',{attack:8,maxHp:6},'코끼리 상아로 날을 세운 창.'],
 ['rattanHelm','등나무 투구','armor',4,'R05',{defense:5,maxHp:8},'기름 먹인 등나무로 짠 투구. 가볍고 단단하다.'],
 ['shuBrocade','촉금 전포','armor',4,'R05',{defense:5,maxHp:12,spirit:2},'촉의 비단으로 지은 전포. 피와 먼지가 스미지 않는다.'],
 ['bronzeDrum','제갈고','accessory',4,'R05',{spirit:3,maxHp:8},'남중의 청동 북. 남정 때 제갈량이 남겼다 하여 제갈고라 불린다.'],
 ['spiritBead','야명주','accessory',4,'R05',{spirit:5,maxMp:6},'밤에도 스스로 빛난다는 구슬.'],
 ['initiateBadge','초입패','accessory',2,'C01',{attack:2,defense:2},'도전의 첫 문을 넘은 이에게 주는 나무패.'],
 ['sharpSpearhead','예창두','weapon',3,'C02',{attack:6},'숲속 대장간에서 갈아 낸 날카로운 창끝.'],
 ['riverShield','강패','armor',3,'C03',{defense:4,maxHp:8},'다리를 지키던 병사의 큰 방패. 화살 자국이 빽빽하다.'],
 ['summitBanner','등봉기','accessory',3,'C04',{spirit:3,agility:3},'산 정상에 꽂던 깃발. 멀리서도 보인다.'],
 ['gatekeeperHalberd','수문장 방천극','weapon',4,'C05',{attack:9,maxHp:8},'군수고 수문장이 들던 방천극. 5단계 수문장을 꺾은 증표.'],
 ['gatekeeperArmor','흑광개','armor',4,'C05',{defense:6,maxHp:14},'검게 빛나는 판갑. 조식의 상소에 명광개와 함께 이름이 오른다. 5단계 수문장을 꺾은 증표.'],
 ['courtSeal','한수정후 인','accessory',4,'C06',{intellect:4,spirit:3},'백마에서 안량을 벤 공으로 관우가 받은 한수정후의 인수.'],
 ['cliffSandals','잔도 짚신','accessory',4,'C07',{agility:5,maxHp:5},'벼랑길을 걷던 짐꾼의 짚신. 어떤 길도 미끄러지지 않는다.'],
 ['fordHorse','백마','accessory',4,'C08',{agility:4,maxHp:8},'공손찬의 백마의종이 타던 흰 말. 오랑캐가 백마장사라 부르며 두려워했다.'],
 ['hundredPaceBow','백보 신궁','weapon',4,'C09',{attack:9,agility:3},'백 걸음 밖의 버들잎을 맞혔다는 활.'],
 ['peerlessSword','백홍검','weapon',4,'C10',{attack:11,agility:3,maxHp:6},'손권의 여섯 명검 가운데 으뜸. 칼을 뽑으면 흰 무지개가 선다 했다. 도전 10단계를 모두 넘은 증표.'],
 ['overlordArmor','패왕갑','armor',4,'C10',{defense:8,maxHp:18},'천하를 다투던 패왕의 갑옷. 마지막 수문장을 꺾은 증표.'],
];
const STAT_KO:Record<string,string>={attack:'공격',defense:'방어',maxHp:'최대 체력',maxMp:'최대 MP',intellect:'지력',spirit:'정신',agility:'민첩'};
export const trainingTreasures:Treasure[]=trainingEntries.map(([id,name,slot,grade,quest,bonus,description])=>({id,name,slot,grade,quest,stage:quest,glyph:name.slice(0,1),bonus,description,
 effect:Object.entries(bonus).map(([k,v])=>STAT_KO[k]+' +'+v).join(' · ')}));
export const questTreasures:Treasure[]=questEntries.map(([id,name,slot,grade,quest,bonus,description])=>({id,name,slot,grade,quest,stage:quest,glyph:name.slice(0,1),bonus,description,
 effect:Object.entries(bonus).map(([k,v])=>STAT_KO[k]+' +'+v).join(' · ')}));
