# BCU Rust Editor Implementation Plan (Updated)

이 문서는 **0038_BCU_Rust** 프로젝트의 애니메이션 에디터 개발 현황과 향후 계획을 관리합니다.

## 1. 설계 원칙 (완료)
*   [x] **원본 호환성 (Core Integrity)**: Java BCU 로직 유지.
*   [x] **레이어 분리 (Layered Architecture)**: Core(Rust) / API(WASM) / UI(TS) 분리 및 모듈화.
*   [x] **JSON 기반 통신 (Command Pattern)**: `dispatch_editor_command`를 통한 결합도 완화.
*   [x] **실시간 반영 (Live Feedback)**: 수정 즉시 GPU 렌더링 반영.

---

## 2. 개발 로드맵 및 현황

### [1단계] 기초 연동 및 상태 조회 (완료)
*   [x] **Rust**: `BCUEngine.get_animation_state(id)` API 구현 (JSON 반환).
*   [x] **TS**: WASM 데이터를 사이드바(Parts Tree)에 실시간 표시.
*   [x] **TS**: 재생/일시정지 및 프레임 탐색 슬라이더 구현.

### [2단계] 실시간 속성 수정 (완료)
*   [x] **Rust**: `dispatch_editor_command(json)` 명령어 통합 인터페이스 구축.
*   [x] **Rust**: `MaModel` 초기값(PosX, PosY, Scale, Angle 등) 실시간 수정 로직 구현.
*   [x] **TS**: Property Inspector 구현 및 속성값 입력 연동.
*   [x] **TS**: UI 코드 모듈화 (`EngineBridge`, `UIManager` 분리).

### [2.5단계] Undo/Redo 시스템 (완료 - 앞당겨짐)
*   [x] **TS**: `HistoryManager`를 통한 명령 기록 및 스택 관리.
*   [x] **TS**: `Ctrl+Z` (Undo), `Ctrl+Y / Ctrl+Shift+Z` (Redo) 단축키 연동.

### [3단계] 에디터 편의 기능 (완료)
*   [x] **Rust**: 파츠의 최종 절대 좌표 계산 API (`get_part_transform`) 연동.
*   [x] **TS**: 캔버스 위에서 마우스 드래그로 파츠 위치 조절 (Gizmo 기초).
*   [x] **TS**: 타임라인 UI 구현 (키프레임 시각화 및 드래그 이동).
*   [x] **Rust**: `MaAnim` 키프레임 수정 기능 추가.

### [4단계] 데이터 보존 및 내보내기 (완료)
*   [x] **Rust**: 수정된 데이터를 원본 `.txt` 형식으로 변환하는 `Serializer` 구현.
*   [x] **TS**: 편집된 애니메이션을 파일로 다운로드하는 기능.
*   [x] **TS**: 다중 애니메이션(Walk, Attack 등) 전환 및 관리 UI.

### [5단계] UX 고도화 및 세부 편집 (진행 예정)
*   [ ] **TS**: UI 컴포넌트화 리팩토링 (`ui-components.ts` 분리).
*   [ ] **TS**: 타임라인 내 키프레임 드래그 이동 및 우클릭 메뉴 (추가/삭제).
*   [ ] **TS**: 보간 타입(Linear, Step, Easing 등) 시각화 및 편집 UI.
*   [ ] **TS**: 기즈모 핸들 확장 (회전/스케일 전용 핸들 추가).
*   [ ] **TS**: 다중 파츠 선택 및 일괄 편집 기능.

### [6단계] 데이터 안정성 및 무결성 강화 (진행 예정)
*   [ ] **Test**: Round-trip 검증 (로드 -> 수정 -> 저장 -> 다시 로드 시 정합성 확인).
*   [ ] **TS/Rust**: 입력값 유효성 검사 (Bounds Check) 강화.
*   [ ] **TS**: 자동 저장 (Local Storage) 및 세션 복구 기능.
*   [ ] **Rust**: 대규모 애니메이션 데이터셋에 대한 파싱/렌더링 스트레스 테스트.

---

## 3. 주요 구현 기술
*   **Backend**: Rust + WASM + Serde (JSON 직렬화)
*   **Frontend**: TypeScript + Vite + Vanilla CSS (컴포넌트 기반 구조로 전환 예정)
*   **State**: Command 패턴 기반의 무상태(Stateless) 통신 및 히스토리 관리

---

## 4. 메모 및 특이사항
*   `test_out/animations` 폴더의 실제 데이터를 통해 파서 및 런타임 호환성 검증 완료 (150+ 폴더 통과).
*   Undo/Redo를 초기에 도입하여 Gizmo 개발 시 안정성 확보.
