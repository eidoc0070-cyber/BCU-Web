# BCU Rust & Battle Simulator Expansion Plan (Definitive Edition)

> **작성일**: 2026-08-12  
> **프로젝트 기본 원칙**: 본 프로젝트는 원본과의 1:1 포팅이 아닌 **재작성(Reimplementation)**을 목표로 한다. 원본 소스는 사양 이해를 위한 참고 자료로 사용하되, 게임 밸런스/결과에 영향 없는 구현 방식은 자유롭게 재설계한다.

---

## 🎯 Architectural Roadmap Overview

기술 부채 방지와 구조 재작성을 방지하기 위해 **[1단계: 데이터/저장소] ➔ [2단계: 진단/UI 표준] ➔ [3단계: 배틀 코어]** 순서로 진행합니다.

```
┌────────────────────────────────────────────────────────┐
│ Phase 1: Native OPFS Storage & Asset Management       │
│ - Web Worker Async File I/O Pipeline & SyncAccessHandle│
│ - Schema Versioning (version: 1) & Asset Package Loader│
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ Phase 2: GPU Diagnostic HUD & i18n UI Framework        │
│ - Zero-Overhead Performance Diagnostic HUD (FPS/Mem)   │
│ - Lightweight Vanilla TS i18n System (KO / EN / JA)    │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ Phase 3: BCU Real-time Battle Simulator Sandbox        │
│ - Targeting/Range & Collision/Queueing Specification   │
│ - Deterministic Entity ID Iteration Update Order       │
│ - 1-Pass WASM-JS State Batching (Single Bridge Call)   │
│ - Replay Determinism Verification Suite (State Hash)   │
│ - Multi-Unit Batch Renderer & Sandbox UI Controller    │
└────────────────────────────────────────────────────────┘
```

---

## 🔍 Legacy Logic Audit & Mapping

### 1. Java 원본 1:1 이식 및 매핑 현황
* **애니메이션 키프레임 보간 (`crates/bcu-core/src/animation/interpolation.rs`)**: 
  `Part.java`의 Linear(0), Step(1), Easing(2), Sinusoidal(4) 계산 공식 1:1 이식.
* **런타임 애니메이션 프레임 업데이트 (`crates/bcu-core/src/animation/runtime.rs`, `epart.rs`)**:
  `EAnimD.java` (`update()`) 및 `EPart.java` (`setValue()`) 속성 0~14번 메커니즘 1:1 매핑.
* **파서 텍스트 데이터 처리 (`crates/bcu-parser/`)**:
  `ImgCut.java`, `MaModel.java`, `MaAnim.java` 의 `read()` 파싱, 32자 제한, `is_old` 변환 규칙 동일 적용.

### 2. 🏛️ 확정된 재설계 결정 기록 (Architecture Redesign Decisions)

| 영역 | 원본 Java (`test_out/...`) | 현행 Rust (`crates/`) | 재구현 사유 |
| :--- | :--- | :--- | :--- |
| **연산 데이터 타입** | `double`, `float` (부동소수점) 사용 | `bcu_math::FixedPoint` (`i64` 기반) 전면 대체 | 부동소수점 오차로 인한 **배틀 리플레이 불일치(Non-determinism)를 원천 차단**하기 위함 |
| **2D 그래픽스 파이프라인** | Java AWT / JOGL의 `Graphics2D` (`rotate()`, `translate()`, `scale()` 호출) | `bcu-render` 내 **`wgpu` MVP 행렬 & Quad Vertex Batch** | 웹 브라우저 WASM 60fps GPU 가속 렌더링 지원 |
| **서브프레임 보간** | `EAnimD`에서 정수 프레임 위주 업데이트 | `RenderState::lerp()` 렌더러 전용 격리 | 60fps 디스플레이 및 타임라인 슬라이더 조작 시 **부드러운 화면 보간 지원** |
| **메모리 / 소유권 관리** | 객체 참조(`EPart` 인스턴스 힙 주소) 직접 보유 | `usize` 파츠 인덱스 및 `parent_idx` 기반 인덱싱 | Rust 소유권 모델 준수 및 WASM 바운더리 넘기기 단순화 |

### 3. ⚠️ 미해결 리스크 (Pending Audit Risks)
- **FixedPoint sqrt/cos/sin 정밀도**: 
  `bcu-math` 삼각함수 및 제곱근 연산의 Java `Math` 대조 정밀도 검증 대기 중 (오차 누적 시뮬레이션 필요).
- **서브프레임 보간(`epart.rs`) 격리 방안**:
  `bcu-core` 크레이트 경계로 `f32 lerp` 함수 import 자체를 물리적으로 차단하여, 배틀 틱 상태 오염을 원천 방지 (트레이트 추상화 미채택, 렌더러 격리 강제).

---

## 🛠 Refactoring Priority Matrix (Idiomatic Code Audit)

| 우선순위 | 영역 / 파일 | 안티패턴 및 검토 결과 | Idiomatic 리팩터링 및 결론 |
| :---: | :--- | :--- | :--- |
| **High 🔴** | `crates/bcu-parser/src/imgcut.rs` | • 파싱 시 임시 `vec!["0", "0", "1", "1"]` 힙 할당 | • **[제거]** `&[&str]` 고정 슬라이스 및 이터레이터 분기로 Zero-allocation 파싱 변환 |
| **High 🔴** | `crates/bcu-parser/src/imgcut.rs`<br>`crates/bcu-parser/src/mamodel.rs`<br>`crates/bcu-parser/src/maanim.rs` | • 파서 3종 내 Java식 중첩 `for i in 0..n` 인덱스 루프 | • **[전환]** `lines.by_ref().take(n).enumerate()` 및 `map/collect` 파이프라인으로 전환<br>• *단, 파서 리팩터링 시 "에러 라인 중간 발생 케이스" 회귀 테스트 필수 추가* |
| **Maintain 🟢** | `crates/bcu-core/src/animation/runtime.rs` | • `model.strs0[i].clone()`, `anim: self.anim.clone()` 등 2건 | • **[유지]** DTO 및 엔티티 소유권 분리와 WASM 직렬화 시 라이프타임 전염 방지를 위해 현행 유지 |

### 💡 파서 Index Loop ➔ Iterator 전환 예시 (`mamodel.rs`)

```rust
// Before: 인덱스 루프 및 바운드 체크
for i in 0..n {
    let line = lines.next().ok_or_else(...)?;
    // ...
}

// After: Iterator 파이프라인
for (i, line) in lines.by_ref().take(n).enumerate() {
    let ss: Vec<&str> = line.trim().split(',').collect();
    // ...
}
```

---

## 📅 Detailed Phase Breakdown

### Phase 1: Native OPFS Storage & Asset Package System
> **Goal**: 외부 라이브러리 없이 Web Worker 기반 비동기 OPFS를 활용해 메인 UI 스레드 블로킹 없는 프로젝트 저장소를 구축한다.

1. **Web Worker Async OPFS Pipeline (`src/editor/workers/opfs.worker.ts`, `opfs-storage.ts`)**
   - 대용량 저장 및 `createSyncAccessHandle` 파일 IO를 Web Worker로 분리.
2. **Schema Versioning (`schema_version: 1`) & Asset Bundle Registry**
   - 모든 세이브/프로젝트 데이터에 `version: 1` 필수 포함.
3. **Unit Testing & Verification**
   - OPFS 백업/복원 및 스키마 버저닝 마이그레이션 테스트 작성 (`tests/unit/opfs.test.ts`).

---

### Phase 2: GPU Diagnostic HUD & i18n UI Framework
> **Goal**: 배틀 시뮬레이터 개발 시 성능 추적과 텍스트 하드코딩 부채를 차단한다.

1. **Zero-Overhead Performance Diagnostic HUD (`src/editor/components/debug-hud.ts`)**
   - Real-time FPS, Draw Call 횟수, 메쉬/텍스처 메모리 계측 오버레이. HUD 자체 렌더 타임 오버헤드 분리 측정.
2. **UI i18n System (`src/editor/i18n.ts`)**
   - 경량화 딕셔너리 기반 다국어 지원 (한국어 / 영어 / 일본어).

---

### Phase 3: BCU Real-time Battle Simulator Sandbox (Core)
> **Goal**: `bcu-core`와 `bcu-render`를 확장하여 실제 맵 위에서 유닛/적군이 전투를 벌이는 시뮬레이터를 완성한다.

1. **Targeting & Range Algorithm Specification (`crates/bcu-core/src/battle/targeting.rs`)**
   - 사거리 및 닿음(Touch) 감지, 단일/범위 타겟팅, KB 무적 타임라인.
2. **Collision, Queueing & Deterministic Update Order (`crates/bcu-core/src/battle/collision.rs`)**
   - 유닛 간 충돌 및 줄서기(Stacking & Queueing) 물리 연산.
   - 엔티티 틱 갱신 순서를 **`Entity ID` 오름차순**으로 엄격 고정하여 결정론 파괴 근본 차단.
3. **1-Pass WASM-JS State Batching (`crates/bcu-api/src/battle_bridge.rs`)**
   - **프레임당 단 1회의 WASM↔JS 바인딩 호출**로 전체 엔티티 상태 일괄 전달.
4. **Replay Determinism Verification Suite (`crates/bcu-core/tests/battle_determinism.rs`)**
   - 입력 시퀀스 리플레이 실행 시 **State Hash (Bit-perfect)** 일치 여부 검증.
5. **Multi-Unit Batch Renderer & Sandbox UI Controller (`crates/bcu-render/src/battle_renderer.rs`, `src/editor/components/battle-panel.ts`)**
   - 성(Base) 및 수십 마리의 아군/적군 수직 레이어링(Z-index) 렌더링, 사거리/히트박스 가시화 토글.
   - 아군 소환 카드 UI, 스폰 쿨다운 휠, 배틀 속도 조절(1x, 2x, Pause).

---

## ⚖️ Phase 3 Parity vs Redesign Decision Matrix

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Strict Parity (100% 원본 동기화)               │
│ - 배틀 밸런스 수치, 프레임 틱 계산 공식, 타겟팅 결정론  │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 2: Explicit Decision (Quirk/버그 선택적 재현)     │
│ - 1틱 딜레이, Clipping/Overlap 등 버그성 특성 판단    │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 3: Idiomatic Freedom (Rust 재설계 자유)           │
│ - 메모리 레이아웃, 이터레이터, WASM Batching, GPU 렌더링│
└─────────────────────────────────────────────────┘
```

---

## 🔍 Phase 3 Pre-implementation Verification Checklist

> **원칙**: 구현자는 AI 모델 추측 대신 `test_out/BCU-java-PC-slow_kotlin/` 원본 소스 코드를 `grep_search` 및 분석하여 근거를 기입한 후 구현에 착수해야 한다.

| 검증 항목 | 질문 및 분석 포인트 | Layer (1/2/3) | 원본 Java/Kotlin 파일 및 클래스/메서드 참조 | 분석 완료 및 구현 스펙 (기입란) |
| :--- | :--- | :---: | :--- | :--- |
| **1. Hurtbox vs Hitbox** | 이동 정지 판정이 Hurtbox 기준인지 Hitbox 기준인지? KB 중 Hurtbox가 비활성화되는지? | Layer 1 | `test_out/BCU-java-PC-slow_kotlin/...` | *Phase 3 착수 전 원본 코드 분석 후 기입* |
| **2. 이동 및 Hop 공식** | Speed 속도값 ➔ 프레임당 FixedPoint 이동량 환산 공식 (예: speed/2 px/frame 등)? | Layer 1 | `test_out/BCU-java-PC-slow_kotlin/...` | *Phase 3 착수 전 원본 코드 분석 후 기입* |
| **3. 충돌 판정 순서** | "이동 후 충돌 판정"인지 "판정 후 이동"인지? (Clipping 현상 재현 필요 여부) | Layer 2 | `test_out/BCU-java-PC-slow_kotlin/...` | *Phase 3 착수 전 원본 코드 분석 후 기입\** |
| **4. KB 무적 프레임** | 데미지 KB / 캐논 KB / 특수 KB 마다 지속 프레임 및 무적 타임라인 규정 | Layer 1 | `test_out/BCU-java-PC-slow_kotlin/...` | *Phase 3 착수 전 원본 코드 분석 후 기입* |
| **5. 특수 능력과 이동 막힘** | Attacks Only 등 타겟 불가 유닛이 있어도 물리적 줄서기/이동 막힘은 동일 적용되는지? | Layer 1 | `test_out/BCU-java-PC-slow_kotlin/...` | *Phase 3 착수 전 원본 코드 분석 후 기입* |
| **6. 보스 스폰 충격파** | 보스 스폰 시 전선 강제 후퇴(Shockwave KB) 범위 및 보스 자체의 KB 면역 처리 판정 | Layer 1 | `test_out/BCU-java-PC-slow_kotlin/...` | *Phase 3 착수 전 원본 코드 분석 후 기입* |
| **7. 타겟 탐색 우선순위** | 최전방 단일 타겟(Single) vs 범위(Area) 탐색 시 사거리 계산 및 정렬 기준 공식 | Layer 1 | `test_out/BCU-java-PC-slow_kotlin/...` | *Phase 3 착수 전 원본 코드 분석 후 기입* |
| **8. (분석 중 발견 항목)** | 유닛 스폰 오프셋, 파도/Wave 트리거, 상태이상(Freeze/Slow) 물리 개입 등 분석 중 발견되는 특수 규칙 | Layer 1/2 | `test_out/BCU-java-PC-slow_kotlin/...` | *분석 중 동적 기입* |

*\* 주: 표의 Layer 구분 항목은 예시 가이드일 뿐이며, 실제 소스 코드 분석 결과를 확인한 후 재판단하여 기입한다.*

---

## 🛡️ CI & Quality Drift Prevention

1. **Pre-commit & Quality Enforcement (`git_commit.sh`)**
   - 기본 커밋은 빠른 검사(`bun run lint` + `bun run test`, 자동수정 없음)만 거치며, 전체 검사(`format` + `lint` + `build`(wasm-pack 포함) + `test`)는 `--full` 옵션 사용 시에만 강제된다.
   - 단, 배틀 크레이트(`bcu-core`, `bcu-render`, `bcu-api` battle 관련) 및 배틀 결정론에 영향을 줄 수 있는 변경사항은 커밋 전 반드시 `--full` 옵션을 사용해야 한다.

---

## ⏳ Pending Before Phase 3 (선행 미완료 작업 트래커)

- [ ] **FixedPoint sqrt/cos/sin 정밀도 검증**: Java `Math` 대조 테스트 및 오차 누적 시뮬레이션 수행 (`bcu-math`)
- [ ] **Phase 3 체크리스트 7개 항목 분석**: `test_out/BCU-java-PC-slow_kotlin/` 원본 소스 실제 분석 및 Layer/스펙 기입
- [ ] **파서 리팩터링 회귀 테스트 추가**: 파서 인덱스 루프 ➔ 이터레이터 변환 시 "파싱 중간 에러 발생 케이스" 테스트 강화
