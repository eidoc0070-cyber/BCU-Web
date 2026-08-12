#!/bin/bash
# BCU Git Commit Helper
# 사용법 1: ./git_commit.sh [파일1] [파일2] ... [커밋메시지]  ← 파일 직접 지정
# 사용법 2: ./git_commit.sh [커밋메시지]                       ← 변경된 파일 자동 감지
# 옵션:     --full  → 기본 lint+test 외에 format 및 build(wasm-pack 포함)까지 포함한 전체 검사 실행 (bun run ready)
set -e

FULL_CHECK=false
ARGS=()
for arg in "$@"; do
  if [ "$arg" = "--full" ]; then
    FULL_CHECK=true
  else
    ARGS+=("$arg")
  fi
done
set -- "${ARGS[@]}"

if [ "$#" -lt 1 ]; then
  echo "❌ 인자 오류"
  echo ""
  echo "사용법 1 (직접 지정): ./git_commit.sh [--full] [파일1] [파일2] ... [커밋메시지]"
  echo "사용법 2 (자동 감지): ./git_commit.sh [--full] [커밋메시지]"
  echo ""
  echo "옵션:"
  echo "  --full  전체 검사 실행 (bun run ready: format + lint(clippy pedantic 포함) + build(wasm-pack 포함) + test)"
  echo "          생략 시 빠른 검사 실행 (lint + test, 자동수정 없음 — 체크만)"
  exit 1
fi

# ── git 저장소인지 확인 ──────────────────────────────────────
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "❌ 현재 디렉토리는 git 저장소가 아닙니다."
  echo "   git 저장소 안에서 실행해주세요."
  exit 1
fi

msg="${@: -1}"

# ── 커밋 메시지 빈 문자열 체크 ──────────────────────────────
if [ -z "$(echo -n "$msg" | tr -d '[:space:]')" ]; then
  echo "❌ 커밋 메시지가 비어 있습니다."
  echo "   공백만으로는 커밋 메시지를 만들 수 없습니다."
  exit 1
fi

if [ "$#" -eq 1 ]; then
  # ── 인자 1개일 때 모호함 처리 ────────────────────────────
  if [ -e "$msg" ]; then
    echo "❌ 인자가 1개인데, 이 값이 실제 존재하는 파일 경로와 같습니다: \"$msg\""
    echo "   커밋 메시지로 쓰려던 것인지, 파일을 지정하려던 것인지 모호합니다."
    echo ""
    echo "   • 이 파일만 커밋하려면 메시지를 추가하세요:"
    echo "     ./git_commit.sh \"$msg\" \"커밋 메시지\""
    echo "   • 변경된 파일 전체를 자동 감지하려면 메시지만 다른 값으로 넘기세요."
    exit 1
  fi

  # ── 자동 감지 모드 ──────────────────────────────────────
  echo "🔎 파일 미지정 → 변경된 파일 자동 감지 중..."
  mapfile -t files < <({
    git diff --name-only
    git diff --cached --name-only
    git ls-files --others --exclude-standard
  } | sort -u)

  if [ "${#files[@]}" -eq 0 ]; then
    echo "❌ 변경된 파일이 없습니다. (추적 중인 변경사항 및 새 파일 없음)"
    exit 1
  fi
else
  # ── 수동 지정 모드 ──────────────────────────────────────
  files=("${@:1:$#-1}")
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 커밋 대상 파일:"
for f in "${files[@]}"; do
  echo "   - $f"
done
echo "💬 커밋 메시지: $msg"
if [ "$FULL_CHECK" = true ]; then
  echo "🔬 검사 모드: 전체 (bun run ready: format + lint + build(wasm-pack) + test)"
else
  echo "⚡ 검사 모드: 빠른 (lint + test, 자동수정 없음)  [전체 검사는 --full 옵션 사용]"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔍 [1/4] 변경 내용 미리보기 (git diff --stat)..."
for f in "${files[@]}"; do
  if git ls-files --error-unmatch "$f" >/dev/null 2>&1; then
    :
  else
    echo "   🆕 (신규 파일, diff 없음) $f"
  fi
done
git diff --stat -- "${files[@]}" 2>/dev/null || true
echo ""

if [ "$FULL_CHECK" = true ]; then
  echo "🧪 [2/4] 전체 품질 검사 (bun run ready)..."
  bun run ready
else
  echo "🧪 [2/4] 빠른 품질 검사 (bun run lint && bun run test)..."
  bun run lint
  bun run test
fi

echo ""
echo "📦 [3/4] 스테이징 & 커밋..."
git add -- "${files[@]}"
git commit -m "$msg"
echo ""
echo "✅ [4/4] 커밋 완료! 최신 로그:"
git log -1 --pretty=format:"  Hash: %h%n  Date: %ad%n  Msg:  %s" --date=short
echo ""
git status --short
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 완료!"
