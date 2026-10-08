// Global learner level derived from the server's total XP; no stored level state.
// Thresholds: 0, 20, 60, 120, 200... Each next level needs 20 more XP.
export function learnerLevel(totalXp: number) {
  const xp = Math.max(0, Math.floor(totalXp));
  const level = Math.floor((1 + Math.sqrt(1 + xp / 2.5)) / 2);
  const startXp = 10 * level * (level - 1);
  const nextLevelXp = 10 * level * (level + 1);
  return {
    level, totalXp: xp, nextLevelXp,
    earnedXp: xp - startXp,
    requiredXp: nextLevelXp - startXp,
    remainingXp: nextLevelXp - xp,
    percent: Math.floor((xp - startXp) / (nextLevelXp - startXp) * 100),
  };
}
