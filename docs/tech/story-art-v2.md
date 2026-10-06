# 이야기 배경 v2 — 2026-09-30

제작 도구: 내장 image_gen (CLI/API 대체 경로 사용 안 함). 기존 게임의 배경을 위한 창작 이미지. 원본 게임의 그림을 복제하지 않았다.

프로젝트에 저장한 파일:

- `packages/web/public/story-backgrounds-1.png` — 1536×1024, 9패널. 생성 원본 exec-8a70e41b-f991-49f7-add6-10e558881dc1.png.
- `packages/web/public/story-backgrounds-2.png` — 1536×1024, 9패널. 생성 원본 exec-df0865be-5a75-4b32-a257-c7e62ea25abb.png.

원본 디렉터리: `C:/Users/kjh87/.codex/generated_images/01a0c0de-c146-7673-93e7-f0ebde08c580/`.

패널 선택과 장소명: `packages/web/src/story.ts`. CSS가 실제 패널 경계 안쪽을 표시한다. 이미지 사이의 불균일한 줄 높이를 균일 격자로 가정하지 않는다.

## 최종 사용 프롬프트 1

Create a production game background atlas, one image landscape 1536x1024, EXACT 3 columns x 3 rows equal cells, each cell 512x341 approximately, no borders or gaps. Nine distinct panoramic environments for a Three Kingdoms Chinese historical pixel-art SRPG dialogue scene. Rich meticulous pixel art, cinematic layered depth, consistent art direction muted jade/navy, warm amber lanterns. NO people, NO characters, NO lettering, NO UI, no watermark. Camera eye level to low slightly elevated, bottom 30% of EVERY cell is empty walkable foreground for overlaid full-body actors. Each cell independently complete scenery, don't cross cell edges. Row1 col1: Han noble estate courtyard at twilight, tile roofs, courtyard flagstones and bronze lanterns. Row1 col2: burning ancient Luoyang city street at night, smoky orange far skyline, intact buildings framing foreground. Row1 col3: monumental ancient stone city south gate at night, redwood open doors, lanterns, cobbled foreground. Row2 col1: rugged mountain pass at dawn, pine trees and distant blue peaks, broad dirt path. Row2 col2: winding deep river ravine with wooden bridge and mist, broad near bank. Row2 col3: eerie deserted imperial palace hall at night, tall crimson columns and candlelit tiled foreground, violet mist. Row3 col1: ancient Chinese military camp in dusty late afternoon, canvas command tent, blue war banners without text, empty dusty foreground. Row3 col2: wide Yangtze river bank at blue twilight, wooden river bridge in middle distance, two distant moored boats, muddy broad foreground. Row3 col3: Tongguan stone fortress below ochre cliffs, tall watchtowers and huge wooden gate, dusty open foreground at golden sunset. Preserve clear exact grid boundaries for runtime cell sampling. All scenes beautiful standalone game illustrations with crisp visible pixel clusters, not simple gradients.

## 최종 사용 프롬프트 2

Production game background atlas, one1536x1024 image EXACT3columns x3rows equal cells no gaps borders. Nine panoramic background scenes for Three Kingdoms historical dialogue game. Beautiful richly detailed muted jade/navy amber PIXEL ART landscapes with visible crisp pixelclusters consistent Chinese ancient architecture, NO characters no text noUI. Each cell independently complete with empty walkable lower30percent for actors, camera slightly elevated near eyelevel. Row1col1: noble estate ARMORY storeroom interior wooden weaponracks bundled spears crates lanternlit; row1col2: small wooden estate sidegate in stone gardenwall, dawn, NOT hugecitygate; row1col3: rocky wooded forked mountain trail two routes at dawn. Row2col1: scholar's private study in Han China at night, writingtable scrolls paperwindows moonlight; row2col2: dreamlike empty bluepurple palace corridor with vanishing point and hanging silk, eerie but no figures; row2col3: command tent interior map laid on table bluebanners oil lamps, emptyforeground. Row3col1: narrow timber bridge over Yangtze river at blue twilight side angle view from nearshore emptyforeground; row3col2: Han army rearguard camp and dust clouds over distant hills at warm dusk, tentstotheright, clear open dirtforeground; row3col3: Hanzhong stone fortress in GREEN MOUNTAIN valley with river and wooden approach bridge, late afternoon, open nearbankforeground. Every cell cleanly separates EXACT equal third grid. Scenic narrative staging with lovely atmosphericdepth, no people.

## 캐릭터 렌더링

새 병종 시트 생성 시도 두 개는 여백/화풍 검토 후 미채택했다. 기존 units-v3.png와 units-extra-v1.png 원본 파일을 그대로 사용한다. `sprite-atlas.ts`가 브라우저 로딩 시 연결 윤곽을 분리하고 일관된 바닥선과 투명 여백을 가진 렌더링 프레임을 만든다. 무기와 인물은 함께 추출되며 옆 인물의 픽셀은 제외한다. 예상 프레임 수가 부족하면 조용히 잘못된 캐릭터를 표시하지 않고 오류를 보고한다.

실제 24+16프레임에서 12px 가장자리 영역의 불투명 픽셀 0개를 브라우저에서 검사했다. 원본의 분리된 미세 입자는 재사용하지 않으며 화살/책략 효과는 기존 전투 이펙트가 재생한다. 신규 병종 자산은 연결 윤곽/프레임 수를 다시 검증해야 한다. 장수별 고유 얼굴과 어린 사마의 전용 모델 제작은 별도 남은 작업이다.
