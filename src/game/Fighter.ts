import { B } from './balance';
export type Attack = {
    kind: 'light' | 'heavy' | 'upper' | 'slam';
    time: number;
    duration: number;
    hit: boolean;
    step: number;
    limb?: 'hand' | 'foot';
    launcher?: boolean;
};
export class Fighter {
    x: number;
    y: number;
    z = 0;
    vx = 0;
    vy = 0;
    vz = 0;
    face = 1;
    hp: number;
    maxHP: number;
    stun = 0;
    hurtHold = 0;
    hurtStyle = 0;
    fallDirection = 1;
    invulnerable = 0;
    cooldown = 0;
    dead = false;
    deathTime = 0;
    projectile = 0;
    spin = 0;
    angle = 0;
    phase = 0;
    moving = false;
    charge = 0;
    attack?: Attack;
    held = false;
    hitTargets = new Set<Fighter>();
    telegraph = 0;
    constructor(x: number, y: number, public player = false, public fatty = false) { this.x = x; this.y = y; this.hp = this.maxHP = player ? B.maxHP : fatty ? B.fattyHP : B.enemyHP; }
}
