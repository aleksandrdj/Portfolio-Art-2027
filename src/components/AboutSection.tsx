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
    className: 'left-[18%] -top-[3%] w-[18vw] min-w-[210px] max-w-[330px] aspect-[3/2] max-md:left-[4%] max-md:top-[4%] max-md:w-[44vw] max-md:min-w-0',
    start: 0.03,
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
    className: 'right-[7%] top-[10%] w-[28vw] max-w-[520px] aspect-[3/2] max-md:-right-[8%] max-md:top-[8%] max-md:w-[48vw]',
    start: 0.08,
    drift: 18,
    label: { ru: 'Рабочий процесс', en: 'Work in progress' },
    dimensions: '1600 × 1067 px',
  },
  {
    id: 'portrait',
    kind: 'photo',
    className: 'left-[4%] top-[22%] w-[19vw] max-w-[350px] aspect-[4/5] max-md:-left-[9%] max-md:top-[24%] max-md:w-[43vw]',
    start: 0.14,
    drift: -12,
    label: { ru: 'Главный портрет', en: 'Main portrait' },
    dimensions: '1200 × 1500 px',
  },
  {
    id: 'apl',
    kind: 'experience',
    className: 'left-[5%] bottom-[3%] w-[16vw] min-w-[190px] max-w-[300px] aspect-[4/5] max-md:left-[2%] max-md:bottom-[2%] max-md:w-[38vw] max-md:min-w-0',
    start: 0.22,
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
    className: 'right-[24%] bottom-[4%] w-[13vw] max-w-[230px] aspect-square max-md:right-[3%] max-md:bottom-[4%] max-md:w-[30vw]',
    start: 0.29,
    drift: -20,
    label: { ru: 'Эскизы и детали', en: 'Sketches and details' },
    dimensions: '1200 × 1200 px',
  },
  {
    id: 'vk',
    kind: 'experience',
    className: '-right-[2%] top-[42%] w-[19vw] min-w-[230px] max-w-[360px] aspect-[3/2] max-md:-right-[8%] max-md:top-[32%] max-md:w-[46vw] max-md:min-w-0',
    start: 0.36,
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
    className: 'left-[25%] bottom-[-12%] w-[14vw] max-w-[260px] aspect-[3/4] max-md:left-[40%] max-md:bottom-[-8%] max-md:w-[31vw]',
    start: 0.43,
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

      const copyProgress = clamp((progress - 0.12) / 0.32);
      const copyEase = 1 - Math.pow(1 - copyProgress, 3);
      if (copyRef.current) {
        copyRef.current.style.opacity = String(copyProgress);
        copyRef.current.style.transform = `translate3d(${(1 - copyEase) * 18}vw, ${(1 - copyEase) * 18}px, 0)`;
      }

      blocks.forEach((block, index) => {
        const element = blockRefs.current[index];
        if (!element) return;
        const local = clamp((progress - block.start) / 0.32);
        const ease = 1 - Math.pow(1 - local, 3);
        const x = (1 - ease) * (36 + index * 4);
        const y = ease * block.drift * progress;
        element.style.opacity = String(local);
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
        className="absolute left-[34%] top-[28%] z-20 w-[34vw] max-w-[620px] opacity-0 max-md:left-[7%] max-md:top-[44%] max-md:w-[86%]"
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
          className={`absolute overflow-hidden bg-black text-white opacity-0 shadow-[0_24px_80px_rgba(0,25,40,0.22)] ${block.className}`}
          style={{ willChange: 'transform, opacity' }}
        >
          {block.kind === 'photo' ? (
            <div className="flex h-full flex-col justify-between p-4 md:p-5">
              <span className="text-[9px] uppercase tracking-[0.16em] text-white/42 md:text-[10px]">{text.photo}</span>
              <div>
                <p className="text-xs font-medium md:text-sm">{block.label[language]}</p>
                <p className="mt-1 font-mono text-[9px] text-white/44 md:text-[10px]">{block.dimensions}</p>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col justify-between p-4 md:p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="text-[9px] uppercase tracking-[0.16em] text-white/42 md:text-[10px]">{block.label[language]}</span>
                <span className="text-right font-mono text-[8px] leading-relaxed text-white/28 md:text-[9px]">
                  {text.logo}<br />{block.dimensions}
                </span>
              </div>
              <div>
                <p className="text-base font-semibold tracking-tight md:text-xl">{block.company}</p>
                <p className="mt-1 text-[10px] leading-snug text-white/64 md:text-xs">{block.role?.[language]}</p>
                <p className="mt-3 font-mono text-[9px] text-cyan-100/55 md:text-[10px]">{block.dates?.[language]}</p>
              </div>
            </div>
          )}
        </div>
      ))}
    </section>
  );
};
