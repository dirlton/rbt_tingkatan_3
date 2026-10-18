import { loadState, markTopicComplete, saveActivityResponse, saveAttempt, resetProgress } from './storage.js';
import { getProgress, nextRecommendation } from './progress.js';
import { updateBadges } from './gamification.js';
import { buildQuestionPool, selectSet, prepareQuestion, gradeSet } from './quiz-engine.js';

const rootPrefix = location.pathname.includes('/modules/') ? '../' : '';
const $ = (selector, scope = document) => scope.querySelector(selector);
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
let modules = [];
let challengeData = null;
let currentQuiz = null;
let preparedQuestions = [];
let answers = {};
let currentIndex = 0;

async function loadContent() {
  const [moduleResponse, assessmentResponse] = await Promise.all([fetch(`${rootPrefix}data/modules.json`), fetch(`${rootPrefix}data/assessments.json`)]);
  if (!moduleResponse.ok || !assessmentResponse.ok) throw new Error('Fail kandungan tidak dapat dimuatkan.');
  modules = await moduleResponse.json();
  challengeData = await assessmentResponse.json();
}

function renderHeader() {
  const state = loadState();
  const inModule = location.pathname.includes('/modules/');
  const home = inModule ? '../index.html' : 'index.html';
  const dashboard = inModule ? '../dashboard.html' : 'dashboard.html';
  const quiz = inModule ? '../quiz.html' : 'quiz.html';
  const page = document.body.dataset.page;
  $('#site-header').innerHTML = `<header class="site-header"><div class="wrap nav-wrap"><a class="brand" href="${home}" aria-label="Ruang Cipta RBT, halaman utama"><span class="brand-mark">✳</span><span>RUANG CIPTA<small>RBT TINGKATAN 3</small></span></a><button class="menu-button" aria-label="Buka menu" aria-expanded="false">☰</button><nav class="main-nav" aria-label="Navigasi utama"><a href="${home}" ${page === 'home' ? 'aria-current="page"' : ''}>Utama</a><a href="${dashboard}" ${page === 'dashboard' ? 'aria-current="page"' : ''}>Dashboard</a><a href="${inModule ? '../modules/modul1.html' : 'modules/modul1.html'}">Modul</a><a href="${quiz}" ${page === 'quiz' ? 'aria-current="page"' : ''}>Pusat kuiz</a></nav><div class="nav-right"><span class="points-pill">✦ ${state.points} mata</span></div></div></header>`;
  $('.menu-button')?.addEventListener('click', (event) => {
    const button = event.currentTarget;
    const nav = $('.main-nav');
    const expanded = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!expanded));
    button.setAttribute('aria-label', expanded ? 'Buka menu' : 'Tutup menu');
    nav.classList.toggle('open', !expanded);
  });
}

function renderFooter() {
  $('#site-footer').innerHTML = `<footer class="site-footer"><div class="wrap footer-inner"><div><a class="brand" href="${rootPrefix}index.html"><span class="brand-mark">✳</span><span>RUANG CIPTA<small>RBT TINGKATAN 3</small></span></a><small>Belajar melalui idea, reka bentuk dan ciptaan.</small></div><div class="footer-links"><a href="${rootPrefix}dashboard.html">Dashboard</a><a href="${rootPrefix}quiz.html">Pusat kuiz</a><a href="${rootPrefix}README.md">Tentang data</a></div></div></footer>`;
}

function moduleCard(module) {
  const state = loadState();
  const done = module.topics.filter((topic) => state.topics[topic.sp]?.completed).length;
  const percent = Math.round(done / module.topics.length * 100);
  return `<a class="module-card" href="modules/${module.id === 'module1' ? 'modul1' : module.id === 'module2' ? 'modul2' : 'modul3'}.html"><div class="card-top"><span class="module-icon">${module.icon}</span><span class="module-number">${module.standard.split(' ')[0]}</span></div><h3>${escapeHtml(module.title)}</h3><p>${escapeHtml(module.summary)}</p><div class="card-foot"><span>${done}/${module.topics.length} subtopik selesai</span><span class="mini-track" aria-label="${percent}% selesai"><span style="width:${percent}%"></span></span></div></a>`;
}

function renderBadgeList(target, badges, compact = false) {
  target.innerHTML = badges.map((badge) => `<div class="badge ${badge.earned ? 'earned' : ''}" title="${escapeHtml(badge.description)}"><span class="badge-symbol" aria-hidden="true">${badge.icon}</span><span>${escapeHtml(badge.title)}${compact ? '' : `<small class="badge-description">${badge.earned ? 'Diperoleh' : 'Belum diperoleh'}</small>`}</span></div>`).join('');
}

function renderHome() {
  $('#module-cards').innerHTML = modules.map(moduleCard).join('');
  const state = loadState();
  const progress = getProgress(modules, state);
  $('#home-progress').innerHTML = `<div class="progress-summary"><div><strong>${progress.percent}%</strong><p>${progress.completedTopics.length} daripada ${progress.allTopics.length} subtopik selesai</p></div><a class="button button-quiet button-small" href="dashboard.html">Lihat dashboard →</a><div class="progress-track" style="grid-column:1/-1"><span style="width:${progress.percent}%"></span></div></div>`;
  renderBadgeList($('#home-badges'), updateBadges(modules, state), true);
}

function renderDashboard() {
  const state = loadState();
  const progress = getProgress(modules, state);
  const recommendation = nextRecommendation(modules, state);
  const badges = updateBadges(modules, state);
  const moduleRows = modules.map((module) => {
    const done = module.topics.filter((topic) => state.topics[topic.sp]?.completed).length;
    const best = progress.bestByModule[module.id];
    const url = module.id === 'module1' ? 'modules/modul1.html' : module.id === 'module2' ? 'modules/modul2.html' : 'modules/modul3.html';
    return `<div class="module-progress-item"><strong><a href="${url}">${escapeHtml(module.title)}</a></strong><small>${best === null ? 'Belum ada markah kuiz' : `Markah terbaik ${best}%`}</small><small>${done}/${module.topics.length} subtopik</small><div class="progress-track"><span style="width:${Math.round(done / module.topics.length * 100)}%"></span></div></div>`;
  }).join('');
  const recent = state.attempts.slice(0, 4).map((attempt) => `<div class="module-progress-item"><strong>${escapeHtml(attempt.title)}</strong><small>${attempt.correctCount}/${attempt.total} betul · ${attempt.percent}%</small><small>${attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString('ms-MY') : ''}</small></div>`).join('') || '<div class="empty-state">Belum ada kuiz dihantar. Cuba latihan subtopik untuk mula membina rekod anda.</div>';
  const bestQuizzes = Object.entries(state.quizzes).map(([key, value]) => {
    const last = state.attempts.find((attempt) => attempt.setId === key);
    const label = last?.title || (key.startsWith('topic-') ? `Latihan ${key.replace('topic-', '')}` : key);
    return `<div class="module-progress-item"><strong>${escapeHtml(label)}</strong><small>Markah terbaik ${value.best}%</small><small>${value.attempts} percubaan</small></div>`;
  }).join('') || '<div class="empty-state">Markah terbaik akan muncul selepas kuiz pertama dihantar.</div>';
  const nextUrl = recommendation ? `${recommendation.module.id === 'module1' ? 'modules/modul1.html' : recommendation.module.id === 'module2' ? 'modules/modul2.html' : 'modules/modul3.html'}#${recommendation.topic.sp.replaceAll('.', '-')}` : 'quiz.html?set=overall';
  $('#dashboard-content').innerHTML = `<div class="stat-grid"><div class="stat-card"><span>Modul selesai</span><strong>${progress.finishedModules}/3</strong></div><div class="stat-card"><span>Kemajuan keseluruhan</span><strong>${progress.percent}%</strong></div><div class="stat-card"><span>Kuiz diselesaikan</span><strong>${progress.totalQuizzes}</strong></div><div class="stat-card"><span>Mata ganjaran</span><strong>${state.points}</strong></div></div><div class="dashboard-grid"><section class="panel"><h3>Kemajuan mengikut modul</h3><div class="module-progress-list">${moduleRows}</div><h3 style="margin-top:24px">Markah terbaik setiap kuiz</h3><div class="module-progress-list">${bestQuizzes}</div></section><section class="panel"><h3>Langkah seterusnya</h3>${recommendation ? `<div class="next-card"><p>${recommendation.review ? 'Ulang kaji topik yang memerlukan perhatian:' : 'Cadangan aktiviti seterusnya:'}</p><strong>${escapeHtml(recommendation.topic.sp)} · ${escapeHtml(recommendation.topic.title)}</strong><p>${escapeHtml(recommendation.module.title)}</p><a class="button button-primary button-small" href="${nextUrl}">Buka topik →</a></div>` : '<div class="next-card"><p>Semua subtopik telah ditandakan selesai.</p><a class="button button-primary button-small" href="quiz.html?set=overall">Cuba cabaran keseluruhan →</a></div>'}<h3 style="margin-top:24px">Percubaan terkini</h3><div class="module-progress-list">${recent}</div></section></div><section class="panel" style="margin-top:17px"><div class="section-heading compact"><div><h3>Lencana pembelajaran</h3><p class="small-note">Lencana menandakan aktiviti yang sudah diselesaikan.</p></div></div><div class="badge-list"></div></section><div class="reset-row"><button class="button button-danger button-small" id="reset-progress">Reset semua kemajuan</button></div><p class="small-note" style="text-align:right">Kemajuan disimpan dalam pelayar dan peranti ini sahaja.</p>`;
  renderBadgeList($('.badge-list'), badges);
  $('#reset-progress').addEventListener('click', () => {
    if (confirm('Reset semua kemajuan, markah, mata dan lencana yang disimpan dalam pelayar ini? Tindakan ini tidak boleh dibatalkan.')) {
      if (resetProgress()) { showToast('Kemajuan telah direset.'); renderDashboard(); renderHeader(); }
      else showToast('Data tidak dapat direset.');
    }
  });
}

function renderModule() {
  const module = modules.find((item) => item.id === document.body.dataset.module);
  if (!module) return;
  document.title = `${module.title} | Ruang Cipta`;
  const state = loadState();
  const lessons = module.topics.map((topic) => `<article class="lesson-card" id="${topic.sp.replaceAll('.', '-')}"><div class="section-heading compact"><div><p class="eyebrow">STANDARD PEMBELAJARAN ${topic.sp}</p><h2>${escapeHtml(topic.title)}</h2></div><span class="tag">${state.topics[topic.sp]?.completed ? '✓ Selesai' : 'Belum selesai'}</span></div><p><strong>Objektif:</strong> ${escapeHtml(topic.objective)}</p><h3>Nota ringkas</h3><p>${escapeHtml(topic.note)}</p><h3>Cuba aktiviti ini</h3><p>${escapeHtml(topic.activity)}</p><div class="callout"><strong>Evidens pembelajaran:</strong> ${escapeHtml(topic.evidence)}</div><div class="activity-input"><label for="activity-${topic.sp}">Catatan aktiviti <span class="small-note">Disimpan dalam pelayar ini sahaja.</span></label><textarea id="activity-${topic.sp}" rows="3" maxlength="1200" placeholder="Catat jawapan, lakaran yang dirancang atau alasan pilihan anda.">${escapeHtml(state.activities[topic.sp]?.response || '')}</textarea><button class="button button-quiet button-small" data-activity="${topic.sp}">Simpan catatan</button></div><div class="lesson-tools"><a class="button button-primary button-small" href="../quiz.html?set=topic-${topic.sp}">Latihan ${topic.quiz.length} soalan →</a><button class="button button-quiet button-small" data-complete="${topic.sp}" data-module="${module.id}">${state.topics[topic.sp]?.completed ? 'Selesai ✓' : 'Tandakan selesai'}</button></div></article>`).join('');
  const performance = `<article class="lesson-card performance-card"><p class="eyebrow">STANDARD PRESTASI DSKP</p><h2>Perkembangan evidens pembelajaran</h2><p class="small-note">Rujukan latihan mengikut pernyataan khusus bidang. Paparan ini bukan penetapan TP rasmi murid.</p><div class="performance-grid">${module.performance.map((statement, index) => `<div><span>TP${index + 1}</span><p>${escapeHtml(statement)}</p></div>`).join('')}</div></article>`;
  $('#module-content').innerHTML = `<header class="module-hero"><div><p class="eyebrow">${escapeHtml(module.standard)}</p><h1>${escapeHtml(module.title)}</h1><p>${escapeHtml(module.intro)}</p><div class="module-meta"><span class="tag">${module.topics.length} subtopik</span><span class="tag">Cadangan DSKP: ${module.hours} jam</span><span class="tag">${escapeHtml(module.standard.split(' ')[0])}</span></div></div><div class="module-token" aria-hidden="true">${module.icon}</div></header><div class="module-layout"><nav class="lesson-nav" aria-label="Subtopik modul">${module.topics.map((topic) => `<a href="#${topic.sp.replaceAll('.', '-')}">${topic.sp} · ${escapeHtml(topic.title)}</a>`).join('')}</nav><div class="lesson-content">${performance}${lessons}<div class="teacher-note">Nota kurikulum: kod SP, objektif dan Standard Prestasi dipadankan dengan DSKP KSSM RBT Tingkatan 3. Kandungan contoh tambahan perlu disemak oleh guru sebelum digunakan sebagai bahan rasmi.</div><div class="lesson-tools"><a class="button button-primary" href="../quiz.html?set=${module.id}">Cabaran bab →</a><a class="button button-quiet" href="../dashboard.html">Lihat kemajuan</a></div></div></div>`;
  $('#module-content').addEventListener('click', (event) => {
    const activityButton = event.target.closest('[data-activity]');
    if (activityButton) {
      const sp = activityButton.dataset.activity;
      const response = document.getElementById(`activity-${sp}`).value.trim();
      saveActivityResponse(sp, response);
      showToast(response ? 'Catatan aktiviti disimpan dalam pelayar ini.' : 'Catatan kosong disimpan.');
      return;
    }
    const button = event.target.closest('[data-complete]');
    if (!button) return;
    markTopicComplete(button.dataset.complete, button.dataset.module);
    updateBadges(modules, loadState());
    showToast('Subtopik ditandakan selesai · +10 mata sekali sahaja.');
    renderModule();
    renderHeader();
  });
}

function quizCards(pool) {
  const challenges = challengeData.sets.map((set) => `<article class="quiz-select-card"><span class="tag">${set.count} soalan · ${set.minutes} minit · ${escapeHtml(set.difficulty)}</span><h3>${escapeHtml(set.title)}</h3><p>${escapeHtml(set.description)}</p><a class="button button-primary button-small" href="quiz.html?set=${set.id}">Pilih kuiz →</a></article>`).join('');
  const practices = modules.map((module) => `<article class="quiz-select-card"><span class="tag">Latihan subtopik · ${module.topics.length} set</span><h3>${escapeHtml(module.title)}</h3><p>Pilih latihan mengikut Standard Pembelajaran. Setiap latihan mengandungi ${challengeData.questionCountByTopic} soalan.</p><div class="topic-chip-list">${module.topics.map((topic) => `<a class="topic-chip" href="quiz.html?set=topic-${topic.sp}">${topic.sp}</a>`).join('')}</div></article>`).join('');
  $('#quiz-content').innerHTML = `<header class="page-title"><p class="eyebrow">PUSAT LATIHAN</p><h1>Pilih cabaran anda</h1><p class="lead">Jawab dahulu, kemudian semak markah dan penjelasan bagi setiap soalan.</p></header><h2 class="subheading">Cabaran modul</h2><div class="quiz-select-grid">${challenges}</div><h2 class="subheading" style="margin-top:32px">Latihan mengikut subtopik</h2><div class="quiz-select-grid">${practices}</div><p class="small-note" style="margin-top:20px">Bank latihan semasa menyediakan ${pool.length} soalan yang dipetakan kepada Standard Pembelajaran. Kuiz mengambil sampel soalan daripada bank yang tersedia.</p>`;
}

function startQuiz(setId, pool) {
  const set = selectSet(setId, modules, pool);
  if (!set || !set.questions.length) { $('#quiz-content').innerHTML = '<div class="empty-state">Set kuiz tidak ditemui.</div>'; return; }
  currentQuiz = set;
  preparedQuestions = set.questions.map(prepareQuestion);
  answers = {};
  currentIndex = 0;
  $('#quiz-content').innerHTML = `<div class="quiz-shell"><div class="panel"><p class="eyebrow">SEBELUM BERMULA</p><h1>${escapeHtml(set.title)}</h1><p class="lead">${preparedQuestions.length} soalan · tiada had masa · pilihan jawapan diacak.</p><div class="callout" style="margin:18px 0"><strong>Arahan:</strong> Pilih satu jawapan bagi setiap soalan. Anda boleh bergerak antara soalan dan menyemak soalan yang belum dijawab. Jawapan serta penjelasan hanya muncul selepas kuiz dihantar.</div><button class="button button-primary" id="begin-quiz">Mula kuiz →</button> <a class="button button-quiet" href="quiz.html">Kembali ke pusat kuiz</a></div></div>`;
  $('#begin-quiz').addEventListener('click', renderQuestion);
}

function renderQuestion() {
  const question = preparedQuestions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const progressPercent = Math.round((currentIndex + 1) / preparedQuestions.length * 100);
  const options = question.options.map((option, index) => `<button class="answer-option ${answers[question.id] === option.sourceIndex ? 'selected' : ''}" data-option="${option.sourceIndex}" aria-pressed="${answers[question.id] === option.sourceIndex}"><span class="option-letter">${String.fromCharCode(65 + index)}</span><span>${escapeHtml(option.text)}</span></button>`).join('');
  const typeLabel = question.type === 'true-false' ? 'BETUL ATAU SALAH' : question.type === 'analysis' ? 'APLIKASI / ANALISIS' : 'ANEKA PILIHAN';
  $('#quiz-content').innerHTML = `<div class="quiz-shell"><div class="quiz-kicker"><span>${escapeHtml(currentQuiz.title)}</span><span>${answeredCount}/${preparedQuestions.length} dijawab</span></div><div class="quiz-progress" aria-label="Kemajuan kuiz"><span style="width:${progressPercent}%"></span></div><div class="panel" style="margin-top:18px"><p class="question-count">${typeLabel} · ${currentIndex + 1} DARIPADA ${preparedQuestions.length} · ${question.sp} · ${escapeHtml(question.difficulty)}</p><h1 class="question-text">${escapeHtml(question.q)}</h1><div class="answer-list">${options}</div><div class="quiz-controls"><button class="button button-quiet button-small" id="previous-question" ${currentIndex === 0 ? 'disabled' : ''}>← Sebelum</button><span class="small-note">${escapeHtml(question.topicTitle)}</span>${currentIndex < preparedQuestions.length - 1 ? '<button class="button button-primary button-small" id="next-question">Seterusnya →</button>' : '<button class="button button-primary button-small" id="submit-quiz">Hantar kuiz ✓</button>'}</div><div class="question-dots" aria-label="Pilih nombor soalan">${preparedQuestions.map((item, index) => `<button class="${answers[item.id] !== undefined ? 'answered' : ''} ${index === currentIndex ? 'current' : ''}" data-question-index="${index}" aria-label="Soalan ${index + 1}${answers[item.id] !== undefined ? ', dijawab' : ', belum dijawab'}">${index + 1}</button>`).join('')}</div></div></div>`;
  $('.answer-list').addEventListener('click', (event) => {
    const button = event.target.closest('[data-option]'); if (!button) return;
    answers[question.id] = Number(button.dataset.option); renderQuestion();
  });
  $('#previous-question')?.addEventListener('click', () => { currentIndex -= 1; renderQuestion(); });
  $('#next-question')?.addEventListener('click', () => { currentIndex += 1; renderQuestion(); });
  $('.question-dots').addEventListener('click', (event) => { const button = event.target.closest('[data-question-index]'); if (button) { currentIndex = Number(button.dataset.questionIndex); renderQuestion(); } });
  $('#submit-quiz')?.addEventListener('click', submitQuiz);
}

function submitQuiz() {
  const missing = preparedQuestions.length - Object.keys(answers).length;
  const prompt = missing ? `Masih ada ${missing} soalan belum dijawab. Hantar kuiz sekarang juga?` : 'Hantar jawapan dan lihat keputusan?';
  if (!confirm(prompt)) return;
  const result = gradeSet(currentQuiz, answers);
  result.moduleId = currentQuiz.moduleId || null;
  result.retrySet = currentQuiz.id;
  saveAttempt(result);
  updateBadges(modules, loadState());
  try { sessionStorage.setItem('ruangCiptaRbt.lastResult', JSON.stringify(result)); } catch (error) { console.error('Keputusan sesi tidak dapat disimpan.', error); }
  location.href = `result.html`;
}

function renderResult() {
  let result;
  try { result = JSON.parse(sessionStorage.getItem('ruangCiptaRbt.lastResult') || 'null'); } catch { result = null; }
  if (!result) { $('#result-content').innerHTML = `<div class="empty-state">Keputusan belum tersedia dalam sesi ini. <a class="text-link" href="quiz.html">Pilih kuiz →</a></div>`; return; }
  let feedback = result.percent === 100 ? 'Cemerlang! Anda menjawab semua soalan dengan betul.' : result.percent >= 70 ? 'Usaha yang baik. Semak penjelasan untuk mengukuhkan kefahaman.' : 'Teruskan latihan. Ulang kaji subtopik yang disenaraikan dan cuba lagi.';
  const review = result.reviewed.map((question, index) => `<article class="review-item"><h3>${index + 1}. ${escapeHtml(question.q)}</h3><p class="${question.correct ? 'review-correct' : 'review-wrong'}"><strong>${question.correct ? 'Betul' : 'Belum tepat'}.</strong> Jawapan anda: ${escapeHtml(question.selectedText || 'Tiada jawapan')}</p><p><strong>Jawapan:</strong> ${escapeHtml(question.correctText)}</p><p><strong>Penjelasan:</strong> ${escapeHtml(question.explanation)}</p><p class="small-note">${escapeHtml(question.sp)} · ${escapeHtml(question.topicTitle)} · ${escapeHtml(question.skill)}</p></article>`).join('');
  const wrongTopicList = result.wrongTopics.length ? result.wrongTopics.map((sp) => { const module = modules.find((m) => m.topics.some((topic) => topic.sp === sp)); const topic = module?.topics.find((item) => item.sp === sp); return `<a class="tag" href="${module?.id === 'module1' ? 'modules/modul1.html' : module?.id === 'module2' ? 'modules/modul2.html' : 'modules/modul3.html'}#${sp.replaceAll('.', '-')}">${sp} · ${escapeHtml(topic?.title || '')}</a>`; }).join('') : '<span class="tag">Tiada topik untuk ulang kaji</span>';
  $('#result-content').innerHTML = `<div class="quiz-shell"><section class="result-hero"><p class="eyebrow">KEPUTUSAN KUIZ</p><div class="score-ring"><strong>${result.percent}%</strong><small>${result.correctCount}/${result.total} betul</small></div><h1>${escapeHtml(result.title)}</h1><p>${escapeHtml(feedback)}</p><div class="module-meta" style="justify-content:center"><span class="tag">${result.correctCount} betul</span><span class="tag">${result.wrongCount} salah/belum dijawab</span></div></section><div class="panel" style="margin-top:17px"><h2 style="font-size:21px">Topik untuk diulang kaji</h2><div class="module-meta">${wrongTopicList}</div><div class="lesson-tools"><button class="button button-primary button-small" id="review-answers">Semak jawapan ↓</button><a class="button button-quiet button-small" href="quiz.html?set=${encodeURIComponent(result.retrySet)}">Cuba lagi</a><a class="button button-quiet button-small" href="${result.moduleId === 'module1' ? 'modules/modul1.html' : result.moduleId === 'module2' ? 'modules/modul2.html' : result.moduleId === 'module3' ? 'modules/modul3.html' : 'dashboard.html'}">Kembali ke modul</a></div></div><div class="review-list" id="answer-review">${review}</div><p class="small-note" style="margin-top:16px">Skor kuiz ialah petunjuk latihan dan tidak menetapkan Tahap Penguasaan rasmi murid.</p></div>`;
  $('#review-answers').addEventListener('click', () => $('#answer-review').scrollIntoView({ behavior: 'smooth', block: 'start' }));
}

function showToast(message) {
  $('.toast')?.remove();
  const toast = document.createElement('div'); toast.className = 'toast'; toast.setAttribute('role', 'status'); toast.textContent = message; document.body.append(toast);
  window.setTimeout(() => toast.remove(), 2600);
}

async function main() {
  try {
    await loadContent();
    renderHeader(); renderFooter();
    const page = document.body.dataset.page;
    if (page === 'home') renderHome();
    if (page === 'dashboard') renderDashboard();
    if (page === 'module') renderModule();
    if (page === 'quiz') {
      const pool = buildQuestionPool(modules); const setId = new URLSearchParams(location.search).get('set');
      if (setId) startQuiz(setId, pool); else quizCards(pool);
    }
    if (page === 'result') renderResult();
  } catch (error) {
    console.error(error);
    const mainContent = document.querySelector('main');
    if (mainContent) mainContent.innerHTML = `<div class="empty-state" role="alert">${escapeHtml(error.message)} Pastikan portal dibuka melalui pelayan setempat atau GitHub Pages.</div>`;
  }
}

main();
