# Codex 디자인 작업 지시 (2026-10-09 기준, 최신)

이 문서 하나만 보고 작업한다. 예전 문서 `디자인-작업지시-2026-10-09.md`는 작업 기록이고, 할 일은 여기 정리된 것이 전부다.

## 0. 범위와 금지

- 범위: **그림 파일과 그림 등록 코드**뿐이다.
  - 그림 파일: `packages/web/public/` 아래.
  - 등록 코드: `officer-models.ts`, `public/officers/manifest.json`, `treasure-art.ts`, 그리고 해당 테스트의 숫자.
- 금지:
  - `session.ts`, `stage-rules.ts`, `packages/core/**`, 스테이지 JSON, 밸런스 수치는 건드리지 않는다.
  - 기존 그림 파일을 지우지 않는다. 고칠 때는 같은 이름으로 덮어써도 되지만, 화풍을 바꾸는 새 판은 `-v2`로 낸다.
  - 실제 인물 사진, 다른 게임 그림을 베끼지 않는다(창작 외형).
- 장수 그림은 **병종이 진화해도 바뀌지 않는다**(규칙판 7). 단계별 줄(4줄 시트)을 새로 그리지 않는다. 한 줄(4칸)만 그린다.
- 커밋은 작업 묶음마다 하나씩(예: `fix(art): ...`, `feat(art): ...`), main에 푸시한다.

## 1. 할 일 (이 순서대로)

### A. 말 탄 장수 대결 그림 크기 맞추기 (먼저, 필수)

대결 화면에서 사마의(걷는 모델)보다 작게 서는 장수가 있다. 대기 칸(1번 칸)의 말과 사람 크기를 손권·공손연에 맞춘다.

| 파일 | 지금(대기 칸 외곽 높이·폭) | 문제 | 목표 |
|---|---|---|---|
| `officers/zhao_yun-duel-v1.webp` | 높이 135 · 폭 161 | 말과 사람이 통째로 작다 | 높이 175~185 |
| `officers/lu_meng-duel-v1.webp` | 높이 159 · 폭 170 | 약간 작다 | 높이 175~185 |
| `officers/meng_yan-duel-v1.webp` | 높이 185 · 폭 139 | 높이는 세운 창 때문이다. 말 몸통은 작다 | 말 폭 165 이상 |
| `officers/bi_yan-duel-v1.webp` | 높이 175 · 폭 131 | 맹염과 같다 | 말 폭 165 이상 |

기준: `sun_quan-duel-v1.webp`(높이 184·폭 177), `gongsun_yuan-duel-v1.webp`(높이 175·폭 165).

- 창이 칸을 넘으면 인물을 줄이지 말고, 창을 비스듬히 눕히거나 몸 쪽으로 당긴 자세로 그린다.
- 네 칸 모두 같은 배율, 발굽이 같은 바닥선(y=230)에 오게 한다.

### B. 보물 그림 22점 (필수)

새 보물 22점은 능력치·효과·얻는 곳이 다 들어가 있다. 그림만 없어 형태 글자 패(예: 「장」)로 보인다.

- 파일: `packages/web/public/treasures-koei-01-v1.webp`, `treasures-koei-02-v1.webp`.
- 규격: 기존 `treasures-unique-01-v1.webp`와 같다.
  - 816×1088, 3열×4행, 칸 272×272.
  - 어두운 바탕 위에 물건 하나. 글자·테두리 없음.
  - 01은 12칸을 쓰고, 02는 앞 10칸만 쓴다(나머지 2칸은 비움).
- 순서(왼쪽 위부터 가로로; id · 이름 · 모습):

**01**
1. `ironHelm` 철투구 · 쇠 병사 투구
2. `beanBag` 콩주머니 · 콩이 든 허리 주머니
3. `twinWhips` 쌍편 · 마디진 쇠채찍 한 쌍
4. `plantainFan` 파초선 · 큰 파초 잎 부채
5. `mirrorArmor` 거울갑옷 · 가슴에 둥근 동경을 단 갑옷
6. `dragonGi` 비룡도복 · 용을 수놓은 무도가 옷
7. `silverShield` 백은방패 · 은테 방패
8. `lubuBow` 여포궁 · 화려한 큰 활
9. `linkedArmor` 연환갑옷 · 쇠고리 사슬 갑옷
10. `windGodShield` 풍신방패 · 바람신 얼굴을 새긴 방패
11. `noFeatherDart` 몰우전 · 돌팔매 돌과 끈
12. `goldFireCannon` 금화관포 · 불붙은 쇠단지를 쏘는 작은 포

**02**
1. `fiveFireFan` 오화신염선 · 다섯 빛 불꽃 부채
2. `sageSword` 성자보검 · 흰 옥 장식 보검
3. `darkRobe` 칠흑도복 · 칠흑빛 도사 옷
4. `phoenixRobe` 봉황깃옷 · 붉은 깃털 옷
5. `windWheel` 바람바퀴 · 바람 무늬 수레바퀴
6. `zhugeTurban` 제갈건 · 비단 두건(윤건)
7. `azureJewel` 청룡보옥 · 푸른 용 구슬
8. `vermilionJewel` 주작보옥 · 붉은 새 구슬
9. `blackTortoiseJewel` 현무보옥 · 검은 거북·뱀 구슬
10. `whiteTigerJewel` 백호보옥 · 흰 범 구슬

등록(`packages/web/src/treasure-art.ts`):
1. `UNIQUE_TREASURE_SHEETS`·`uniqueSheetIcon`과 같은 방식으로 `KOEI_TREASURE_SHEETS`(위 순서)와 아이콘 함수를 만든다. `treasureIcon`에서 먼저 찾고, `TREASURE_ART`에도 넣는다.
2. `ART_PENDING`을 빈 목록으로 만든다.
3. `packages/web/test/treasure-codex.test.ts`를 고친다:
   - `expect(ART_PENDING).toHaveLength(22)` → 0
   - `TREASURE_ART.size` 92 → 114
   - 새 그림판을 쓰는지 확인하는 줄 하나 추가(예: `treasureIcon("lubuBow")`가 `treasures-koei-01-v1.webp`를 포함).

### C. 2차 우선순위 장수 28명 (필수)

**C-1. 대결 그림만 필요 (20명)** — 전투 시트는 이미 있다.

| id | 이름 | 병종(시트) | 말 탐 |
|---|---|---|---|
| guan_yu | 관우 | cavalry | 예 |
| zhang_liao | 장료 | cavalry | 예 |
| zhang_he | 장합 | cavalry | 예 |
| xiahou_dun | 하후돈 | cavalry | 예 |
| jiang_wei | 강유 | cavalry | 예 |
| xiahou_yuan | 하후연 | horseArcher | 예 |
| xu_huang | 서황 | heavyCav | 예 |
| cao_ren | 조인 | heavyCav | 예 |
| liu_bei | 유비 | lord | 예 |
| cao_rui | 조예 | lord | 예 |
| yuan_tan | 원담 | lord | 예 |
| yuan_shang | 원상 | lord | 예 |
| gan_ning | 감녕 | bandit | 아니오 |
| huang_gai | 황개 | infantry | 아니오 |
| zhu_rong | 축융 | assassin | 아니오 |
| meng_huo | 맹획 | elephant | 아니오 |
| lu_su | 노숙 | strategist | 아니오 |
| pang_tong | 방통 | strategist | 아니오 |
| xun_yu | 순욱 | strategist | 아니오 |
| wooden_zhuge | 제갈량 | strategist (별칭 zhuge_liang) | 아니오 |

맹획의 대결 그림은 코끼리를 타지 않고 걸어서 선 모습으로 그린다.

**C-2. 전투 시트 + 대결 그림 둘 다 필요 (8명)**

| id | 이름 | 병종(시트 이름) | 시트 크기 |
|---|---|---|---|
| gao_shou | 고수 | bandit | 1400×280 (기존 산적 시트들과 같게) |
| guo_huai | 곽회 | archer | 1400×280 |
| dai_ling | 대릉 | infantry | 1120×224 |
| zhang_zhao | 장소 | strategist | 1120×224 |
| zhuge_jin | 제갈근 | strategist | 1120×224 |
| zhang_ba | 장패 | cavalry | 1400×280 |
| cao_xiu | 조휴 | cavalry | 1400×280 |
| cao_shuang | 조상 | cavalry | 1400×280 |

산적·궁병 시트 크기는 같은 병종의 기존 장수 시트(`gan_ning-battle-bandit-v1.webp`, `huang_zhong-battle-archer-v1.webp`)를 열어 그 크기에 맞춘다.

### D. (선택) 이야기 무대 흉상·걷는 그림

이야기 장면 흉상(`<id>-bust-v1.webp`, 3072×1024, 3칸)과 걷는 그림(`<id>-story-v1.webp`, 1280×480, 8칸×3줄)은 13명만 있다. A~C가 끝난 뒤 시간이 있으면 한다.

## 2. 그림 규격 (모두 RGBA 투명 바탕 webp, 인물은 오른쪽을 본다)

### 대결 그림 `packages/web/public/officers/<id>-duel-v1.webp`

- 1024×256, 가로 4칸(칸 256×256), 1줄.
- 칸 순서: ① 대기(3/4 정면, 무기 든 자세) ② 한 걸음·지휘(설전은 공세 자세를 모두 이 칸으로 쓴다 → 부채·손짓처럼 말하는 자세) ③ 공격·필살 ④ 방어·피격(움츠림).
- **네 칸이 같은 배율**이다. 칸마다 따로 늘리거나 줄이지 않는다.
- 발끝(말이면 발굽)은 모든 칸에서 y=230에 맞춘다.
- **칸 가장자리에서 26px(10%) 안쪽**에 무기 끝·말꼬리·망토까지 다 들어가게 한다. 넘치면 자세를 바꾸고, 그림을 자르지 않는다.
- 몸 크기(머리~발, 무기·말 제외): 걷는 장수는 대기 칸 외곽 높이 175~190(황충 184·양앙 186·손소 185 수준). 말 탄 장수는 1-A의 기준.
- 화풍: 6~7등신 정밀 화풍. 기준 그림은 `yang_ang-duel-v1.webp`, `sun_shao-duel-v1.webp`, `wang_ling-duel-v1.webp`. 전투 시트의 SD 화풍을 키운 것처럼 보이면 안 된다.

### 전투 시트 `packages/web/public/officers/<id>-battle-<병종>-v1.webp`

- 걸어서 싸우는 병종: 1120×224(칸 280×224). 말 탄 병종·군주·중기병: 1400×280(칸 350×280). 가로 4칸, 1줄.
- 칸 순서: 대기 / 한 걸음 / 공격 / 방어.
- 화풍은 기존 전투 시트(`lu_xun-battle-strategist-v1.webp`, `zhao_yun-battle-heavyCav-v1.webp`)와 같은 SD.
- 칸 여백·같은 배율 규칙은 대결 그림과 같다(옆 칸으로 넘치지 않게).

## 3. 등록 (그림을 넣은 뒤)

1. `packages/web/src/officer-models.ts`
   - `officerManifest`:
     - 새 장수(C-2)는 `E('<id>','<이름>',c('<id>','<병종>'[,1,350,280]))`를 추가한다.
     - 대결 그림이 생긴 장수는 네 번째 인자에 `{duel:'officers/<id>-duel-v1.webp'}`를 넣는다.
   - `duelRows`에 `<id>:{sheet:'officers/<id>-duel-v1.webp',row:0,rows:1}`를 추가한다.
   - 말 탄 대결 그림이면 `MOUNTED_DUEL`에 id를 추가한다(1-C 표의 '예').
2. `packages/web/public/officers/manifest.json`에도 같은 내용을 넣는다. 두 색인은 같아야 한다.
3. 새 장수의 세력은 `packages/web/src/officer-factions.ts`에 넣는다.
   - 위: 곽회·조상·조휴
   - 오: 장소·제갈근·장패
   - 군웅: 고수
   - 촉: 대릉
4. `packages/web/test/officer-models.test.ts`의 숫자를 새 등록 수에 맞춘다(`officerManifest` 길이 56 → 늘어난 수). 2차 장수용 검사를 1차(`priorityDuelIds`)처럼 하나 더한다.

## 4. 스스로 검수하기 (푸시 전에 반드시)

### 4-1. 칸 잘림·크기 측정

저장소 밖에서 실행한다. 스크립트는 커밋하지 않는다.

```python
from PIL import Image
import sys
for f in sys.argv[1:]:
    im=Image.open(f).convert('RGBA'); a=im.split()[3]; w,h=im.size; cw=w//4
    for i in range(4):
        c=a.crop((i*cw,0,(i+1)*cw,h)); x0,y0,x1,y1=c.getbbox()
        col=lambda x:sum(1 for y in range(h) if c.getpixel((x,y))>200)
        cut=col(x1-1)>=12 or col(x0)>=12          # 세로로 12px 넘게 일직선이면 잘린 것
        edge=min(x0,y0,cw-x1)                       # 여백(26 이상이어야 한다)
        print(f,i+1,'높이',y1-y0,'바닥',y1,'여백',edge,'잘림' if cut else '')
```

**합격 기준**
- 잘림 0칸.
- 여백 26 이상(위쪽은 무기 끝까지 포함).
- 네 칸의 바닥이 모두 같은 값(대결 230).
- 대기 칸 높이가 2장의 기준 범위 안.

### 4-2. 테스트

```
npm run typecheck && npx vitest run
```

특히 `officer-models.test.ts`, `treasure-codex.test.ts`, `battle-art.test.ts`가 통과해야 한다.

### 4-3. 실제 화면

1. `npm run build` 후 `packages/web/dist`를 `python3 -m http.server`로 띄우고 `/?dev`로 연다.
2. 일기토·설전:
   - 콘솔에서 `__sama.start(장번호)`를 실행한 뒤, 사마의를 상대 옆에 세우고 `__sama.act({kind:'item',unit:'sima_yi',item:'duel',target:'<id>'})`(설전은 `'debate'`)를 실행한다.
   - 상대가 거절하면 `__sama.session.challengeAnswer=()=>({accept:true,line:'좋다.'})`를 먼저 실행한다.
3. 보물: 본영 → 보물 도감에서 새 22점이 그림으로 보이는지 확인한다(형태 글자 패가 남으면 안 된다).
4. 병종 탭 → 장수: 새 장수 카드가 같은 크기로, 잘림 없이 나오는지 확인한다.
5. 화면 크기 1366×768, 1920×1080, 844×390(휴대폰 가로) 세 가지로 본다.

**대결 화면 합격 기준**
- 두 인물의 키 차이가 1.2배 이내.
- 같은 화풍.
- 머리·무기·말꼬리가 잘리지 않음.
- 네 칸이 서로 다른 자세.

## 5. 완료 체크리스트

- [ ] A: 조운·여몽·맹염·비연 대결 그림 크기(4-1 측정값 첨부)
- [ ] B: 보물 그림판 2장 + 등록, `ART_PENDING` 비움, 테스트 숫자 갱신
- [ ] C-1: 대결 그림 20장 + 등록 + 말 탄 장수 표시
- [ ] C-2: 전투 시트 8장 + 대결 그림 8장 + 등록 + 세력
- [ ] 4-1 측정 결과를 커밋 메시지 또는 이 문서 끝 "작업 기록"에 남김
- [ ] `npm run typecheck && npx vitest run` 통과
- [ ] main에 푸시

## 작업 기록

(Codex가 작업을 마칠 때마다 날짜·커밋·측정 결과를 여기에 한 줄씩 적는다.)
