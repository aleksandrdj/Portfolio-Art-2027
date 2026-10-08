import React, { useState } from 'react';
import './PortfolioSection.css';

type Category = {
  title: string;
  description: string;
  projects: string[];
};

const categories: Category[] = [
  { title: '3D', description: 'CGI, рендеры и объекты в движении.', projects: ['Проект 01', 'Проект 02', 'Проект 03'] },
  { title: 'Digital', description: 'Кампании, интерфейсы и визуальные системы.', projects: ['Проект 01', 'Проект 02', 'Проект 03'] },
  { title: 'Презентации', description: 'Pitch decks и истории для брендов и продуктов.', projects: ['Проект 01', 'Проект 02'] },
  { title: 'Айдентика', description: 'Логотипы, брендинг, упаковка и гайдлайны.', projects: ['Проект 01', 'Проект 02', 'Проект 03'] },
  { title: 'Motion / Видео', description: 'Заставки, ролики и промо в движении.', projects: ['Проект 01', 'Проект 02'] },
];

export const PortfolioSection: React.FC = () => {
  const [selected, setSelected] = useState<{ category: string; project: string } | null>(null);

  return (
    <section className="portfolio-catalog" id="works" aria-label="Работы">
      <div className="portfolio-intro">
        <p className="portfolio-eyebrow">Работы / Works</p>
        <h2>Идеи, превращённые<br />в визуальные системы.</h2>
        <p className="portfolio-lead">Выбери направление, чтобы посмотреть проекты и процесс.</p>
      </div>
      <div className="portfolio-categories">
        {categories.map((category, categoryIndex) => (
          <section className={`portfolio-category portfolio-category--${categoryIndex + 1}`} key={category.title}>
            <div className="portfolio-category-head">
              <h3>{category.title}</h3>
              <p>{category.description}</p>
            </div>
            <div className="portfolio-projects">
              {category.projects.map((project, projectIndex) => (
                <button
                  className={`portfolio-project portfolio-project--${projectIndex + 1}`}
                  type="button"
                  key={project}
                  onClick={() => setSelected({ category: category.title, project })}
                >
                  <span className="portfolio-project-art" aria-hidden="true" />
                  <span className="portfolio-project-meta">
                    <strong>{project}</strong>
                    <small>Добавим материал</small>
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
      {selected && (
        <div className="portfolio-modal" role="dialog" aria-modal="true" aria-label={selected.project}>
          <button className="portfolio-modal-close" type="button" onClick={() => setSelected(null)}>Закрыть</button>
          <p className="portfolio-eyebrow">{selected.category}</p>
          <h2>{selected.project}</h2>
          <p>Здесь появится полноценный кейс: первый экран, описание задачи, процесс, изображения и видео.</p>
        </div>
      )}
    </section>
  );
};
