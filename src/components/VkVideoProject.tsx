import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Language } from '../types';

export function VkVideoProject({ language, onClose }: { language: Language; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const ru = language === 'ru';
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.showModal();
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);
  const descriptions = ru
    ? ['Объёмные знаки воспроизведения', 'Стекло и световые контуры крупным планом', 'Объёмный логотип VK Видео', 'Композиция красных и синих элементов', 'Процесс: свет и расположение объектов', 'Процесс: построение композиции', 'Логотипы VK Видео в пространстве']
    : ['Three-dimensional play symbols', 'Glass and light contours in detail', 'Three-dimensional VK Video logo', 'Red and blue elements', 'Process: lighting and object placement', 'Process: composition setup', 'VK Video logos in space'];
  const photo = (n: number) => <img key={n} src={`/projects/vk-video-3d/${n}.jpg`} alt={descriptions[n - 1]} width={5504} height={3072} loading="lazy" decoding="async" />;
  return <dialog ref={dialog} className="black-off-project vk-video-project" aria-labelledby="vk-video-title" onCancel={onClose}>
    <button className="project-close" autoFocus onClick={onClose} aria-label={ru ? 'Закрыть проект' : 'Close project'}><X size={22} /></button>
    <article>
      <img className="project-hero" src="/projects/vk-video-3d/shapka.jpg" alt="VK Video — 3D Visual System" width={6336} height={2688} />
      <div className="project-intro">
        <div><span className="project-kicker">3D / VISUAL SYSTEM</span><h2 id="vk-video-title">VK Video<span className="project-subtitle">3D Visual System</span></h2></div>
        <div className="project-description">
          <h3>{ru ? 'Знакомый знак. Новое измерение.' : 'A familiar symbol. A new dimension.'}</h3>
          <p>{ru ? 'Серия 3D-визуализаций, в которой знаки VK Видео становятся объёмными объектами. Прозрачные оболочки, глянцевые поверхности и красно-синие световые контуры формируют единый визуальный язык.' : 'A series of 3D visualisations that turns VK Video symbols into dimensional objects. Transparent shells, glossy surfaces and red-and-blue light contours form a consistent visual language.'}</p>
          <p>{ru ? 'Композиции раскрывают систему в разных масштабах: от крупного плана с преломлениями и отражениями до сцен с множеством элементов. Тёмное окружение подчёркивает свет и глубину, а повторение форм задаёт ритм. В кейсе представлены финальные изображения и рабочие кадры построения сцен.' : 'The compositions explore the system at different scales, from close-ups of refractions and reflections to scenes with multiple elements. Dark surroundings emphasise light and depth, while repeated shapes establish a rhythm. The case includes final images and behind-the-scenes views of the scene setup.'}</p>
        </div>
      </div>
      <div className="project-gallery">{photo(1)}{photo(2)}{photo(3)}{photo(4)}{photo(7)}
        <h3 className="project-process-title">{ru ? 'За кадром' : 'Behind the scenes'}</h3>
        <div className="project-detail-pair">{photo(5)}{photo(6)}</div>
      </div>
      <footer className="project-footer"><span>VK Video / ArtDeejay</span><button onClick={onClose}>{ru ? 'Вернуться к работам' : 'Back to works'} ↗</button></footer>
    </article>
  </dialog>;
}
