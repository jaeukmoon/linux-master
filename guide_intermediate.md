# 리눅스 명령어 가이드 - 중급

## 1. 검색

### grep — 파일 내용에서 텍스트 검색

```bash
grep "에러" log.txt                # log.txt에서 "에러" 포함된 줄 출력
grep -i "error" log.txt            # 대소문자 구분 안 함 (Error, ERROR 다 찾음)
#     └─ ignore-case
grep -n "error" log.txt            # 줄번호도 같이 출력
#     └─ number
grep -r "import torch" ./          # 현재 폴더 아래 모든 파일에서 검색
#     └─ recursive
grep -c "error" log.txt            # 매칭된 줄 수만 출력
#     └─ count
grep -v "DEBUG" log.txt            # "DEBUG"가 없는 줄만 출력 (제외)
#     └─ invert
```

**옵션 조합:**
```bash
grep -rn "TODO" ./                 # 모든 파일에서 TODO 검색 + 줄번호
grep -ri "error" logs/             # 대소문자 무시 + 재귀 검색
grep -rn "def train" --include="*.py" ./  # .py 파일에서만 검색
```

### find — 파일/폴더 찾기

```bash
find . -name "*.py"                # 현재 폴더 아래에서 .py 파일 모두 찾기
#    │  └─ 이름으로 검색
#    └──── 어디서부터? (. = 현재 폴더)

find . -name "*.log" -delete       # .log 파일 찾아서 삭제
find . -type d -name "models"      # "models"라는 이름의 폴더만 검색
#       └─ type: d=directory(폴더), f=file(파일)
find . -size +100M                 # 100MB보다 큰 파일 찾기
find . -mtime -7                   # 최근 7일 내 수정된 파일
```

### which / whereis — 명령어 위치 찾기

```bash
which python                       # python이 어디에 설치되어 있는지
whereis cuda                       # cuda 관련 파일 위치
```

---

## 2. 파이프라인과 리다이렉션

### 파이프 `|` — 명령어 연결

**핵심 개념: 왼쪽 명령어의 출력을 오른쪽 명령어의 입력으로 넘긴다**

```
명령어A | 명령어B | 명령어C
   출력 ──→ 입력
              출력 ──→ 입력
```

```bash
# 프로세스 목록에서 python 찾기
ps aux | grep python

# 파일 목록에서 .py만 보기
ls -la | grep ".py"

# 로그에서 에러 줄 수 세기
cat log.txt | grep "ERROR" | wc -l

# 파일 목록을 정렬해서 처음 10개만
ls -l | sort -k5 -n | head -n 10

# GPU 메모리 사용량만 보기
nvidia-smi | grep "MiB"
```

### 리다이렉션 — 출력을 파일로 저장

```bash
# > : 파일에 저장 (덮어쓰기)
echo "hello" > output.txt          # output.txt에 "hello" 저장
ls -la > filelist.txt              # 파일 목록을 filelist.txt에 저장

# >> : 파일에 추가 (이어쓰기)
echo "world" >> output.txt         # output.txt 끝에 "world" 추가

# 2> : 에러 메시지를 파일로
python train.py 2> error.log       # 에러만 error.log에 저장

# &> : 출력 + 에러 모두 파일로
python train.py &> all.log         # 모든 출력을 all.log에 저장

# /dev/null : 출력 버리기 (아무것도 안 보고 싶을 때)
python train.py > /dev/null 2>&1   # 모든 출력 무시
```

### 자주 쓰는 파이프 조합

```bash
# 긴 출력을 스크롤하며 보기
명령어 | less

# 결과 개수 세기
명령어 | wc -l

# 결과 정렬
명령어 | sort

# 중복 제거
명령어 | sort | uniq

# 특정 열만 추출 (공백 기준 2번째 열)
명령어 | awk '{print $2}'
```

---

## 3. 권한

### 권한 읽는 법

```
-rwxr-xr--
│├─┤├─┤├─┤
│ │   │  └─ 기타 사용자: r(읽기)  -(쓰기X) -(실행X)
│ │   └──── 그룹:       r(읽기)  -(쓰기X) x(실행)
│ └──────── 소유자:     r(읽기)  w(쓰기)  x(실행)
└────────── 파일 유형

r = read(읽기), w = write(쓰기), x = execute(실행)
```

### chmod — 권한 변경

```bash
chmod +x script.sh               # 실행 권한 추가 (스크립트 실행 전 필수!)
chmod -x script.sh               # 실행 권한 제거

# 숫자로 설정 (r=4, w=2, x=1 을 더함)
chmod 755 script.sh              # 소유자:rwx(7) 그룹:r-x(5) 기타:r-x(5)
chmod 644 file.txt               # 소유자:rw-(6) 그룹:r--(4) 기타:r--(4)
```

### chown — 소유자 변경

```bash
sudo chown j.moon file.txt             # 소유자 변경
sudo chown -R j.moon:staff my_folder/  # 폴더 전체의 소유자+그룹 변경
```

---

## 4. 프로세스 관리

### ps — 실행 중인 프로세스 보기

```bash
ps aux                           # 모든 프로세스 목록
ps aux | grep python             # python 프로세스만 보기
```

### kill — 프로세스 종료

```bash
kill 12345                       # PID 12345 프로세스에 종료 요청
kill -9 12345                    # 강제 종료 (안 죽을 때 사용)
```

### 백그라운드 실행

```bash
python train.py &                # & : 백그라운드에서 실행 (터미널 계속 사용 가능)
nohup python train.py &          # nohup: 터미널 닫아도 계속 실행
# 출력은 nohup.out 파일에 저장됨

nohup python train.py > train.log 2>&1 &
# 백그라운드 실행 + 출력을 train.log에 저장 + 에러도 같이

jobs                             # 백그라운드 작업 목록
fg                               # 백그라운드 작업을 다시 앞으로 가져오기
```

### Ctrl 단축키

```
Ctrl + C    현재 실행 중인 명령 중단
Ctrl + Z    현재 실행 중인 명령 일시정지 (bg로 백그라운드 전환 가능)
Ctrl + D    입력 종료 (exit와 같음)
Ctrl + L    화면 지우기 (clear와 같음)
Ctrl + R    이전 명령어 검색
```

---

## 빠른 참조표 (중급)

| 하고 싶은 것 | 명령어 |
|-------------|--------|
| 파일 내용 검색 | `grep -r "텍스트" ./` |
| 대소문자 무시 검색 | `grep -ri "텍스트" ./` |
| 파일 찾기 | `find . -name "패턴"` |
| 큰 파일 찾기 | `find . -size +100M` |
| 스크립트 실행 권한 | `chmod +x script.sh` |
| 프로세스 찾기 | `ps aux \| grep 이름` |
| 프로세스 강제 종료 | `kill -9 PID` |
| 백그라운드 실행 | `nohup 명령어 &` |
| 파이프로 필터 | `명령어 \| grep "패턴"` |
| 출력 저장 | `명령어 > 파일` |
| 출력 추가 | `명령어 >> 파일` |
