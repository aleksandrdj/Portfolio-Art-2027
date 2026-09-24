import React, { useEffect, useRef } from 'react';
import { Language } from '../types';

interface Props {
  appState: string;
  language: Language;
  progressRef: React.MutableRefObject<number>;
  prefersReducedMotion: boolean;
}

interface VisualBlock {
  id: string;
  className: string;
  start: number;
  duration: number;
  drift: number;
  kind: 'photo' | 'experience';
  label: { ru: string; en: string };
  dimensions?: string;
  company?: string;
  role?: { ru: string; en: string };
  dates?: { ru: string; en: string };
}

const blocks: VisualBlock[] = [
  {
    id: 'a2b',
    kind: 'experience',
    className: 'left-[38%] -top-[3%] w-[18vw] min-w-[210px] max-w-[330px] aspect-[3/2] max-md:left-[27%] max-md:top-[4%] max-md:w-[44vw] max-md:min-w-0',
    start: 0.00,
    duration: 0.38,
    drift: -22,
    label: { ru: 'Опыт работы', en: 'Experience' },
    company: 'A2b Creative Agency',
    role: { ru: 'Старший дизайнер и руководитель команды', en: 'Senior Designer and Team Lead' },
    dates: { ru: 'Май 2020 - январь 2023', en: 'May 2020 - January 2023' },
    dimensions: '1200 × 800 px',
  },
  {
    id: 'work',
    kind: 'photo',
    className: 'left-[38%] top-[10%] w-[28vw] max-w-[520px] aspect-[3/2] max-md:left-[27%] max-md:top-[11%] max-md:w-[48vw]',
    start: 0.10,
    duration: 0.38,
    drift: 18,
    label: { ru: 'Рабочий процесс', en: 'Work in progress' },
    dimensions: '1600 × 1067 px',
  },
  {
    id: 'portrait',
    kind: 'photo',
    className: 'left-[38%] top-[29%] w-[19vw] max-w-[350px] aspect-[4/5] max-md:left-[27%] max-md:top-[25%] max-md:w-[43vw]',
    start: 0.20,
    duration: 0.38,
    drift: -12,
    label: { ru: 'Главный портрет', en: 'Main portrait' },
    dimensions: '1200 × 1500 px',
  },
  {
    id: 'apl',
    kind: 'experience',
    className: 'left-[38%] bottom-[3%] w-[16vw] min-w-[190px] max-w-[300px] aspect-[4/5] max-md:left-[27%] max-md:bottom-[2%] max-md:w-[38vw] max-md:min-w-0',
    start: 0.30,
    duration: 0.38,
    drift: 16,
    label: { ru: 'Опыт работы', en: 'Experience' },
    company: 'APL GO',
    role: { ru: 'Ведущий бренд-дизайнер', en: 'Lead Brand Designer' },
    dates: { ru: 'Февраль 2023 - сентябрь 2024', en: 'February 2023 - September 2024' },
    dimensions: '1000 × 1250 px',
  },
  {
    id: 'detail',
    kind: 'photo',
    className: 'left-[38%] top-[8%] w-[13vw] max-w-[230px] aspect-square max-md:left-[27%] max-md:top-[9%] max-md:w-[30vw]',
    start: 0.40,
    duration: 0.36,
    drift: -20,
    label: { ru: 'Эскизы и детали', en: 'Sketches and details' },
    dimensions: '1200 × 1200 px',
  },
  {
    id: 'vk',
    kind: 'experience',
    className: 'left-[38%] top-[44%] w-[19vw] min-w-[230px] max-w-[360px] aspect-[3/2] max-md:left-[27%] max-md:top-[32%] max-md:w-[46vw] max-md:min-w-0',
    start: 0.51,
    duration: 0.38,
    drift: 14,
    label: { ru: 'Текущее место работы', en: 'Current role' },
    company: 'VK Видео',
    role: { ru: 'Старший арт-директор', en: 'Senior Art Director' },
    dates: { ru: 'Декабрь 2024 - настоящее время', en: 'December 2024 - Present' },
    dimensions: '1200 × 800 px',
  },
  {
    id: 'atmosphere',
    kind: 'photo',
    className: 'left-[38%] bottom-[-10%] w-[14vw] max-w-[260px] aspect-[3/4] max-md:left-[27%] max-md:bottom-[-7%] max-md:w-[31vw]',
    start: 0.62,
    duration: 0.36,
    drift: 24,
    label: { ru: 'Атмосферный портрет', en: 'Atmospheric portrait' },
    dimensions: '1200 × 1600 px',
  },
];

const copy = {
  ru: {
    eyebrow: 'Обо мне',
    title: 'Я превращаю сложные идеи в понятные визуальные системы.',
    body: 'Меня зовут Александр Савенков. Я арт-директор и продуктовый дизайнер с опытом более 13 лет. Работаю на пересечении айдентики, интерфейсов, 3D, motion-дизайна и визуального сторителлинга.',
    note: 'Музыка научила меня чувствовать ритм. Дизайн научил превращать его в форму, движение и систему.',
    photo: 'Место для фотографии',
    logo: 'Место для логотипа',
  },
  en: {
    eyebrow: 'About',
    title: 'I turn complex ideas into clear visual systems.',
    body: 'My name is Alexsandr Savenkov. I am an Art Director and Product Designer with over 13 years of experience across identity, interfaces, 3D, motion design and visual storytelling.',
    note: 'Music taught me to feel rhythm. Design taught me to turn it into form, movement and a system.',
    photo: 'Photo placeholder',
    logo: 'Logo placeholder',
  },
};

const clamp = (value: number) => Math.min(1, Math.max(0, value));

export const AboutSection: React.FC<Props> = ({ appState, language, progressRef, prefersReducedMotion }) => {
  const rootRef = useRef<HTMLElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const blockRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (appState !== 'ready') return;
    let frame = 0;

    const update = () => {
      const rawProgress = clamp(progressRef.current);
      const progress = prefersReducedMotion ? (rawProgress > 0.005 ? 1 : 0) : rawProgress;
      if (rootRef.current) {
        rootRef.current.style.visibility = progress > 0.005 ? 'visible' : 'hidden';
      }

      const copyRaw = (progress - 0.40) / 0.48;
      const copyProgress = clamp(copyRaw);
      const copyOpacity = copyRaw > 0 && copyRaw < 1
        ? Math.min(1, copyProgress / 0.08, (1 - copyProgress) / 0.08)
        : 0;
      if (copyRef.current) {
        const copyX = prefersReducedMotion ? 0 : 100 - copyProgress * 220;
        copyRef.current.style.opacity = String(copyOpacity);
        copyRef.current.style.transform = `translate3d(${copyX}vw, 0, 0)`;
      }

      blocks.forEach((block, index) => {
        const element = blockRefs.current[index];
        if (!element) return;
        const rawLocal = (progress - block.start) / block.duration;
        const local = clamp(rawLocal);
        const opacity = rawLocal > 0 && rawLocal < 1
          ? Math.min(1, local / 0.08, (1 - local) / 0.08)
          : 0;
        const x = prefersReducedMotion ? 0 : 100 - local * 220;
        const y = prefersReducedMotion ? 0 : Math.sin(local * Math.PI) * block.drift;
        element.style.opacity = String(opacity);
        element.style.transform = `translate3d(${x}vw, ${y}px, 0)`;
      });

      frame = requestAnimationFrame(update);
    };

    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [appState, prefersReducedMotion, progressRef]);

  if (appState !== 'ready') return null;
  const text = copy[language];

  return (
    <section
      ref={rootRef}
      id="about"
      className="invisible pointer-events-none absolute inset-0 z-[35] overflow-hidden text-white"
      aria-label={text.eyebrow}
    >
      <div
        ref={copyRef}
        className="absolute left-[31%] top-[26%] z-20 w-[38vw] max-w-[680px] opacity-0 max-md:left-[7%] max-md:top-[37%] max-md:w-[86%]"
        style={{ willChange: 'transform, opacity' }}
      >
        <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.18em] text-cyan-100/75 md:text-xs">
          {text.eyebrow}
        </p>
        <h2 className="max-w-[16ch] text-[clamp(2rem,3.5vw,4.5rem)] font-semibold leading-[0.98] tracking-[-0.045em]">
          {text.title}
        </h2>
        <p className="mt-6 max-w-[58ch] text-sm leading-relaxed text-white/78 md:text-base">
          {text.body}
        </p>
        <p className="mt-5 max-w-[48ch] text-xs leading-relaxed text-cyan-100/65 md:text-sm">
          {text.note}
        </p>
      </div>

      {blocks.map((block, index) => (
        <div
          key={block.id}
          ref={(element) => { blockRefs.current[index] = element; }}
          className={`absolute overflow-visible text-white opacity-0 ${block.className}`}
          style={{ willChange: 'transform, opacity' }}
        >
          <div className="absolute bottom-full left-0 mb-2.5 w-full md:mb-3">
            {block.kind === 'photo' ? (
              <div className="flex items-end justify-between gap-3">
                <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-white/72 md:text-[11px]">
                  {block.label[language]}
                </p>
                <p className="shrink-0 font-mono text-[8px] text-white/38 md:text-[9px]">
                  {block.dimensions}
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-end justify-between gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-white/78 md:text-xs">
                    {block.company}
                  </p>
                  <p className="shrink-0 font-mono text-[8px] text-cyan-100/48 md:text-[9px]">
                    {block.dates?.[language]}
                  </p>
                </div>
                <p className="mt-1 text-[8px] leading-snug text-white/48 md:text-[10px]">
                  {block.role?.[language]}
                </p>
              </div>
            )}
          </div>

          <div
            className="h-full w-full overflow-hidden bg-black shadow-[0_24px_80px_rgba(0,25,40,0.22)]"
            aria-label={block.kind === 'photo' ? text.photo : text.logo}
          >
            <div className="h-full w-full bg-[linear-gradient(135deg,rgba(255,255,255,0.035),transparent_42%,rgba(255,255,255,0.018))]" />
          </div>
        </div>
      ))}
    </section>
  );
};
