# 장수 고유 외형과 대화 초상 v1

- 내장 image_gen으로 제작한 창작 외형. 실제 역사적 초상의 재현은 아님.
- 초상 파일: packages/web/public/officer-portraits-v1.png (4열 3행, 12종).
- 이야기 전신: packages/web/public/officer-story-v1.png (4열 2행, 8종). spriteAtlas로 정규화.
- 초상 순서: 사마의, 소년 사마의, 사마랑, 사마방 / 조진, 조조, 조비, 허저 / 마초, 여포, 진궁, 주유.
- 전신은 첫 8명. 기존 이야기 장면에 인물별 외형을 적용하고 등장·말하기·호흡 모션을 유지한다. 현재 1인 1자세이며 입 모양 프레임이나 장수 전용 전투 공격 모션은 미제작.
- 본편 대화, 외전 대화, 외전 결과 대사, 전투 선택 대화: 왼쪽 초상 + 오른쪽 화자/대사. 모바일에서도 좌우 배치 유지.
- 이름/ID를 하나의 외형 목록에서 매칭. 미등록 화자(교관, 해설, 꿈속 목소리 등)는 중립 표식과 이름으로 표시하며 다른 장수 초상을 대신 쓰지 않는다.
- 메뉴의 장수 외형에서 12종 확인. 이후 인물과 연령별 외형을 확장할 수 있도록 목록과 표시 함수를 분리했다.

## 검증
- 229개 테스트 및 타입 검사·빌드 통과.
- 본편 사마방 → 소년 사마의 대사 전환에 따라 초상과 이름 변경 확인.
- 데스크톱·390px 모바일 모두 초상이 대사 왼쪽에 위치. 모바일 가로 넘침 없음(339px).
- 전신 8개 실루엣 정상, 셀 경계 불투명 픽셀 0.

## 초상 생성 프롬프트
Use case stylized-concept. Character portrait atlas for original Three Kingdoms tactical RPG. Exactly FOUR equal columns and THREE equal rows, 12 distinct waist-up bust portraits each contained in own cell, no gutters or borders or text. Dark jade charcoal uniform flat background. Refined 2D hand-painted game illustration, restrained bronze gold, historically inspired Han Chinese garments. Faces readable, distinct ages and facial structures, 3/4 facing slightly right. Row1 left-right: Sima Yi adult sharp narrow eyes slim black beard black tall scholar cap navy silver robe feather fan; young Sima Yi adolescent clean-shaven youthful same eyes simple navy scholar robe hair topknot; Sima Lang older brother warm square face short black beard muted olive scholar robe black cap; Sima Fang elder father lined stern face long grey beard formal brown-gold robe tall black cap. Row2: Cao Zhen broad young commander bronze armor dark teal scarf short beard; Cao Cao mature shrewd narrow eyes strong mustache black beard crimson black gold warlord robe gold crown; Cao Pi slender young aristocrat clean-shaven purple gold robe ornate low crown; Xu Chu very muscular broad face thick brows short beard dark iron armor red neckcloth. Row3: Ma Chao handsome athletic young warrior silver armor white plume helmet white blue cloak; Lu Bu fierce warrior gold black armor red cloak twin long pheasant plumes; Chen Gong thoughtful thin middle-aged scholar narrow beard olive grey robe black cap scroll; Zhou Yu handsome clean-shaven young commander white red gold clothing small elegant crown. No writing, no logos. Exactly 12 portraits one per cell, same head scale, full headgear within cells with generous top margin. Cinematic but legible, consistent artistic style.

## 전신 생성 프롬프트
Create transparent pixel-art full-body story character sprite atlas using the portrait reference for identities and costumes. EXACT FOUR columns TWO rows, eight unique people, each shown once standing facing slightly right, whole body and all headgear visible. Row1 left-right: adult Sima Yi (reference row1 col1, navy silver robe feather fan black tall hat), young Sima Yi (reference row1 col2, youthful clean shaven navy simple robe topknot), Sima Lang (ref row1 col3, olive robe black scholar cap short beard), Sima Fang (ref row1 col4, elderly grey beard brown gold formal robe tall cap). Row2 left-right: Cao Zhen (ref row2 col1, bronze armor teal scarf), Cao Cao (ref row2 col2 crimson black gold robe crown), Cao Pi (ref row2 col3 purple gold robe young face), Xu Chu (ref row2 col4 huge muscular iron armor red scarf). Crisp detailed 2D pixel-art strategic RPG sprites with slightly enlarged heads, consistent perspective. Neutral conversational stance with held fan or hand gesture, no battle attacks. Everyone unmounted. Huge transparent gutters 25% in every cell, no touching, common baseline and comparable scale; young Sima Yi a little shorter and Xu Chu broader. Genuine alpha transparent background. No labels, scenery, floor shadows, border or grid.

