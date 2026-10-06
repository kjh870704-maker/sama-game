# 기본 병종 반응 및 퇴각 v1

## 적용
- 내장 image_gen 사용. 기본 6종(보병·창병·궁병·경기병·책사·포차) 24프레임, 추가 4종(노병·중기병·공병·풍수사) 16프레임.
- 저장: packages/web/public/units-base-reaction-v1.png, packages/web/public/units-extra-reaction-v1.png.
- 열: 방어 준비, 방어, 피격, 자세 회복. 기존 7병종과 합쳐 도감 방어·피격 탭에 17종 표시.
- 퇴각: 피격 원화를 회전·하강·페이드하여 제거. 별도의 쓰러짐 원화를 제작한 것은 아님. 성문·감시탑·충차·포차·수송대는 작은 진동과 하강·소멸로 구분.
- 책략 피해는 엔진에서 퇴각보다 뒤에 기록되므로 화면 로그만 재정렬. 엔진 판정·저장 형식은 유지.
- 민중·수군·충차 전용 반응 원화는 아직 없음. 해당 부대의 일반 퇴각 연출은 적용.

## 검증
- 타입 검사, 224개 테스트 통과. 40프레임 모두 추출, 정규화된 셀 경계의 불투명 픽셀 0.
- 실제 Pixi 렌더러에서 보병/노병 반응 텍스처 연결, 퇴각 회전·페이드·객체 제거 확인. 동작 줄이기 즉시 제거 확인.
- 모바일 도감 clientWidth/scrollWidth 모두 324px.

## 채택한 기본 병종 생성 프롬프트
Use case stylized-concept. Create a genuine transparent sprite atlas, EXACTLY 4 columns by 6 rows, using reference characters identities and blue-gold colors and crisp pixel art. Remove all background. Same rows: blue sword shield infantry; blue long spear infantry; blue bow archer; blue swordsman riding complete brown horse; blue robed feather-fan strategist; wooden wheeled catapult and blue operator connected as single silhouette. All face right 3/4. Columns: defensive preparation, braced guard, recoiling from hit from right leaning left, recovering crouched. For machine rows show operator bracing then recoiling while still touching intact machine. No blood or detached effects. Maintain full bodies, entire weapons and horses, constant scale across row, huge transparent gutters 20% each cell. No labels borders shadows scenery. 24 isolated silhouettes aligned in exact 6x4 grid. Faithful original identities.

### 후속 투명 배경 편집
Remove the entire blue and brown background from this sprite sheet. Output genuine alpha transparency in all spaces between sprites. Preserve every one of the 24 pixel art characters, exact positions and arrangement 4 columns 6 rows. No replacement background, no checkerboard, no shadows. Only isolated character silhouettes with transparent pixels around them.

이 편집 출력의 실제 알파와 24개 실루엣을 검사한 후 채택했다. 다른 디자인/레이아웃 후보는 게임에 사용하지 않았다.

## 추가 병종 생성 프롬프트
Create companion reaction sprite atlas from reference, preserving detailed pixel art, teal armor and each identity. TRUE transparent alpha background, no scenery or floor. Exactly 4 columns x4 rows. Row1 teal crossbow soldier; row2 teal heavy cavalry with full armored black horse; row3 brown apron engineer with hammer and backpack; row4 cream-teal fengshui master with jade staff. All face right 3/4. Columns: 1 arms or implement lifted to defend, 2 bracing and blocking, 3 leaning back left from impact on right, 4 crouched recovery. Horse remains complete in every frame. No blood, detached particles, ground shadows, text or grid. Equal baseline and size in each row. 20% empty transparent margins in each cell, entire weapons and feet inside. 16 separate connected silhouettes. Do not copy the attack poses: show defensive and hurt expressions.

