// Abrar Maheer Bin Arif UCID 30218259
const htmlDecode = (str = "") => {
  const div = document.createElement('div');
  div.innerHTML = String.prototype.replace.call(str, /</g, '&lt;'); // .call()
  const decoded = div.innerText || div.textContent || "";
  return decoded.trim();
};
const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    (function(a, b) { [arr[a], arr[b]] = [arr[b], arr[a]]; }).apply(null, [i, j]); // .apply()
  }
  return arr;
};

class Question {
  constructor({ text, choices, correctIndex, difficulty = 'medium', category = 'Unknown' }) {
    this.text = text; this.choices = choices; this.correctIndex = correctIndex;
    this.difficulty = difficulty; this.category = category;
  }
  isCorrect(i) { return i === this.correctIndex; }
  correctText() { return this.choices[this.correctIndex]; }
}
class User {
  constructor(username = 'Player') { this.username = username || 'Player'; this.history = []; this.bestStreak = 0; }
  log(r){ this.history.push(r); const s=this.currentStreak(); if(s>this.bestStreak)this.bestStreak=s; }
  score(){ return this.history.filter(h=>h.correct).length; }
  currentStreak(){ let s=0; for(let i=this.history.length-1;i>=0;i--){ if(this.history[i].correct)s++; else break; } return s; }
}
class Quiz {
  constructor(user){ this.user=user; this.questions=[]; this._flow=null; }

  loadQuestions(questions){
    this.questions = questions;
    this._flow = this._questionFlow();
  }

  * _questionFlow(){
    // The difficultyPointer has 3 levels only: 0 easy, 1 medium, 2 hard
    let difficultyPointer = 1;
    // Track what happened compared to the previous question
    let lastChange = 'start'; // 'start' | 'up' | 'down' | 'same'

    const pools = {
      easy:   this.questions.filter(q => q.difficulty === 'easy'),
      medium: this.questions.filter(q => q.difficulty === 'medium'),
      hard:   this.questions.filter(q => q.difficulty === 'hard'),
    };
    const pullNext = (diff) => pools[diff].shift();
    const mapIndexToDiff = (d) => ['easy','medium','hard'][Math.max(0, Math.min(2, d))];

    while (true) {
      const intended = mapIndexToDiff(difficultyPointer);

      // Try intended difficulty, fallback gracefully if empty.
      let used = intended;
      let fellBack = false;

      let q = pullNext(intended);
      if (!q) {
        // Prefer medium, then easy, then hard as a graceful fallback order
        q = pullNext('medium') || pullNext('easy') || pullNext('hard');
        if (!q) return; // all pools empty
        used = q.difficulty;
        fellBack = true;
      }

      // Yield the question + meta (what we intended, what we actually used, and how difficulty changed last time)
      const correctness = yield { question: q, intended, used, change: lastChange, fellBack };

      // Update pointer for the next question based on the answer we just received
      if (correctness === true) { difficultyPointer++; lastChange = 'up'; }
      else if (correctness === false) { difficultyPointer--; lastChange = 'down'; }
      else { lastChange = 'same'; }
    }
  }

  next(correctness){
    const step = this._flow.next(correctness);
    if (step.done) return null;
    return step.value; // {question,intended,used,change,fellBack}
  }
}

async function fetchOTDB({ amount = 9, category = "" }) {
  const base = 'https://opentdb.com/api.php';
  const qs = (o) => Object.entries(o).map(([k,v]) => `${k}=${encodeURIComponent(v)}`).join('&');

  async function fetchChunk(params) {
    const res = await fetch(`${base}?${qs(params)}`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    return Array.isArray(json?.results) ? json.results : [];
  }

  const toQuestionObjects = (results) => results.map(item => {
    const decodedQ = htmlDecode(item.question);
    const allChoices = shuffle([
      ...item.incorrect_answers.map(htmlDecode),
      htmlDecode(item.correct_answer)
    ]);
    const correctIndex = allChoices.findIndex(c => c === htmlDecode(item.correct_answer));
    return new Question({
      text: decodedQ,
      choices: allChoices,
      correctIndex,
      difficulty: item.difficulty,
      category: item.category || 'Unknown'
    });
  });

  // 1) Grab a mixed batch (any difficulty) in the chosen category
  let collected = toQuestionObjects(
    await fetchChunk({ amount, type: 'multiple', ...(category ? { category } : {}) })
  );

  // 2) If still short, top up with mixed any-category
  if (collected.length < amount) {
    const remain = amount - collected.length;
    collected = collected.concat(toQuestionObjects(
      await fetchChunk({ amount: remain, type: 'multiple' })
    ));
  }

  if (!collected.length) throw new Error('No questions available from API right now.');
  return collected.slice(0, amount);
}

const UI = {
  els: {}, state: { user:null, quiz:null, current:null, total:0, answered:0, locked:false },
  init() {
    this.els = {
      controls: document.getElementById('controls'),
      username: document.getElementById('username'),
      amount: document.getElementById('amount'),
      category: document.getElementById('category'),
      startBtn: document.getElementById('startBtn'),
      resetBtn: document.getElementById('resetBtn'),

      quiz: document.getElementById('quiz'),
      qIndex: document.getElementById('qIndex'),
      qDifficulty: document.getElementById('qDifficulty'),
      qCategory: document.getElementById('qCategory'),
      qText: document.getElementById('qText'),
      choices: document.getElementById('choices'),
      submitBtn: document.getElementById('submitBtn'),
      nextBtn: document.getElementById('nextBtn'),
      showAnsBtn: document.getElementById('showAnsBtn'),
      message: document.getElementById('message'),
      history: document.getElementById('history'),
      progressBar: document.getElementById('progress'),
      progressPill: document.getElementById('progressPill'),
      scoreNow: document.getElementById('scoreNow'),
      streak: document.getElementById('streak'),

      summary: document.getElementById('summary'),
      sumText: document.getElementById('sumText'),
      playAgain: document.getElementById('playAgain'),
      exportHistory: document.getElementById('exportHistory'),
    };

    // Bind handlers
    this.onStart = this.onStart.bind(this);
    this.onReset = this.onReset.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
    this.onNext = this.onNext.bind(this);
    this.onReveal = this.onReveal.bind(this);
    this.onPlayAgain = this.onPlayAgain.bind(this);
    this.onExport = this.onExport.bind(this);

    this.els.startBtn.addEventListener('click', this.onStart);
    this.els.resetBtn.addEventListener('click', this.onReset);
    this.els.submitBtn.addEventListener('click', this.onSubmit);
    this.els.nextBtn.addEventListener('click', this.onNext);
    this.els.showAnsBtn.addEventListener('click', this.onReveal);
    this.els.playAgain.addEventListener('click', this.onPlayAgain);
    this.els.exportHistory.addEventListener('click', this.onExport);
  },

  message(text, type = '') { this.els.message.className = 'msg ' + type; this.els.message.textContent = text || ''; },

  messageAppend(text){
    const m = this.els.message;
    m.className = m.className || 'msg';
    m.textContent = (m.textContent ? m.textContent + ' ' : '') + (text || '');
  },

  markChoices(correctIndex, chosenIndex) {
    [...this.els.choices.children].forEach((node, idx) => {
      if (idx === correctIndex) node.classList.add('correct');
      if (chosenIndex != null && idx === chosenIndex && chosenIndex !== correctIndex) node.classList.add('wrong');
    });
  },

  // Update score, streak, and progress
  updateHUD() {
    const pct = Math.round((this.state.answered / this.state.total) * 100);
    this.els.progressBar.style.width = pct + '%';
    this.els.progressPill.textContent = pct + '%';
    this.els.scoreNow.textContent = `Score: ${this.state.user.score()}`;
    this.els.streak.textContent = `Streak: ${this.state.user.currentStreak()} 🔥`;
  },

  pushHistory({ correct }) {
    const chip = document.createElement('span');
    chip.className = 'scorepill ' + (correct ? 'good' : 'bad');
    chip.textContent = correct ? '✓' : '✗';
    this.els.history.appendChild(chip);
  },

  // Fetch questions and start quiz
  async onStart() {
    try {
      this.toggleControls(true);
      this.message('Fetching questions…');
      const amount = parseInt(this.els.amount.value, 10);
      const category = this.els.category.value;
      const user = new User(this.els.username.value.trim() || 'Player');
      const all = await fetchOTDB({ amount, category });
      const quiz = new Quiz(user);
      quiz.loadQuestions(all);

      Object.assign(this.state, { user, quiz, total: all.length, answered: 0 });
      this.els.quiz.hidden = false; this.els.summary.hidden = true;
      this.renderNext(null);
    } catch (e) {
      this.toggleControls(false);
      this.message('Could not load questions. Please try again or change options.', 'err');
    }
  },

  // Reset the game state
  onReset() {
    this.state = { user:null, quiz:null, current:null, total:0, answered:0, locked:false };
    this.els.quiz.hidden = true; this.els.summary.hidden = true;
    this.toggleControls(false);
    this.els.username.value = ''; this.els.history.textContent = '';
    this.message('');
    this.els.progressBar.style.width = '0%';
    this.els.progressPill.textContent = '0%';
    this.els.scoreNow.textContent = 'Score: 0';
    this.els.streak.textContent = 'Streak: 0 🔥';
  },

  // Populate UI with question data
  renderQuestion(q) {
    const { qText, choices, qIndex, qDifficulty, qCategory, submitBtn, nextBtn, showAnsBtn } = this.els;
    qText.textContent = q.text; choices.innerHTML = '';
    qIndex.textContent = `Q ${this.state.answered + 1}`;
    qDifficulty.textContent = `difficulty: ${q.difficulty}`;
    qCategory.textContent = `category: ${q.category}`;
    submitBtn.disabled = false; nextBtn.disabled = true; showAnsBtn.disabled = false; this.state.locked = false;

    q.choices.forEach((c, i) => {
      const wrap = document.createElement('label');
      wrap.className = 'choice';
      wrap.innerHTML = `<input type="radio" name="choice" value="${i}" /><span>${c}</span>`;
      choices.appendChild(wrap);
    });
  },

  // Check answer and update score
  onSubmit() {
    if (this.state.locked) return;
    const selected = this.els.choices.querySelector('input[name="choice"]:checked');
    if (!selected) { this.message('Please choose an answer.', 'warn'); return; }
    const chosen = parseInt(selected.value, 10);
    const q = this.state.current;
    const correct = q.isCorrect(chosen);
    this.state.user.log({ q: q.text, correct, chosen, correctText: q.correctText() });
    this.markChoices(q.correctIndex, chosen);
    this.state.answered++;
    this.updateHUD();
    this.pushHistory({ correct });
    this.message(correct ? 'Correct!' : `Incorrect. Correct answer is: ${q.correctText()}.`);
    this.state.locked = true;
    this.els.submitBtn.disabled = true;
    this.els.nextBtn.disabled = false;
    this.els.showAnsBtn.disabled = true;
  },

  onReveal() {
    // If there's no current question or we've already finalized this turn, bail.
    if (!this.state.current || this.state.locked) return;

    const q = this.state.current;

    // Visually show the correct option
    this.markChoices(q.correctIndex, null);

    // Count it as WRONG: log to history, advance answered count, update HUD
    this.state.user.log({
        q: q.text,
        correct: false,
        chosen: null,                 // no choice made
        correctText: q.correctText()
    });
    this.pushHistory({ correct: false });
    this.state.answered++;
    this.updateHUD();

    // Feedback + lock the turn
    this.message(`Answer revealed: ${q.correctText()} (counted as incorrect).`);
    this.state.locked = true;

    // Buttons: disable submit/reveal, enable next
    this.els.submitBtn.disabled = true;
    this.els.nextBtn.disabled = true;   // briefly keep disabled to avoid double-advance
    this.els.showAnsBtn.disabled = true;

    // Re-enable Next (in case layout/paint takes a tick)
    // and ensure keyboard users can move on immediately.
    setTimeout(() => {
        this.els.nextBtn.disabled = false;
        this.els.nextBtn.focus();
    }, 0);
  },
  
  onNext() { this.renderNext(this.state.user.history.at(-1)?.correct ?? null); },   // Move to next question

  renderNext(lastCorrect){
    const res = this.state.quiz.next(lastCorrect);
    if (!res) { this.renderSummary(); return; }

    const { question: q, intended, used, change, fellBack } = res;

    this.state.current = q;
    this.renderQuestion(q);
    this.updateHUD();

    // Build the replacement message (shown right after you click "Next Question")
    let msg = '';
    if (change === 'up')       msg = `Difficulty increased to ${intended}.`;
    else if (change === 'down')msg = `Difficulty decreased to ${intended}.`;
    else if (change === 'start') msg = ''; // first question, no prior correctness to replace

    if (fellBack && used !== intended) {
        msg = (msg ? msg + ' ' : '') + `(No ${intended} questions left; showing ${used} instead.)`;
    }

    // Replace whatever was there (Correct/Incorrect) with the new difficulty/fallback info
    this.message(msg);
  },

  // Display summary and save history
  renderSummary() {
    const { user } = this.state;
    this.els.quiz.hidden = true; this.els.summary.hidden = false;
    const s = user.score(), t = user.history.length, rate = (s/t*100).toFixed(1);
    this.els.sumText.textContent = `${user.username} scored ${s}/${t} (${rate}%). Best streak: ${user.bestStreak}.`;
    try {
      const key = 'seng513_a2_history';
      const bucket = JSON.parse(localStorage.getItem(key) || '[]');
      bucket.push({ at: new Date().toISOString(), user: user.username, score: s, total: t, bestStreak: user.bestStreak });
      localStorage.setItem(key, JSON.stringify(bucket));
    } catch {}
  },

  onPlayAgain() {
    this.toggleControls(false);
    this.onStart();
  },

  onExport() {
    try {
      const data = localStorage.getItem('seng513_a2_history') || '[]';
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'quiz-history.json'; a.click();
      URL.revokeObjectURL(url);
    } catch {
      this.message('Nothing to export yet.', 'warn');
    }
  },

  toggleControls(quizStarting) {
    this.els.startBtn.disabled = quizStarting;
    this.els.username.disabled = quizStarting;
    this.els.amount.disabled = quizStarting;
    this.els.category.disabled = quizStarting;
  }
};

UI.init();
