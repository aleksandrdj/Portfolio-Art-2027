import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Language } from '../types';

const asset = (name: string) => `/projects/black-off/${name}.jpg`;
export function BlackOffProject({ language, onClose }: { language: Language; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const ru = language === 'ru';
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.showModal();
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);
  const descriptions = ru
    ? ['Панель управления и таймер', 'Детали открывания корпуса', 'Black OFF в интерьере', 'Телефон внутри бокса', 'Система модульных аксессуаров', 'Персонализация корпуса']
    : ['Controls and timer', 'Opening mechanism details', 'Black OFF in an interior', 'Phone inside the box', 'Modular accessories', 'Customised enclosure'];
  const photo = (n: number) => <img key={n} src={asset(String(n))} alt={descriptions[n - 1]} width={5504} height={3072} loading="lazy" decoding="async" />;
  return <dialog ref={dialog} className="black-off-project" aria-labelledby="black-off-title" onCancel={onClose}>
    <button className="project-close" autoFocus onClick={onClose} aria-label={ru ? 'Закрыть проект' : 'Close project'}><X size={22} /></button>
    <article>
      <img className="project-hero" src={asset('shapka')} alt={ru ? 'Black OFF — концепция детокс-бокса и эскизы' : 'Black OFF detox box concept and sketches'} width={6336} height={2688} />
      <div className="project-intro">
        <div><span className="project-kicker">{ru ? 'АВТОРСКАЯ КОНЦЕПЦИЯ / 3D' : 'INDEPENDENT CONCEPT / 3D'}</span><h2 id="black-off-title">Black OFF</h2></div>
        <div className="project-description">
          <h3>{ru ? 'Отключиться от экрана. Вернуться к себе.' : 'Step away from the screen. Come back to yourself.'}</h3>
          <p>{ru ? 'Black OFF — авторская концепция детокс-бокса для смартфона. Телефон помещается внутрь, а время до открытия задаётся таймером — чтобы освободить пространство для работы, отдыха и общения без постоянных отвлечений.' : 'Black OFF is an independent concept for a smartphone detox box. Place your phone inside and set the opening timer to make room for work, rest and conversation without constant distractions.'}</p>
          <p>{ru ? 'Концепция предусматривает встроенную зарядку и ультрафиолетовую обработку для уменьшения количества бактерий на поверхности телефона. Модульный корпус, вдохновлённый эстетикой конструктора, можно персонализировать с помощью держателей, органайзеров и декоративных элементов.' : 'The concept proposes integrated charging and ultraviolet treatment to reduce bacteria on the phone’s surface. Inspired by construction toys, the modular enclosure can be personalised with holders, organisers and decorative elements.'}</p>
          <small>{ru ? 'Независимый концептуальный проект Александра Савенкова. Не связан с LEGO Group и не является официальным продуктом или коллаборацией LEGO.' : 'An independent concept by Alexsandr Savenkov. Not affiliated with LEGO Group and not an official LEGO product or collaboration.'}</small>
        </div>
      </div>
      <div className="project-gallery">{photo(3)}<div className="project-detail-pair">{photo(1)}{photo(2)}</div>{photo(4)}{photo(5)}{photo(6)}</div>
      <footer className="project-footer"><span>Black OFF / ArtDeejay</span><button onClick={onClose}>{ru ? 'Вернуться к работам' : 'Back to works'} ↗</button></footer>
    </article>
  </dialog>;
}
