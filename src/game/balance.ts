/** One knob for silhouette size and every reach that has to track it. */
const SCALE = 1.3;
export const B = { maxHP: 100, enemyHP: 80, fattyHP: 210, fattyHeal: 12, normalScore: 100, fattyScore: 400, playerSpeed: 285, gravity: 1550, jump: 640, maxEnemies: 12, maxBodies: 10, comboTimeout: 2.3, firstFatty: 35, fattyInterval: 42, floor: 555, ceiling: 240, arenaWidth: 3840, view: 1280, figureScale: SCALE };
/** Hit volumes and AI spacing, scaled with the silhouette so contact stays visually honest. */
export const REACH = { heavy: 115 * SCALE, light: 85 * SCALE, behind: 28 * SCALE, vertical: 45 * SCALE, air: 105 * SCALE, aiAttack: 65 * SCALE, aiStop: 52 * SCALE, aiSpread: 30 * SCALE, bodyX: 38 * SCALE, bodyY: 30 * SCALE, bodyZ: 65 * SCALE, hold: 32 * SCALE, holdZ: 40 * SCALE, impactY: 45 * SCALE };
export type Difficulty = 'easy' | 'normal' | 'hard';
export const MODES = {
    easy: { pace: .8, extra: 0, aggression: 1.2, fattyTime: 1.2 },
    normal: { pace: 1, extra: 1, aggression: 1, fattyTime: 1 },
    hard: { pace: 1.25, extra: 3, aggression: .75, fattyTime: .75 },
};
export function difficulty(seconds: number, mode: Difficulty = 'normal') {
    const m = MODES[mode], t = seconds * m.pace;
    return { cap: Math.min(B.maxEnemies, (t < 20 ? 2 : t < 50 ? 3 : 4 + Math.floor((t - 50) / 40)) + m.extra),
        interval: Math.max(.65, (2.2 - t / 140) / m.pace), speed: Math.min(270, Math.min(210, 150 + t / 9) * m.pace) };
}
export function killValue(fatty: boolean, combo: number) { return (fatty ? B.fattyScore : B.normalScore) * (1 + Math.min(4, Math.floor(combo / 5)) * .25); }


