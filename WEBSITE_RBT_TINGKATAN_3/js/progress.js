export function getProgress(modules, state) {
  const allTopics = modules.flatMap((module) => module.topics.map((topic) => ({ ...topic, moduleId: module.id, moduleTitle: module.title })));
  const completedTopics = allTopics.filter((topic) => state.topics[topic.sp]?.completed);
  const finishedModules = modules.filter((module) => module.topics.every((topic) => state.topics[topic.sp]?.completed)).length;
  const totalQuizzes = Object.keys(state.quizzes).length;
  const percent = allTopics.length ? Math.round((completedTopics.length / allTopics.length) * 100) : 0;
  const bestByModule = Object.fromEntries(modules.map((module) => {
    const scores = Object.values(state.quizzes).filter((value) => value.moduleId === module.id).map((value) => value.best);
    return [module.id, scores.length ? Math.max(...scores) : null];
  }));
  return { allTopics, completedTopics, finishedModules, totalQuizzes, percent, bestByModule };
}

export function nextRecommendation(modules, state) {
  const latestReview = state.attempts.find((attempt) => attempt.wrongTopics?.length);
  const reviewSp = latestReview?.wrongTopics?.[0];
  if (reviewSp) {
    const module = modules.find((item) => item.topics.some((topic) => topic.sp === reviewSp));
    const topic = module?.topics.find((item) => item.sp === reviewSp);
    if (module && topic) return { module, topic, review: true };
  }
  for (const module of modules) {
    const topic = module.topics.find((item) => !state.topics[item.sp]?.completed);
    if (topic) return { module, topic };
  }
  return null;
}
