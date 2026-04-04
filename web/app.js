/* ============================================================
   Linux Master - Quiz App
   Pure JS, no frameworks. localStorage for persistence.
   ============================================================ */

(function () {
  'use strict';

  // ---- State ----
  let allQuizzes = [];
  let currentQuizzes = [];   // questions for the active session
  let currentIndex = 0;
  let score = 0;
  let answered = false;
  let selectedChoice = null;
  let currentLevel = null;   // 'beginner' | 'intermediate' | 'advanced' | 'daily'
  let currentMode = null;    // 'daily' | 'practice'

  // ---- Storage Keys ----
  const STORAGE_KEY = 'linux_master_data';
  const NOTEBOOK_KEY = 'linux_master_notebook';

  // ---- Helpers ----
  function getToday() {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  // Seeded PRNG (simple mulberry32)
  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function dateSeed(dateStr) {
    let h = 0;
    for (let i = 0; i < dateStr.length; i++) {
      h = Math.imul(31, h) + dateStr.charCodeAt(i) | 0;
    }
    return h;
  }

  // Shuffle array with seeded rng
  function seededShuffle(arr, rng) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---- Storage ----
  function loadStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return {
      correctIds: [],       // array of question ids answered correctly
      history: [],          // [{date, level, mode, correct, total}]
      streak: 0,
      lastPracticeDate: null,
      levelStats: {
        beginner: { solved: 0, correct: 0 },
        intermediate: { solved: 0, correct: 0 },
        advanced: { solved: 0, correct: 0 }
      }
    };
  }

  function saveStorage(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function recordSession(level, mode, correctCount, total, questionResults) {
    const data = loadStorage();
    const today = getToday();

    // Update correctIds
    questionResults.forEach(function (r) {
      if (r.correct && data.correctIds.indexOf(r.id) === -1) {
        data.correctIds.push(r.id);
      }
    });

    // Update level stats
    questionResults.forEach(function (r) {
      const q = allQuizzes.find(function (qq) { return qq.id === r.id; });
      if (q) {
        const lv = q.level;
        data.levelStats[lv].solved++;
        if (r.correct) data.levelStats[lv].correct++;
      }
    });

    // Add history entry
    data.history.push({
      date: today,
      level: level,
      mode: mode,
      correct: correctCount,
      total: total
    });

    // Update streak
    if (data.lastPracticeDate === today) {
      // already practiced today, no change
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.getFullYear() + '-' +
        String(yesterday.getMonth() + 1).padStart(2, '0') + '-' +
        String(yesterday.getDate()).padStart(2, '0');

      if (data.lastPracticeDate === yStr) {
        data.streak++;
      } else if (!data.lastPracticeDate) {
        data.streak = 1;
      } else {
        data.streak = 1;
      }
      data.lastPracticeDate = today;
    }

    saveStorage(data);
  }

  // ---- DOM Refs ----
  const $ = function (sel) { return document.querySelector(sel); };
  const $$ = function (sel) { return document.querySelectorAll(sel); };

  const pages = {
    home: $('#page-home'),
    mode: $('#page-mode'),
    quiz: $('#page-quiz'),
    score: $('#page-score'),
    notebook: $('#page-notebook'),
    stats: $('#page-stats')
  };

  // ---- Page Navigation ----
  function showPage(name) {
    Object.keys(pages).forEach(function (k) {
      pages[k].classList.toggle('hidden', k !== name);
    });
    // Update nav buttons
    $$('.nav-btn').forEach(function (btn) {
      var isActive = btn.dataset.page === name ||
        (['home', 'mode', 'quiz', 'score'].indexOf(name) !== -1 && btn.dataset.page === 'home');
      btn.classList.toggle('active', isActive);
    });
  }

  // ---- Home Page Updates ----
  function updateHomeProgress() {
    const data = loadStorage();
    const all = getAllQuizzesWithNotebook();
    ['beginner', 'intermediate', 'advanced'].forEach(function (level) {
      const total = all.filter(function (q) { return q.level === level; }).length;
      const done = all.filter(function (q) {
        return q.level === level && data.correctIds.indexOf(q.id) !== -1;
      }).length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      const bar = $('#progress-' + level);
      const text = $('#progress-text-' + level);
      if (bar) bar.style.width = pct + '%';
      if (text) text.textContent = done + ' / ' + total + ' 완료';
    });
  }

  // ---- Quiz Logic ----
  function getDailyQuestions(level) {
    const today = getToday();
    const seed = dateSeed(today + (level || 'all'));
    const rng = mulberry32(seed);
    const all = getAllQuizzesWithNotebook();

    let pool;
    if (level && level !== 'daily') {
      pool = all.filter(function (q) { return q.level === level; });
    } else {
      pool = all.slice();
    }

    const shuffled = seededShuffle(pool, rng);
    return shuffled.slice(0, 5);
  }

  function getPracticeQuestions(level) {
    return getAllQuizzesWithNotebook().filter(function (q) { return q.level === level; });
  }

  function startQuiz(questions, level, mode) {
    currentQuizzes = questions;
    currentIndex = 0;
    score = 0;
    currentLevel = level;
    currentMode = mode;
    sessionResults = [];
    showPage('quiz');
    renderQuestion();
  }

  var sessionResults = [];

  function renderQuestion() {
    if (currentIndex >= currentQuizzes.length) {
      showScore();
      return;
    }

    answered = false;
    selectedChoice = null;

    const q = currentQuizzes[currentIndex];

    // Badge
    const badge = $('#quiz-badge');
    badge.className = 'quiz-level-badge ' + q.level;
    const levelNames = { beginner: '초급', intermediate: '중급', advanced: '고급' };
    badge.textContent = levelNames[q.level];

    // Type badge
    const typeBadge = $('#quiz-type-badge');
    const typeNames = {
      'fill-blank': '빈칸 채우기',
      'predict-output': '결과 예측',
      'write-command': '명령어 작성',
      'option-meaning': '옵션 의미'
    };
    typeBadge.textContent = typeNames[q.type] || q.type;

    // Progress
    $('#quiz-progress').textContent = (currentIndex + 1) + ' / ' + currentQuizzes.length;

    // Question text
    $('#question-text').textContent = q.question;

    // Code block
    const codeBlock = $('#code-block');
    const codeContent = $('#code-content');
    if (q.code) {
      codeBlock.classList.remove('hidden');
      // Render code with blanks highlighted
      const rendered = q.code.replace(/_____/g, '<span class="blank">?????</span>');
      codeContent.innerHTML = rendered;
    } else {
      codeBlock.classList.add('hidden');
    }

    // Input vs choices
    const inputArea = $('#input-area');
    const choicesArea = $('#choices-area');
    const answerInput = $('#answer-input');

    if (q.type === 'fill-blank' || q.type === 'write-command') {
      inputArea.classList.remove('hidden');
      choicesArea.classList.add('hidden');
      answerInput.value = '';
      answerInput.placeholder = q.type === 'fill-blank' ? '빈칸에 들어갈 내용을 입력하세요...' : '명령어를 입력하세요...';
      setTimeout(function () { answerInput.focus(); }, 100);
    } else {
      inputArea.classList.add('hidden');
      choicesArea.classList.remove('hidden');
      renderChoices(q.choices);
    }

    // Hide result
    $('#result-box').classList.add('hidden');
    $('#btn-submit').classList.remove('hidden');
    $('#btn-next').classList.add('hidden');
    $('#btn-submit').disabled = false;

    // Animate
    const card = $('#question-card');
    card.classList.remove('fade-in');
    void card.offsetWidth; // reflow
    card.classList.add('fade-in');
  }

  function renderChoices(choices) {
    const area = $('#choices-area');
    area.innerHTML = '';
    const labels = ['A', 'B', 'C', 'D'];
    choices.forEach(function (ch, i) {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.innerHTML = '<span class="choice-label">' + labels[i] + '.</span> ' + escapeHtml(ch);
      btn.dataset.index = i;
      btn.addEventListener('click', function () {
        if (answered) return;
        $$('.choice-btn').forEach(function (b) { b.classList.remove('selected'); });
        btn.classList.add('selected');
        selectedChoice = ch;
      });
      area.appendChild(btn);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function checkAnswer() {
    if (answered) return;

    const q = currentQuizzes[currentIndex];
    let userAnswer;

    if (q.type === 'fill-blank' || q.type === 'write-command') {
      userAnswer = $('#answer-input').value.trim();
      if (!userAnswer) return; // don't submit empty
    } else {
      if (selectedChoice === null) return;
      userAnswer = selectedChoice;
    }

    answered = true;

    const isCorrect = normalizeAnswer(userAnswer) === normalizeAnswer(q.answer);

    if (isCorrect) score++;

    sessionResults.push({ id: q.id, correct: isCorrect });

    // Show result
    const resultBox = $('#result-box');
    resultBox.classList.remove('hidden', 'correct', 'incorrect');
    resultBox.classList.add(isCorrect ? 'correct' : 'incorrect');

    $('#result-label').textContent = isCorrect ? '정답입니다!' : '오답입니다';
    $('#result-answer').textContent = '정답: ' + q.answer;
    $('#result-explanation').textContent = q.explanation;

    // Mark choices
    if (q.choices) {
      $$('.choice-btn').forEach(function (btn) {
        btn.classList.add('disabled');
        const idx = parseInt(btn.dataset.index);
        const choiceText = q.choices[idx];
        if (normalizeAnswer(choiceText) === normalizeAnswer(q.answer)) {
          btn.classList.add('correct');
        } else if (btn.classList.contains('selected') && !isCorrect) {
          btn.classList.add('incorrect');
        }
      });
    }

    // Disable input
    if (q.type === 'fill-blank' || q.type === 'write-command') {
      const input = $('#answer-input');
      input.disabled = true;
      if (isCorrect) {
        input.style.borderColor = 'var(--green)';
      } else {
        input.style.borderColor = 'var(--red)';
      }
    }

    // Toggle buttons
    $('#btn-submit').classList.add('hidden');
    $('#btn-next').classList.remove('hidden');

    // Animate result
    resultBox.classList.add('fade-in');
  }

  function normalizeAnswer(str) {
    return str.toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/['"]/g, '"')
      .replace(/['"]/g, '"')
      .trim();
  }

  function nextQuestion() {
    // Re-enable input for next question
    const input = $('#answer-input');
    input.disabled = false;
    input.style.borderColor = '';

    currentIndex++;
    renderQuestion();
  }

  function showScore() {
    showPage('score');

    const total = currentQuizzes.length;
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;

    const scoreEl = $('#score-value');
    scoreEl.textContent = score + ' / ' + total;
    scoreEl.className = 'score-big';
    if (pct >= 80) scoreEl.classList.add('');       // green by default
    else if (pct >= 50) scoreEl.classList.add('mid');
    else scoreEl.classList.add('low');

    $('#score-correct').textContent = score;
    $('#score-incorrect').textContent = total - score;
    $('#score-accuracy').textContent = pct + '%';

    const messages = [
      '다시 한번 도전해보세요!',
      '조금만 더 연습하면 될 거예요!',
      '꽤 잘하고 있어요!',
      '훌륭합니다!',
      '완벽합니다! 리눅스 마스터!'
    ];
    const msgIdx = Math.min(Math.floor(pct / 25), 4);
    $('#score-message').textContent = messages[msgIdx];

    // Record session
    recordSession(currentLevel, currentMode, score, total, sessionResults);
  }

  // ---- Stats Page ----
  function renderStats() {
    const data = loadStorage();

    // Streak
    // Check if streak is still active (last practice was today or yesterday)
    const today = getToday();
    let displayStreak = data.streak || 0;
    if (data.lastPracticeDate) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.getFullYear() + '-' +
        String(yesterday.getMonth() + 1).padStart(2, '0') + '-' +
        String(yesterday.getDate()).padStart(2, '0');
      if (data.lastPracticeDate !== today && data.lastPracticeDate !== yStr) {
        displayStreak = 0; // streak broken
      }
    }
    $('#streak-count').textContent = displayStreak;

    // Total stats
    let totalSolved = 0, totalCorrect = 0;
    ['beginner', 'intermediate', 'advanced'].forEach(function (lv) {
      totalSolved += (data.levelStats[lv] || {}).solved || 0;
      totalCorrect += (data.levelStats[lv] || {}).correct || 0;
    });

    const uniqueDays = [];
    (data.history || []).forEach(function (h) {
      if (uniqueDays.indexOf(h.date) === -1) uniqueDays.push(h.date);
    });

    $('#stat-total-solved').textContent = totalSolved;
    $('#stat-total-correct').textContent = totalCorrect;
    $('#stat-total-accuracy').textContent = totalSolved > 0 ?
      Math.round((totalCorrect / totalSolved) * 100) + '%' : '0%';
    $('#stat-days-practiced').textContent = uniqueDays.length;

    // Level accuracy bars
    ['beginner', 'intermediate', 'advanced'].forEach(function (lv) {
      const st = data.levelStats[lv] || { solved: 0, correct: 0 };
      const pct = st.solved > 0 ? Math.round((st.correct / st.solved) * 100) : 0;
      $('#acc-bar-' + lv).style.width = pct + '%';
      $('#acc-pct-' + lv).textContent = pct + '%';
    });

    // History list
    const histList = $('#history-list');
    const history = (data.history || []).slice().reverse().slice(0, 20);
    if (history.length === 0) {
      histList.innerHTML = '<li class="history-item" style="color:var(--text-muted); justify-content:center;">아직 학습 기록이 없습니다</li>';
    } else {
      histList.innerHTML = '';
      const levelLabels = { beginner: '초급', intermediate: '중급', advanced: '고급', daily: '일일' };
      const modeLabels = { daily: '오늘의 퀴즈', practice: '전체 연습' };
      history.forEach(function (h) {
        const li = document.createElement('li');
        li.className = 'history-item';
        const pct = h.total > 0 ? Math.round((h.correct / h.total) * 100) : 0;
        let pctColor = 'var(--green)';
        if (pct < 50) pctColor = 'var(--red)';
        else if (pct < 80) pctColor = 'var(--yellow)';
        li.innerHTML =
          '<span class="history-date">' + h.date + '</span>' +
          '<span style="color:var(--text-secondary); font-size:0.85rem;">' +
          (levelLabels[h.level] || h.level) + ' / ' +
          (modeLabels[h.mode] || h.mode) + '</span>' +
          '<span class="history-score" style="color:' + pctColor + ';">' +
          h.correct + '/' + h.total + ' (' + pct + '%)</span>';
        histList.appendChild(li);
      });
    }
  }

  // ---- Notebook (모르는 명령어) ----
  var COMMAND_DB = {
    // 기본 명령어 설명 DB — 로컬에서 즉시 설명 제공
    'xargs': {
      desc: '파이프로 받은 입력을 다른 명령어의 인자로 변환해서 전달합니다.',
      example: 'find . -name "*.log" | xargs rm',
      level: 'advanced'
    },
    'awk': {
      desc: '텍스트를 열(column) 단위로 처리하는 도구입니다. 공백/탭 기준으로 나눠서 특정 열을 추출합니다.',
      example: "awk '{print $1, $3}' file.txt",
      level: 'advanced'
    },
    'sed': {
      desc: '텍스트를 줄 단위로 치환(find & replace)하는 스트림 에디터입니다.',
      example: "sed 's/old/new/g' file.txt",
      level: 'advanced'
    },
    'grep': {
      desc: '파일 내용에서 특정 텍스트 패턴을 검색합니다.',
      example: 'grep -rn "error" logs/',
      level: 'intermediate'
    },
    'find': {
      desc: '조건에 맞는 파일이나 폴더를 재귀적으로 검색합니다.',
      example: 'find . -name "*.py" -type f',
      level: 'intermediate'
    },
    'rsync': {
      desc: '파일/폴더를 동기화합니다. scp보다 빠르며 변경된 부분만 전송합니다.',
      example: 'rsync -avz src/ user@server:dest/',
      level: 'advanced'
    },
    'tar': {
      desc: '파일을 하나로 묶거나(아카이브) 압축/해제합니다.',
      example: 'tar -czf archive.tar.gz folder/',
      level: 'advanced'
    },
    'chmod': {
      desc: '파일/폴더의 읽기·쓰기·실행 권한을 변경합니다.',
      example: 'chmod +x script.sh',
      level: 'intermediate'
    },
    'chown': {
      desc: '파일/폴더의 소유자(owner)와 그룹을 변경합니다.',
      example: 'sudo chown -R user:group folder/',
      level: 'intermediate'
    },
    'curl': {
      desc: 'URL로 데이터를 전송하거나 다운로드합니다. API 테스트에도 많이 사용됩니다.',
      example: 'curl -O https://example.com/file.tar.gz',
      level: 'advanced'
    },
    'wget': {
      desc: 'URL에서 파일을 다운로드합니다.',
      example: 'wget -O output.zip https://example.com/data.zip',
      level: 'advanced'
    },
    'scp': {
      desc: 'SSH를 통해 로컬-서버 또는 서버-서버 간 파일을 복사합니다.',
      example: 'scp -r folder/ user@server:/path/',
      level: 'advanced'
    },
    'ssh': {
      desc: 'Secure Shell로 원격 서버에 접속합니다.',
      example: 'ssh -p 2222 user@server',
      level: 'advanced'
    },
    'nohup': {
      desc: '터미널을 닫아도 프로세스가 종료되지 않도록 백그라운드에서 실행합니다.',
      example: 'nohup python train.py > log.txt 2>&1 &',
      level: 'intermediate'
    },
    'kill': {
      desc: 'PID를 지정하여 프로세스에 시그널(종료 요청)을 보냅니다.',
      example: 'kill -9 12345',
      level: 'intermediate'
    },
    'ps': {
      desc: '현재 실행 중인 프로세스 목록을 표시합니다.',
      example: 'ps aux | grep python',
      level: 'intermediate'
    },
    'du': {
      desc: '파일/폴더의 디스크 사용량을 표시합니다.',
      example: 'du -sh *',
      level: 'advanced'
    },
    'df': {
      desc: '파일시스템(파티션)별 디스크 전체 사용량을 표시합니다.',
      example: 'df -h',
      level: 'advanced'
    },
    'wc': {
      desc: '파일의 줄 수, 단어 수, 바이트 수를 셉니다.',
      example: 'wc -l file.txt',
      level: 'beginner'
    },
    'diff': {
      desc: '두 파일의 내용을 비교하여 차이점을 보여줍니다.',
      example: 'diff file1.txt file2.txt',
      level: 'beginner'
    },
    'sort': {
      desc: '텍스트를 줄 단위로 정렬합니다.',
      example: 'sort -k2 -n data.txt',
      level: 'intermediate'
    },
    'uniq': {
      desc: '연속된 중복 줄을 제거합니다. 보통 sort와 함께 사용합니다.',
      example: 'sort file.txt | uniq -c',
      level: 'intermediate'
    },
    'tee': {
      desc: '파이프 중간에서 출력을 화면과 파일에 동시에 보냅니다.',
      example: 'ls -la | tee filelist.txt',
      level: 'advanced'
    },
    'watch': {
      desc: '명령어를 일정 간격으로 반복 실행하면서 결과를 실시간 표시합니다.',
      example: 'watch -n 2 nvidia-smi',
      level: 'advanced'
    },
    'ln': {
      desc: '파일에 링크(바로가기)를 만듭니다. -s 옵션으로 심볼릭 링크를 생성합니다.',
      example: 'ln -s /path/to/original link_name',
      level: 'intermediate'
    },
    'alias': {
      desc: '긴 명령어에 짧은 별명을 붙입니다. 셸 설정 파일에 저장하면 영구적입니다.',
      example: "alias gs='git status'",
      level: 'intermediate'
    },
    'env': {
      desc: '현재 설정된 환경변수를 모두 출력합니다.',
      example: 'env | grep PATH',
      level: 'intermediate'
    },
    'export': {
      desc: '환경변수를 설정하거나 현재 셸의 변수를 자식 프로세스에 전달합니다.',
      example: 'export CUDA_VISIBLE_DEVICES=0,1',
      level: 'intermediate'
    },
    'crontab': {
      desc: '정기적으로 실행할 명령어(크론잡)를 등록/관리합니다.',
      example: 'crontab -e   # 편집기로 크론 설정',
      level: 'advanced'
    },
    'screen': {
      desc: '터미널 세션을 분리(detach)하여 연결이 끊어져도 프로세스가 유지됩니다.',
      example: 'screen -S training   # 세션 이름 지정',
      level: 'advanced'
    },
    'tmux': {
      desc: 'screen과 유사한 터미널 멀티플렉서. 창을 나누고 세션을 관리합니다.',
      example: 'tmux new -s mysession',
      level: 'advanced'
    },
    'top': {
      desc: '실시간 프로세스 모니터링. CPU/메모리 사용량을 확인합니다.',
      example: 'top   # q로 종료',
      level: 'intermediate'
    },
    'htop': {
      desc: 'top의 개선판. 컬러 UI로 프로세스를 시각적으로 관리합니다.',
      example: 'htop',
      level: 'intermediate'
    },
    'lsof': {
      desc: '열린 파일과 해당 프로세스를 표시합니다. 포트 사용 확인에도 유용합니다.',
      example: 'lsof -i :8080   # 8080 포트 사용 프로세스',
      level: 'advanced'
    },
    'netstat': {
      desc: '네트워크 연결, 라우팅 테이블, 포트 사용 현황을 표시합니다.',
      example: 'netstat -tlnp   # 리스닝 포트 확인',
      level: 'advanced'
    },
    'head': {
      desc: '파일의 처음 N줄을 출력합니다.',
      example: 'head -n 20 file.txt',
      level: 'beginner'
    },
    'tail': {
      desc: '파일의 마지막 N줄을 출력합니다. -f로 실시간 모니터링 가능.',
      example: 'tail -f log.txt',
      level: 'beginner'
    },
    'less': {
      desc: '긴 파일을 페이지 단위로 스크롤하며 읽습니다.',
      example: 'less large_file.txt   # q로 종료',
      level: 'beginner'
    },
    'which': {
      desc: '명령어의 실행 파일 위치를 찾습니다.',
      example: 'which python',
      level: 'intermediate'
    },
    'whereis': {
      desc: '명령어의 바이너리, 소스, 매뉴얼 파일 위치를 찾습니다.',
      example: 'whereis cuda',
      level: 'intermediate'
    }
  };

  function loadNotebook() {
    try {
      var raw = localStorage.getItem(NOTEBOOK_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return [];  // [{id, command, context, desc, example, level, date, quizIds}]
  }

  function saveNotebook(entries) {
    localStorage.setItem(NOTEBOOK_KEY, JSON.stringify(entries));
  }

  function generateDescription(command) {
    // 명령어의 기본 부분 추출 (예: "awk -F','" → "awk")
    var baseCmd = command.trim().split(/\s+/)[0].toLowerCase();
    var info = COMMAND_DB[baseCmd];
    if (info) {
      return info;
    }
    // DB에 없는 명령어 → 기본 설명
    return {
      desc: '"' + command + '" — 설명을 직접 추가해주세요. 가이드 md에서 검색하거나 man ' + baseCmd + ' 으로 확인할 수 있습니다.',
      example: command,
      level: 'intermediate'
    };
  }

  function generateQuizFromEntry(entry) {
    var quizzes = [];
    var baseId = 10000 + entry.id * 10;
    var baseCmd = entry.command.trim().split(/\s+/)[0];

    // Quiz 1: 빈칸 채우기 — 명령어 이름 맞추기
    quizzes.push({
      id: baseId,
      level: entry.level,
      type: 'fill-blank',
      question: entry.desc,
      code: '_____ ' + (entry.command.indexOf(' ') > 0 ? entry.command.substring(entry.command.indexOf(' ')) : ''),
      choices: null,
      answer: baseCmd,
      explanation: entry.desc + (entry.example ? ' 예시: ' + entry.example : ''),
      _notebook: true
    });

    // Quiz 2: 명령어 작성 — 설명을 보고 명령어 작성
    if (entry.example) {
      quizzes.push({
        id: baseId + 1,
        level: entry.level,
        type: 'write-command',
        question: '"' + entry.desc.replace(/\.$/, '') + '" — 이 작업을 수행하는 명령어를 작성하세요.',
        code: null,
        choices: null,
        answer: entry.example,
        explanation: entry.desc,
        _notebook: true
      });
    }

    return quizzes;
  }

  function getNotebookQuizzes() {
    var entries = loadNotebook();
    var quizzes = [];
    entries.forEach(function (e) {
      quizzes = quizzes.concat(generateQuizFromEntry(e));
    });
    return quizzes;
  }

  function getAllQuizzesWithNotebook() {
    return allQuizzes.concat(getNotebookQuizzes());
  }

  function addNotebookEntry(command, context) {
    var entries = loadNotebook();
    // 중복 체크
    var exists = entries.some(function (e) {
      return e.command.toLowerCase().trim() === command.toLowerCase().trim();
    });
    if (exists) return null;

    var info = generateDescription(command);
    var newEntry = {
      id: Date.now(),
      command: command.trim(),
      context: context || '',
      desc: info.desc,
      example: info.example,
      level: info.level,
      date: getToday()
    };
    entries.push(newEntry);
    saveNotebook(entries);
    return newEntry;
  }

  function deleteNotebookEntry(id) {
    var entries = loadNotebook();
    entries = entries.filter(function (e) { return e.id !== id; });
    saveNotebook(entries);
  }

  function renderNotebook() {
    var entries = loadNotebook();
    var container = $('#nb-list');

    if (entries.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted); text-align:center;">아직 등록한 명령어가 없습니다</p>';
      return;
    }

    container.innerHTML = '';
    entries.slice().reverse().forEach(function (entry) {
      var card = document.createElement('div');
      card.className = 'nb-card';

      var quizCount = generateQuizFromEntry(entry).length;

      card.innerHTML =
        '<div class="nb-actions">' +
          '<button class="delete-btn" data-id="' + entry.id + '" title="삭제">x</button>' +
        '</div>' +
        '<div class="nb-cmd">' + escapeHtml(entry.command) +
          '<span class="nb-quiz-badge">' + quizCount + '문제 생성됨</span>' +
        '</div>' +
        '<div class="nb-desc">' + escapeHtml(entry.desc) + '</div>' +
        (entry.example ?
          '<div class="code-block" style="margin:8px 0; padding:10px 14px; font-size:0.85rem;">' +
            '<span class="prompt-symbol">$ </span>' + escapeHtml(entry.example) +
          '</div>' : '') +
        (entry.context ?
          '<div class="nb-context">메모: ' + escapeHtml(entry.context) + '</div>' : '') +
        '<div class="nb-date">' + entry.date + '</div>';

      container.appendChild(card);

      // Delete button
      card.querySelector('.delete-btn').addEventListener('click', function () {
        if (confirm('"' + entry.command + '" 을(를) 삭제하시겠습니까?')) {
          deleteNotebookEntry(entry.id);
          renderNotebook();
        }
      });
    });
  }

  // ---- Event Bindings ----
  function bindEvents() {
    // Nav
    $$('.nav-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const page = btn.dataset.page;
        if (page === 'stats') {
          showPage('stats');
          renderStats();
        } else if (page === 'notebook') {
          showPage('notebook');
          renderNotebook();
        } else {
          showPage('home');
          updateHomeProgress();
        }
      });
    });

    // Daily banner
    $('#daily-banner').addEventListener('click', function () {
      const questions = getDailyQuestions('daily');
      startQuiz(questions, 'daily', 'daily');
    });

    // Level cards
    $$('.level-card').forEach(function (card) {
      card.addEventListener('click', function () {
        const level = card.dataset.level;
        const levelNames = { beginner: '초급', intermediate: '중급', advanced: '고급' };
        $('#mode-title').textContent = levelNames[level] + ' 모드 선택';
        currentLevel = level;
        showPage('mode');
      });
    });

    // Mode buttons
    $('#btn-daily-mode').addEventListener('click', function () {
      const questions = getDailyQuestions(currentLevel);
      startQuiz(questions, currentLevel, 'daily');
    });

    $('#btn-practice-mode').addEventListener('click', function () {
      const questions = getPracticeQuestions(currentLevel);
      startQuiz(questions, currentLevel, 'practice');
    });

    $('#btn-back-home').addEventListener('click', function () {
      showPage('home');
      updateHomeProgress();
    });

    // Quiz buttons
    $('#btn-submit').addEventListener('click', checkAnswer);
    $('#btn-next').addEventListener('click', nextQuestion);

    // Enter key for text input
    $('#answer-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        if (!answered) {
          checkAnswer();
        } else {
          nextQuestion();
        }
      }
    });

    // Score buttons
    $('#btn-score-home').addEventListener('click', function () {
      showPage('home');
      updateHomeProgress();
    });

    $('#btn-retry').addEventListener('click', function () {
      if (currentMode === 'daily') {
        const questions = getDailyQuestions(currentLevel);
        startQuiz(questions, currentLevel, 'daily');
      } else {
        const questions = getPracticeQuestions(currentLevel);
        startQuiz(questions, currentLevel, 'practice');
      }
    });

    // Reset stats
    $('#btn-reset-stats').addEventListener('click', function () {
      if (confirm('정말 모든 통계를 초기화하시겠습니까?')) {
        localStorage.removeItem(STORAGE_KEY);
        renderStats();
        updateHomeProgress();
      }
    });

    // Notebook: 등록 버튼
    $('#btn-nb-add').addEventListener('click', function () {
      var cmd = $('#nb-command').value.trim();
      if (!cmd) return;
      var ctx = $('#nb-context').value.trim();
      var entry = addNotebookEntry(cmd, ctx);
      if (entry) {
        $('#nb-command').value = '';
        $('#nb-context').value = '';
        renderNotebook();
      } else {
        alert('이미 등록된 명령어입니다.');
      }
    });

    // Notebook: Enter key
    $('#nb-command').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        $('#btn-nb-add').click();
      }
    });
  }

  // ---- Init ----
  function init() {
    fetch('quizzes.json')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        allQuizzes = data;
        updateHomeProgress();
        bindEvents();
      })
      .catch(function (err) {
        console.error('Failed to load quizzes:', err);
        // Fallback: try to work anyway
        allQuizzes = [];
        bindEvents();
      });
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
