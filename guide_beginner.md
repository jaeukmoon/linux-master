# 리눅스 명령어 가이드 - 초급

## 1. 명령어의 구조

모든 리눅스 명령어는 이 구조를 따른다:

```
명령어  [옵션]  [대상]
```

```bash
ls  -l  /home
#│   │    └─ 대상: 어디를?
#│   └────── 옵션: 어떻게?
#└────────── 명령어: 뭘 할건지
```

### 옵션(플래그)의 원리

옵션은 **명령어의 동작을 바꿔주는 스위치**다.

| 형태 | 의미 | 예시 |
|------|------|------|
| `-` + 알파벳 하나 | 짧은 옵션 | `ls -l` |
| `--` + 단어 | 긴 옵션 | `ls --all` |
| 짧은 옵션 여러 개 합치기 | 붙여 쓸 수 있음 | `ls -la` = `ls -l -a` |

자주 보이는 공통 옵션들:

| 옵션 | 의미 | 설명 |
|------|------|------|
| `-r` | recursive (재귀) | 폴더 안의 모든 하위 폴더까지 포함 |
| `-f` | force (강제) | 확인 안 묻고 바로 실행 |
| `-v` | verbose (상세) | 뭘 하고 있는지 자세히 출력 |
| `-i` | interactive (대화형) | 하나하나 확인을 물어봄 |
| `-n` | dry-run / number | 실제로 실행 안 하고 미리보기, 또는 줄번호 |
| `-h` | human-readable | 사람이 읽기 쉬운 단위 (KB, MB, GB) |
| `-a` | all (전체) | 숨김 파일(.으로 시작)까지 포함 |

### 도움말 보는 법

모르는 명령어가 있으면:

```bash
# 간단한 도움말
명령어 --help

# 상세한 매뉴얼
man 명령어           # 'q'를 누르면 나감
```

---

## 2. 파일/폴더 다루기

### ls — 목록 보기

```bash
ls                   # 현재 폴더 목록
ls -l                # 자세히 보기 (권한, 크기, 날짜)
ls -a                # 숨김 파일 포함
ls -la               # 자세히 + 숨김 파일
ls -lh               # 자세히 + 파일 크기를 MB/GB로
```

`ls -l` 출력 읽는 법:
```
drwxr-xr-x  3 j.moon staff  96  Feb 15 10:00 my_folder
-rw-r--r--  1 j.moon staff 4.2K Feb 15 09:30 train.py
│└────────┘   └─────┘ └───┘ └──┘ └──────────┘ └───────┘
│  권한       소유자  그룹  크기    수정일시     파일명
│
d = 폴더(directory), - = 일반 파일, l = 링크
```

### mkdir — 폴더 만들기

```bash
mkdir models                     # 폴더 하나 만들기
mkdir -p data/raw/2024           # 중간 폴더가 없어도 한번에 다 만들기
#      └─ parents: 부모 폴더도 같이 생성
```

### cp — 복사

```bash
cp file.txt backup.txt           # 파일 복사
cp file.txt /home/backup/        # 다른 폴더로 복사

cp -r my_folder/ backup_folder/  # 폴더 전체 복사
#  └─ recursive: 폴더 안의 모든 내용물까지
#     -r 없이 폴더를 복사하면 에러남!
```

### mv — 이동 / 이름 변경

```bash
mv old.txt new.txt               # 이름 변경 (같은 폴더 내)
mv file.txt /home/data/          # 파일 이동
mv my_folder/ /home/backup/      # 폴더 이동 (cp와 달리 -r 필요 없음)
```

### rm — 삭제

```bash
rm file.txt                      # 파일 삭제
rm -i file.txt                   # 삭제 전 확인 (안전)

rm -r my_folder/                 # 폴더 전체 삭제
#  └─ recursive: 폴더 안의 모든 것을 삭제
#     -r 없이 폴더를 삭제하면 에러남!

rm -rf my_folder/                # 강제로 폴더 전체 삭제 (확인 안 물음)
#  └─ r + f(force)
#     ⚠️ 주의: 복구 불가! 휴지통 없음!
```

---

## 3. 파일 내용 보기

### cat — 파일 전체 출력

```bash
cat file.txt                     # 파일 내용 전체 출력
cat -n file.txt                  # 줄번호 포함해서 출력
```

### head / tail — 앞부분 / 뒷부분

```bash
head file.txt                    # 처음 10줄
head -n 20 file.txt              # 처음 20줄

tail file.txt                    # 마지막 10줄
tail -n 20 file.txt              # 마지막 20줄
tail -f log.txt                  # 실시간 로그 모니터링 (새 내용이 추가되면 자동 출력)
#     └─ follow: 파일 끝을 계속 따라감. Ctrl+C로 종료
```

### less — 스크롤하며 보기 (긴 파일용)

```bash
less file.txt
# 조작법:
#   위/아래 방향키 = 스크롤
#   스페이스바 = 다음 페이지
#   /검색어 = 파일 안에서 검색 (n으로 다음 결과)
#   q = 나가기
```

### wc — 줄/단어/글자 수 세기

```bash
wc file.txt                      # 줄수  단어수  바이트수  파일명
wc -l file.txt                   # 줄 수만 출력
```

### diff — 두 파일 비교

```bash
diff file1.txt file2.txt         # 두 파일의 차이점 출력
```

---

## 빠른 참조표 (초급)

| 하고 싶은 것 | 명령어 |
|-------------|--------|
| 파일 목록 보기 | `ls -la` |
| 폴더 만들기 | `mkdir -p 경로` |
| 파일 복사 | `cp 원본 사본` |
| 폴더 복사 | `cp -r 원본/ 사본/` |
| 이름 변경 | `mv 이전 이후` |
| 파일 삭제 | `rm 파일` |
| 폴더 삭제 | `rm -rf 폴더/` |
| 파일 내용 보기 | `cat 파일` |
| 처음 N줄 보기 | `head -n N 파일` |
| 마지막 N줄 보기 | `tail -n N 파일` |
| 실시간 로그 | `tail -f 파일` |
| 줄 수 세기 | `wc -l 파일` |
