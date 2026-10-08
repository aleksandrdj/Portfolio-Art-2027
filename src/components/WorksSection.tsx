import React, { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Language } from '../types';
import './WorksSection.css';
import { BlackOffProject } from './BlackOffProject';
import { VkVideoProject } from './VkVideoProject';
import { ValentinoProject } from './ValentinoProject';
import { AplGoProject } from './AplGoProject';
import { EmollentLabProject } from './EmollentLabProject';

const directions = [
  { id: '3d', ru: '3D', en: '3D', copy: ['Объём. Свет. Материал.', 'Volume. Light. Material.'], tags: 'CGI / PRODUCT / VISUALISATION' },
  { id: 'digital', ru: 'Digital', en: 'Digital', copy: ['Дизайн для цифровой среды.', 'Design for digital spaces.'], tags: 'CAMPAIGNS / WEB / SOCIAL' },
  { id: 'presentations', ru: 'Презентации', en: 'Presentations', copy: ['Истории, которые убеждают.', 'Stories that persuade.'], tags: 'KEYNOTE / PITCH DECK / STORYTELLING' },
  { id: 'identity', ru: 'Айдентика', en: 'Identity', copy: ['Характер бренда в каждой детали.', 'Brand character in every detail.'], tags: 'BRANDING / PACKAGING / GUIDELINES' },
  { id: 'motion', ru: 'Motion / Видео', en: 'Motion / Film', copy: ['Ритм становится изображением.', 'Rhythm becomes an image.'], tags: 'ANIMATION / FILM / PROMO' },
];

export function WorksSection({ language }: { language: Language }) {
  const [active, setActive] = useState<string | null>('3d');
  const [projectOpen, setProjectOpen] = useState<'black-off' | 'vk-video' | 'valentino' | 'aplgo' | 'emollent-lab' | null>(null);
  const ru = language === 'ru';
  return <section className="works" id="works" aria-labelledby="works-title">
    <div className="works-heading">
      <h2 id="works-title" className="sr-only">{ru ? 'Работы' : 'Works'}</h2>
      <div className="works-introduction"><p>{ru ? 'От идеи до визуального мира.' : 'From an idea to a visual world.'}</p><span>{ru ? '3D, digital, брендинг и движение.' : '3D, digital, branding and motion.'}</span></div>
    </div>
    <div className="works-index">{directions.map((item, index) => {
      const open = active === item.id;
      return <article className={`work-direction ${open ? 'is-open' : ''}`} key={item.id}>
        <h3><button className="work-toggle" type="button" id={`toggle-${item.id}`} aria-expanded={open} aria-controls={`panel-${item.id}`} onClick={() => setActive(current => current === item.id ? null : item.id)}>
          <span className="work-number" aria-hidden="true">0{index + 1}</span><span className="work-title">{item[language]}</span><span className="work-description">{item.copy[ru ? 0 : 1]}</span><span className="work-icon" aria-hidden="true"><span className="work-icon-liquid" /><span className="work-icon-bar" /><span className="work-icon-bar work-icon-bar--vertical" /></span>
        </button></h3>
        <div className="work-panel" id={`panel-${item.id}`} role="region" aria-labelledby={`toggle-${item.id}`} aria-hidden={!open} inert={!open}><div className="work-panel-clip"><div className="work-panel-content">
          {item.id === '3d' ? <>
            <button className="black-off-cover" onClick={() => setProjectOpen('black-off')} aria-label={ru ? 'Открыть проект Black OFF' : 'Open Black OFF project'}><img src="/projects/black-off/shapka.jpg" width={6336} height={2688} loading="lazy" alt="Black OFF" /><span>{ru ? 'Смотреть проект' : 'View project'} <ArrowUpRight size={20} /></span></button>
            <div className="work-editorial"><p>Black OFF</p><span>{ru ? 'ДЕТОКС-БОКС / АВТОРСКАЯ КОНЦЕПЦИЯ' : 'DETOX BOX / INDEPENDENT CONCEPT'}</span><small>{ru ? 'Отключиться от экрана. Вернуться к себе.' : 'Step away from the screen. Come back to yourself.'}</small></div>
            <button className="black-off-cover" onClick={() => setProjectOpen('vk-video')} aria-label={ru ? 'Открыть проект VK Video' : 'Open VK Video project'}><img src="/projects/vk-video-3d/shapka.jpg" width={6336} height={2688} loading="lazy" alt="VK Video — 3D Visual System" /><span>{ru ? 'Смотреть проект' : 'View project'} <ArrowUpRight size={20} /></span></button>
            <div className="work-editorial"><p>VK Video</p><span>3D VISUAL SYSTEM</span><small>{ru ? 'Знакомый знак. Новое измерение.' : 'A familiar symbol. A new dimension.'}</small></div>
            <button className="black-off-cover" onClick={() => setProjectOpen('valentino')} aria-label={ru ? 'Открыть проект Valentino' : 'Open Valentino project'}><img src="/projects/valentino/shapka.jpg" width={3200} height={1357} loading="lazy" alt={ru ? 'Авторский 3D-концепт Valentino' : 'Independent Valentino 3D concept'} /><span>{ru ? 'Смотреть проект' : 'View project'} <ArrowUpRight size={20} /></span></button>
            <div className="work-editorial"><p>Valentino</p><span>{ru ? '3D / АВТОРСКИЙ КОНЦЕПТ' : '3D / INDEPENDENT CONCEPT'}</span><small>{ru ? 'Стекло, камень и свет в одной сцене.' : 'Glass, stone and light in one scene.'}</small></div>
          </> : item.id === 'digital' ? <>
            <button className="black-off-cover" onClick={() => setProjectOpen('aplgo')} aria-label={ru ? 'Открыть проект APL GO' : 'Open APL GO project'}><img src="/projects/aplgo/shapka.webp" width={3000} height={1273} loading="lazy" alt={ru ? 'APL GO — digital-кампании' : 'APL GO digital campaigns'} /><span>{ru ? 'Смотреть проект' : 'View project'} <ArrowUpRight size={20} /></span></button>
            <div className="work-editorial"><p>APL GO</p><span>DIGITAL CAMPAIGNS / 2023–2024</span><small>{ru ? 'Один бренд. Разные рынки и поводы.' : 'One brand. Different markets and moments.'}</small></div>
          </> : item.id === 'identity' ? <>
            <button className="black-off-cover" onClick={() => setProjectOpen('emollent-lab')} aria-label={ru ? 'Открыть проект ÉMOLLENT LAB' : 'Open ÉMOLLENT LAB project'}><img src="/projects/emollent-lab/shapka.webp" width={3000} height={1273} loading="lazy" alt={ru ? 'ÉMOLLENT LAB — айдентика и упаковка' : 'ÉMOLLENT LAB identity and packaging'} /><span>{ru ? 'Смотреть проект' : 'View project'} <ArrowUpRight size={20} /></span></button>
            <div className="work-editorial"><p>ÉMOLLENT LAB</p><span>IDENTITY / PACKAGING</span><small>{ru ? 'Одна система. Три характера.' : 'One system. Three characters.'}</small></div>
          </> : <><div className="work-material" aria-label={ru ? 'Место для обложки проекта' : 'Project cover placeholder'}><span className="work-material-word" aria-hidden="true">{item[language]}</span><span className="work-material-note">{ru ? 'Подборка в подготовке' : 'Selection in progress'}</span></div>
          <div className="work-editorial"><p>{item.copy[ru ? 0 : 1]}</p><span>{item.tags}</span><small>{ru ? 'Скоро здесь появятся проекты, детали и процесс работы.' : 'Projects, details and the creative process are coming here soon.'}</small></div></>}
        </div></div></div>
      </article>;
    })}</div>
    <div className="works-end"><span>{ru ? 'Александр Савенков' : 'Alexsandr Savenkov'} / ArtDeejay</span><a href="#portfolio-screen">{ru ? 'К началу' : 'Back to top'} <ArrowUpRight size={18} aria-hidden="true" /></a></div>
    {projectOpen === 'black-off' && <BlackOffProject language={language} onClose={() => setProjectOpen(null)} />}
    {projectOpen === 'vk-video' && <VkVideoProject language={language} onClose={() => setProjectOpen(null)} />}
    {projectOpen === 'valentino' && <ValentinoProject language={language} onClose={() => setProjectOpen(null)} />}
    {projectOpen === 'aplgo' && <AplGoProject language={language} onClose={() => setProjectOpen(null)} />}
    {projectOpen === 'emollent-lab' && <EmollentLabProject language={language} onClose={() => setProjectOpen(null)} />}
  </section>;
}
