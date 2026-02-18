# Linux Master

리눅스 명령어 학습 + 실전 퀴즈 프로젝트.

## 구성

### 가이드
| 파일 | 내용 |
|------|------|
| `guide_beginner.md` | 초급: 명령어 구조, 파일/폴더, 내용 보기 |
| `guide_intermediate.md` | 중급: 검색(grep/find), 파이프, 권한, 프로세스 |
| `guide_advanced.md` | 고급: 네트워크, 압축, 디스크, 실전 조합 |

### 퀴즈 (레벨별 15문제)
| 파일 | 레벨 | 주제 |
|------|------|------|
| `q1.ipynb` | 입문 | 서버 기본 조작 (pwd, cd, ls, vim 등) |
| `q2.ipynb` | 초급 | 파일/폴더 다루기 (cp, mv, rm, head/tail 등) |
| `q3.ipynb` | 중급 | 검색, 파이프, 권한, 프로세스 (grep, find, chmod 등) |
| `q4.ipynb` | 고급 | 네트워크, 압축, 실전 조합 (scp, tar, nohup 등) |

### 기타
| 파일/폴더 | 내용 |
|------|------|
| `engine.py` | 공유 채점 엔진 |
| `results/` | 퀴즈 결과 자동 저장 (qN.json) |
| `r1.md` ~ `r4.md` | 보강자료 (퀴즈 결과 기반으로 생성) |

## 학습 플로우

```
q1.ipynb 풀기 → 결과 확인 → r1.md 복습 → q2.ipynb → ... → q4.ipynb
```

1. 레벨별 퀴즈 노트북을 순서대로 풀기
2. `results/qN.json`에 결과가 자동 저장됨
3. 틀린 문제 기반으로 보강자료(`rN.md`) 생성 요청
4. 복습 후 다음 레벨로 진행

## 퀴즈 사용법

```bash
jupyter notebook q1.ipynb
```

1. 첫 번째 셀(채점 엔진 import)을 실행
2. 각 문제 셀에서 `answer = "명령어"` 입력 후 Shift+Enter
3. 즉시 정답/오답 판정
4. 마지막 셀에서 점수 요약 확인

힌트가 필요하면 `quiz.hint()`를 실행.
