export class Sound {
    context?: AudioContext;
    muted = false;
    play(heavy = false) { if (this.muted)
        return; try {
        this.context ??= new AudioContext();
        void this.context.resume();
        const c = this.context, o = c.createOscillator(), v = c.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(heavy ? 95 : 180, c.currentTime);
        o.frequency.exponentialRampToValueAtTime(30, c.currentTime + .12);
        v.gain.setValueAtTime(heavy ? .15 : .08, c.currentTime);
        v.gain.exponentialRampToValueAtTime(.001, c.currentTime + .14);
        o.connect(v);
        v.connect(c.destination);
        o.start();
        o.stop(c.currentTime + .15);
    }
    catch { /* Audio is optional. */ } }
}
