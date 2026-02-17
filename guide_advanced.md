# 리눅스 명령어 가이드 - 고급

## 1. 네트워크/다운로드

### wget / curl — 파일 다운로드

```bash
wget https://example.com/data.zip              # 파일 다운로드
wget -O my_data.zip https://example.com/data   # 파일명 지정해서 다운로드
#    └─ Output

curl -O https://example.com/file.tar.gz        # curl로 다운로드
curl -L https://example.com/redirect            # 리다이렉트 따라가기
```

### scp — 서버 간 파일 복사

```bash
# 로컬 → 서버
scp file.txt user@server:/home/user/

# 서버 → 로컬
scp user@server:/home/user/file.txt ./

# 폴더 전체 복사
scp -r my_folder/ user@server:/home/user/
```

### ssh — 서버 접속

```bash
ssh user@server                      # 서버 접속
ssh -p 2222 user@server              # 포트 지정
```

### rsync — 고급 동기화 (scp보다 빠름)

```bash
# scp 대신 rsync 사용 — 변경된 파일만 전송
rsync -avz my_folder/ user@server:/home/user/my_folder/
#      │││
#      ││└─ z: 압축 전송 (네트워크 절약)
#      │└── v: verbose (진행 상황 표시)
#      └─── a: archive (권한, 시간 등 보존 + recursive)

# --delete: 원본에서 삭제된 파일은 대상에서도 삭제
rsync -avz --delete src/ dest/

# --dry-run: 실제로 전송하지 않고 미리보기
rsync -avz --dry-run src/ dest/
```

---

## 2. 압축

### tar — 묶기/압축

```bash
# 압축하기
tar -czf archive.tar.gz my_folder/
#    │││  └─ 생성할 파일명
#    ││└─ f: 파일명 지정
#    │└── z: gzip 압축
#    └─── c: create (생성)

# 압축 풀기
tar -xzf archive.tar.gz
#    └─── x: extract (추출)

# 압축 내용 미리보기 (풀지 않고)
tar -tzf archive.tar.gz
#    └─── t: list (목록)

# 특정 폴더에 압축 풀기
tar -xzf archive.tar.gz -C /target/folder/
```

### zip / unzip

```bash
zip -r archive.zip my_folder/        # 압축
unzip archive.zip                    # 압축 풀기
unzip archive.zip -d /target/        # 특정 폴더에 풀기
unzip -l archive.zip                 # 내용 미리보기
```

---

## 3. 디스크 용량

```bash
df -h                                # 디스크 전체 사용량 (파티션별)
#   └─ human-readable

du -sh *                             # 현재 폴더의 각 항목 크기
#   ││
#   │└─ human-readable
#   └── summary (하위 폴더를 합산)

du -sh /home/user/data/              # 특정 폴더 총 크기
du -h --max-depth=1                  # 1단계 하위 폴더까지만 크기 표시
```

---

## 4. 심화 텍스트 처리

### awk — 열 기반 텍스트 처리

```bash
# 공백으로 구분된 데이터에서 특정 열 추출
awk '{print $1}' file.txt            # 1번째 열만 출력
awk '{print $1, $3}' file.txt        # 1번째, 3번째 열
awk -F',' '{print $2}' data.csv      # CSV에서 2번째 열 (쉼표 구분)

# 조건부 출력
awk '$3 > 100 {print $1, $3}' file.txt  # 3번째 열이 100 초과인 행만
```

### sed — 텍스트 치환

```bash
# 파일에서 문자열 치환
sed 's/old/new/' file.txt            # 각 줄에서 첫 번째 old → new
sed 's/old/new/g' file.txt           # 모든 old → new (global)
sed -i 's/old/new/g' file.txt        # 파일을 직접 수정 (in-place)
#    └─ 주의: 원본이 바뀜!

# 특정 줄 삭제
sed '5d' file.txt                    # 5번째 줄 삭제
sed '/pattern/d' file.txt            # pattern이 포함된 줄 삭제
```

### xargs — 파이프 결과를 인자로 변환

```bash
# find 결과를 다른 명령어의 인자로 전달
find . -name "*.py" | xargs grep "TODO"
# .py 파일을 모두 찾아서 각 파일에서 TODO 검색

# 파일 여러 개를 한꺼번에 삭제
find . -name "*.tmp" | xargs rm
```

---

## 5. 실전 조합 예시

### 서버에서 GPU 학습할 때

```bash
# GPU 상태 확인
nvidia-smi

# GPU 사용 중인 프로세스 찾기
nvidia-smi | grep python

# 특정 GPU만 사용하도록 학습 실행
CUDA_VISIBLE_DEVICES=0,1 python train.py

# 백그라운드로 학습 돌리고, 로그 저장
nohup python train.py > train.log 2>&1 &

# 학습 로그 실시간 모니터링
tail -f train.log

# 학습 로그에서 loss 값만 보기
grep "loss" train.log | tail -n 5
```

### 파일 관리

```bash
# 용량 큰 파일 찾기 (모델 파일 등)
find . -size +1G -type f

# .pyc 캐시 파일 전부 삭제
find . -name "*.pyc" -delete

# 특정 패턴의 파일이 몇 개 있는지
find . -name "*.json" | wc -l

# 폴더별 용량 확인 후 큰 순서대로
du -sh */ | sort -rh | head -n 10
```

### 로그/결과 분석

```bash
# 로그에서 ERROR만 뽑아서 파일로 저장
grep "ERROR" app.log > errors_only.log

# 최근 100줄의 로그에서 WARNING 찾기
tail -n 100 app.log | grep "WARNING"

# 여러 로그 파일에서 한번에 검색
grep -r "OOM" logs/

# CSV 파일의 줄 수 확인 (헤더 제외)
wc -l data.csv                       # 전체 줄 수
head -n 1 data.csv                   # 헤더(첫 줄)만 확인

# 프로세스별 메모리 사용량 상위 10개
ps aux --sort=-%mem | head -n 11
```

### 서버 간 대량 파일 전송

```bash
# 모델 체크포인트 서버로 전송 (변경분만)
rsync -avz --progress checkpoints/ user@server:/data/checkpoints/

# 학습 결과 로컬로 가져오기
rsync -avz user@server:/data/results/ ./results/
```

---

## 빠른 참조표 (고급)

| 하고 싶은 것 | 명령어 |
|-------------|--------|
| 서버로 파일 복사 | `scp -r 로컬경로 user@server:경로` |
| 서버 동기화 (빠름) | `rsync -avz src/ user@server:dest/` |
| SSH 접속 | `ssh user@server` |
| 파일 다운로드 | `wget URL` |
| tar.gz 압축 | `tar -czf 파일.tar.gz 폴더/` |
| tar.gz 풀기 | `tar -xzf 파일.tar.gz` |
| 디스크 사용량 | `df -h` / `du -sh *` |
| 특정 열 추출 | `awk '{print $N}' 파일` |
| 문자열 치환 | `sed 's/old/new/g' 파일` |
| find 결과로 명령 실행 | `find . -name "패턴" \| xargs 명령어` |
| 폴더별 크기 순위 | `du -sh */ \| sort -rh \| head` |
| GPU 학습 + 로그 | `nohup python train.py > log 2>&1 &` |
