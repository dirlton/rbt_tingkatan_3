export function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
  return copy;
}

export function buildQuestionPool(modules) {
  return modules.flatMap((module) => module.topics.flatMap((topic) => topic.quiz.map((question, index) => {
    const common = {
      ...question,
      id: `${topic.sp}-Q${index + 1}`,
      moduleId: module.id,
      moduleTitle: module.title,
      sp: topic.sp,
      topicTitle: topic.title,
      difficulty: index === 0 ? 'Asas' : index === 1 ? 'Aplikasi' : 'Analisis',
      skill: index === 0 ? 'Pengetahuan' : index === 1 ? 'Aplikasi' : 'Pemikiran kritis'
    };
    if (index !== 1) return { ...common, type: index === 0 ? 'multiple-choice' : 'analysis' };
    const isTrue = Number(topic.sp.split('.').at(-1)) % 2 === 1;
    const statementIndex = isTrue ? question.a : (question.a + 1) % question.options.length;
    const statement = question.options[statementIndex];
    return {
      ...common,
      type: 'true-false',
      q: `Pernyataan tentang ${topic.title}: “Bagi soalan ‘${question.q}’, jawapan yang tepat ialah ${statement}.” Betul atau salah?`,
      options: ['Betul', 'Salah'],
      a: isTrue ? 0 : 1,
      why: isTrue ? question.why : `Pernyataan itu salah. Jawapan yang tepat ialah “${question.options[question.a]}”. ${question.why}`
    };
  })));
}

export function selectSet(setId, modules, pool) {
  const topicMatch = setId.match(/^topic-(\d+\.\d+\.\d+)$/);
  if (topicMatch) { const topicQuestions = pool.filter((q) => q.sp === topicMatch[1]); return { id: setId, moduleId: topicQuestions[0]?.moduleId, title: `Latihan ${topicMatch[1]}`, questions: shuffle(topicQuestions) }; }
  if (setId === 'overall') return { id: 'overall', title: 'Cabaran RBT keseluruhan', questions: shuffle(pool).slice(0, 20) };
  if (modules.some((m) => m.id === setId)) {
    const module = modules.find((m) => m.id === setId);
    return { id: setId, moduleId: setId, title: `Cabaran · ${module.title}`, questions: shuffle(pool.filter((q) => q.moduleId === setId)).slice(0, setId === 'module2' ? 12 : 10) };
  }
  return null;
}

export function prepareQuestion(question) {
  return { ...question, options: shuffle(question.options.map((text, sourceIndex) => ({ text, sourceIndex }))) };
}

export function gradeSet(set, answers) {
  const reviewed = set.questions.map((question) => {
    const selectedSourceIndex = answers[question.id];
    const correct = selectedSourceIndex === question.a;
    return { ...question, selectedSourceIndex: selectedSourceIndex ?? null, selectedText: selectedSourceIndex === undefined ? null : question.options[selectedSourceIndex], correctText: question.options[question.a], correct, explanation: question.why };
  });
  const correctCount = reviewed.filter((question) => question.correct).length;
  const percent = reviewed.length ? Math.round((correctCount / reviewed.length) * 100) : 0;
  const wrongTopics = [...new Set(reviewed.filter((question) => !question.correct).map((question) => question.sp))];
  return { setId: set.id, title: set.title, total: reviewed.length, correctCount, wrongCount: reviewed.length - correctCount, percent, reviewed, wrongTopics };
}
