import Phaser from 'phaser';
import { B, REACH, difficulty, killValue } from './balance';
import { Fighter } from './Fighter';
import { StickFigure } from './StickFigure';
import { Input, type Action } from './Input';
import { Sound } from './Sound';
import { Hallway } from './Hallway';
import { Stamina, SPRINT } from './Stamina';
export class Arena extends Phaser.Scene {
    player!: Fighter;
    fighters: Fighter[] = [];
    views = new Map<Fighter, StickFigure>();
    controls!: Input;
    sfx = new Sound();
    elapsed = 0;
    score = 0;
    kills = 0;
    fattys = 0;
    combo = 0;
    best = 0;
    comboClock = 0;
    spawnClock = 0;
    fattyClock = B.firstFatty;
    freeze = 0;
    chain = 0;
    chainClock = 0;
    started = false;
    over = false;
    paused = false;
    held?: Fighter;
    buffer?: Action;
    bufferTime = 0;
    lastKill = -10;
    hud!: Phaser.GameObjects.Text;
    stats!: Phaser.GameObjects.Text;
    comboText!: Phaser.GameObjects.Text;
    notice!: Phaser.GameObjects.Text;
    health!: Phaser.GameObjects.Graphics;
    stamina = new Stamina();
    staminaBar!: Phaser.GameObjects.Graphics;
    staminaLabel!: Phaser.GameObjects.Text;
    overlay!: Phaser.GameObjects.Container;
    hallway!: Hallway;
    constructor() { super('Arena'); }
    label(x: number, y: number, text: string, size = 14, color = '#171717') { return this.add.text(x, y, text, { fontFamily: 'Arial, sans-serif', fontSize: size, color, letterSpacing: 2 }).setScrollFactor(0).setDepth(9500); }
    create() {
        this.fighters = [];
        this.views = new Map();
        this.elapsed = 0;
        this.score = 0;
        this.kills = 0;
        this.fattys = 0;
        this.combo = 0;
        this.best = 0;
        this.comboClock = 0;
        this.spawnClock = 0;
        this.fattyClock = B.firstFatty;
        this.freeze = 0;
        this.chain = 0;
        this.chainClock = 0;
        this.over = false;
        this.paused = false;
        this.held = undefined;
        this.buffer = undefined;
        this.lastKill = -10;
        this.stamina = new Stamina();
        this.controls = new Input(this);
        this.cameras.main.setScroll((B.arenaWidth - B.view) / 2, 0);
        this.hallway = new Hallway(this);
        const g = this.add.graphics().setScrollFactor(0);
        g.lineStyle(1, 0xd8d8d3);
        g.lineBetween(48, 155, 1232, 155);
        g.lineBetween(48, 702, 1232, 702);
        this.label(48, 29, 'SFC / 001', 12, '#777772');
        this.label(48, 53, 'STICK FIGHT CLUB', 31).setFontStyle('bold');
        this.label(48, 100, 'NO FINISH LINE. JUST ONE MORE FIGHT.', 11, '#82827b');
        this.hud = this.label(870, 48, '', 28).setOrigin(1, 0);
        this.stats = this.label(1232, 50, '', 16).setOrigin(1, 0);
        this.label(48, 178, 'VITALS', 10, '#777772');
        this.health = this.add.graphics().setScrollFactor(0).setDepth(9500);
        this.staminaLabel = this.label(300, 178, 'STAMINA  100%', 10, '#777772');
        this.staminaBar = this.add.graphics().setScrollFactor(0).setDepth(9500);
        this.comboText = this.label(1232, 181, '', 25).setOrigin(1, 0);
        this.notice = this.label(640, 268, '', 18, '#a32c2c').setOrigin(.5);
        this.label(48, 728, '← / →   MOVE      A   PUNCH      S   KICK      D   LAUNCH KICK      W   DODGE', 12);
        this.label(48, 756, 'CTRL   RUN      SPACE   JUMP      ↑ + A   UPPERCUT      ↓ + S   SLAM      ESC   PAUSE', 11, '#85857f');
        this.label(1232, 753, 'SURVIVE. IMPROVISE. REPEAT.', 10, '#85857f').setOrigin(1, 0);
        this.player = this.addFighter(new Fighter(B.arenaWidth / 2, B.floor, true));
        this.spawn();
        this.spawnClock = 1.2;
        this.overlay = this.add.container(0, 0).setDepth(10000).setScrollFactor(0);
        if (!this.started)
            this.showOverlay('MAKE A LITTLE CHAOS.', 'Arrows to move. A punches. S kicks.\nD launches. Space follows. A / S attack in midair.', 'ENTER / CLICK TO FIGHT');
        this.input.on('pointerdown', () => { if (!this.started) {
            this.started = true;
            this.overlay.removeAll(true);
            this.sfx.play();
        }
        else if (this.over)
            this.scene.restart(); });
        this.game.events.on('blur', this.onBlur, this);
        this.events.once('shutdown', () => this.game.events.off('blur', this.onBlur, this));
        this.refreshHUD();
    }
    onBlur() { if (this.started && !this.over && !this.paused)
        this.togglePause(); }
    showOverlay(title: string, body: string, button: string) { this.overlay.removeAll(true); const bg = this.add.rectangle(640, 430, 900, 330, 0xfafaf8, .97); const t = this.label(640, 335, title, 36).setOrigin(.5).setFontStyle('bold'); const b = this.label(640, 421, body, 16, '#666660').setOrigin(.5).setAlign('center').setLineSpacing(12); const c = this.label(640, 528, button, 14).setOrigin(.5); this.overlay.add([bg, t, b, c]); }
    togglePause() { this.paused = !this.paused; if (this.paused)
        this.showOverlay('TAKE A BREATH.', 'The fight can wait.', 'ESC TO RESUME');
    else
        this.overlay.removeAll(true); }
    addFighter(f: Fighter) { this.fighters.push(f); this.views.set(f, new StickFigure(this)); return f; }
    // Walk in from just beyond the view so fights start in seconds, falling back to the far
    // side when the player is pinned against a wall and the near side is out of bounds.
    spawn(fatty = false) { const cameraX = this.cameras.main.scrollX; const edge = 70; const leftX = cameraX - edge, rightX = cameraX + B.view + edge; const leftOk = leftX > edge, rightOk = rightX < B.arenaWidth - edge; const left = leftOk && rightOk ? Math.random() < .5 : leftOk; const x = Phaser.Math.Clamp(left ? leftX : rightX, edge, B.arenaWidth - edge); const f = this.addFighter(new Fighter(x, B.floor, false, fatty)); f.cooldown = .8 + Math.random(); if (fatty) {
        f.z = 180;
        this.announce('HEAVY COMPANY  /  FATTY • KILL FOR +12 HP');
        this.cameras.main.shake(180, .003);
        this.sfx.play(true);
    } }
    announce(text: string) { this.notice.setText(text).setAlpha(1); this.tweens.killTweensOf(this.notice); this.tweens.add({ targets: this.notice, alpha: 0, delay: 1250, duration: 450 }); }
    update(_time: number, delta: number) {
        if (this.controls.pressed('M')) {
            this.sfx.muted = !this.sfx.muted;
            this.announce(this.sfx.muted ? 'SOUND OFF' : 'SOUND ON');
        }
        if (this.controls.pressed('ENTER')) {
            if (this.over) {
                this.scene.restart();
                return;
            }
            if (!this.started) {
                this.started = true;
                this.overlay.removeAll(true);
            }
        }
        if (this.controls.pressed('ESC') && this.started && !this.over)
            this.togglePause();
        let dt = Math.min(delta / 1000, .033);
        if (!this.started || this.over || this.paused) {
            this.render();
            return;
        }
        if (this.freeze > 0) {
            this.freeze -= dt;
            this.render();
            return;
        }
        this.elapsed += dt;
        this.comboClock -= dt;
        if (this.comboClock <= 0)
            this.combo = 0;
        this.chainClock -= dt;
        if (this.chainClock <= 0)
            this.chain = 0;
        const p = this.player, axis = this.controls.axis();
        p.moving = false;
        const action = this.controls.action();
        if (action) {
            this.buffer = action;
            this.bufferTime = .24;
        }
        this.bufferTime -= dt;
        if (p.stun <= 0) {
            if (axis.x)
                p.face = axis.x;
            if (this.controls.pressed('SPACE') && p.z === 0)
                p.vz = B.jump;
            if (this.controls.pressed('W') && p.cooldown <= 0) {
                p.vx = (axis.x || p.face) * 780;
                p.invulnerable = .3;
                p.cooldown = .65;
            }
            if (this.buffer && this.bufferTime > 0 && (!p.attack || p.attack.time > p.attack.duration * .65)) {
                this.act(this.buffer);
                this.buffer = undefined;
            }
        }
        const canMove = p.stun <= 0 && !p.attack && p.invulnerable < .12;
        this.stamina.update(dt, this.controls.running() && !!axis.x && canMove && p.z === 0);
        if (canMove) {
            p.x += axis.x * (this.stamina.running ? SPRINT.speed : B.playerSpeed) * dt;
            p.moving = !!axis.x;
        }
        for (const f of this.fighters) {
            f.cooldown -= dt;
            f.stun -= dt;
            f.invulnerable -= dt;
            f.projectile -= dt;
            f.phase += dt * (f.moving ? 14 : 3);
            if (f.dead) {
                f.deathTime += dt;
            }
            else if (!f.player && !f.held)
                this.ai(f, dt);
            if (f.attack) {
                f.attack.time += dt;
                if (!f.attack.hit && f.attack.time >= f.attack.duration * .3) {
                    f.attack.hit = true;
                    this.attackHits(f);
                }
                if (f.attack.time >= f.attack.duration)
                    f.attack = undefined;
            }
            if (!f.held)
                this.integrate(f, dt);
        }
        // Clamped here rather than in integrate so knockback still carries free bodies past the edges.
        p.x = Phaser.Math.Clamp(p.x, 40, B.arenaWidth - 40);
        if (this.held) {
            this.held.x = p.x + p.face * REACH.hold;
            this.held.y = p.y;
            this.held.z = p.z + REACH.holdZ;
        }
        this.bodyCollisions();
        for (const f of [...this.fighters])
            if (f.dead && f.deathTime > 2.6)
                this.remove(f);
        const bodies = this.fighters.filter(f => f.dead);
        while (bodies.length > B.maxBodies)
            this.remove(bodies.shift()!);
        const d = difficulty(this.elapsed);
        this.spawnClock -= dt;
        this.fattyClock -= dt;
        if (this.spawnClock <= 0 && this.fighters.filter(f => !f.player && !f.dead).length < d.cap) {
            const fatty = this.fattyClock <= 0;
            this.spawn(fatty);
            if (fatty)
                this.fattyClock = B.fattyInterval;
            this.spawnClock = d.interval;
        }
        this.refreshHUD();
        this.render();
    }
    act(action: Action) {
        const p = this.player;
        if (action === 'launch') {
            p.attack = { kind: 'upper', time: 0, duration: .42, hit: false, step: 1, limb: 'foot', launcher: true };
            p.vx = p.face * 90;
            this.chain = 0;
            this.chainClock = 0;
            return;
        }
        this.chain = this.chainClock > 0 ? this.chain % 3 + 1 : 1;
        this.chainClock = .85;
        const a = this.controls.axis();
        const kind = action === 'light' ? (a.y < 0 ? 'upper' : 'light') : a.y > 0 || p.z > 20 ? 'slam' : a.y < 0 || this.chain === 3 ? 'upper' : 'heavy';
        p.attack = { kind, time: 0, duration: kind === 'light' ? .29 : .47, hit: false, step: this.chain, limb: action === 'light' ? 'hand' : 'foot' };
        p.vx = p.face * (kind === 'light' ? 110 : 180);
    }
    attackHits(f: Fighter) {
        const a = f.attack!;
        const heavy = a.kind !== 'light';
        for (const target of this.fighters) {
            if (target === f || target.dead || target.held || target.player === f.player)
                continue;
            const dx = target.x - f.x;
            if (Math.abs(dx) > (heavy ? REACH.heavy : REACH.light) || dx * f.face < -REACH.behind || Math.abs(target.y - f.y) > REACH.vertical || Math.abs(target.z - f.z) > REACH.air)
                continue;
            const damage = f.player ? (a.launcher ? 20 : heavy ? 36 : 18) : (f.fatty ? 18 : 8);
            const groundedFatty = target.fatty && a.limb === 'foot';
            const regular = a.kind === 'light' || a.kind === 'heavy';
            const recoil = (regular && target.z === 0) || groundedFatty;
            this.hit(target, damage, f.face * (recoil ? 80 : a.launcher ? 110 : heavy ? 610 : 175), recoil ? 0 : a.launcher ? 680 : a.kind === 'upper' ? 760 : a.kind === 'slam' ? -650 : heavy ? 260 : 80, heavy, f.player, recoil);
            if (groundedFatty) { target.z = 0; target.vz = 0; target.projectile = 0; }
            if (f.player && a.kind === 'slam' && !groundedFatty) {
                target.z = Math.max(target.z, 30);
                this.announce('GROUND SLAM');
                this.score += 25;
            }
        }
    }
    hit(f: Fighter, damage: number, vx: number, vz: number, heavy: boolean, credit: boolean, recoil = false) {
        if (f.invulnerable > 0 || f.dead)
            return;
        f.hp -= damage;
        f.stun = heavy ? .65 : .26;
        f.attack = undefined;
        f.telegraph = 0;
        f.hurtHold = recoil ? .11 : 0;
        f.hurtStyle = (f.hurtStyle + 1) % 2;
        f.fallDirection = Math.sign(vx) || 1;
        f.vx = vx * (f.fatty && !heavy ? .35 : 1);
        f.vz = vz;
        f.z = recoil ? f.z : Math.max(2, f.z);
        f.invulnerable = f.player ? .48 : .09;
        if (recoil) { f.projectile = 0; f.spin = 0; f.angle = 0; }
        if (heavy && !f.player && !recoil) {
            f.projectile = 1;
            f.hitTargets.clear();
            f.spin = Math.sign(vx) * 7;
        }
        this.sfx.play(heavy);
        this.freeze = heavy ? .045 : .018;
        this.cameras.main.shake(heavy ? 100 : 50, heavy ? .003 : .001);
        this.impact(f.x, f.y - f.z - REACH.impactY, heavy);
        if (credit) {
            this.combo++;
            this.best = Math.max(this.best, this.combo);
            this.comboClock = B.comboTimeout;
            this.score += 10;
            if (f.z > 90) {
                this.score += 20;
                this.announce('AIR JUGGLE');
            }
        }
        if (f.hp <= 0) {
            f.dead = true;
            f.deathTime = 0;
            f.hurtHold = 0;
            if (f.player) {
                this.over = true;
                if (this.held) {
                    this.held.held = false;
                    this.held = undefined;
                }
                this.showOverlay('THAT WAS A GOOD FIGHT.', `${Math.floor(this.score + this.elapsed)} SCORE     /     ${this.formatTime()} SURVIVED\n${this.kills} DEFEATED     /     ${this.best} BEST COMBO     /     ${this.fattys} FATTYS`, 'ENTER / CLICK TO GO AGAIN');
            }
            else {
                this.kills++;
                this.score += killValue(f.fatty, this.combo);
                if (this.elapsed - this.lastKill < .7) {
                    this.score += 100;
                    this.announce('MULTI KILL');
                }
                this.lastKill = this.elapsed;
                if (f.fatty) {
                    this.fattys++;
                    this.player.hp = Math.min(B.maxHP, this.player.hp + B.fattyHeal);
                    this.announce('FATTY DOWN  /  +12 HP');
                }
            }
        }
    }
    ai(f: Fighter, dt: number) {
        f.moving = false;
        if (f.stun > 0 || f.z > 5 || f.dead)
            return;
        const p = this.player, dx = p.x - f.x;
        f.face = dx >= 0 ? 1 : -1;
        if (f.telegraph > 0) {
            f.telegraph -= dt;
            if (f.telegraph <= 0) {
                f.attack = { kind: 'light', time: 0, duration: .38, hit: false, step: 1 };
                f.cooldown = 1 + Math.random() * 1.2;
            }
            return;
        }
        if (f.attack)
            return;
        if (Math.abs(dx) < REACH.aiAttack && f.cooldown <= 0 && p.z < 90) {
            f.telegraph = f.fatty ? .65 : .42;
            return;
        }
        if (Math.abs(dx) > REACH.aiStop) {
            const speed = difficulty(this.elapsed).speed * (f.fatty ? .68 : 1);
            f.x += Math.sign(dx) * speed * dt;
            f.moving = true;
        }
        for (const other of this.fighters)
            if (other !== f && !other.dead && !other.player && other.z < 5 && Math.abs(f.x - other.x) < REACH.aiSpread)
                f.x += (f.x >= other.x ? 1 : -1) * REACH.aiSpread * dt;
    }
    integrate(f: Fighter, dt: number) {
        if (f.hurtHold > 0 && !f.dead) { f.hurtHold = Math.max(0, f.hurtHold - dt); return; }
        f.x += f.vx * dt;
        f.y = B.floor;
        f.vy = 0;
        f.z += f.vz * dt;
        if (f.z > 0 || f.vz > 0)
            f.vz -= B.gravity * dt;
        if (f.z <= 0) {
            f.z = 0;
            if (f.vz < -420) {
                f.vz = -f.vz * .32;
                f.vx *= .7;
                this.impact(f.x, f.y, false);
                if (f.projectile > 0 && !f.dead) {
                    this.score += 15;
                }
            }
            else {
                f.vz = 0;
                if (f.projectile <= 0 && !f.dead)
                    f.angle = 0;
            }
        }
        const drag = Math.exp(-(f.z > 0 ? 1.4 : 9) * dt);
        f.vx *= drag;
        f.vy *= drag;
        if (f.dead && f.z === 0) {
            f.spin = 0;
            f.angle += (f.fallDirection * Math.PI / 2 - f.angle) * (1 - Math.exp(-11 * dt));
        } else if (f.projectile > 0 || f.dead)
            f.angle += f.spin * dt;
        else
            f.angle *= Math.exp(-15 * dt);
    }
    bodyCollisions() { for (const f of this.fighters) {
        if (f.player || f.held || f.projectile <= 0 || Math.hypot(f.vx, f.vy) < 160)
            continue;
        for (const t of this.fighters) {
            if (t === f || t.player || t.dead || t.held || f.hitTargets.has(t))
                continue;
            if (Math.abs(t.x - f.x) < REACH.bodyX && Math.abs(t.y - f.y) < REACH.bodyY && Math.abs(t.z - f.z) < REACH.bodyZ) {
                f.hitTargets.add(t);
                this.hit(t, 25, f.vx * .7, 320, true, true);
                t.vy = f.vy * .65;
                t.hitTargets.add(f);
                this.score += 45;
                this.announce('ENEMY COLLISION');
            }
        }
    } }
    impact(x: number, y: number, heavy: boolean) { const g = this.add.graphics().setDepth(9000); g.lineStyle(heavy ? 3 : 2, 0x272727); for (let i = 0; i < 7; i++) {
        const a = i / 7 * Math.PI * 2;
        g.lineBetween(x + Math.cos(a) * 12, y + Math.sin(a) * 12, x + Math.cos(a) * (heavy ? 35 : 23), y + Math.sin(a) * (heavy ? 35 : 23));
    } this.tweens.add({ targets: g, alpha: 0, duration: 180, onComplete: () => g.destroy() }); }
    remove(f: Fighter) { this.views.get(f)?.destroy(); this.views.delete(f); this.fighters = this.fighters.filter(x => x !== f); }
    formatTime() { return `${Math.floor(this.elapsed / 60).toString().padStart(2, '0')}:${Math.floor(this.elapsed % 60).toString().padStart(2, '0')}`; }
    refreshHUD() { this.staminaLabel.setText(`STAMINA  ${Math.ceil(this.stamina.value)}%${this.stamina.exhausted ? " / REST" : ""}`); this.staminaBar.clear().fillStyle(0xe2e2dc).fillRect(300, 200, 180, 5).fillStyle(this.stamina.exhausted ? 0xaaaaa0 : 0x66665c).fillRect(300, 200, 180 * this.stamina.value / SPRINT.max, 5); this.hud.setText(`${Math.floor(this.score + this.elapsed).toString().padStart(6, '0')}\n`).setFontSize(28); this.stats.setText(`${this.formatTime()} SURVIVED\n${this.kills} DEFEATED`); this.health.clear().fillStyle(0xe2e2dc).fillRect(48, 200, 210, 5).fillStyle(0x202020).fillRect(48, 200, 210 * Math.max(0, this.player.hp) / 100, 5); this.comboText.setText(this.combo > 1 ? `${this.combo} HIT COMBO` : ''); }
    render() {
        const camera = this.cameras.main;
        if (this.started && !this.paused && !this.over) {
            const target = Phaser.Math.Clamp(this.player.x - B.view / 2 + this.player.face * 65, 0, B.arenaWidth - B.view);
            const blend = 1 - Math.exp(-5 * Math.min(this.game.loop.delta / 1000, .05));
            camera.scrollX += (target - camera.scrollX) * blend;
        }
        this.hallway.draw(camera.scrollX);
        const p = this.player;
        const towardOpponent = this.stamina.running && p.moving && p.stun <= 0 && !p.attack && !p.dead &&
            this.fighters.some(f => !f.player && !f.dead && (f.x - p.x) * p.face > 0 && Math.abs(f.x - p.x) < 700);
        if (!this.paused && !this.over) {
            const target = towardOpponent ? 1 : 0;
            p.charge += (target - p.charge) * (1 - Math.exp(-10 * Math.min(this.game.loop.delta / 1000, .05)));
        }
        for (const f of this.fighters) this.views.get(f)?.draw(f);
    }
}

