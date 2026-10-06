# 병종 4단계 원화 보완 (2026-10-06)

## 규칙

- 전투 계통 36개는 모두 `기본 → 정예 → 최정예 → 전설` 4단계다.
- 진화해도 무기 종류는 바꾸지 않고 갑옷·마구·기계 장식만 발전한다.
- 군주 계통은 네 단계 모두 말을 탄다.
- 책사 전설 `신산` 은 사륜거에 앉아 백우선을 든다.
- 공병과 포차는 다른 계통의 상위 id로 재사용하지 않고 각각 독립 4단계를 갖는다.
- 비전투 유닛 `민중` 은 진화 계통에서 제외한다.

## 원화 규격

새 시트는 모두 4열 동작(대기, 준비/이동, 공격/사용, 피격/방어)을 쓴다. 원본 크기가 달라도 `spriteAtlas` 가 각 칸을 256px 정사각형으로 정규화하며, 시트 안의 공통 비율을 쓰므로 게임 화면에서 크기가 흔들리지 않는다. 알파 240 미만의 생성 배경은 제거하고 실루엣 가장자리는 복원한다.

## 생성 프롬프트 공통부

> Production sprite atlas for an isometric Three Kingdoms tactical RPG. EXACTLY 4 columns by 4 rows, genuine alpha transparency. Columns: calm idle, ready/walk, attack/use, hurt/guard recovery. Every cell has one complete isolated right-facing 3/4 sprite, same scale and baseline across each row, at least 22% empty transparent padding. Crisp hand-painted 2D pixel art, late Han China, dark clean outline, blue/teal/brown/gold palette. Keep the exact same weapon in all four cells of each row. Entire horse, machine, wheels, weapon tip, feet and cloth inside its own cell. No text, grid, scenery, ground, shadow, opaque background, anime or 3D.

각 시트의 행 지정은 `packages/web/src/complete-troops.ts` 의 `fourStageCorrectionRows` 가 담당한다.

## 신규 원화

- `troops-four-stage-command-v1.png`: 신산, 군주, 패주, 제왕
- `troops-four-stage-command-extra-v1.png`: 천자, 축성병, 공성장인, 신기장
- `troops-four-stage-ranged-v1.png`: 천호기병, 천궁수, 신노, 천풍수사
- `troops-four-stage-ranged-extra-v1.png`: 천궁기, 천석투병, 귀영살수, 천량철기
- `troops-four-stage-special-v1.png`: 금강등갑병, 백상왕, 천요술사, 천녀
- `troops-four-stage-special-extra-v1.png`: 남만맹호기, 남만수왕기, 신개마무사, 철극기병
- `troops-four-stage-siege-v1.png`: 신극기병, 벽력거, 천균거, 신포차
