export interface SplatInput {
  cursorUV: [number, number]; // [0..1, 0..1] with (0,0) at bottom-left
  force: [number, number];
}

export interface RenderSnapshot {
  mouseNDC: [number, number];
  mousePace: number;
}

interface BezierCurve {
  p0: [number, number];
  p1: [number, number];
  p2: [number, number];
  p3: [number, number];
}

export class IdleController {
  private lastRealActivityTime = performance.now();
  private mouseInsideWindow = false;
  private lastClientX = -9999;
  private lastClientY = -9999;

  // Real mouse state & accumulated impulse
  private realCurrentNDC: [number, number] | null = null;
  private pendingDeltaX = 0.0;
  private pendingDeltaY = 0.0;
  private smoothedPace = 0.0;

  // Autonomous pass state
  private isAutonomousActive = false;
  private autonomousStartTime = 0;
  private autonomousDuration = 2500;
  private currentCurve: BezierCurve | null = null;
  private autoCurrentNDC: [number, number] | null = null;
  private autoPreviousNDC: [number, number] | null = null;

  // Timings: 4s without real movement triggers autonomous pass, 5-9s between subsequent passes
  private readonly idleThreshold = 4000;
  private nextPassTime = 0;

  constructor() {}

  public onMouseMove(clientX: number, clientY: number, width: number, height: number) {
    const now = performance.now();
    const moveDist = Math.hypot(clientX - this.lastClientX, clientY - this.lastClientY);

    this.mouseInsideWindow = true;
    this.lastClientX = clientX;
    this.lastClientY = clientY;

    // Only count as active if cursor actually moved by at least 0.5px
    if (moveDist > 0.5) {
      this.lastRealActivityTime = now;

      // If an autonomous pass was currently running, stop autonomous splat injection immediately.
      // Existing fluid simulation is NOT cleared, allowing natural physical dissipation!
      if (this.isAutonomousActive) {
        this.isAutonomousActive = false;
        this.currentCurve = null;
        this.autoPreviousNDC = null;
        this.autoCurrentNDC = null;
      }
    }

    const ndcX = (2.0 * clientX) / width - 1.0;
    const ndcY = 1.0 - (2.0 * clientY) / height;

    if (this.realCurrentNDC !== null) {
      const dx = ndcX - this.realCurrentNDC[0];
      const dy = ndcY - this.realCurrentNDC[1];
      this.pendingDeltaX += dx;
      this.pendingDeltaY += dy;

      const dist = Math.hypot(dx, dy);
      const rawPace = Math.min(dist * 25.0, 1.5);
      this.smoothedPace += (rawPace - this.smoothedPace) * 0.2;
    } else {
      this.pendingDeltaX = 0.0;
      this.pendingDeltaY = 0.0;
    }

    this.realCurrentNDC = [ndcX, ndcY];
  }

  public onMouseLeave() {
    this.mouseInsideWindow = false;
    this.pendingDeltaX = 0.0;
    this.pendingDeltaY = 0.0;
    this.realCurrentNDC = null;
    this.lastRealActivityTime = performance.now();
  }

  public onTabVisibilityChange(hidden: boolean) {
    if (!hidden) {
      // Waking up: reset timers to prevent time jumps
      this.lastRealActivityTime = performance.now();
      this.pendingDeltaX = 0.0;
      this.pendingDeltaY = 0.0;
      if (this.isAutonomousActive) {
        this.isAutonomousActive = false;
        this.currentCurve = null;
        this.autoPreviousNDC = null;
        this.autoCurrentNDC = null;
      }
    }
  }

  public resetInput() {
    this.pendingDeltaX = 0.0;
    this.pendingDeltaY = 0.0;
    this.realCurrentNDC = null;
    this.autoPreviousNDC = null;
    this.autoCurrentNDC = null;
    this.isAutonomousActive = false;
    this.currentCurve = null;
    this.lastRealActivityTime = performance.now();
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
    const side = Math.random();
    let p0: [number, number];
    let p3: [number, number];

    if (side < 0.4) {
      // Left to right diagonal
      p0 = [-1.15, (Math.random() - 0.5) * 0.8];
      p3 = [1.15, (Math.random() - 0.5) * 0.8];
    } else if (side < 0.8) {
      // Right to left diagonal
      p0 = [1.15, (Math.random() - 0.5) * 0.8];
      p3 = [-1.15, (Math.random() - 0.5) * 0.8];
    } else {
      // Top to bottom curve
      p0 = [(Math.random() - 0.5) * 1.2, 1.15];
      p3 = [(Math.random() - 0.5) * 1.2, -1.15];
    }

    const cx = (Math.random() - 0.5) * 0.4;
    const cy = (Math.random() - 0.5) * 0.3;

    const p1: [number, number] = [
      p0[0] + (cx - p0[0]) * 0.7 + (Math.random() - 0.5) * 0.25,
      p0[1] + (cy - p0[1]) * 0.7 + (Math.random() - 0.5) * 0.25,
    ];
    const p2: [number, number] = [
      cx + (p3[0] - cx) * 0.4 + (Math.random() - 0.5) * 0.25,
      cy + (p3[1] - cy) * 0.4 + (Math.random() - 0.5) * 0.25,
    ];

    return { p0, p1, p2, p3 };
  }

  /**
   * Consumes input for physics simulation step.
   * Stationary mouse inside window for >= 4s is treated as idle!
   */
  public consumeSimulationStep(now: number, mouseForce: number): SplatInput | null {
    const idleElapsed = now - this.lastRealActivityTime;
    // A stationary mouse inside the window for >= 4 seconds is considered idle!
    const isUserActive = idleElapsed < this.idleThreshold;

    // 1. Real User Movement
    if (isUserActive && this.realCurrentNDC) {
      const dx = this.pendingDeltaX;
      const dy = this.pendingDeltaY;
      this.pendingDeltaX = 0.0;
      this.pendingDeltaY = 0.0;

      if (Math.hypot(dx, dy) > 0.0001) {
        const cursorUV: [number, number] = [
          this.realCurrentNDC[0] * 0.5 + 0.5,
          this.realCurrentNDC[1] * 0.5 + 0.5,
        ];
        const force: [number, number] = [
          dx * 0.5 * mouseForce,
          dy * 0.5 * mouseForce,
        ];
        return { cursorUV, force };
      }
      return null;
    }

    // 2. Autonomous Idle Pass (triggered when idle >= 4s, whether mouse left or stayed still)
    if (!this.isAutonomousActive) {
      if (idleElapsed >= this.idleThreshold && now >= this.nextPassTime) {
        this.isAutonomousActive = true;
        this.autonomousStartTime = now;
        this.autonomousDuration = 2200 + Math.random() * 800; // 2.2 - 3.0s
        this.currentCurve = this.generateNewCurve();
        this.autoPreviousNDC = null;
        this.autoCurrentNDC = null;
      }
    }

    if (this.isAutonomousActive && this.currentCurve) {
      const progress = (now - this.autonomousStartTime) / this.autonomousDuration;

      if (progress >= 1.0) {
        this.isAutonomousActive = false;
        this.currentCurve = null;
        this.autoPreviousNDC = null;
        this.autoCurrentNDC = null;
        this.nextPassTime = now + 5000 + Math.random() * 4000; // 5 - 9 seconds
        return null;
      }

      // Smoothstep easing along bezier curve
      const t = progress * progress * (3.0 - 2.0 * progress);
      const ndc = this.getCubicBezier(t, this.currentCurve);
      this.autoCurrentNDC = ndc;

      if (this.autoPreviousNDC === null) {
        this.autoPreviousNDC = ndc;
        return null;
      }

      const dx = ndc[0] - this.autoPreviousNDC[0];
      const dy = ndc[1] - this.autoPreviousNDC[1];
      this.autoPreviousNDC = ndc;

      const cursorUV: [number, number] = [
        ndc[0] * 0.5 + 0.5,
        ndc[1] * 0.5 + 0.5,
      ];
      const force: [number, number] = [
        dx * 0.5 * mouseForce,
        dy * 0.5 * mouseForce,
      ];
      return { cursorUV, force };
    }

    return null;
  }

  public getRenderSnapshot(now: number): RenderSnapshot {
    const idleElapsed = now - this.lastRealActivityTime;
    const isUserActive = idleElapsed < this.idleThreshold;

    if (isUserActive && this.realCurrentNDC) {
      return {
        mouseNDC: this.realCurrentNDC,
        mousePace: this.smoothedPace,
      };
    }

    if (this.isAutonomousActive && this.autoCurrentNDC) {
      return {
        mouseNDC: this.autoCurrentNDC,
        mousePace: 0.5,
      };
    }

    this.smoothedPace *= 0.95;

    return {
      mouseNDC: [0, 0],
      mousePace: this.smoothedPace,
    };
  }
}
