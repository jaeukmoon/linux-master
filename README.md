# Linux Master

리눅스 명령어 학습 + 실전 퀴즈 프로젝트.

## 구성

| 파일 | 내용 |
|------|------|
| `guide_beginner.md` | 초급: 명령어 구조, 파일/폴더, 내용 보기 |
| `guide_intermediate.md` | 중급: 검색(grep/find), 파이프, 권한, 프로세스 |
| `guide_advanced.md` | 고급: 네트워크, 압축, 디스크, 실전 조합 |
| `quiz.ipynb` | 실전 퀴즈 (45문제, 즉시 채점) |

## 퀴즈 사용법

```bash
jupyter notebook quiz.ipynb
```

1. 첫 번째 셀(채점 엔진)을 실행
2. 각 문제 셀에서 `answer = "명령어"` 입력 후 Shift+Enter
3. 즉시 정답/오답 판정
4. 각 섹션 끝과 마지막에 점수 요약

힌트가 필요하면 셀에 `hint()`를 실행.
