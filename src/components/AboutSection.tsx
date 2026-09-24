import React, { useEffect, useRef } from 'react';
import { Language } from '../types';
import './AboutSection.css';

interface Props {
  appState: string;
  language: Language;
  progressRef: React.MutableRefObject<number>;
  prefersReducedMotion: boolean;
}

interface VisualBlock {
  id: string;
  className: string;
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
    className: 'left-0 top-[9%] w-[24vh] aspect-[3/2]',
    label: { ru: 'Опыт работы', en: 'Experience' },
    company: 'A2b Creative Agency',
    role: { ru: 'Старший дизайнер и руководитель команды', en: 'Senior Designer and Team Lead' },
    dates: { ru: 'Май 2020 - январь 2023', en: 'May 2020 - January 2023' },
    dimensions: '1200 × 800 px',
  },
  {
    id: 'work',
    kind: 'photo',
    className: 'left-[12vh] bottom-[3%] w-[28vh] aspect-[3/2]',
    label: { ru: 'Рабочий процесс', en: 'Work in progress' },
    dimensions: '1600 × 1067 px',
  },
  {
    id: 'portrait',
    kind: 'photo',
    className: 'left-[54vh] top-[6%] w-[46vh] aspect-[4/5]',
    label: { ru: 'Главный портрет', en: 'Main portrait' },
    dimensions: '1200 × 1500 px',
  },
  {
    id: 'apl',
    kind: 'experience',
    className: 'left-[116vh] top-[10%] w-[23vh] aspect-[4/5]',
    label: { ru: 'Опыт работы', en: 'Experience' },
    company: 'APL GO',
    role: { ru: 'Ведущий бренд-дизайнер', en: 'Lead Brand Designer' },
    dates: { ru: 'Февраль 2023 - сентябрь 2024', en: 'February 2023 - September 2024' },
    dimensions: '1000 × 1250 px',
  },
  {
    id: 'detail',
    kind: 'photo',
    className: 'left-[129vh] bottom-[3%] w-[29vh] aspect-square',
    label: { ru: 'Эскизы и детали', en: 'Sketches and details' },
    dimensions: '1200 × 1200 px',
  },
  {
    id: 'vk',
    kind: 'experience',
    className: 'left-[174vh] top-[12%] w-[28vh] aspect-[3/2]',
    label: { ru: 'Текущее место работы', en: 'Current role' },
    company: 'VK Видео',
    role: { ru: 'Старший арт-директор', en: 'Senior Art Director' },
    dates: { ru: 'Декабрь 2024 - настоящее время', en: 'December 2024 - Present' },
    dimensions: '1200 × 800 px',
  },
  {
    id: 'atmosphere',
    kind: 'photo',
    className: 'left-[188vh] bottom-[3%] w-[24vh] aspect-[3/4]',
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
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (appState !== 'ready') return;
    let frame = 0;
    const portrait = window.matchMedia('(orientation: portrait)');

    const update = () => {
      const progress = clamp(progressRef.current);
      if (rootRef.current && trackRef.current) {
        const track = trackRef.current;
        const viewport = portrait.matches ? rootRef.current.clientHeight : rootRef.current.clientWidth;
        const last = track.querySelector<HTMLElement>('.about-frame--atmosphere');
        const extent = last
          ? (portrait.matches ? last.offsetTop + last.offsetHeight : last.offsetLeft + last.offsetWidth)
          : (portrait.matches ? track.offsetHeight : track.offsetWidth);
        const start = viewport + 16;
        const end = viewport * 0.9 - extent;
        const offset = start + progress * (end - start);
        track.style.transform = portrait.matches
          ? `translate3d(0, ${offset}px, 0)`
          : `translate3d(${offset}px, 0, 0)`;
        rootRef.current.style.visibility = progress > 0.005 ? 'visible' : 'hidden';
      }

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
      <div className="about-window absolute inset-x-0 top-[10%] h-[80%] overflow-hidden">
      <div ref={trackRef} className="about-track absolute top-0 h-full w-[220vh]" style={{ willChange: 'transform' }}>
      <div
        className="about-copy absolute left-[54vh] bottom-[2%] w-[46vh]"
      >
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-cyan-100/75 md:text-xs">
          {text.eyebrow}
        </p>
        <h2 className="max-w-[26ch] text-[clamp(1rem,2.4vh,1.8rem)] font-semibold leading-[0.98] tracking-[-0.045em]">
          {text.title}
        </h2>
        <p className="mt-2 max-w-[58ch] text-[clamp(10px,1.35vh,14px)] leading-snug text-white/78">
          {text.body}
        </p>
        <p className="mt-2 max-w-[48ch] text-[clamp(9px,1.2vh,12px)] leading-snug text-cyan-100/65">
          {text.note}
        </p>
      </div>

      {blocks.map((block) => (
        <div
          key={block.id}
          className={`about-frame about-frame--${block.id} absolute overflow-visible text-white ${block.className}`}
        >
          <div className="about-caption absolute bottom-full left-0 mb-2.5 w-full md:mb-3">
            {block.kind === 'photo' ? (
              <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
                <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-white/72 md:text-[11px]">
                  {block.label[language]}
                </p>
                <p className="shrink-0 font-mono text-[8px] text-white/38 md:text-[9px]">
                  {block.dimensions}
                </p>
              </div>
            ) : (
              <div>
                <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
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
            className="about-image absolute inset-0 overflow-hidden bg-black"
            aria-label={block.kind === 'photo' ? text.photo : text.logo}
          >
            <div className="h-full w-full bg-[linear-gradient(135deg,rgba(255,255,255,0.035),transparent_42%,rgba(255,255,255,0.018))]" />
          </div>
        </div>
      ))}
      </div>
      </div>
    </section>
  );
};
