import { SplatPoint } from './FluidSimulation';

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
  private isCoarsePointer = false;
  private isReady = false;

  private lastRealActivityTime = performance.now();
  private mouseInsideWindow = false;
  private lastClientX = -9999;
  private lastClientY = -9999;

  // Real user pointer state in NDC [-1, 1]
  private realCurrentNDC: [number, number] | null = null;
  private realPreviousNDC: [number, number] | null = null;
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

  // Schedule timing
  private nextPassTime = Infinity;
  private curveIndex = 0;

  constructor() {
    this.detectPointerType();
  }

  private detectPointerType() {
    if (typeof window !== 'undefined') {
      const coarseQuery = window.matchMedia?.('(pointer: coarse)');
      this.isCoarsePointer = !!(
        coarseQuery?.matches ||
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0
      );
    }
  }

  /**
   * Starts timer from state 'ready', as required by specification.
   */
  public onStateReady(now: number) {
    this.isReady = true;
    this.lastRealActivityTime = now;
    if (this.isCoarsePointer) {
      // Mobile: First autonomous pass in 1-2 seconds after intro finishes
      this.nextPassTime = now + 1000 + Math.random() * 1000;
    } else {
      // Desktop: 4 seconds without mouse movement
      this.nextPassTime = now + 4000;
    }
  }

  public onPointerMove(clientX: number, clientY: number, width: number, height: number) {
    const now = performance.now();
    const moveDist = Math.hypot(clientX - this.lastClientX, clientY - this.lastClientY);

    this.mouseInsideWindow = true;
    this.lastClientX = clientX;
    this.lastClientY = clientY;

    if (moveDist > 0.5) {
      this.lastRealActivityTime = now;

      // Stop autonomous injection immediately on user interaction
      // Existing fluid simulation is NOT cleared, allowing natural physical dissipation!
      if (this.isAutonomousActive) {
        this.isAutonomousActive = false;
        this.currentCurve = null;
        this.autoPreviousNDC = null;
        this.autoCurrentNDC = null;
        this.scheduleNextAutonomousPass(now);
      }
    }

    const ndcX = (2.0 * clientX) / Math.max(1, width) - 1.0;
    const ndcY = 1.0 - (2.0 * clientY) / Math.max(1, height);

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

    this.realPreviousNDC = this.realCurrentNDC;
    this.realCurrentNDC = [ndcX, ndcY];
  }

  public onPointerDown(clientX: number, clientY: number, width: number, height: number) {
    this.onPointerMove(clientX, clientY, width, height);
    if (this.isAutonomousActive) {
      this.isAutonomousActive = false;
      this.currentCurve = null;
      this.autoPreviousNDC = null;
      this.autoCurrentNDC = null;
      this.scheduleNextAutonomousPass(performance.now());
    }
  }

  public onScrollOrTouch() {
    const now = performance.now();
    this.lastRealActivityTime = now;
    if (this.isAutonomousActive) {
      this.isAutonomousActive = false;
      this.currentCurve = null;
      this.autoPreviousNDC = null;
      this.autoCurrentNDC = null;
      this.scheduleNextAutonomousPass(now);
    }
  }

  public onMouseLeave() {
    this.mouseInsideWindow = false;
    this.pendingDeltaX = 0.0;
    this.pendingDeltaY = 0.0;
    this.realCurrentNDC = null;
    this.realPreviousNDC = null;
    this.lastRealActivityTime = performance.now();
  }

  public onTabVisibilityChange(hidden: boolean) {
    const now = performance.now();
    if (!hidden) {
      // Waking up: reset timers without jump
      this.lastRealActivityTime = now;
      this.pendingDeltaX = 0.0;
      this.pendingDeltaY = 0.0;
      if (this.isAutonomousActive) {
        this.isAutonomousActive = false;
        this.currentCurve = null;
        this.autoPreviousNDC = null;
        this.autoCurrentNDC = null;
      }
      this.scheduleNextAutonomousPass(now);
    }
  }

  private scheduleNextAutonomousPass(now: number) {
    if (this.isCoarsePointer) {
      // Subsequent intervals: 3-6 seconds
      this.nextPassTime = now + 3000 + Math.random() * 3000;
    } else {
      // Desktop intervals: 4-8 seconds
      this.nextPassTime = now + 4000 + Math.random() * 4000;
    }
  }

  private getCubicBezier(t: number, b: BezierCurve): [number, number] {
    const u = 1.0 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    const x = uuu * b.p0[0] + 3.0 * uu * t * b.p1[0] + 3.0 * u * tt * b.p2[0] + ttt * b.p3[0];
    const y = uuu * b.p0[1] + 3.0 * uu * t * b.p1[1] + 3.0 * u * tt * b.p2[1] + ttt * b.p3[1];
    return [x, y];
  }

  /**
   * Generates varied smooth Bezier trajectories.
   * Prominently crosses the central logo (NDC X in [-0.3, 0.3], Y in [-0.15, 0.15])
   * so local fluid inversion is clearly visible.
   */
  private generateNewCurve(): BezierCurve {
    this.curveIndex = (this.curveIndex + 1) % 5;

    switch (this.curveIndex) {
      case 0:
        // Sweeping diagonal from left through center logo to upper right
        return {
          p0: [-1.15, -0.18 + (Math.random() - 0.5) * 0.1],
          p1: [-0.35, -0.05 + (Math.random() - 0.5) * 0.1],
          p2: [0.15, 0.05 + (Math.random() - 0.5) * 0.1],
          p3: [1.15, 0.28 + (Math.random() - 0.5) * 0.1],
        };
      case 1:
        // Flowing wave from right through center logo to bottom-left
        return {
          p0: [1.15, 0.22 + (Math.random() - 0.5) * 0.1],
          p1: [0.35, 0.02 + (Math.random() - 0.5) * 0.1],
          p2: [-0.20, -0.06 + (Math.random() - 0.5) * 0.1],
          p3: [-1.15, -0.25 + (Math.random() - 0.5) * 0.1],
        };
      case 2:
        // Gentle diagonal cross from top-left through logo center to bottom-right
        return {
          p0: [-0.85, 1.15],
          p1: [-0.25, 0.12 + (Math.random() - 0.5) * 0.08],
          p2: [0.20, -0.12 + (Math.random() - 0.5) * 0.08],
          p3: [0.85, -1.15],
        };
      case 3:
        // Horizontal arc across the lower loops of the signature
        return {
          p0: [-1.15, -0.28],
          p1: [-0.15, -0.04],
          p2: [0.35, 0.08],
          p3: [1.15, -0.12],
        };
      case 4:
      default:
        // S-curve sweeping through the signature
        return {
          p0: [1.15, -0.18],
          p1: [0.25, 0.08],
          p2: [-0.25, -0.04],
          p3: [-1.15, 0.22],
        };
    }
  }

  /**
   * Consumes input for physics simulation step.
   * Interpolates sub-points between last and current position with step <= radiusPx * 0.5.
   * Evenly distributes total impulse and density across sub-points.
   */
  public consumeSimulationStep(
    now: number,
    mouseForce: number,
    radiusPx: number,
    cssWidth: number,
    cssHeight: number
  ): SplatPoint[] {
    if (!this.isReady) return [];

    const idleElapsed = now - this.lastRealActivityTime;
    const idleThreshold = this.isCoarsePointer ? 1500 : 4000;
    const isUserActive = idleElapsed < idleThreshold;

    // 1. Real User Movement
    if (isUserActive && this.realCurrentNDC) {
      const dx = this.pendingDeltaX;
      const dy = this.pendingDeltaY;
      this.pendingDeltaX = 0.0;
      this.pendingDeltaY = 0.0;

      const currUV: [number, number] = [
        this.realCurrentNDC[0] * 0.5 + 0.5,
        this.realCurrentNDC[1] * 0.5 + 0.5,
      ];

      const prevUV: [number, number] = this.realPreviousNDC
        ? [this.realPreviousNDC[0] * 0.5 + 0.5, this.realPreviousNDC[1] * 0.5 + 0.5]
        : currUV;

      this.realPreviousNDC = this.realCurrentNDC;

      const distNdc = Math.hypot(dx, dy);
      if (distNdc > 0.0001) {
        // Compute distance in CSS pixels
        const distPx = Math.hypot(
          (currUV[0] - prevUV[0]) * cssWidth,
          (currUV[1] - prevUV[1]) * cssHeight
        );

        // Step size <= half radius of brush
        const maxStepPx = Math.max(4.0, radiusPx * 0.45);
        const numSteps = Math.max(1, Math.min(Math.ceil(distPx / maxStepPx), 12));

        // Total force and density distributed
        const totalFx = dx * 0.5 * mouseForce;
        const totalFy = dy * 0.5 * mouseForce;
        const totalDensity = 0.45; // Positive scalar density

        const splats: SplatPoint[] = [];
        for (let i = 1; i <= numSteps; i++) {
          const t = i / numSteps;
          splats.push({
            cursorUV: [
              prevUV[0] + (currUV[0] - prevUV[0]) * t,
              prevUV[1] + (currUV[1] - prevUV[1]) * t,
            ],
            force: [totalFx / numSteps, totalFy / numSteps],
            density: totalDensity / numSteps,
          });
        }
        return splats;
      }
      return [];
    }

    // 2. Autonomous Idle Pass (Desktop >= 4s idle; Mobile autonomous runs)
    if (!this.isAutonomousActive) {
      if (now >= this.nextPassTime) {
        this.isAutonomousActive = true;
        this.autonomousStartTime = now;
        // 2 - 3 seconds pass duration
        this.autonomousDuration = 2000 + Math.random() * 1000;
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
        this.scheduleNextAutonomousPass(now);
        return [];
      }

      // Smooth cubic easing along bezier curve
      const t = progress * progress * (3.0 - 2.0 * progress);
      const ndc = this.getCubicBezier(t, this.currentCurve);
      this.autoCurrentNDC = ndc;

      if (this.autoPreviousNDC === null) {
        this.autoPreviousNDC = ndc;
        return [];
      }

      const prevNdc = this.autoPreviousNDC;
      this.autoPreviousNDC = ndc;

      const currUV: [number, number] = [ndc[0] * 0.5 + 0.5, ndc[1] * 0.5 + 0.5];
      const prevUV: [number, number] = [prevNdc[0] * 0.5 + 0.5, prevNdc[1] * 0.5 + 0.5];

      const dx = ndc[0] - prevNdc[0];
      const dy = ndc[1] - prevNdc[1];

      const distPx = Math.hypot(
        (currUV[0] - prevUV[0]) * cssWidth,
        (currUV[1] - prevUV[1]) * cssHeight
      );

      const maxStepPx = Math.max(4.0, radiusPx * 0.45);
      const numSteps = Math.max(1, Math.min(Math.ceil(distPx / maxStepPx), 12));

      // Autonomous total impulse and density:
      // Density is explicitly injected so gentle, smooth curves remain fully visible!
      const totalFx = dx * 0.5 * mouseForce * 1.8;
      const totalFy = dy * 0.5 * mouseForce * 1.8;
      const totalDensity = 0.55;

      const splats: SplatPoint[] = [];
      for (let i = 1; i <= numSteps; i++) {
        const stepT = i / numSteps;
        splats.push({
          cursorUV: [
            prevUV[0] + (currUV[0] - prevUV[0]) * stepT,
            prevUV[1] + (currUV[1] - prevUV[1]) * stepT,
          ],
          force: [totalFx / numSteps, totalFy / numSteps],
          density: totalDensity / numSteps,
        });
      }
      return splats;
    }

    return [];
  }

  public getRenderSnapshot(now: number): RenderSnapshot {
    const idleElapsed = now - this.lastRealActivityTime;
    const idleThreshold = this.isCoarsePointer ? 1500 : 4000;
    const isUserActive = idleElapsed < idleThreshold;

    if (isUserActive && this.realCurrentNDC) {
      return {
        mouseNDC: this.realCurrentNDC,
        mousePace: this.smoothedPace,
      };
    }

    if (this.isAutonomousActive && this.autoCurrentNDC) {
      return {
        mouseNDC: this.autoCurrentNDC,
        mousePace: 0.45,
      };
    }

    this.smoothedPace *= 0.95;

    return {
      mouseNDC: [0, 0],
      mousePace: this.smoothedPace,
    };
  }
}
