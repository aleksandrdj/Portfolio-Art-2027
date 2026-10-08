import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Language } from '../types';
import './AplGoProject.css';

const asset = (name: string) => `/projects/aplgo/${name}.webp`;

const imageDescriptions: Record<number, { ru: string; en: string }> = {
  1: { ru: 'Промокампания APL GO с продуктами All-time', en: 'APL GO All-time product campaign' },
  2: { ru: 'Пасхальная digital-кампания', en: 'Easter digital campaign' },
  3: { ru: 'Весенняя распродажа для рынка США', en: 'Spring sale for the U.S. market' },
  4: { ru: 'Кампания ко Дню памяти в США', en: 'U.S. Memorial Day campaign' },
  5: { ru: 'Анонс круиза APL GO', en: 'APL GO cruise announcement' },
  6: { ru: 'Промокампания Golden People', en: 'Golden People campaign' },
  7: { ru: 'Январская кампания Cyber Monday', en: 'January Cyber Monday campaign' },
  8: { ru: 'Кампания ко Дню отца', en: 'Father’s Day campaign' },
  9: { ru: 'Промо ко Дню святого Валентина', en: 'Valentine’s Day promotion' },
  10: { ru: 'Анонс события APL PLANET 2024', en: 'APL PLANET 2024 event announcement' },
  11: { ru: 'Кампания ко Дню президентов США', en: 'U.S. Presidents’ Day campaign' },
  12: { ru: 'Промо Leap Into Savings', en: 'Leap Into Savings promotion' },
  13: { ru: 'Продуктовая кампания с комплексом PFT', en: 'PFT product campaign' },
  14: { ru: 'Кампания Final Madness', en: 'Final Madness campaign' },
  15: { ru: 'Кампания к Международному женскому дню', en: 'International Women’s Day campaign' },
  16: { ru: 'Спортивная промокампания Swing Into Action', en: 'Swing Into Action sports campaign' },
  17: { ru: 'Продуктовая кампания Flash Upgrades', en: 'Flash Upgrades product campaign' },
  18: { ru: 'Анонс летней вечеринки APL GO', en: 'APL GO summer party announcement' },
};

export function AplGoProject({ language, onClose }: { language: Language; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const ru = language === 'ru';

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.showModal();
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  const visual = (number: number, priority = false) => (
    <figure className="aplgo-visual" key={number}>
      <img
        src={asset(String(number))}
        alt={imageDescriptions[number][language]}
        width={2000}
        height={1131}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
      />
    </figure>
  );

  return <dialog ref={dialog} className="black-off-project aplgo-project" aria-labelledby="aplgo-title" onCancel={onClose}>
    <button className="project-close" autoFocus onClick={onClose} aria-label={ru ? 'Закрыть проект' : 'Close project'}><X size={22} /></button>
    <article>
      <img className="project-hero" src={asset('shapka')} alt={ru ? 'Подборка digital-кампаний APL GO' : 'A selection of APL GO digital campaigns'} width={3000} height={1273} />
      <div className="project-intro aplgo-intro">
        <div>
          <span className="project-kicker">DIGITAL / APL GO / 2023–2024</span>
          <h2 id="aplgo-title">APL GO</h2>
          <dl className="aplgo-facts">
            <div><dt>{ru ? 'Роль' : 'Role'}</dt><dd>{ru ? 'Арт-директор и дизайнер' : 'Art director and designer'}</dd></div>
            <div><dt>{ru ? 'Рынки' : 'Markets'}</dt><dd>{ru ? 'Россия, США и Канада' : 'Russia, U.S. and Canada'}</dd></div>
            <div><dt>{ru ? 'Форматы' : 'Formats'}</dt><dd>{ru ? 'Digital-кампании, промо и события' : 'Digital campaigns, promotions and events'}</dd></div>
          </dl>
        </div>
        <div className="project-description">
          <h3>{ru ? 'Один бренд. Множество поводов быть заметным.' : 'One brand. Many reasons to stand out.'}</h3>
          <p>{ru
            ? 'Для APL GO я разрабатывал визуальные решения digital-кампаний — от идеи и арт-дирекшна до финальных материалов. В подборке собраны анонсы продуктов, сезонные акции и события для российского и североамериканского рынков.'
            : 'For APL GO, I developed visual directions for digital campaigns, from the initial idea and art direction to final assets. This selection brings together product announcements, seasonal promotions and events for the Russian and North American markets.'}</p>
          <p>{ru
            ? 'Каждая кампания меняет настроение, язык и культурные акценты под свой повод, сохраняя энергию и узнаваемость бренда. Выразительная типографика, свет и предметные сцены помогают сообщению быстро считываться в цифровой среде.'
            : 'Each campaign shifts its mood, language and cultural cues to fit the occasion while retaining the brand’s energy and recognisable character. Expressive type, lighting and product scenes make the message easy to read across digital channels.'}</p>
        </div>
      </div>

      <div className="aplgo-gallery">
        <section className="aplgo-chapter" aria-labelledby="aplgo-russia">
          <header className="aplgo-chapter-heading"><span>01 / {ru ? 'РОССИЯ' : 'RUSSIA'}</span><h3 id="aplgo-russia">{ru ? 'События и запуски' : 'Events and launches'}</h3><p>{ru ? 'От APL PLANET до продуктовых историй — разные сюжеты с общим характером.' : 'From APL PLANET to product stories, distinct narratives with a shared visual character.'}</p></header>
          {visual(10, true)}
          <div className="aplgo-pair">{visual(1)}{visual(13)}</div>
          <div className="aplgo-pair">{visual(5)}{visual(6)}</div>
        </section>
        <section className="aplgo-chapter" aria-labelledby="aplgo-north-america">
          <header className="aplgo-chapter-heading"><span>02 / {ru ? 'США И КАНАДА' : 'U.S. AND CANADA'}</span><h3 id="aplgo-north-america">{ru ? 'Поводы для диалога' : 'Moments to connect'}</h3><p>{ru ? 'Праздники, сезонные предложения и продуктовые промо, адаптированные к локальному контексту.' : 'Holidays, seasonal offers and product promotions shaped for the local context.'}</p></header>
          {visual(3)}
          <div className="aplgo-pair">{visual(11)}{visual(4)}</div>
          <div className="aplgo-pair">{visual(2)}{visual(15)}</div>
          <div className="aplgo-pair">{visual(7)}{visual(9)}</div>
          <div className="aplgo-pair">{visual(12)}{visual(14)}</div>
          <div className="aplgo-pair">{visual(16)}{visual(8)}</div>
          <div className="aplgo-pair">{visual(17)}{visual(18)}</div>
        </section>
      </div>
      <footer className="project-footer"><span>APL GO / ArtDeejay</span><button onClick={onClose}>{ru ? 'Вернуться к работам' : 'Back to works'} ↗</button></footer>
    </article>
  </dialog>;
}
