export const BADGES = [
  { id: 'first-steps', title: 'Langkah Pertama', icon: '✦', description: 'Selesaikan kuiz pertama.' },
  { id: 'mechatronics', title: 'Penjelajah Mekatronik', icon: '⌁', description: 'Selesaikan subtopik Modul 1.' },
  { id: 'product-maker', title: 'Pereka Produk', icon: '◇', description: 'Selesaikan subtopik Modul 2.' },
  { id: 'tester', title: 'Pakar Pengujian', icon: '✓', description: 'Lengkapkan latihan pengujian produk.' },
  { id: 'marketing', title: 'Strategis Pemasaran', icon: '↗', description: 'Selesaikan subtopik Modul 3.' },
  { id: 'rbt-champion', title: 'Juara RBT', icon: '★', description: 'Selesaikan ketiga-tiga modul.' }
];

export function updateBadges(modules, state) {
  const completed = (id) => modules.find((m) => m.id === id)?.topics.every((topic) => state.topics[topic.sp]?.completed);
  const earned = new Set(state.badges);
  if (state.attempts.length) earned.add('first-steps');
  if (completed('module1')) earned.add('mechatronics');
  if (completed('module2')) earned.add('product-maker');
  if (state.topics['2.1.8']?.completed) earned.add('tester');
  if (completed('module3')) earned.add('marketing');
  if (modules.every((module) => completed(module.id))) earned.add('rbt-champion');
  if (earned.size !== state.badges.length) {
    state.badges = [...earned];
    try { localStorage.setItem('ruangCiptaRbt.v1', JSON.stringify(state)); } catch (error) { console.error(error); }
  }
  return BADGES.map((badge) => ({ ...badge, earned: earned.has(badge.id) }));
}
