import React, { useEffect, useRef, useState } from 'react';
import { Language } from '../types';
import sketch5 from '../assets/about-sketches/sketch-5.svg?raw';
import sketch9 from '../assets/about-sketches/sketch-9.svg?raw';
import sketch8 from '../assets/about-sketches/sketch-8.svg?raw';
import orbitSketch from '../assets/about-sketches/orbit.svg?raw';
import './AboutSection.css';

interface Props {
  appState: string;
  language: Language;
  progressRef: React.MutableRefObject<number>;
  prefersReducedMotion: boolean;
}

interface VisualBlock {
  id: string;
  kind: 'photo' | 'experience';
  label: { ru: string; en: string };
  company?: string;
  role?: { ru: string; en: string };
  dates?: { ru: string; en: string };
  image: string;
}

const blocks: VisualBlock[] = [
  {
    id: 'a2b',
    kind: 'experience',
    label: { ru: 'Опыт работы', en: 'Experience' },
    company: 'A2b Creative Agency',
    role: { ru: 'Дизайнер и руководитель команды', en: 'Designer and Team Lead' },
    dates: { ru: 'Май 2020 - январь 2023', en: 'May 2020 - January 2023' },
    image: '/images/about/a2b.jpg',
  },
  {
    id: 'work',
    kind: 'photo',
    label: { ru: '', en: '' },
    image: '/images/about/work-process.jpg',
  },
  {
    id: 'portrait',
    kind: 'photo',
    label: { ru: '', en: '' },
    image: '/images/about/alexsandr-savenkov.jpg',
  },
  {
    id: 'apl',
    kind: 'experience',
    label: { ru: 'Опыт работы', en: 'Experience' },
    company: 'APL GO',
    role: { ru: 'Ведущий бренд-дизайнер', en: 'Lead Brand Designer' },
    dates: { ru: 'Февраль 2023 - сентябрь 2024', en: 'February 2023 - September 2024' },
    image: '/images/about/apl.jpg',
  },
  {
    id: 'detail',
    kind: 'photo',
    label: { ru: '', en: '' },
    image: '/images/about/detail.jpg',
  },
  {
    id: 'vk',
    kind: 'experience',
    label: { ru: 'Текущее место работы', en: 'Current role' },
    company: 'VK Видео',
    role: { ru: 'Старший дизайнер', en: 'Senior Designer' },
    dates: { ru: 'Декабрь 2024 - настоящее время', en: 'December 2024 - Present' },
    image: '/images/about/vk-video.jpg',
  },
  {
    id: 'atmosphere',
    kind: 'photo',
    label: { ru: '', en: '' },
    image: '/images/about/atmosphere.jpg',
  },
];

const copy = {
  ru: {
    eyebrow: 'Обо мне',
    title: 'Александр Савенков / ArtDeejay. Senior Designer',
    tenure: 'В дизайне с мая 2020',
    body: 'Мой прошлый опыт в диджеинге и звукорежиссуре научил меня главному: чувствовать ритм, выстраивать композицию и гармонично миксовать разные элементы. Сегодня я полностью посвятил себя дизайну и переношу этот принцип в визуальные медиа. Работаю на стыке брендинга, диджитал-среды и графики.',
    photo: 'Место для фотографии',
    logo: 'Место для логотипа',
  },
  en: {
    eyebrow: 'About',
    title: 'Alexsandr Savenkov / ArtDeejay. Senior Designer',
    tenure: 'Designing since May 2020',
    body: 'My previous experience in DJing and sound engineering taught me the most important thing: how to feel rhythm, build composition, and harmoniously mix different elements. Today I am fully dedicated to design and bring this principle into visual media. I work at the intersection of branding, digital environments, and graphic design.',
    photo: 'Photo placeholder',
    logo: 'Logo placeholder',
  },
};

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const dayMs = 24 * 60 * 60 * 1000;
const designStart = { year: 2020, month: 5, day: 1 };

const moscowDate = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Moscow', year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: value('year'), month: value('month'), day: value('day'),
    hours: value('hour'), minutes: value('minute'), seconds: value('second'),
  };
};
const utcDateParts = (date: Date) => ({
  year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate(),
  hours: date.getUTCHours(), minutes: date.getUTCMinutes(), seconds: date.getUTCSeconds(),
});

const designTenure = ({ year, month, day, hours, minutes, seconds }: ReturnType<typeof moscowDate>) => {
  let years = year - designStart.year;
  if (month < designStart.month || (month === designStart.month && day < designStart.day)) years--;
  years = Math.max(0, years);
  const anniversary = Date.UTC(designStart.year + years, designStart.month - 1, designStart.day);
  const today = Date.UTC(year, month - 1, day);
  return {
    years, days: Math.max(0, Math.floor((today - anniversary) / dayMs)),
    hours, minutes, seconds,
  };
};

const russianUnit = (count: number, one: string, few: string, many: string) => {
  if (count % 100 >= 11 && count % 100 <= 14) return many;
  if (count % 10 === 1) return one;
  if (count % 10 >= 2 && count % 10 <= 4) return few;
  return many;
};

const DesignTenure: React.FC<{ language: Language }> = ({ language }) => {
  const [now, setNow] = useState(() => moscowDate(new Date()));
  const [timeSource, setTimeSource] = useState<'device' | 'network'>('device');
  const tenure = designTenure(now);

  useEffect(() => {
    let serverMoscowTime: number | null = null;
    let syncedAt = 0;
    let mounted = true;
    const controller = new AbortController();
    const update = () => setNow(serverMoscowTime === null
      ? moscowDate(new Date())
      : utcDateParts(new Date(serverMoscowTime + performance.now() - syncedAt)));
    const sync = async () => {
      const timeout = window.setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch('https://www.timeapi.io/api/time/current/zone?timeZone=Europe%2FMoscow', {
          cache: 'no-store', signal: controller.signal,
        });
        if (!response.ok) return;
        const result: Record<string, unknown> = await response.json();
        const fields = [result.year, result.month, result.day, result.hour, result.minute, result.seconds];
        if (!fields.every((field) => typeof field === 'number' && Number.isFinite(field))) return;
        serverMoscowTime = Date.UTC(
          result.year as number, (result.month as number) - 1, result.day as number,
          result.hour as number, result.minute as number, result.seconds as number,
          typeof result.milliSeconds === 'number' ? result.milliSeconds : 0,
        );
        syncedAt = performance.now();
        if (mounted) {
          setTimeSource('network');
          update();
        }
      } catch {
        // Keep the browser clock as a fallback if the time service is unavailable.
      } finally {
        window.clearTimeout(timeout);
      }
    };
    void sync();
    const interval = window.setInterval(update, 1_000);
    document.addEventListener('visibilitychange', update);
    return () => {
      mounted = false;
      controller.abort();
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  return <div className="about-tenure" data-time-source={timeSource} aria-label={language === 'ru'
    ? `${tenure.years} ${russianUnit(tenure.years, 'год', 'года', 'лет')} и ${tenure.days} ${russianUnit(tenure.days, 'день', 'дня', 'дней')} в дизайне`
    : `${tenure.years} ${tenure.years === 1 ? 'year' : 'years'} and ${tenure.days} ${tenure.days === 1 ? 'day' : 'days'} in design`}>
    <span className="about-tenure-label">{copy[language].tenure}</span>
    <span className="about-tenure-count">
      <strong>{tenure.years}</strong> {language === 'ru' ? russianUnit(tenure.years, 'год', 'года', 'лет') : tenure.years === 1 ? 'year' : 'years'}
      <span className="about-tenure-divider" aria-hidden="true">/</span>
      <strong>{tenure.days}</strong> {language === 'ru' ? russianUnit(tenure.days, 'день', 'дня', 'дней') : tenure.days === 1 ? 'day' : 'days'}
    </span>
    <span className="about-tenure-clock" aria-label={language === 'ru' ? 'Часы, минуты и секунды' : 'Hours, minutes and seconds'}>
      {String(tenure.hours).padStart(2, '0')}:{String(tenure.minutes).padStart(2, '0')}:{String(tenure.seconds).padStart(2, '0')}
    </span>
  </div>;
};

export const AboutSection: React.FC<Props> = ({ appState, language, progressRef, prefersReducedMotion }) => {
  const rootRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (appState !== 'ready') return;
    let frame = 0;
    const portrait = window.matchMedia('(orientation: portrait)');

    let viewport = 0;
    let start = 0;
    let end = 0;
    let lastProgress = -1;
    const measure = () => {
      const root = rootRef.current;
      const track = trackRef.current;
      if (!root || !track) return;
      viewport = portrait.matches ? root.clientHeight : root.clientWidth;
      const pen = track.querySelector<HTMLElement>('.about-sketch--three');
      const biography = track.querySelector<HTMLElement>('.about-copy');
      if (!portrait.matches && pen && biography) {
        const freeHeight = track.clientHeight - biography.offsetTop - biography.offsetHeight - 24;
        pen.style.width = `${Math.max(0, Math.min(window.innerHeight * 0.32, freeHeight * 432 / 227))}px`;
      }

      const frames = Array.from(track.querySelectorAll<HTMLElement>('.about-frame, .about-copy'));
      const extent = frames.length
        ? Math.max(...frames.map((frame) => portrait.matches
          ? frame.offsetTop + frame.offsetHeight
          : frame.offsetLeft + frame.offsetWidth))
        : (portrait.matches ? track.offsetHeight : track.offsetWidth);
      start = viewport + 16;
      end = viewport * 0.9 - extent;
      lastProgress = -1;
    };
    const goToAbout = () => {
      measure();
      const portraitFrame = trackRef.current?.querySelector<HTMLElement>('.about-frame--portrait');
      const scene = document.getElementById('portfolio-screen');
      if (!portraitFrame || !scene) return;
      const framePosition = portrait.matches ? portraitFrame.offsetTop : portraitFrame.offsetLeft;
      const focalPoint = portrait.matches ? viewport * 0.24 : viewport * 0.34;
      const progress = clamp((focalPoint - framePosition - start) / (end - start));
      const total = scene.offsetHeight - window.innerHeight;
      window.scrollTo({ top: scene.offsetTop + total * 0.8 * (0.46 + 0.54 * progress),
        behavior: prefersReducedMotion ? 'instant' : 'smooth' });
    };
    const observer = new ResizeObserver(measure);
    if (trackRef.current) observer.observe(trackRef.current);
    if (rootRef.current) observer.observe(rootRef.current);
    const biographyElement = trackRef.current?.querySelector('.about-copy');
    if (biographyElement) observer.observe(biographyElement);
    portrait.addEventListener('change', measure);
    window.addEventListener('portfolio:about', goToAbout);
    const sketches = Array.from(rootRef.current?.querySelectorAll<HTMLElement>('.about-sketch') ?? []);
    sketches.forEach((sketch) => {
      sketch.querySelectorAll<SVGPathElement>('path').forEach((path) => {
        const segments = path.getAttribute('d')?.match(/[Mm][^Mm]*/g) ?? [];
        if (segments.length < 2) return;
        // Source artwork uses absolute M commands; each becomes a separate stroke.
        if (segments.some(segment => segment.startsWith('m'))) return;
        segments.forEach(segment => {
          const stroke = path.cloneNode(false) as SVGPathElement;
          stroke.setAttribute('d', segment);
          path.before(stroke);
        });
        path.remove();
      });
    });
    const sketchPaths = sketches.map((sketch) => Array.from(sketch.querySelectorAll<SVGPathElement>('path')).map((path) => {
      const length = path.getTotalLength();
      path.style.fill = 'none';
      // Deliberately blended blue-white: it reads as a soft "ink" line without alpha.
      path.style.stroke = '#C5F5FA';
      path.style.strokeWidth = '1.6';
      path.style.strokeLinecap = 'round';
      path.style.strokeLinejoin = 'round';
      path.style.strokeDasharray = `${length} ${length}`;
      path.style.strokeDashoffset = String(length);
      return { path, length };
    }));
    measure();
    const update = () => {
      const progress = clamp(progressRef.current);
      if (rootRef.current && trackRef.current && progress !== lastProgress) {
        const offset = start + progress * (end - start);
        trackRef.current.style.transform = portrait.matches
          ? `translate3d(0, ${offset}px, 0)`
          : `translate3d(${offset}px, 0, 0)`;
        sketches.forEach((sketch, sketchIndex) => {
          // Local viewport travel: the leading edge crosses 20% before drawing,
          // and reaches 75% when the final stroke is complete.
          const bounds = sketch.getBoundingClientRect();
          const screenSize = portrait.matches ? window.innerHeight : window.innerWidth;
          const leadingEdge = portrait.matches ? bounds.top : bounds.left;
          const travel = (screenSize - leadingEdge) / screenSize;
          // The final sketch must finish before the gallery runs out of travel.
          const finalEdge = leadingEdge + end - offset;
          const finalTravel = (screenSize - finalEdge) / screenSize;
          const finish = sketchIndex === sketches.length - 1
            ? Math.min(0.75, Math.max(0.21, finalTravel - 0.02))
            : 0.75;
          const reveal = prefersReducedMotion ? 1 : clamp((travel - 0.2) / (finish - 0.2));
          const paths = sketchPaths[sketchIndex];
          const totalLength = paths.reduce((sum, item) => sum + item.length, 0);
          let drawnBefore = 0;
          paths.forEach(({ path, length }) => {
            const draw = clamp((reveal * totalLength - drawnBefore) / length);
            path.style.strokeDashoffset = String(length * (1 - draw));
            path.style.visibility = draw > 0 ? 'visible' : 'hidden';
            drawnBefore += length;
          });
        });
        rootRef.current.style.visibility = progress > 0.005 ? 'visible' : 'hidden';
        lastProgress = progress;
      }
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      portrait.removeEventListener('change', measure);
      window.removeEventListener('portfolio:about', goToAbout);
    };
  }, [appState, prefersReducedMotion, progressRef, language]);

  if (appState !== 'ready') return null;
  const text = copy[language];

  return (
    <section
      ref={rootRef}
      id="about"
      className="invisible absolute inset-0 z-[35] overflow-hidden text-white"
      aria-label={text.eyebrow}
    >
      <div className="about-window absolute inset-x-0 top-[10%] h-[80%] overflow-hidden">
      <div ref={trackRef} className="about-track absolute top-0" style={{ willChange: 'transform' }}>
      <div className="about-sketches" aria-hidden="true">
        <div
          className="about-sketch about-sketch--one"
          dangerouslySetInnerHTML={{ __html: sketch5 }}
        />
        <div
          className="about-sketch about-sketch--two"
          dangerouslySetInnerHTML={{ __html: sketch9 }}
        />
        <div
          className="about-sketch about-sketch--three"
          dangerouslySetInnerHTML={{ __html: sketch8 }}
        />
        <div
          className="about-sketch about-sketch--four"
          dangerouslySetInnerHTML={{ __html: orbitSketch }}
        />
      </div>
      <div
        className="about-copy"
      >
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-cyan-100/75 md:text-xs">
          {text.eyebrow}
        </p>
        <h2 className="max-w-[26ch] text-[clamp(1rem,2.4vh,1.8rem)] font-semibold leading-[0.98] tracking-[-0.045em]">
          {text.title}
        </h2>
        <DesignTenure language={language} />
        <p className="mt-2 max-w-[58ch] text-[clamp(10px,1.35vh,14px)] leading-snug text-white/78">
          {text.body}
        </p>
        <span
          className="about-signature"
          aria-hidden="true"
        />
      </div>

      {blocks.map((block) => (
        <div
          key={block.id}
          className={`about-frame about-frame--${block.id} overflow-visible text-white`}
        >
          <div className="about-caption absolute bottom-full left-0 mb-2.5 w-full md:mb-3">
            {block.kind === 'photo' && block.label[language] ? (
              <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
                <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-white/72 md:text-[11px]">
                  {block.label[language]}
                </p>
              </div>
            ) : (
              <div>
                <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-white/90 md:text-xs">
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
            <img
              src={block.image}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      ))}
      </div>
      </div>
    </section>
  );
};
