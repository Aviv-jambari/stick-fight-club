export const SPRINT = { max: 100, speed: 480, drain: 28, recovery: 22, delay: .65, resume: 20 };

export class Stamina {
    value = SPRINT.max;
    running = false;
    exhausted = false;
    private recoveryDelay = 0;

    update(dt: number, requested: boolean) {
        if (this.value >= SPRINT.resume) this.exhausted = false;
        this.running = requested && !this.exhausted && this.value > 0;
        if (this.running) {
            this.value = Math.max(0, this.value - SPRINT.drain * dt);
            this.recoveryDelay = SPRINT.delay;
            if (this.value === 0) { this.exhausted = true; this.running = false; }
        } else {
            const recovering = Math.max(0, dt - this.recoveryDelay);
            this.recoveryDelay = Math.max(0, this.recoveryDelay - dt);
            this.value = Math.min(SPRINT.max, this.value + SPRINT.recovery * recovering);
        }
    }
}
