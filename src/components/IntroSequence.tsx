import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from '../types';

interface IntroSequenceProps {
  appState: AppState;
  onStateChange: (state: AppState) => void;
  onIntroComplete: () => void;
  prefersReducedMotion: boolean;
}

interface LogoData {
  id: number;
  viewBox: string;
  pathD: string;
}

// Numerical order strictly 1 through 20 via Array.from
const LOGO_IDS = Array.from({ length: 20 }, (_, i) => i + 1);

// Durations in milliseconds for each logo (monotonically decelerating progression)
const DURATIONS = [
  60, 65, 70, 75, 80, 90, 100, 115, 130, 150, 175, 205, 240, 280, 330, 390,
  460, 550, 670, 950,
];
const TOTAL_LOGO_TIME = DURATIONS.reduce((a, b) => a + b, 0); // 5315 ms
const TIME_BEFORE_FINAL_LOGO = TOTAL_LOGO_TIME - DURATIONS[DURATIONS.length - 1]; // 4365 ms

export const IntroSequence: React.FC<IntroSequenceProps> = ({
  appState,
  onStateChange,
  onIntroComplete,
  prefersReducedMotion,
}) => {
  const [logos, setLogos] = useState<LogoData[]>([]);
  const [activeLogoIndex, setActiveLogoIndex] = useState<number>(0);
  const [containerScale, setContainerScale] = useState<number>(0.9);
  const [logo1Opacity, setLogo1Opacity] = useState<number>(0);

  const [isVideoReady, setIsVideoReady] = useState<boolean>(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);
  const [autoplayFailed, setAutoplayFailed] = useState<boolean>(false);
  const [whiteCoverOpacity, setWhiteCoverOpacity] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoOrientationSrcRef = useRef<string>('');
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number>(0);
  const isTabHiddenRef = useRef<boolean>(false);
  const hasFinishedVideoRef = useRef<boolean>(false);
  const stageRef = useRef<AppState>(appState);

  // Keep stageRef in sync
  useEffect(() => {
    stageRef.current = appState;
  }, [appState]);

  // Determine initial video source once (never restart on orientation change during intro)
  if (!videoOrientationSrcRef.current && typeof window !== 'undefined') {
    const isVertical = window.innerHeight > window.innerWidth;
    videoOrientationSrcRef.current = isVertical
      ? '/video_logo/Logo_animate_vertical.mp4'
      : '/video_logo/Logo_animate_horizontal.mp4';
  }

  // Preload all 20 SVGs in strict numerical order 1..20
  useEffect(() => {
    if (prefersReducedMotion) {
      onIntroComplete();
      return;
    }

    let isMounted = true;

    async function preloadAllLogos() {
      try {
        const loaded = await Promise.all(
          LOGO_IDS.map(async (id) => {
            const res = await fetch(`/logo/Logo_ArtDeejay_${id}.svg`);
            if (!res.ok) {
              throw new Error(`Failed to load /logo/Logo_ArtDeejay_${id}.svg: ${res.status}`);
            }
            const text = await res.text();
            const vbMatch = text.match(/viewBox=["']([^"']+)["']/i);
            const viewBox = vbMatch ? vbMatch[1] : '0 0 1000 300';
            const dMatch = text.match(/<path[^>]*\bd=["']([^"']+)["'][^>]*>/i);
            const pathD = dMatch ? dMatch[1] : '';
            return { id, viewBox, pathD };
          })
        );

        if (!isMounted) return;
        setLogos(loaded);
        onStateChange('logoSequence');
      } catch (err) {
        console.warn('Error preloading logo sequence:', err);
        // Fallback: continue to video
        if (isMounted) onStateChange('video');
      }
    }

    preloadAllLogos();

    return () => {
      isMounted = false;
    };
  }, [prefersReducedMotion, onIntroComplete, onStateChange]);

  // Tab visibility listener: pause/resume sequence and video seamlessly
  useEffect(() => {
    const handleVisibility = () => {
      const hidden = document.hidden;
      isTabHiddenRef.current = hidden;

      if (videoRef.current) {
        if (hidden && !videoRef.current.paused) {
          videoRef.current.pause();
        } else if (!hidden && stageRef.current === 'video' && isVideoPlaying) {
          videoRef.current.play().catch(() => {});
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isVideoPlaying]);

  // Stage A Animation Loop: 20 Logos Sequence with decelerating pacing
  useEffect(() => {
    if (appState !== 'logoSequence' || logos.length === 0) return;

    let localStartTime: number | null = null;
    let accumulatedPause = 0;
    let pauseTimestamp: number | null = null;

    const tick = (now: number) => {
      if (isTabHiddenRef.current) {
        if (pauseTimestamp === null) pauseTimestamp = now;
        animFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      if (pauseTimestamp !== null) {
        accumulatedPause += now - pauseTimestamp;
        pauseTimestamp = null;
      }

      if (localStartTime === null) {
        localStartTime = now;
        startTimeRef.current = now;
      }

      const elapsed = now - localStartTime - accumulatedPause;

      // 1. Continuous zoom of outer container from 0.9 to 1.0 with ease-out
      // Movement gradually decelerates and completely stops at the appearance of the 20th logo (4365ms).
      // During the final 950ms pause, the 20th logo is completely static at scale 1.0.
      if (elapsed < TIME_BEFORE_FINAL_LOGO) {
        const u = Math.min(Math.max(elapsed / TIME_BEFORE_FINAL_LOGO, 0), 1.0);
        // Cubic ease-out: 1 - (1 - u)^3 (derivative reaches 0 at u = 1)
        const easeOut = 1 - Math.pow(1 - u, 3);
        setContainerScale(0.9 + 0.1 * easeOut);
      } else {
        setContainerScale(1.0);
      }

      // 2. First logo appearance: quickly reveals from black screen in 50ms (within its 60ms duration)
      if (elapsed <= 50) {
        setLogo1Opacity(elapsed / 50);
      } else {
        setLogo1Opacity(1.0);
      }

      // 3. Determine active logo index strictly based on decelerating durations
      let acc = 0;
      let targetIdx = 0;
      for (let i = 0; i < DURATIONS.length; i++) {
        if (elapsed < acc + DURATIONS[i]) {
          targetIdx = i;
          break;
        }
        acc += DURATIONS[i];
        if (i === DURATIONS.length - 1) {
          targetIdx = DURATIONS.length - 1;
        }
      }

      setActiveLogoIndex(targetIdx);

      // 4. Logo sequence end: start video after full pause on 20th logo (5315ms)
      if (elapsed >= TOTAL_LOGO_TIME) {
        onStateChange('video');
        return;
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [appState, logos, onStateChange]);

  // Stage B: Video Playback & Time Tracking
  const startVideoPlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setAutoplayFailed(false);
        })
        .catch((err) => {
          console.warn('Autoplay prevented by browser:', err);
          setAutoplayFailed(true);
        });
    }
  }, []);

  // When transition to 'video' state occurs
  useEffect(() => {
    if (appState === 'video') {
      startVideoPlayback();
    }
  }, [appState, startVideoPlayback]);

  // Transition from Video to White Cover
  const handleTriggerWhiteCover = useCallback(() => {
    if (hasFinishedVideoRef.current) return;
    hasFinishedVideoRef.current = true;

    if (videoRef.current) {
      videoRef.current.pause();
    }

    onStateChange('whiteCover');

    // Fade white cover from 0 to 1 over 600ms
    const start = performance.now();
    const duration = 600;

    const step = (time: number) => {
      const elapsed = time - start;
      const progress = Math.min(Math.max(elapsed / duration, 0), 1.0);
      // Smooth cubic easing
      const eased = progress * progress * (3 - 2 * progress);
      setWhiteCoverOpacity(eased);

      if (progress < 1.0) {
        requestAnimationFrame(step);
      } else {
        setWhiteCoverOpacity(1.0);
        // After full white screen is reached, activate ready state
        onIntroComplete();
      }
    };

    requestAnimationFrame(step);
  }, [onStateChange, onIntroComplete]);

  // Video time tracking loop: exactly 5 seconds of actual playback, or 'ended'
  useEffect(() => {
    if (appState !== 'video') return;

    let frameId: number;

    const checkVideoTime = () => {
      const video = videoRef.current;
      if (video && !hasFinishedVideoRef.current) {
        // Track actual playback time via video.currentTime >= 5.0
        if (video.currentTime >= 5.0 || video.ended) {
          handleTriggerWhiteCover();
          return;
        }
      }
      frameId = requestAnimationFrame(checkVideoTime);
    };

    frameId = requestAnimationFrame(checkVideoTime);
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [appState, handleTriggerWhiteCover]);

  // Manual play button click handler for autoplay restrictions
  const handleManualPlay = () => {
    setAutoplayFailed(false);
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  if (appState === 'ready') {
    return null;
  }

  const currentLogo = logos[activeLogoIndex] || logos[0];

  return (
    <div
      id="intro-sequence-root"
      className="fixed inset-0 w-full h-[100dvh] bg-[#000000] overflow-hidden select-none z-40 flex items-center justify-center pointer-events-auto"
    >
      {/* Video Element: Prepared early, strictly 100% viewport width, auto height */}
      <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-[#000000] overflow-hidden z-10 pointer-events-none">
        <video
          ref={videoRef}
          src={videoOrientationSrcRef.current}
          muted
          playsInline
          preload="auto"
          onLoadedData={() => setIsVideoReady(true)}
          onPlaying={() => setIsVideoPlaying(true)}
          onEnded={handleTriggerWhiteCover}
          onError={() => {
            console.warn('Video failed to load/play, proceeding to transition');
            handleTriggerWhiteCover();
          }}
          className="w-full h-auto block"
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
          }}
        />
      </div>

      {/* Autoplay fallback button */}
      {autoplayFailed && appState === 'video' && (
        <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-auto bg-black/60">
          <button
            onClick={handleManualPlay}
            className="px-6 py-3 rounded border border-white/40 bg-black/80 text-white font-sans text-xs tracking-widest uppercase hover:bg-white hover:text-black transition-colors"
          >
            Продолжить / Continue
          </button>
        </div>
      )}

      {/* Stage A: 20 Logos Sequence (Remains visible until video is actively playing its first frame) */}
      {(appState === 'preloading' || appState === 'logoSequence' || (appState === 'video' && !isVideoPlaying)) && currentLogo && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div
            style={{
              transform: `scale(${containerScale})`,
              transformOrigin: 'center center',
            }}
            className="flex items-center justify-center will-change-transform"
          >
            <div
              style={{
                opacity: activeLogoIndex === 0 ? logo1Opacity : 1.0,
                transformOrigin: 'center center',
              }}
              className="flex items-center justify-center will-change-transform"
            >
              <svg
                viewBox={currentLogo.viewBox}
                className="w-[60vw] h-auto block overflow-visible"
                style={{
                  width: '60vw',
                  height: 'auto',
                }}
                role="img"
                aria-label={`Logo ${currentLogo.id}`}
              >
                <path
                  d={currentLogo.pathD}
                  fill="#FFFFFF"
                  fillRule="evenodd"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Stage C: Fullscreen White Cover (Fades in over 600ms on top of paused last video frame) */}
      {(appState === 'whiteCover' || whiteCoverOpacity > 0) && (
        <div
          id="intro-white-cover"
          className="fixed inset-0 w-full h-full bg-[#FFFFFF] z-30 pointer-events-none"
          style={{
            opacity: whiteCoverOpacity,
          }}
        />
      )}
    </div>
  );
};
