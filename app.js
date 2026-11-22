/* ===================================================================
   Rheum Revise — app logic
   All state lives in localStorage, per-device. No backend, no account.
=================================================================== */
(function(){
"use strict";

const STORAGE_KEY = "rheumRevise_v1";
const LETTERS = ["A","B","C","D","E"];

/* ---------- persistence ---------- */
function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){ /* ignore corrupt state */ }
  return { perQuestion:{}, lastSession:null, theme:null };
}
function saveState(){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch(e){ /* storage full or unavailable — fail silently */ }
}
let state = loadState();

function qRecord(id){
  if(!state.perQuestion[id]) state.perQuestion[id] = { seen:0, correct:0, wrong:0, flagged:false, last:null };
  return state.perQuestion[id];
}

/* ---------- theme ---------- */
const root = document.documentElement;
function applyTheme(){
  if(state.theme === "light" || state.theme === "dark"){
    root.setAttribute("data-theme", state.theme);
  } else {
    root.removeAttribute("data-theme");
  }
}
applyTheme();
document.getElementById("btnTheme").addEventListener("click", () => {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const current = state.theme || (prefersDark ? "dark" : "light");
  state.theme = current === "dark" ? "light" : "dark";
  applyTheme();
  saveState();
});

/* ---------- question index ---------- */
const byId = {};
QUESTIONS.forEach(q => byId[q.id] = q);

function catCount(cat){ return QUESTIONS.filter(q => q.c === cat).length; }
function catAnswered(cat){
  return QUESTIONS.filter(q => q.c === cat && state.perQuestion[q.id] && state.perQuestion[q.id].seen > 0).length;
}

function shuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

/* ---------- routing ---------- */
const viewEl = document.getElementById("view");
let session = null; // active quiz session object

function go(screen, payload){
  if(screen === "home") renderHome();
  else if(screen === "category-picker") renderCategoryPicker();
  else if(screen === "mock-setup") renderMockSetup();
  else if(screen === "quiz") renderQuiz();
  else if(screen === "summary") renderSummary(payload);
}

document.getElementById("btnHome").addEventListener("click", () => {
  session = null;
  go("home");
});

/* ---------- HOME ---------- */
function overallStats(){
  const ids = Object.keys(state.perQuestion);
  let answered=0, correct=0, flagged=0;
  ids.forEach(id => {
    const r = state.perQuestion[id];
    if(r.seen>0){ answered++; if(r.last==="correct") correct++; }
    if(r.flagged) flagged++;
  });
  return { answered, correct, flagged, accuracy: answered? Math.round(correct/answered*100): null };
}

function renderHome(){
  const tpl = document.getElementById("tpl-home").content.cloneNode(true);
  viewEl.innerHTML = "";
  viewEl.appendChild(tpl);

  const stats = overallStats();
  document.getElementById("statAnswered").textContent = stats.answered;
  document.getElementById("statAccuracy").textContent = stats.accuracy===null ? "—" : stats.accuracy+"%";
  document.getElementById("statFlagged").textContent = stats.flagged;

  const resumeBand = document.getElementById("resumeBand");
  if(state.lastSession && state.lastSession.queue && state.lastSession.index < state.lastSession.queue.length){
    resumeBand.hidden = false;
    const ls = state.lastSession;
    const modeLabel = { random:"Random practice", mock:"Mock exam", category:"Category practice", review:"Review session" }[ls.mode] || "Session";
    document.getElementById("resumeDetail").textContent =
      `${modeLabel} — question ${ls.index+1} of ${ls.queue.length}`;
    document.getElementById("btnResume").onclick = () => { session = reviveSession(ls); renderQuiz(); };
  } else {
    resumeBand.hidden = true;
  }

  document.querySelectorAll(".mode-card").forEach(btn => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.mode;
      if(mode === "random") startSession("random", QUESTIONS.map(q=>q.id));
      else if(mode === "mock") go("mock-setup");
      else if(mode === "category") go("category-picker");
      else if(mode === "review") startReviewSession();
    });
  });

  const bars = document.getElementById("categoryBars");
  CATEGORIES.forEach(cat => {
    const total = catCount(cat);
    const done = catAnswered(cat);
    const row = document.createElement("div");
    row.className = "catbar-row";
    row.innerHTML = `
      <span class="catbar-name">${cat}</span>
      <span class="catbar-track"><span class="catbar-fill" style="width:${total? (done/total*100):0}%"></span></span>
      <span class="catbar-count">${done}/${total}</span>`;
    bars.appendChild(row);
  });

  document.getElementById("btnReset").addEventListener("click", () => {
    if(confirm("Reset all saved progress? This cannot be undone.")){
      state = { perQuestion:{}, lastSession:null, theme:state.theme };
      saveState();
      renderHome();
    }
  });
}

/* ---------- CATEGORY PICKER ---------- */
function renderCategoryPicker(){
  const tpl = document.getElementById("tpl-category-picker").content.cloneNode(true);
  viewEl.innerHTML = "";
  viewEl.appendChild(tpl);
  viewEl.querySelector("[data-back]").addEventListener("click", () => go("home"));

  const selected = new Set();
  const list = document.getElementById("catList");
  CATEGORIES.forEach(cat => {
    const chip = document.createElement("div");
    chip.className = "cat-chip";
    chip.dataset.selected = "false";
    chip.innerHTML = `<span>${cat}</span><span class="cat-chip-count">${catCount(cat)}</span>`;
    chip.addEventListener("click", () => {
      if(selected.has(cat)){ selected.delete(cat); chip.dataset.selected="false"; }
      else { selected.add(cat); chip.dataset.selected="true"; }
    });
    list.appendChild(chip);
  });

  document.getElementById("btnStartCategory").addEventListener("click", () => {
    const pool = selected.size
      ? QUESTIONS.filter(q => selected.has(q.c))
      : QUESTIONS;
    startSession("category", shuffle(pool.map(q=>q.id)));
  });
}

/* ---------- MOCK SETUP ---------- */
function renderMockSetup(){
  const tpl = document.getElementById("tpl-mock-setup").content.cloneNode(true);
  viewEl.innerHTML = "";
  viewEl.appendChild(tpl);
  viewEl.querySelector("[data-back]").addEventListener("click", () => go("home"));

  let len = 50;
  const pills = document.querySelectorAll("#mockLenRow .choice-pill");
  pills.forEach(p => {
    p.dataset.selected = (parseInt(p.dataset.len)===len) ? "true":"false";
    p.addEventListener("click", () => {
      len = parseInt(p.dataset.len);
      pills.forEach(x => x.dataset.selected = (x===p)?"true":"false");
    });
  });

  document.getElementById("btnStartMock").addEventListener("click", () => {
    const timed = document.getElementById("mockTimedToggle").checked;
    const n = Math.min(len, QUESTIONS.length);
    const ids = shuffle(QUESTIONS.map(q=>q.id)).slice(0, n);
    startSession("mock", ids, { timed, secondsPerQ: 108, deferFeedback: true });
  });
}

/* ---------- REVIEW SESSION ---------- */
function startReviewSession(){
  const ids = Object.keys(state.perQuestion)
    .filter(id => {
      const r = state.perQuestion[id];
      return r.flagged || r.last === "wrong";
    })
    .map(Number);
  if(!ids.length){
    alert("No flagged or missed questions yet — answer some first.");
    return;
  }
  startSession("review", shuffle(ids));
}

/* ---------- SESSION ENGINE ---------- */
function startSession(mode, ids, opts){
  session = {
    mode,
    queue: ids,
    index: 0,
    opts: opts || {},
    results: {},
    committed: new Set(),
    startedAt: Date.now(),
    deadline: (opts && opts.timed) ? Date.now() + ids.length * opts.secondsPerQ * 1000 : null
  };
  persistSession();
  go("quiz");
}
function reviveSession(ls){
  return {
    mode: ls.mode, queue: ls.queue, index: ls.index, opts: ls.opts || {},
    results: ls.results || {}, committed: new Set(), startedAt: ls.startedAt,
    deadline: ls.deadline || null
  };
}
function persistSession(){
  if(!session) return;
  state.lastSession = {
    mode: session.mode, queue: session.queue, index: session.index,
    opts: session.opts, results: session.results, startedAt: session.startedAt,
    deadline: session.deadline
  };
  saveState();
}
function clearSession(){ state.lastSession = null; saveState(); }

let timerInterval = null;

function renderQuiz(){
  clearInterval(timerInterval);
  const tpl = document.getElementById("tpl-quiz").content.cloneNode(true);
  viewEl.innerHTML = "";
  viewEl.appendChild(tpl);

  viewEl.querySelector("[data-back]").addEventListener("click", () => {
    if(confirm("Exit this session? Your place will be saved.")){
      persistSession();
      session = null;
      go("home");
    }
  });

  const q = byId[session.queue[session.index]];
  const total = session.queue.length;

  document.getElementById("qCategory").textContent = q.c;
  document.getElementById("qStem").textContent = q.s;
  document.getElementById("quizPos").textContent = `${session.index+1} / ${total}`;
  document.getElementById("quizProgressFill").style.width = `${(session.index)/total*100}%`;

  const rec = qRecord(q.id);
  const flagBtn = document.getElementById("btnFlag");
  flagBtn.dataset.flagged = rec.flagged ? "true":"false";
  flagBtn.addEventListener("click", () => {
    rec.flagged = !rec.flagged;
    flagBtn.dataset.flagged = rec.flagged ? "true":"false";
    saveState();
  });

  const deferFeedback = !!session.opts.deferFeedback;
  const already = session.results[q.id];

  const optionsEl = document.getElementById("qOptions");
  q.o.forEach((text, i) => {
    const btn = document.createElement("button");
    btn.className = "option";
    btn.innerHTML = `<span class="option-letter">${LETTERS[i]}</span><span>${text}</span>`;
    btn.addEventListener("click", () => selectOption(i, q, deferFeedback));
    optionsEl.appendChild(btn);
  });

  const nextBtn = document.getElementById("btnNext");
  nextBtn.addEventListener("click", advance);

  if(already){
    nextBtn.hidden = false;
    if(deferFeedback && !already.revealed){
      document.querySelectorAll(".option")[already.choice].dataset.state = "selected";
    }
  }

  // timer
  if(session.deadline){
    const timerEl = document.getElementById("quizTimer");
    timerEl.hidden = false;
    const tick = () => {
      const remaining = Math.max(0, session.deadline - Date.now());
      const m = Math.floor(remaining/60000);
      const s = Math.floor((remaining%60000)/1000);
      timerEl.textContent = `${m}:${s.toString().padStart(2,"0")}`;
      timerEl.classList.toggle("low", remaining < 60000);
      if(remaining<=0){
        clearInterval(timerInterval);
        finishSession();
      }
    };
    tick();
    timerInterval = setInterval(tick, 1000);
  }

  // if already answered and feedback was already revealed (not deferred, or a
  // reviewed/resumed question), show that prior state instead of live options
  if(already && (already.revealed || session.opts.alwaysReveal)){
    lockOptions(q, already.choice);
    showFeedback(q, already.choice);
  }
}

// Records or updates the person's current choice for this question within the
// session. Does NOT touch long-term stats — those are committed exactly once,
// in commitStats(), when the person leaves the question via Next/finish.
function selectOption(choiceIdx, q, deferFeedback){
  const already = session.results[q.id];
  if(already && already.revealed) return; // locked once feedback is shown

  session.results[q.id] = { choice: choiceIdx, correct: choiceIdx === q.a, revealed: !deferFeedback };
  persistSession();

  if(!deferFeedback){
    lockOptions(q, choiceIdx);
    showFeedback(q, choiceIdx);
  } else {
    document.querySelectorAll(".option").forEach((el,i) => {
      el.dataset.state = (i===choiceIdx) ? "selected" : "";
    });
  }
  document.getElementById("btnNext").hidden = false;
}

function lockOptions(q, chosenIdx){
  const opts = document.querySelectorAll(".option");
  opts.forEach((el,i) => {
    el.disabled = true;
    if(i === q.a) el.dataset.state = "correct";
    else if(i === chosenIdx) el.dataset.state = "wrong";
    else el.dataset.state = "dim";
  });
}

// Writes one question's outcome into the long-term per-question record.
// Guarded by session.committed so it can safely be called from both
// advance() and a time-expired finishSession() without double-counting.
function commitStats(id){
  if(session.committed.has(id)) return;
  const result = session.results[id];
  if(!result) return; // skipped question — no answer given, nothing to record
  session.committed.add(id);
  const rec = qRecord(id);
  rec.seen += 1;
  if(result.correct){ rec.correct += 1; rec.last = "correct"; }
  else { rec.wrong += 1; rec.last = "wrong"; }
}

function showFeedback(q, chosenIdx){
  const feedback = document.getElementById("qFeedback");
  feedback.hidden = false;
  const verdict = document.getElementById("qVerdict");
  const correct = chosenIdx === q.a;
  verdict.textContent = correct ? "Correct" : `Not quite — correct answer is ${LETTERS[q.a]}`;
  verdict.className = "qfeedback-verdict " + (correct ? "is-correct":"is-wrong");
  document.getElementById("qExplain").textContent = q.e;
}

function advance(){
  if(!session.opts.reviewOnly){
    commitStats(session.queue[session.index]);
    saveState();
  }
  if(session.index + 1 >= session.queue.length){
    finishSession();
  } else {
    session.index += 1;
    persistSession();
    renderQuiz();
  }
}

function finishSession(){
  clearInterval(timerInterval);
  if(!session.opts.reviewOnly) commitStats(session.queue[session.index]);
  const total = session.queue.length;
  let correct = 0;
  const byCat = {};
  session.queue.forEach(id => {
    const q = byId[id];
    const r = session.results[id];
    byCat[q.c] = byCat[q.c] || { total:0, correct:0 };
    byCat[q.c].total += 1;
    if(r && r.correct){ correct += 1; byCat[q.c].correct += 1; }
  });
  const summaryData = { total, correct, byCat, queue: session.queue, results: session.results };
  clearSession();
  go("summary", summaryData);
}

/* ---------- SUMMARY ---------- */
function renderSummary(data){
  const tpl = document.getElementById("tpl-summary").content.cloneNode(true);
  viewEl.innerHTML = "";
  viewEl.appendChild(tpl);

  const pct = data.total ? Math.round(data.correct/data.total*100) : 0;
  document.getElementById("summaryPct").textContent = pct + "%";
  document.getElementById("summaryFraction").textContent = `${data.correct} of ${data.total} correct`;

  const catBox = document.getElementById("summaryByCat");
  Object.keys(data.byCat).sort().forEach(cat => {
    const c = data.byCat[cat];
    const row = document.createElement("div");
    row.className = "catbar-row";
    row.innerHTML = `
      <span class="catbar-name">${cat}</span>
      <span class="catbar-track"><span class="catbar-fill" style="width:${c.total? (c.correct/c.total*100):0}%"></span></span>
      <span class="catbar-count">${c.correct}/${c.total}</span>`;
    catBox.appendChild(row);
  });

  document.getElementById("btnReviewSession").addEventListener("click", () => {
    // Re-walk the just-finished session's questions with answers already
    // revealed. reviewOnly stops advance() from re-committing stats that
    // were already recorded while the session was live.
    session = {
      mode: "review-session",
      queue: data.queue,
      index: 0,
      opts: { deferFeedback:false, reviewOnly:true, alwaysReveal:true },
      results: data.results,
      committed: new Set(),
      startedAt: Date.now(),
      deadline: null
    };
    clearSession(); // this view isn't resumable as "last session" — it's a replay
    go("quiz");
  });
  document.getElementById("btnBackHome").addEventListener("click", () => go("home"));
}

/* ---------- boot ---------- */
go("home");

if("serviceWorker" in navigator && location.hostname !== "appassets.androidplatform.net"){
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => { /* offline support unavailable, app still works online */ });
  });
}

})();
