import Phaser from 'phaser';
import { B } from './balance';
import { Fighter } from './Fighter';

/** Round head, slim trunk, and uniform rounded limbs from the supplied pose references. */
const FIGURE = { limb: 9, torso: 12, fattyLimb: 15, fattyTorso: 28, head: 14, headDrop: 16, fist: 1, foot: 11, footWidth: 8 };

/**
 * Half a step, the peak toe clearance, and the fraction of a cycle a foot stays planted.
 * reach must stay under sqrt(LEG^2 - hip^2) or the leg solver clamps at full extension and
 * the planted foot silently leaves the floor.
 */
export const STRIDE = { reach: 34, lift: 12, stance: .62 };
/** Standing hip height and the length of each of the two leg segments. Total leg exceeds the
 *  hip height on purpose, so knees stay bent in a fighting crouch and the stride can open up. */
export const RIG = { hip: 57, leg: 36 };

/**
 * One foot through a walk cycle. Planted feet slide backward under the hip at a constant
 * rate, which is what reads as ground contact; the swing leg then lifts and eases forward.
 */
export function step(cycle: number): Point {
    const p = ((cycle % 1) + 1) % 1;
    if (p < STRIDE.stance) return [STRIDE.reach * (1 - 2 * (p / STRIDE.stance)), 0];
    const t = (p - STRIDE.stance) / (1 - STRIDE.stance);
    const ease = t * t * (3 - 2 * t);
    return [STRIDE.reach * (2 * ease - 1), -Math.sin(Math.PI * t) * STRIDE.lift];
}

type Point = [number, number];
type Pose = { hipX: number; hipY: number; lean: number; frontX: number; frontY: number; backX: number; backY: number; frontFootX: number; frontFootY: number; backFootX: number; backFootY: number; kick: number };

/** Drawn size of a fighter. Stride cadence needs this too, since it scales the step length. */
export const figureScale = (f: Fighter) => (f.fatty ? 1.35 : 1) * B.figureScale;

/** Reference ready pose: open arms below the shoulders and a wide, bent-knee base. */
const GUARD = { frontX: 31, frontY: -77, backX: -24, backY: -79, frontFootX: 24, backFootX: -26 };

export class StickFigure {
    g: Phaser.GameObjects.Graphics;
    parts: { x: number; y: number; length: number; width: number; angle: number }[] = [];
    debris?: { x: number; y: number; length: number; width: number; angle: number; vx: number; vy: number; spin: number }[];
    pose: Pose = { hipX: 0, hipY: -RIG.hip, lean: 5, ...GUARD, frontFootY: 0, backFootY: 0, kick: 0 };
    constructor(scene: Phaser.Scene) { this.g = scene.add.graphics(); }

    draw(f: Fighter) {
        const g = this.g;
        g.clear().setDepth(f.player ? 610 : f.held ? 620 : 600);
        const scale = figureScale(f);
        const alpha = f.dead ? Math.max(0, 1 - Math.max(0, f.deathTime - 1.4) / 1.2) : 1;
        const bodyColor = f.player ? 0x000000 : 0x791f2a;
        if (f.dead && !f.player) {
            // Split the last visible pose into its actual head, torso, and limb segments.
            this.debris ??= this.parts.map((part, i) => ({ ...part,
                vx: f.vx * .35 + Math.cos(i * 2.4) * (100 + i * 8),
                vy: -140 - (i % 4) * 55, spin: (i % 2 ? 1 : -1) * (3 + i % 5) }));
            const t = f.deathTime;
            for (const part of this.debris) {
                const floor = f.y - part.width / 2;
                const fall = Math.max(0, floor - part.y);
                const land = (-part.vy + Math.sqrt(part.vy ** 2 + 1800 * fall)) / 900;
                const after = Math.max(0, t - land);
                const bounce = Math.min(120, (part.vy + 900 * land) * .22);
                const y = t < land ? part.y + part.vy * t + 450 * t * t
                    : floor + Math.min(0, -bounce * after + 450 * after * after);
                const x = part.x + part.vx * (t < land ? t : land + (1 - Math.exp(-5 * after)) / 5);
                const angle = part.angle + part.spin * Math.min(t, land + bounce / 450);
                const dx = Math.cos(angle) * part.length / 2, dy = Math.sin(angle) * part.length / 2;
                const cy = Math.min(y, floor - Math.abs(dy));
                const fade = Math.max(0, Math.min(1, (2.6 - t) / .8));
                g.lineStyle(part.width, bodyColor, fade).lineBetween(x - dx, cy - dy, x + dx, cy + dy);
                g.fillStyle(bodyColor, fade).fillCircle(x - dx, cy - dy, part.width / 2).fillCircle(x + dx, cy + dy, part.width / 2);
            }
            return;
        }
        this.parts = [];
        const air = f.z > 5;
        const run = f.moving && !air && !f.attack;
        const cycle = f.phase / (Math.PI * 2);
        const front = run ? step(cycle) : [GUARD.frontFootX, 0] as Point;
        const back = run ? step(cycle + .5) : [GUARD.backFootX, 0] as Point;
        const target: Pose = {
            hipX: 0,
            // Hips sit lowest through double support and rise over mid-stance, so twice per cycle.
            hipY: -RIG.hip + (run ? -2 + 2 * Math.cos(2 * f.phase) : 3 + Math.sin(f.phase) * 1.2),
            lean: run ? 6 : 8, ...GUARD,
            frontFootX: front[0], frontFootY: front[1],
            backFootX: back[0], backFootY: back[1],
            kick: 0,
        };
        if (run) {
            // Hands hang near the hips and oppose their matching leg's travel.
            // Use the foot cycle so arm motion stays synchronized with planted steps.
            const swing = front[0] / STRIDE.reach;
            target.frontX = 7 - swing * 18;
            target.backX = 3 + swing * 18;
            target.frontY = -53 - Math.max(0, -swing) * 7;
            target.backY = -55 - Math.max(0, swing) * 7;
        }
        if (air) {
            target.lean = -7;
            target.frontX = -8; target.frontY = -75;
            target.backX = -22; target.backY = -88;
            target.frontFootX = 10; target.frontFootY = -39;
            target.backFootX = -25; target.backFootY = -15;
        }
        if (f.attack) {
            const t = f.attack.time / f.attack.duration;
            // Load the hips, accelerate through contact, then settle into guard.
            const power = t < .18 ? -.28 * Math.sin(t / .18 * Math.PI / 2)
                : t < .30 ? -.28 + 1.28 * Phaser.Math.Easing.Cubic.Out((t - .18) / .12)
                : t < .43 ? 1
                : Math.pow(Math.max(0, 1 - (t - .43) / .57), 1.5);
            target.hipX = power * 9;
            target.lean = 5 + power * 15;
            target.frontX = 30 + power * 45;
            target.frontY = f.attack.step === 2 ? -77 : -94;
            target.backX = 6; target.backY = -84;
            if (f.attack.kind === 'upper') {
                target.frontX = 29 + power * 10;
                target.frontY = -82 - power * 63;
                target.lean = 5 - power * 8;
                target.hipY -= power * 6;
            } else if (f.attack.kind === 'slam') {
                target.frontX = 25 + power * 28;
                target.frontY = -139 + power * 91;
                target.backX = 10 + power * 25;
                target.backY = -125 + power * 62;
                target.lean = 8 + power * 23;
            }
            if (f.attack.limb === 'foot') {
                target.kick = power;
                target.frontX = 22; target.frontY = -84;
                target.backX = 2; target.backY = -79;
                target.lean = -power * 12;
                target.hipX = power * 12;
                if (air) { target.lean = -12 - power * 12; target.backX = -22; target.backY = -91; }
            } else if (f.attack.step === 2 && f.attack.kind === 'light') {
                // Alternate the striking arm for a readable jab / cross sequence.
                target.backX = target.frontX; target.backY = target.frontY;
                target.frontX = 20; target.frontY = -88;
            }
        }
        if (f.telegraph > 0) { target.frontX = -19; target.frontY = -96; target.lean = -9; }
        if (f.stun > 0) {
            target.kick = 0;
            target.frontFootX = GUARD.frontFootX; target.frontFootY = 0;
            target.backFootX = GUARD.backFootX; target.backFootY = 0;
            target.hipY = -47;
            target.lean = f.hurtStyle === 0 ? -23 : 22;
            target.frontX = f.hurtStyle === 0 ? 13 : 24;
            target.frontY = f.hurtStyle === 0 ? -106 : -62;
            target.backX = f.hurtStyle === 0 ? -19 : 12;
            target.backY = f.hurtStyle === 0 ? -89 : -66;
        }
        if (f.dead) {
            target.hipY = -52; target.lean = -7; target.hipX = 0;
            target.frontX = 27; target.frontY = -65;
            target.backX = -23; target.backY = -74;
            target.frontFootX = 24; target.frontFootY = 0;
            target.backFootX = -26; target.backFootY = 0;
            target.kick = 0;
        }
        if (f.held) { target.frontX = 28; target.frontY = -108; target.backX = -24; target.backY = -97; }
        if (f.attack?.kind === 'spin') {
            target.kick = 1; target.lean = -14;
            target.frontX = 24; target.frontY = -83;
            target.backX = -25; target.backY = -78;
            target.backFootX = -20; target.backFootY = -28;
        }
        if (f.attack?.kind === 'grab') {
            const tossing = f.attack.time / f.attack.duration > .3;
            target.frontX = tossing ? 45 : 30; target.frontY = tossing ? -55 : -133;
            target.backX = tossing ? 30 : 12; target.backY = tossing ? -65 : -125;
            target.lean = tossing ? 25 : -12;
        }
        const blend = f.hurtHold > 0 ? 1 : 1 - Math.exp(-38 * Math.min(g.scene.game.loop.delta / 1000, .05));
        for (const key of Object.keys(target) as (keyof Pose)[]) this.pose[key] += (target[key] - this.pose[key]) * blend;
        const p = this.pose;
        const spinning = f.attack?.kind === 'spin';
        const tumbling = f.dead || f.projectile > 0 || spinning;
        const angle = spinning ? f.face * Math.PI * 2 * (f.attack!.time / f.attack!.duration) : tumbling ? f.angle : 0;
        // Tumble around the body's center, not the feet. Keep grounded bodies above the floor.
        const centerY = f.y - f.z - (tumbling ? (f.dead ? 30 + 32 * Math.abs(Math.cos(angle)) : 60) * scale : 0);
        const transform = ([x, y]: Point): Point => {
            x *= f.face * scale;
            y = (y + (tumbling ? 60 : 0)) * scale;
            return [f.x + x * Math.cos(angle) - y * Math.sin(angle), centerY + x * Math.sin(angle) + y * Math.cos(angle)];
        };
        const stroke = (a: Point, b: Point, width = FIGURE.limb, color = bodyColor) => {
            const start = transform(a), end = transform(b);
            const radius = width * scale / 2;
            this.parts.push({ x: (start[0] + end[0]) / 2, y: (start[1] + end[1]) / 2,
                length: Math.hypot(end[0] - start[0], end[1] - start[1]), width: radius * 2,
                angle: Math.atan2(end[1] - start[1], end[0] - start[0]) });
            // Layered translucent silhouettes provide a soft directional blur in Canvas and WebGL.
            if (f.charge > .08) {
                for (let i = 3; i >= 1; i--) {
                    const offset = -f.face * i * 15 * f.charge;
                    g.lineStyle(radius * 2 + i * 3, color, alpha * f.charge * .045)
                        .lineBetween(start[0] + offset, start[1], end[0] + offset, end[1]);
                }
            }
            g.lineStyle(radius * 2, color, alpha).lineBetween(...start, ...end);
            g.fillStyle(color, alpha).fillCircle(...start, radius).fillCircle(...end, radius);
        };
        const limb = (root: Point, end: Point, length: number, bend: number, width = FIGURE.limb, cap = 1) => {
            const dx = end[0] - root[0], dy = end[1] - root[1];
            const distance = Math.max(.01, Math.hypot(dx, dy));
            const reach = Math.min(distance, length * 2 - .01);
            const tip: Point = [root[0] + dx / distance * reach, root[1] + dy / distance * reach];
            const height = Math.sqrt(Math.max(0, length * length - reach * reach / 4));
            const joint: Point = [(root[0] + tip[0]) / 2 - dy / distance * height * bend, (root[1] + tip[1]) / 2 + dx / distance * height * bend];
            stroke(root, joint, width); stroke(joint, tip, width);
            // A wider cap at the tip reads as a fist rather than a tapering line.
            if (cap > 1) g.fillStyle(bodyColor, alpha).fillCircle(...transform(tip), width * scale / 2 * cap);
        };
        g.fillStyle(0x171717, .09 * alpha).fillEllipse(f.x, f.y + 3, (f.fatty ? 72 : 50) * Math.max(.35, 1 - f.z / 650), 7);
        const hip: Point = [p.hipX, p.hipY];
        const chest: Point = [p.hipX + p.lean, p.hipY - 37];
        const frontFoot: Point = [p.frontFootX, p.frontFootY];
        const backFoot: Point = [p.backFootX, p.backFootY];
        frontFoot[0] += p.kick * 47; frontFoot[1] -= p.kick * 65;
        if (air && f.attack?.limb === 'foot' && f.attack.kind === 'slam') {
            frontFoot[0] = 10 + p.kick * 50;
            frontFoot[1] = -39 + p.kick * 32;
            backFoot[0] = -27; backFoot[1] = -31;
        }
        if (f.attack?.limb === 'foot' && f.attack.kind === 'upper') frontFoot[1] -= p.kick * 35;
        const weight = f.fatty ? FIGURE.fattyLimb : FIGURE.limb;
        // A lifted foot points its toe down, the way a swing leg does.
        const foot = (ankle: Point) => {
            const toe = Math.min(1, Math.max(0, -ankle[1] / STRIDE.lift));
            stroke(ankle, [ankle[0] + FIGURE.foot * (1 - .35 * toe), ankle[1] - 3 + FIGURE.foot * .7 * toe], FIGURE.footWidth);
        };
        limb(hip, backFoot, RIG.leg, -1, weight);
        foot(backFoot);
        limb(chest, [p.backX, p.backY], 25, 1, weight, FIGURE.fist);
        stroke(hip, chest, f.fatty ? FIGURE.fattyTorso : FIGURE.torso);
        if (f.fatty) {
            stroke([hip[0] - 7, hip[1] - 4], [chest[0] - 8, chest[1] + 7], 24);
            stroke([chest[0] - 11, chest[1] + 9], [chest[0] + 11, chest[1] + 9], 6);
        }
        limb(hip, frontFoot, RIG.leg, -1, weight);
        foot(frontFoot);
        limb(chest, [p.frontX, p.frontY], 27, 1, weight, FIGURE.fist);
        // No neck: the head circle overlaps the shoulder mass, as in the reference.
        const head = transform([chest[0] + 3, chest[1] - FIGURE.headDrop]);
        if (f.charge > .08) {
            for (let i = 3; i >= 1; i--) {
                g.fillStyle(0x111111, alpha * f.charge * .04).fillCircle(head[0] - f.face * i * 15 * f.charge, head[1], (FIGURE.head + i) * scale);
            }
            for (let i = 0; i < 4; i++) {
                const x = f.x - f.face * (35 + i * 9), y = f.y - f.z - 30 - i * 22;
                g.lineStyle(2, 0x999990, f.charge * .2).lineBetween(x, y, x - f.face * (32 + i * 7) * f.charge, y);
            }
        }
        g.fillStyle(bodyColor, alpha).fillCircle(...head, FIGURE.head * scale);
        this.parts.push({ x: head[0], y: head[1], length: 0, width: FIGURE.head * scale * 2, angle: 0 });
        if (f.telegraph > 0) {
            const y = f.y - f.z - 140 * scale;
            g.fillStyle(0xb73232, .8).fillTriangle(f.x - 4, y, f.x + 4, y, f.x, y + 8);
        }
    }
    destroy() { this.g.destroy(); }
}
