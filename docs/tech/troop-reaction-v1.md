# 병종 피격·방어 그래픽 v1

- 제작: 내장 image_gen, 기존 병종 원화를 참조. 2026-10-02.
- 파일: packages/web/public/troops-casters-reaction-v1.png (3행), packages/web/public/troops-specialists-reaction-v1.png (4행).
- 행 순서는 기존 아틀라스와 동일. 열은 방어 준비 / 방어 / 피격 / 자세 회복. 총 28프레임.
- 전장: 양수 피해와 명중일 때만 반응. 견고 상태는 방어, 일반 명중은 피격. 광역 책략은 대상별 판정. 아군 보호 로그에도 방어 자세 표시.
- 일기토: 신규 일곱 병종이 방어를 선택하면 전용 방어 자세 사용. 설전은 기존 표현 유지.
- 도감: 방어·피격 미리보기. 동작 줄이기 설정 준수.
- 검증: 타입 검사 및 221개 테스트 통과. 브라우저 아틀라스 28프레임 정상, 경계 픽셀 0. 실제 Pixi 렌더러의 명중·회피·견고·회복 텍스처 전환 및 복원 확인.
- 범위: 신규 일곱 병종만 전용 반응 원화 적용. 각 반응 2프레임이며, 기본 병종 피격 원화와 쓰러짐·퇴각 애니메이션은 후속 작업.

## 생성 프롬프트: 책략 병종

Use case stylized-concept. Companion REACTION sprite atlas using reference strictly for character identity, clothes, colors and crisp detailed pixel art. Transparent background, exactly 4 columns and 3 rows. Row1 purple male shaman with sword and red talisman. Row2 white-red female priestess with bell. Row3 teal elderly Taoist with staff. Each row same character. All face RIGHT 3/4. Columns: 1 defensive preparation, raising held implement across chest; 2 strong braced guard with bent knees and raised forearms; 3 flinching from incoming hit from right, leaning backward left; 4 recovering from impact, crouched slightly, still standing. NO blood, effects, detached particles, scenery, text, grid or shadows. Full body every cell, feet and weapons entirely inside with 20 percent transparent margins. Same scale and baseline across all four poses. Preserve exact identity and visual detail of reference; 12 clearly separated silhouettes. Genuine alpha.

## 생성 프롬프트: 전문 병종

Use case stylized-concept. Companion REACTION sprite atlas using reference strictly for four character identities, clothes, colors and crisp detailed pixel art. Transparent background, exactly 4 columns and 4 rows. Row1 pale green physician with fan and medicine satchel. Row2 ochre muscular martial monk with wraps. Row3 blue armored horse archer red scarf on same complete brown horse. Row4 russet fur-shouldered bandit with saber. Each row same character. All face RIGHT 3/4. Columns: 1 defensive preparation with arms raised; 2 firm braced guard blocking with implement or forearms; 3 flinching from incoming hit from right, leaning backward left; 4 recovering after hit crouched slightly. Horse archer stays mounted in every pose, horse bracing then recoiling subtly. NO blood, effects, detached particles, scenery, text, grid or shadows. Full body every cell, feet weapons entire horse inside own cell with 20 percent transparent margins. Same scale and baseline across all four poses in each row. Preserve identities and reference detail. 16 clearly separated silhouettes. Genuine alpha.

