"""Linux Master Quiz - 대화형 터미널 퀴즈

사용법:
    python quiz.py              # 기본 모드 (퀴즈 풀기 + 힌트)
    python quiz.py              # .env에 API 키가 있으면 자동으로 AI 모드 활성화

.env 파일 예시:
    ANTHROPIC_API_KEY=sk-ant-...
"""

import os
import sys
import json
import base64
import textwrap
import io

# Windows cp949 인코딩 문제 해결
if sys.stdout.encoding != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding="utf-8", errors="replace")

_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_RESULTS_DIR = os.path.join(_BASE_DIR, "results")

# ── 퀴즈 데이터 (engine.py에서 가져옴) ──────────────────────────────────────

from engine import Quiz as _EngineQuiz

_LEVEL_NAMES = {"q1": "입문", "q2": "초급", "q3": "중급", "q4": "고급"}
_LEVEL_TOPICS = {
    "q1": "서버 기본 조작 (pwd, cd, ls, vim 등)",
    "q2": "파일/폴더 다루기 (cp, mv, rm, head/tail 등)",
    "q3": "검색, 파이프, 권한, 프로세스 (grep, find, chmod 등)",
    "q4": "네트워크, 압축, 실전 조합 (scp, tar, nohup 등)",
}


# ── 유틸리티 ────────────────────────────────────────────────────────────────

def _load_db(level):
    eq = _EngineQuiz(level)
    return eq._db


def _normalize(cmd):
    return " ".join(cmd.strip().split())


def _load_env():
    """Load .env file and return API key if found."""
    env_path = os.path.join(_BASE_DIR, ".env")
    if not os.path.exists(env_path):
        return None
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line.startswith("ANTHROPIC_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None


def _get_ai_client():
    """Return Anthropic client if API key is available."""
    api_key = os.environ.get("ANTHROPIC_API_KEY") or _load_env()
    if not api_key:
        return None
    try:
        from anthropic import Anthropic
        return Anthropic(api_key=api_key)
    except ImportError:
        print("\n  anthropic 패키지가 없습니다. AI 기능을 쓰려면:")
        print("  pip install anthropic\n")
        return None


def _save_results(level, results):
    """Save quiz results to JSON."""
    os.makedirs(_RESULTS_DIR, exist_ok=True)
    path = os.path.join(_RESULTS_DIR, f"{level}.json")
    data = {
        "level": level,
        "level_name": _LEVEL_NAMES[level],
        "results": results,
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return path


def _save_markdown(level, filename, content):
    """Save markdown content to results directory."""
    os.makedirs(_RESULTS_DIR, exist_ok=True)
    path = os.path.join(_RESULTS_DIR, f"{level}_{filename}.md")
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    return path


# ── 가이드 로딩 (AI 프롬프트용) ─────────────────────────────────────────────

def _load_guide_for_level(level):
    """Load the relevant guide markdown for context."""
    guide_map = {
        "q1": "guide_beginner.md",
        "q2": "guide_beginner.md",
        "q3": "guide_intermediate.md",
        "q4": "guide_advanced.md",
    }
    path = os.path.join(_BASE_DIR, guide_map[level])
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            return f.read()
    return ""


# ── 터미널 UI ───────────────────────────────────────────────────────────────

def _clear():
    os.system("cls" if os.name == "nt" else "clear")


def _print_banner():
    print("=" * 56)
    print("   Linux Master Quiz")
    print("   리눅스 명령어 학습 + 실전 퀴즈")
    print("=" * 56)


def _print_level_menu():
    print("\n  레벨을 선택하세요:\n")
    for key in ["q1", "q2", "q3", "q4"]:
        name = _LEVEL_NAMES[key]
        topic = _LEVEL_TOPICS[key]
        print(f"    {key[-1]}) {name} — {topic}")
    print()


def _input_choice(prompt, valid):
    while True:
        choice = input(prompt).strip().lower()
        if choice in valid:
            return choice
        print(f"  '{choice}'은(는) 올바르지 않습니다. 다시 입력하세요.")


# ── 퀴즈 실행 ───────────────────────────────────────────────────────────────

def run_quiz(level):
    """Run an interactive quiz and return results dict."""
    db = _load_db(level)
    total = len(db)
    results = {}
    current_hint = ""

    print(f"\n{'─' * 56}")
    print(f"  {_LEVEL_NAMES[level]} ({level}) — {_LEVEL_TOPICS[level]}")
    print(f"  총 {total}문제 | 답을 입력하세요 (빈칸 = 건너뛰기)")
    print(f"  힌트가 필요하면 'h' 입력")
    print(f"{'─' * 56}\n")

    for qnum in range(1, total + 1):
        d = db[qnum]
        question = d["q"]
        accepted = d["a"]
        current_hint = d["h"]

        print(f"  Q{qnum}. {question}")

        while True:
            answer = input("  > ").strip()

            if answer.lower() == "h":
                print(f"  💡 힌트: {current_hint}")
                continue
            break

        if not answer:
            print(f"  ⏭  건너뜀\n")
            results[str(qnum)] = {
                "correct": False,
                "user_answer": "",
                "question": question,
                "skipped": True,
            }
            continue

        user_norm = _normalize(answer)
        is_correct = any(_normalize(a) == user_norm for a in accepted)

        if is_correct:
            print(f"  ✅ 정답!\n")
        else:
            print(f"  ❌ 오답 (정답: {accepted[0]})\n")

        results[str(qnum)] = {
            "correct": is_correct,
            "user_answer": answer,
            "question": question,
        }

    return results


def print_summary(level, results):
    """Print quiz summary and return wrong/skipped question numbers."""
    db = _load_db(level)
    total = len(db)
    correct = sum(1 for r in results.values() if r["correct"])
    wrong = [
        int(qn) for qn, r in sorted(results.items(), key=lambda x: int(x[0]))
        if not r["correct"]
    ]
    not_attempted = [
        i for i in range(1, total + 1) if str(i) not in results
    ]

    pct = correct / total * 100 if total > 0 else 0
    bar = "█" * int(pct // 10) + "░" * (10 - int(pct // 10))

    print(f"\n{'=' * 56}")
    print(f"  {_LEVEL_NAMES[level]} ({level}) 결과")
    print(f"  {bar} {correct}/{total} ({pct:.0f}%)")
    if wrong:
        wrong_str = ", ".join(f"Q{n}" for n in wrong)
        print(f"  ❌ 틀린/건너뛴 문제: {wrong_str}")
    if not_attempted:
        na_str = ", ".join(f"Q{n}" for n in not_attempted)
        print(f"  ❓ 미응답: {na_str}")
    print(f"{'=' * 56}")

    if pct == 100:
        print(f"\n  🎉 축하합니다! {_LEVEL_NAMES[level]} 완벽 클리어!")
    elif pct >= 80:
        print(f"\n  👍 잘했습니다! 틀린 문제만 복습하면 완벽!")

    return wrong + not_attempted


# ── AI 기능 ─────────────────────────────────────────────────────────────────

def ai_generate_review(client, level, results):
    """AI가 오답노트를 생성한다."""
    db = _load_db(level)
    wrong_items = []
    for qn, r in sorted(results.items(), key=lambda x: int(x[0])):
        if not r["correct"]:
            d = db[int(qn)]
            wrong_items.append({
                "번호": f"Q{qn}",
                "질문": d["q"],
                "정답": d["a"][0],
                "내 답": r["user_answer"] or "(건너뜀)",
                "힌트": d["h"],
            })

    if not wrong_items:
        return None

    guide = _load_guide_for_level(level)

    prompt = f"""당신은 리눅스 명령어 튜터입니다. 학생이 {_LEVEL_NAMES[level]} 레벨 퀴즈를 풀었고, 아래 문제를 틀렸습니다.

## 틀린 문제 목록
{json.dumps(wrong_items, ensure_ascii=False, indent=2)}

## 참고 가이드
{guide[:3000]}

## 요청
각 틀린 문제에 대해:
1. 왜 틀렸는지 분석 (학생의 답과 정답을 비교)
2. 정답 명령어의 의미와 구조를 설명
3. 관련 명령어/옵션 정리표
4. 비슷한 상황에서의 활용 예시

마크다운 형식으로 작성하세요. 제목은 "# {_LEVEL_NAMES[level]} 오답 노트"로 시작하세요."""

    print("\n  🤖 AI가 오답노트를 생성하고 있습니다...")

    response = client.messages.create(
        model="claude-sonnet-4-5-20250514",
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}],
    )

    content = response.content[0].text
    path = _save_markdown(level, "review", content)
    print(f"  📄 저장됨: {path}")
    return content


def ai_generate_retest(client, level, results):
    """AI가 틀린 문제 기반으로 재시험을 생성한다."""
    db = _load_db(level)
    wrong_items = []
    for qn, r in sorted(results.items(), key=lambda x: int(x[0])):
        if not r["correct"]:
            d = db[int(qn)]
            wrong_items.append({
                "번호": f"Q{qn}",
                "질문": d["q"],
                "정답": d["a"][0],
                "힌트": d["h"],
            })

    if not wrong_items:
        return None

    prompt = f"""당신은 리눅스 명령어 튜터입니다. 학생이 {_LEVEL_NAMES[level]} 레벨 퀴즈에서 아래 문제를 틀렸습니다.

## 틀린 문제
{json.dumps(wrong_items, ensure_ascii=False, indent=2)}

## 요청
틀린 문제와 같은 주제에서 새로운 문제를 만들어주세요.
- 틀린 문제 1개당 유사 문제 2개씩 출제
- 각 문제는 "질문", "정답", "힌트" 형식
- 난이도는 원래 문제와 비슷하거나 약간 쉽게
- JSON 배열 형식으로 출력

출력 형식 (순수 JSON만, 마크다운 코드블록 없이):
[{{"q": "질문", "a": "정답", "h": "힌트"}}]"""

    print("  🤖 AI가 재시험을 생성하고 있습니다...")

    response = client.messages.create(
        model="claude-sonnet-4-5-20250514",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = response.content[0].text.strip()
    # JSON 파싱 (마크다운 코드블록 제거)
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1]
        raw = raw.rsplit("```", 1)[0]
    try:
        retest_questions = json.loads(raw)
    except json.JSONDecodeError:
        print("  ⚠️  재시험 생성 중 파싱 오류가 발생했습니다.")
        return None

    return retest_questions


def run_retest(questions):
    """AI가 생성한 재시험을 실행한다."""
    total = len(questions)
    correct = 0

    print(f"\n{'─' * 56}")
    print(f"  재시험 — {total}문제")
    print(f"  답을 입력하세요 (빈칸 = 건너뛰기, h = 힌트)")
    print(f"{'─' * 56}\n")

    for i, q in enumerate(questions, 1):
        print(f"  R{i}. {q['q']}")

        while True:
            answer = input("  > ").strip()
            if answer.lower() == "h":
                print(f"  💡 힌트: {q['h']}")
                continue
            break

        if not answer:
            print(f"  ⏭  건너뜀 (정답: {q['a']})\n")
            continue

        user_norm = _normalize(answer)
        answer_norm = _normalize(q["a"])
        if user_norm == answer_norm:
            print(f"  ✅ 정답!\n")
            correct += 1
        else:
            print(f"  ❌ 오답 (정답: {q['a']})\n")

    pct = correct / total * 100 if total > 0 else 0
    print(f"\n  재시험 결과: {correct}/{total} ({pct:.0f}%)")
    if pct == 100:
        print("  🎉 완벽! 약점을 극복했습니다!")
    elif pct >= 50:
        print("  👍 좋아지고 있어요! 오답노트를 한 번 더 읽어보세요.")
    else:
        print("  📖 오답노트를 꼼꼼히 읽고 다시 도전해보세요.")


def ai_generate_supplement(client, level, results):
    """AI가 보강자료를 생성한다."""
    db = _load_db(level)
    wrong_items = []
    for qn, r in sorted(results.items(), key=lambda x: int(x[0])):
        if not r["correct"]:
            d = db[int(qn)]
            wrong_items.append(d["q"])

    if not wrong_items:
        return None

    guide = _load_guide_for_level(level)

    prompt = f"""당신은 리눅스 명령어 튜터입니다. 학생이 {_LEVEL_NAMES[level]} 레벨에서 약한 부분이 있습니다.

## 약한 주제 (틀린 문제들)
{json.dumps(wrong_items, ensure_ascii=False)}

## 참고 가이드
{guide[:3000]}

## 요청
틀린 문제들의 주제를 분석하고, 해당 주제에 대한 보강 학습 자료를 만들어주세요:
1. 약한 주제를 2~3개로 그룹핑
2. 각 주제별로:
   - 핵심 개념 설명
   - 자주 쓰는 명령어 + 옵션 정리표
   - 실전 시나리오 예시 3개
   - 외우는 팁 (약어 풀이, 연상법 등)

마크다운 형식으로 작성하세요. 제목은 "# {_LEVEL_NAMES[level]} 보강 자료"로 시작하세요."""

    print("  🤖 AI가 보강자료를 생성하고 있습니다...")

    response = client.messages.create(
        model="claude-sonnet-4-5-20250514",
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}],
    )

    content = response.content[0].text
    path = _save_markdown(level, "supplement", content)
    print(f"  📄 저장됨: {path}")
    return content


# ── 메인 루프 ───────────────────────────────────────────────────────────────

def main():
    _clear()
    _print_banner()

    # AI 클라이언트 확인
    client = _get_ai_client()
    if client:
        print("\n  🤖 AI 모드 활성화 (.env에서 API 키 감지)")
        print("     오답노트 / 재시험 / 보강자료가 자동 생성됩니다")
    else:
        print("\n  📝 기본 모드 (AI 없이 퀴즈만 진행)")
        print("     AI 기능을 쓰려면 .env 파일에 ANTHROPIC_API_KEY를 설정하세요")

    # 레벨 선택
    _print_level_menu()
    choice = _input_choice("  선택 (1-4): ", ["1", "2", "3", "4"])
    level = f"q{choice}"

    # 퀴즈 실행
    results = run_quiz(level)

    # 결과 저장 + 요약
    save_path = _save_results(level, results)
    wrong = print_summary(level, results)
    print(f"\n  💾 결과 저장됨: {save_path}")

    # AI 피드백 루프
    if client and wrong:
        print(f"\n{'─' * 56}")
        print("  AI 피드백을 시작합니다")
        print(f"{'─' * 56}")

        # 1) 오답노트
        ai_generate_review(client, level, results)

        # 2) 보강자료
        ai_generate_supplement(client, level, results)

        # 3) 재시험
        retest_q = ai_generate_retest(client, level, results)
        if retest_q:
            print()
            do_retest = input("  재시험을 풀어볼까요? (y/n): ").strip().lower()
            if do_retest == "y":
                run_retest(retest_q)

                # 재시험 후 다시 도전 여부
                print()
                again = input("  원래 퀴즈를 다시 풀어볼까요? (y/n): ").strip().lower()
                if again == "y":
                    results = run_quiz(level)
                    _save_results(level, results)
                    wrong = print_summary(level, results)

    elif not wrong:
        print("\n  🎉 모든 문제를 맞혔습니다! 다음 레벨로 진행하세요.")

    # 다음 레벨 안내
    level_num = int(level[-1])
    if level_num < 4:
        next_level = f"q{level_num + 1}"
        print(f"\n  ➡  다음 레벨: python quiz.py → {_LEVEL_NAMES[next_level]}({next_level})")

    print()


if __name__ == "__main__":
    main()
