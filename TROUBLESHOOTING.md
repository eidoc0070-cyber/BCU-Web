# BCU Rust: Rendering Troubleshooting Guide

현재 브라우저에서 엔진 초기화 중 발생한 `No available adapters` 에러와 `ReferenceError`에 대한 분석 및 해결 방안입니다.

## 1. "No available adapters" 에러 분석

이 에러는 `wgpu` 라이브러리가 브라우저의 GPU 가속(WebGPU 또는 WebGL2)에 접근하지 못했을 때 발생합니다.

### 원인 1: 브라우저의 WebGPU 미지원
*   **WebGPU**는 최신 브라우저 표준으로, 아직 모든 환경에서 기본 활성화되어 있지 않을 수 있습니다.
*   현재 코드(`lib.rs`)는 WebGPU를 우선적으로 찾도록 설정되어 있습니다.

### 원인 2: 하드웨어 가속 비활성화
*   브라우저 설정에서 "가능한 경우 하드웨어 가속 사용"이 꺼져 있으면 GPU 어댑터를 찾을 수 없습니다.

### 원인 3: Linux 환경의 드라이버 호환성
*   Linux 브라우저(Chrome/Firefox)에서 Vulkan이나 OpenGL 드라이버가 제대로 잡히지 않을 때 발생합니다.

### 🛠️ 해결 방안 (코드 수정 예정)
*   **WebGL2 Fallback 강화**: WebGPU가 실패할 경우 확실하게 WebGL2로 전환하도록 `bcu-render`의 백엔드 설정을 조정해야 합니다.
*   **어댑터 옵션 완화**: `force_fallback_adapter: true` 옵션을 추가하여 소프트웨어 렌더러라도 사용하도록 수정할 수 있습니다.

---

## 2. "loadCharacter is not defined" 에러 분석

### 원인
*   `BCUEngine.init()` 함수가 실행되는 도중 위에서 언급한 GPU 어댑터 에러로 인해 **Panic(충돌)**이 발생했습니다.
*   이로 인해 그 다음 줄에 있는 `(window as any).loadCharacter = ...` 코드가 실행되지 못했고, 버튼 클릭 시 해당 함수를 찾지 못하게 된 것입니다.

### 🛠️ 해결 방안
*   **초기화 순서 변경**: 엔진 초기화 전에 함수를 먼저 등록하여, 엔진이 실패하더라도 UI가 깨지지 않게 합니다.
*   **에러 핸들링**: GPU 어댑터를 찾지 못했을 때 Panic이 아닌 사용자 친화적인 메시지를 띄우도록 수정합니다.

---

## 3. 사용자 조치 사항 (지금 확인해볼 수 있는 것)

1.  **브라우저 확인**: Chrome 최신 버전 또는 Edge를 사용하고 계신지 확인해주세요.
2.  **하드웨어 가속**: 브라우저 설정 -> 시스템 -> "가능한 경우 하드웨어 가속 사용"이 켜져 있는지 확인해주세요.
3.  **WebGPU 확인**: [webgpu.github.io/webgpu-samples/](https://webgpu.github.io/webgpu-samples/) 사이트가 정상적으로 작동하는지 확인하시면 현재 브라우저의 WebGPU 지원 여부를 알 수 있습니다.

---

## ✅ 해결 완료 (2026-05-26)

### 1. WebGL2/소프트웨어 렌더링 Fallback 적용
*   `bcu-render`의 `request_adapter` 옵션에서 `force_fallback_adapter: true`를 설정했습니다.
*   이로 인해 하드웨어 가속이 불가능한 환경에서도 소프트웨어 렌더러를 통해 엔진이 구동될 수 있습니다.

### 2. 초기화 순서 및 에러 핸들링 개선
*   `src/main.ts`에서 `loadCharacter` 함수를 엔진 초기화 코드보다 먼저 등록하도록 수정했습니다.
*   엔진 초기화 실패 시 Panic으로 인해 자바스크립트 실행이 중단되는 대신, 사용자에게 적절한 에러 메시지를 표시하고 UI 기능을 유지합니다.
*   데이터 로드 시 엔진 상태를 체크하여 초기화 실패 시 알림을 띄우도록 보완했습니다.
