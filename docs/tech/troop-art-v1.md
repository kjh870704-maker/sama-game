# 신규 병종 전용 그래픽 v1

제작: 2026-10-02. 내장 image_gen 도구 사용. 투명 PNG 2종을 생성하고 원본을 프로젝트 public 디렉터리에 복사했다. 기존 파일을 덮어쓰지 않았다.

## 저장 경로와 프레임

- `packages/web/public/troops-casters-v1.png`: 주술사 / 무녀 / 도사, 3행 × 4열.
- `packages/web/public/troops-specialists-v1.png`: 의술사 / 무도가 / 궁기병 / 산적, 4행 × 4열.
- 열 순서: 대기, 이동, 물리 공격, 책략 또는 병종 특수 자세.
- `spriteAtlas`가 연결된 실루엣을 분리하고 256×256 셀로 정규화한다. 28개 프레임이 모두 추출됐으며 경계 불투명 픽셀은 0개.
- Pixi 전장, 정비 모델, 대결 모델, 병종 도감이 같은 정규화된 아틀라스를 사용한다. 도감에서 이동·공격·특수 동작을 반복 재생하며 시스템의 동작 줄이기 설정을 존중한다.
- 실제 이동 방향은 좌우 반전으로 표현한다. 8방향 원화나 다중 보행 사이클은 후속 작업이다.

## 생성 프롬프트: 책략 병종

Use case: stylized-concept. Production sprite atlas for a Three Kingdoms Korean tactical pixel-art RPG. One transparent PNG, exactly 4 columns x 3 rows of evenly sized invisible cells, 12 separate full-body sprites. Detailed hand-pixelled 1990s strategy RPG look, crisp pixel clusters, muted bronze palette, 3/4 view facing right, slightly big heads and short bodies, NOT smooth painting. Row1: male curse shaman in dark purple Han Chinese ritual robe, black tall headwrap, red paper talisman in hand and short ritual sword. Row2: female Chinese ritual priestess in white and vermilion Han-era layered robes, black hair bun with jade pin, small bronze bell and silk ribbon, no Japanese clothing. Row3: elderly male Taoist in teal robe, white beard, Taoist cap, wooden staff and folded scroll. Same individual consistent throughout each row. Columns left to right: neutral idle, clear walking step, physical attack thrust with held implement, arms raised spell casting with a small magic flourish touching the held implement. No detached particles, no floor shadows, no scenery, no text, no grid lines. All weapons and ribbons remain within their own cell. At least 20% transparent margins around EACH sprite; separate rows widely, constant baseline and character scale. Real alpha transparency. Entire body feet and head visible. Image intended as exact 4x3 sprite-sheet game asset.

## 생성 프롬프트: 전문 병종

Use case stylized-concept. Production transparent PNG sprite atlas for a Three Kingdoms tactical pixel-art RPG. EXACTLY FOUR COLUMNS AND FOUR ROWS, sixteen full-body isolated sprites, equal invisible cells and wide transparent gutters. Crisp detailed 1990s hand-pixelled strategy game style, 3/4 view facing right, slightly big heads, bronze muted palette. Row1 same male physician, pale green Han robe, simple cloth cap, medicine satchel and herb fan. Row2 same muscular male martial monk, ochre trousers and sleeveless brown tunic, shaved head, cloth hand wraps, no weapons. Row3 same mounted horse archer in blue leather armor and red scarf, short recurved bow, complete dark brown horse in every cell, rider and horse one silhouette. Row4 same rugged mountain bandit, russet tunic, fur shoulder, black headband, short broad saber. Columns 1 idle, 2 walking step (horse stepping), 3 attack (physician fan swipe, monk punch, mounted archer drawn bow firing, bandit saber slash), 4 special action (physician raising herb fan, monk guarding crossed arms, archer reloading bow, bandit raising saber). Consistent identical costume, scale and baseline per row. No labels, no text, no borders, no environment, no ground shadow, no detached particles. Keep full horse, all feet, bows, blades and hands inside own cell with large margins. Genuine alpha transparent background. Readable silhouettes and restrained highlights. These are actual game sprites, not a presentation poster.

## 2026-10-02 방향별 보행 추가

- 내장 image_gen으로 기존 두 아틀라스를 참조해 생성. 새 파일: public/troops-casters-walk-v1.png, public/troops-specialists-walk-v1.png.
- 기존 행 순서를 유지. 열 0/1은 앞 보행, 2/3은 뒤 보행. 총 28개 추가 프레임.
- 전장 화면 좌표에서 세로 이동은 앞/뒤, 가로 이동은 기존 옆 보행 및 좌우 반전. 대각선은 주 이동축을 따르고 동률은 세로. 정지 후 방향 유지, 공격 시 옆 공격 자세로 전환.
- 도감에 앞 이동·뒤 이동 반복 미리보기 추가. 동작 줄이기 설정 준수. 현재 방향당 2프레임이며 8방향 전용 원화나 긴 보행 사이클은 아님.
- 검증: 28개 실루엣 정상, 경계 불투명 픽셀 0. 타입 검사, 218개 테스트, 프로덕션 빌드 통과.

### 보행 생성 프롬프트: 책략 병종

Create a companion WALKING DIRECTION sprite sheet matching the three characters in reference exactly in costume, colors, body proportions and crisp detailed pixel art. 4 equal columns x 3 equal rows, transparent background. Row1 purple male curse shaman with talisman/sword; row2 white-red female priestess with bell; row3 teal elderly Taoist with beard and staff. Columns: 1 FRONT facing DOWN toward viewer, left foot forward walking; 2 FRONT facing DOWN toward viewer, right foot forward walking; 3 BACK facing UP away from viewer, left foot forward walking; 4 BACK facing UP away, right foot forward walking. For columns 3 and 4 show back of head and back of robe, no face! Feet alternate distinctly, sleeves move subtly; all accessories kept close, NO attacks or spell effects. Full bodies, equal baseline and scale, 20 percent empty transparent margin in each cell, no text/grid/shadow/scenery. This is a 12-frame game sprite atlas with genuine alpha transparency. Preserve original identities.

### 보행 생성 프롬프트: 전문 병종

Create a companion WALKING DIRECTION sprite atlas matching all four characters in reference, preserve exact costumes colors proportions crisp pixel art. Exactly FOUR columns and FOUR rows, 16 full-body sprites with real transparent alpha. Row1 green-robed physician with fan and medicine bag. Row2 ochre martial monk with hand wraps. Row3 blue armored mounted archer with red scarf riding same dark brown horse; full horse in all four cells. Row4 fur-shouldered russet bandit with saber. Columns 1 FRONT facing SOUTH toward viewer left foot leading; 2 FRONT facing SOUTH toward viewer right foot leading; 3 BACK facing NORTH away from viewer left foot leading; 4 BACK facing NORTH away right foot leading. Columns 3/4 must show backs of heads and costumes, no faces; mounted horse seen from rear with tail. Alternate legs and arms clearly, no combat or effects, held equipment resting. Match same character scale and ground baseline within rows, huge clear transparent gutters around every complete figure. No text, grid, scenery, shadows. Center characters in each cell, no cropped feet or weapons. A game-ready 4x4 sheet.
