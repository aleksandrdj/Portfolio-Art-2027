import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, X } from 'lucide-react';
import { Language } from '../types';

const base = '/projects/valentino/';

export function ValentinoProject({ language, onClose }: { language: Language; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const videoFrame = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [loadVideo, setLoadVideo] = useState(false);
  const [videoState, setVideoState] = useState<'loading' | 'playing' | 'error'>('loading');
  const [expanded, setExpanded] = useState(false);
  const ru = language === 'ru';

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.showModal();
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  useEffect(() => {
    const frame = videoFrame.current;
    if (!frame) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setLoadVideo(true);
        if (video.current?.paused) video.current.play().catch(() => {});
      } else if (video.current && !video.current.paused) {
        video.current.pause();
      }
    }, { root: dialog.current, rootMargin: '300px 0px', threshold: 0.01 });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    const resetControls = () => { if (!document.fullscreenElement) element.controls = false; };
    document.addEventListener('fullscreenchange', resetControls);
    element.addEventListener('webkitendfullscreen', resetControls);
    return () => {
      document.removeEventListener('fullscreenchange', resetControls);
      element.removeEventListener('webkitendfullscreen', resetControls);
    };
  }, [loadVideo]);

  const image = (name: string, alt: string, width: number, height: number) =>
    <img src={`${base}${name}`} alt={alt} width={width} height={height} loading="lazy" decoding="async" />;

  const openFullscreen = async () => {
    const element = video.current;
    if (!element) return;
    if (expanded) {
      setExpanded(false);
      element.controls = false;
      return;
    }
    element.controls = true;
    try {
      if (element.requestFullscreen) await element.requestFullscreen();
      else {
        const iosVideo = element as HTMLVideoElement & { webkitEnterFullscreen?: () => void };
        if (iosVideo.webkitEnterFullscreen) iosVideo.webkitEnterFullscreen();
        else setExpanded(true);
      }
    } catch {
      setExpanded(true);
    }
  };

  return <dialog ref={dialog} className="black-off-project valentino-project" aria-labelledby="valentino-title" onCancel={event => { if (expanded) { event.preventDefault(); setExpanded(false); if (video.current) video.current.controls = false; } else onClose(); }}>
    <button className="project-close" autoFocus onClick={onClose} aria-label={ru ? 'Закрыть проект' : 'Close project'}><X size={22} /></button>
    <article>
      <img className="project-hero" src={`${base}shapka.jpg`} alt={ru ? 'Тёмный флакон на фоне кристаллов' : 'Dark bottle against crystal forms'} width={3200} height={1357} fetchPriority="high" />
      <div className="project-intro">
        <div><span className="project-kicker">3D / INDEPENDENT CONCEPT</span><h2 id="valentino-title">Valentino<span className="project-subtitle">{ru ? 'Свет внутри формы' : 'Light within form'}</span></h2></div>
        <div className="project-description">
          <h3>{ru ? 'Предмет как маленькая вселенная.' : 'An object as a world of its own.'}</h3>
          <p>{ru ? 'Авторский 3D-концепт, построенный вокруг контраста хрупкого стекла и массивного камня. Холодный свет проходит через грани флакона, а кристаллы задают движение и меняют силуэт сцены.' : 'An independent 3D concept built on the contrast between fragile glass and solid stone. Cool light travels through the bottle’s facets, while crystals bring movement and reshape the scene’s silhouette.'}</p>
          <p>{ru ? 'Серия исследует один объект в разных масштабах: от почти абстрактного макро до монументальной композиции. Видеосцена продолжает эту историю в движении.' : 'The series explores one object at different scales, from an almost abstract close-up to a monumental composition. The moving image carries the same visual story forward.'}</p>
          <small>{ru ? 'Неофициальный авторский проект. Не создан по заказу Valentino и не связан с брендом.' : 'Unofficial independent project. Not commissioned by or affiliated with Valentino.'}</small>
        </div>
      </div>
      <div className="project-gallery">
        <figure className="valentino-film" ref={videoFrame}>
          <div className="valentino-film-heading"><div><span className="valentino-film-kicker">01 / MOTION</span><h3>{ru ? 'Сцена в движении' : 'The scene in motion'}</h3></div><span className="valentino-film-duration">FILM · 00:27</span></div>
          <div className={`valentino-film-stage${expanded ? ' is-expanded' : ''}`}>
            {loadVideo && <video ref={video} src={`${base}showroom.mp4`} poster={`${base}shapka.jpg`} autoPlay muted loop playsInline preload="metadata" onPlaying={() => setVideoState('playing')} onWaiting={() => setVideoState('loading')} onError={() => setVideoState('error')} aria-label={ru ? 'Анимация 3D-концепта Valentino' : 'Valentino 3D concept animation'} />}
            <button className="valentino-film-fullscreen" type="button" onClick={openFullscreen} aria-label={expanded ? (ru ? 'Свернуть видео' : 'Exit fullscreen') : (ru ? 'Открыть видео на весь экран' : 'Open video fullscreen')}>{expanded ? <Minimize2 size={17} aria-hidden="true" /> : <Maximize2 size={17} aria-hidden="true" />}<span>{expanded ? (ru ? 'Свернуть' : 'Exit fullscreen') : (ru ? 'На весь экран' : 'Fullscreen')}</span></button>
            {videoState !== 'playing' && <div className="valentino-film-status" role="status" aria-live="polite">
              {videoState === 'loading' ? <><span className="valentino-film-spinner" aria-hidden="true" />{ru ? 'Загружаем видео…' : 'Loading film…'}</> : <button type="button" onClick={() => { setVideoState('loading'); video.current?.load(); video.current?.play().catch(() => setVideoState('error')); }}>{ru ? 'Повторить загрузку видео' : 'Retry video'}</button>}
            </div>}
          </div>
        </figure>
        {image('low-angle.jpg', ru ? 'Флакон с нижней точки обзора' : 'Low angle view of the bottle', 1672, 941)}
        {image('crystal-orbit.jpg', ru ? 'Флакон среди парящих кристаллов' : 'Bottle surrounded by floating crystals', 1654, 951)}
        {image('glass-macro.jpg', ru ? 'Крупный план гранёного стекла' : 'Close-up of faceted glass', 1654, 951)}
        {image('monumental.jpg', ru ? 'Флакон среди каменных монолитов' : 'Bottle among stone monoliths', 1672, 941)}
      </div>
      <footer className="project-footer"><span>Valentino — {ru ? 'авторский концепт' : 'independent concept'} / ArtDeejay</span><button onClick={onClose}>{ru ? 'Вернуться к работам' : 'Back to works'} ↗</button></footer>
    </article>
  </dialog>;
}
