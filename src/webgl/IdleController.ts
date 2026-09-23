export interface PointerInput {
  cursorUV: [number, number]; // [0..1, 0..1] with (0,0) at bottom-left
  force: [number, number];
  pace: number;
}

interface BezierCurve {
  p0: [number, number];
  p1: [number, number];
  p2: [number, number];
  p3: [number, number];
}

export class IdleController {
  private lastRealActivityTime = performance.now();
  private isUserActive = false;

  // Real mouse state
  private realCurrentNDC: [number, number] | null = null;
  private realPreviousNDC: [number, number] | null = null;
  private smoothedPace = 0.0;

  // Autonomous pass state
  private isAutonomousActive = false;
  private autonomousStartTime = 0;
  private autonomousDuration = 2500;
  private currentCurve: BezierCurve | null = null;
  private autoPreviousNDC: [number, number] | null = null;
  private nextPassDelay = 4000; // initial 4 seconds of idle

  constructor() {}

  public onMouseMove(clientX: number, clientY: number, width: number, height: number) {
    this.lastRealActivityTime = performance.now();
    this.isUserActive = true;

    // Immediately cancel any autonomous pass
    if (this.isAutonomousActive) {
      this.isAutonomousActive = false;
      this.autoPreviousNDC = null;
    }

    // Standard NDC calculation
    const ndcX = (2.0 * clientX) / width - 1.0;
    const ndcY = 1.0 - (2.0 * clientY) / height;

    if (this.realPreviousNDC === null) {
      // First input: prevent screen-wide impulse spike
      this.realPreviousNDC = [ndcX, ndcY];
    }
    this.realCurrentNDC = [ndcX, ndcY];
  }

  public onMouseLeave() {
    this.isUserActive = false;
    this.realPreviousNDC = null;
    this.realCurrentNDC = null;
    this.lastRealActivityTime = performance.now();
  }

  public resetInput() {
    this.realPreviousNDC = null;
    this.realCurrentNDC = null;
    this.autoPreviousNDC = null;
    this.isAutonomousActive = false;
  }

  private getCubicBezier(t: number, b: BezierCurve): [number, number] {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    const x = uuu * b.p0[0] + 3 * uu * t * b.p1[0] + 3 * u * tt * b.p2[0] + ttt * b.p3[0];
    const y = uuu * b.p0[1] + 3 * uu * t * b.p1[1] + 3 * u * tt * b.p2[1] + ttt * b.p3[1];
    return [x, y];
  }

  private generateNewCurve(): BezierCurve {
    // Generate organic trajectory across screen, crossing center/logo
    const side = Math.random();
    let p0: [number, number];
    let p3: [number, number];

    if (side < 0.35) {
      // Left to right
      p0 = [-1.15, (Math.random() - 0.5) * 0.8];
      p3 = [1.15, (Math.random() - 0.5) * 0.8];
    } else if (side < 0.7) {
      // Right to left
      p0 = [1.15, (Math.random() - 0.5) * 0.8];
      p3 = [-1.15, (Math.random() - 0.5) * 0.8];
    } else {
      // Diagonal top to bottom
      p0 = [(Math.random() - 0.5) * 1.2, 1.15];
      p3 = [(Math.random() - 0.5) * 1.2, -1.15];
    }

    // Near center where logo is
    const cx = (Math.random() - 0.5) * 0.35;
    const cy = (Math.random() - 0.5) * 0.25;

    const p1: [number, number] = [
      p0[0] + (cx - p0[0]) * 0.7 + (Math.random() - 0.5) * 0.3,
      p0[1] + (cy - p0[1]) * 0.7 + (Math.random() - 0.5) * 0.3,
    ];
    const p2: [number, number] = [
      cx + (p3[0] - cx) * 0.4 + (Math.random() - 0.5) * 0.3,
      cy + (p3[1] - cy) * 0.4 + (Math.random() - 0.5) * 0.3,
    ];

    return { p0, p1, p2, p3 };
  }

  public update(now: number, mouseForce: number): {
    splat: { cursorUV: [number, number]; force: [number, number] } | null;
    mouseNDC: [number, number];
    mousePace: number;
  } {
    // 1. Check Real User Mouse
    if (this.isUserActive && this.realCurrentNDC && this.realPreviousNDC) {
      const deltaX = this.realCurrentNDC[0] - this.realPreviousNDC[0];
      const deltaY = this.realCurrentNDC[1] - this.realPreviousNDC[1];
      const dist = Math.hypot(deltaX, deltaY);

      // Smooth pace: normalized cursor speed clamped to avoid spikes
      // mousePace in reference is 4.0 * speed, smoothed & clamped
      const rawPace = Math.min(dist * 20.0, 1.5);
      this.smoothedPace += (rawPace - this.smoothedPace) * 0.15;

      const cursorUV: [number, number] = [
        this.realCurrentNDC[0] * 0.5 + 0.5,
        this.realCurrentNDC[1] * 0.5 + 0.5,
      ];

      // force = delta * 0.5 * mouse_force
      const force: [number, number] = [
        deltaX * 0.5 * mouseForce,
        deltaY * 0.5 * mouseForce,
      ];

      // Update previous
      this.realPreviousNDC = [this.realCurrentNDC[0], this.realCurrentNDC[1]];

      return {
        splat: { cursorUV, force },
        mouseNDC: this.realCurrentNDC,
        mousePace: this.smoothedPace,
      };
    }

    // Decay smoothed pace when mouse is still or absent
    this.smoothedPace += (0.0 - this.smoothedPace) * 0.05;

    // 2. Check Autonomous Pass
    const idleElapsed = now - this.lastRealActivityTime;

    if (!this.isAutonomousActive) {
      if (idleElapsed >= this.nextPassDelay) {
        // Trigger autonomous pass
        this.isAutonomousActive = true;
        this.autonomousStartTime = now;
        this.autonomousDuration = 2000 + Math.random() * 1000; // 2 - 3 seconds
        this.currentCurve = this.generateNewCurve();
        this.autoPreviousNDC = null;
      }
    }

    if (this.isAutonomousActive && this.currentCurve) {
      const progress = (now - this.autonomousStartTime) / this.autonomousDuration;

      if (progress >= 1.0) {
        // Pass completed: set pause between 5 and 9 seconds
        this.isAutonomousActive = false;
        this.currentCurve = null;
        this.autoPreviousNDC = null;
        this.lastRealActivityTime = now;
        this.nextPassDelay = 5000 + Math.random() * 4000; // 5 - 9 seconds
      } else {
        // Smoothstep progress for organic easing
        const t = progress * progress * (3.0 - 2.0 * progress);
        const currentNDC = this.getCubicBezier(t, this.currentCurve);

        if (this.autoPreviousNDC === null) {
          this.autoPreviousNDC = currentNDC;
        }

        const deltaX = currentNDC[0] - this.autoPreviousNDC[0];
        const deltaY = currentNDC[1] - this.autoPreviousNDC[1];

        const cursorUV: [number, number] = [
          currentNDC[0] * 0.5 + 0.5,
          currentNDC[1] * 0.5 + 0.5,
        ];

        const force: [number, number] = [
          deltaX * 0.5 * mouseForce,
          deltaY * 0.5 * mouseForce,
        ];

        this.autoPreviousNDC = currentNDC;

        return {
          splat: { cursorUV, force },
          mouseNDC: currentNDC,
          mousePace: 0.6,
        };
      }
    }

    // Default neutral state
    return {
      splat: null,
      mouseNDC: [0, 0],
      mousePace: this.smoothedPace,
    };
  }
}
