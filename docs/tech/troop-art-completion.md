# 병종 전용 그림 우선 제작

사용자 지시: 병종 그림 전체를 먼저 완성하고 인물 초상화는 그 다음에 재개한다.

## 등갑병 계통
- 등갑병 / 정예 등갑병 / 오과국 등갑병: 3행, 각 행 대기·공격·이동·피격 4열.
- 파일: packages/web/public/troops-rattan-v2.png
- 내장 image_gen, 투명 배경. 그림 검수 후 spriteAtlas로 실루엣을 분리해 도감·진화표·전장·전투 상세에 연결.
- 보병 그림 재사용 및 금속 갑옷 덧씌우기를 전용 그림으로 대체.

### 생성 프롬프트

Game production sprite atlas, original Three Kingdoms tactical RPG. TRUE TRANSPARENT BACKGROUND. One landscape image with EXACTLY 12 isolated full-body soldier sprites arranged in precise regular grid: 3 equal rows and 4 equal columns. Each sprite stays entirely within own cell with generous transparent padding. No text, labels, grid lines, scenery, shadows on ground or border. Semi-realistic hand-painted 2D game sprites, detailed but readable at 80px, slightly elevated three-quarter camera facing bottom-right, full body feet visible, believable East Asian adults with slightly enlarged heads. RATTAN INFANTRY evolution family: every soldier wears unmistakable interwoven honey-brown rattan body armor and woven rattan helmet, round woven wicker shield in left hand and single curved dao sword in right hand. Row1 basic rattan soldier: plain wicker armor and green cloth, small shield. Row2 elite rattan: denser layered dark wicker armor, reinforced broad wicker shield and deep green shoulder cape. Row3 Wuguo veteran rattan: intricate dark woven armor with restrained brass bindings, ochre cape, taller woven helmet and large reinforced woven shield; still wicker, NOT metallic plate. EACH ROW depicts SAME soldier in four distinct action frames: col1 steady idle shield forward sword lowered; col2 sword slash attack with sword extended forward, shield held near torso; col3 walking forward with one leg advanced and sword lowered; col4 recoiling hit pose with knees bent and shield raised, no blood. Consistent scale within rows, clean separated silhouettes, sword and shield physically connected to hands. All 12 figures and weapons fully inside cells, not cropped. No extra floating objects or effects. Render as one clean 4-column by 3-row sprite sheet on alpha transparency.

## 이후 제작
장비의 구조와 실루엣이 단계마다 달라지는 별도 원화를 기준으로 한다. 깃발 추가·색 변경만으로 진화 그림 완료로 취급하지 않는다.

## 상병 계통
- 상병: 간이 안장·가죽 하네스·기수 1명.
- 전투상: 보강 하네스·누빔 방호포·머리 철갑·난간 좌석.
- 상왕군: 다중 하네스·측면 비늘갑·상아 보호구·2인승 전투 누각.
- 파일: packages/web/public/troops-elephant-v1.png. 3단계 × 대기·공격·이동·피격 4동작.
- 내장 image_gen으로 제작. 실제 알파 채널 및 spriteAtlas의 12개 프레임 분리 확인.

### 상병 생성 프롬프트
Production sprite atlas for a premium hand-painted 2D Three Kingdoms tactics game. REAL alpha transparent background. Exactly 12 isolated full elephant-and-rider sprites in a regular FOUR columns by THREE rows landscape grid. Every entire animal including feet trunk tusks rider and equipment fits within its cell, generous transparent gutters, no touching between cells, figures at most 65% cell width and 70% cell height. Consistent slightly elevated three-quarter view facing lower right, detailed painterly realism readable at 96px. ROWS ARE THREE DRASTICALLY DIFFERENT EVOLUTIONS, not recolors or flags. Row1 basic elephant: gray Asian elephant largely bare skin, simple rope chest harness and leather belly girth, small coarse green saddle blanket, simple flat saddle, one unarmored mahout with spear. Row2 armored battle elephant: heavy crossed stitched leather breast and belly harness, buckled straps, large quilted blue-gray saddle pad, wooden seat with low protective railing, rider in lamellar armor, riveted iron forehead guard and cheek plates, reinforced tusk collars; markedly different harness silhouette. Row3 elite royal war elephant: articulated scaled head and trunk-base protection, armored side panels hanging from elaborate load-bearing harness with multiple brass buckles and leather straps, deep burgundy padded housing, large fortified wooden HOWDAH with shielded railings, two armored crew, brass tusk sleeves; clearly taller wider armored silhouette, NO flags. Keep elephant anatomy natural in all rows. FOUR columns in each row: 1 idle elephant all feet grounded trunk relaxed; 2 charging thrust attack with head lowered tusks forward rider leaning; 3 walking with alternate front leg advanced; 4 defensive recoil head raised trunk curled rider braced. Same equipment stays consistent across each row. No ground shadows, no scenery, no text, labels, gridlines, borders, floating weapons, horses, extra unattached people. Each complete animal plus its mounted crew is one separate connected silhouette. All 12 distinct sprites on transparent background.

현재 전용 3단계 그림을 갖추지 않은 다른 계통을 순차 제작한다. 초상화 추가 제작은 모든 병종 완료 뒤 재개한다.
