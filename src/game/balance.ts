export const B = { maxHP: 100, enemyHP: 80, fattyHP: 160, fattyHeal: 12, normalScore: 100, fattyScore: 400, playerSpeed: 285, gravity: 1550, jump: 640, maxEnemies: 12, maxBodies: 10, comboTimeout: 2.3, firstFatty: 35, fattyInterval: 42, floor: 555, despawnDistance: 2200 };
export function difficulty(seconds: number) { return { cap: Math.min(B.maxEnemies, seconds < 20 ? 1 : seconds < 50 ? 2 : 3 + Math.floor((seconds - 50) / 45)), interval: Math.max(.65, 4 - seconds / 100), speed: Math.min(140, 65 + seconds / 7) }; }
export function killValue(fatty: boolean, combo: number) { return (fatty ? B.fattyScore : B.normalScore) * (1 + Math.min(4, Math.floor(combo / 5)) * .25); }


