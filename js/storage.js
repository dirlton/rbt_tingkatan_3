const STORAGE_KEY = 'ruangCiptaRbt.v1';
const emptyState = () => ({ version: 1, topics: {}, activities: {}, quizzes: {}, attempts: [], badges: [], points: 0, lastActivity: null });

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || typeof parsed !== 'object') return emptyState();
    return { ...emptyState(), ...parsed, topics: parsed.topics || {}, activities: parsed.activities || {}, quizzes: parsed.quizzes || {}, attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [], badges: Array.isArray(parsed.badges) ? parsed.badges : [] };
  } catch (error) {
    console.warn('Data kemajuan tidak dapat dibaca; sesi baharu dimulakan.', error);
    return emptyState();
  }
}

export function saveState(state) {
  try {
    state.lastActivity = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.error('Data tidak dapat disimpan dalam pelayar.', error);
    return false;
  }
}

export function markTopicComplete(sp, moduleId) {
  const state = loadState();
  const current = state.topics[sp] || {};
  if (!current.completed) {
    state.topics[sp] = { ...current, completed: true, completedAt: new Date().toISOString(), moduleId };
    state.points += 10;
  }
  saveState(state);
  return state;
}

export function saveActivityResponse(sp, response) {
  const state = loadState();
  state.activities[sp] = { response, updatedAt: new Date().toISOString() };
  saveState(state);
  return state;
}

export function saveAttempt(result) {
  const state = loadState();
  const key = result.setId;
  const previous = state.quizzes[key] || { best: 0, attempts: 0 };
  state.quizzes[key] = { best: Math.max(previous.best, result.percent), attempts: previous.attempts + 1, lastPercent: result.percent, lastAt: new Date().toISOString(), moduleId: result.moduleId };
  state.attempts.unshift({ setId: result.setId, title: result.title, moduleId: result.moduleId, percent: result.percent, correctCount: result.correctCount, wrongCount: result.wrongCount, total: result.total, wrongTopics: result.wrongTopics, submittedAt: new Date().toISOString() });
  state.attempts = state.attempts.slice(0, 40);
  if (!previous.attempts) state.points += 15;
  saveState(state);
  return state;
}

export function awardBadge(id) {
  const state = loadState();
  if (!state.badges.includes(id)) { state.badges.push(id); saveState(state); return true; }
  return false;
}

export function resetProgress() {
  try { localStorage.removeItem(STORAGE_KEY); return true; } catch (error) { console.error(error); return false; }
}
