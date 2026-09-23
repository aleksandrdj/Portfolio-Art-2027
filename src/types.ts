export type AppState = 'preloading' | 'logoSequence' | 'video' | 'whiteCover' | 'ready';

export type Language = 'ru' | 'en';

export interface LiquidBlob {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  birth: number;
  lifespan: number; // in milliseconds (1200 - 2000ms)
}

export interface AutonomousPass {
  active: boolean;
  startTime: number;
  duration: number;
  points: { x: number; y: number }[];
}
