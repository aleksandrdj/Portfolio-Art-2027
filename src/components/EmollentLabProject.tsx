import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Language } from '../types';
import './EmollentLabProject.css';

const asset = (name: string) => `/projects/emollent-lab/${name}.webp`;

export function EmollentLabProject({ language, onClose }: { language: Language; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const ru = language === 'ru';

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.showModal();
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  const visual = (number: number, altRu: string, altEn: string) => <figure className="emollent-visual">
    <img src={asset(String(number))} alt={ru ? altRu : altEn} width={2200} height={1228} loading="lazy" decoding="async" />
  </figure>;

  return <dialog ref={dialog} className="black-off-project emollent-project" aria-labelledby="emollent-title" onCancel={onClose}>
    <button className="project-close" autoFocus onClick={onClose} aria-label={ru ? 'Закрыть проект' : 'Close project'}><X size={22} /></button>
    <article>
      <img className="project-hero" src={asset('shapka')} alt={ru ? 'ÉMOLLENT LAB — айдентика линейки ухода за телом' : 'ÉMOLLENT LAB body care identity'} width={3000} height={1273} />
      <div className="project-intro emollent-intro">
        <div><span className="project-kicker">IDENTITY / PACKAGING</span><h2 id="emollent-title">ÉMOLLENT LAB</h2></div>
        <div className="project-description">
          <h3>{ru ? 'Уход, который видно и хочется почувствовать.' : 'Care you can see and almost feel.'}</h3>
          <p>{ru
            ? 'ÉMOLLENT LAB — визуальная система для линейки средств по уходу за телом. В её основе — контраст спокойной лабораторной типографики и выразительных фактур, которые передают характер каждого продукта ещё до знакомства с ароматом.'
            : 'ÉMOLLENT LAB is a visual system for a body care range. Restrained, laboratory-inspired typography meets expressive textures, giving each product its own character before the scent is even discovered.'}</p>
          <p>{ru
            ? 'Три направления — Thalasso Therapie, Piña Colada и Macadamia Coconut — объединены общей архитектурой упаковки. Цвет, ингредиенты и пластика текстур меняют настроение от продукта к продукту, сохраняя цельность линейки.'
            : 'Three expressions — Thalasso Therapie, Piña Colada and Macadamia Coconut — share one packaging architecture. Colour, ingredients and tactile textures shift the mood of each product while keeping the range cohesive.'}</p>
        </div>
      </div>
      <div className="emollent-gallery">
        <div className="emollent-section-heading"><span>01 / {ru ? 'СИСТЕМА' : 'SYSTEM'}</span><h3>{ru ? 'Одна форма. Три характера.' : 'One form. Three characters.'}</h3></div>
        {visual(1, 'Система айдентики и три текстуры ÉMOLLENT LAB', 'Identity system and three ÉMOLLENT LAB textures')}
        <div className="emollent-section-heading emollent-section-heading--products"><span>02 / {ru ? 'ЛИНЕЙКА' : 'THE RANGE'}</span><h3>{ru ? 'Продукт в центре истории.' : 'The product at the heart of the story.'}</h3></div>
        {visual(2, 'Thalasso Therapie — тёмная скраб-маска на бирюзовом фоне', 'Thalasso Therapie dark scrub mask on turquoise')}
        <div className="emollent-pair">
          {visual(3, 'Piña Colada — жёлтая упаковка с ананасом и кокосом', 'Piña Colada yellow packaging with pineapple and coconut')}
          {visual(4, 'Macadamia Coconut — голубая упаковка с кокосом и макадамией', 'Macadamia Coconut blue packaging with coconut and macadamia')}
        </div>
        {visual(5, 'Три продукта ÉMOLLENT LAB в общей системе упаковки', 'Three ÉMOLLENT LAB products in one packaging system')}
      </div>
      <footer className="project-footer"><span>ÉMOLLENT LAB / ArtDeejay</span><button onClick={onClose}>{ru ? 'Вернуться к работам' : 'Back to works'} ↗</button></footer>
    </article>
  </dialog>;
}
