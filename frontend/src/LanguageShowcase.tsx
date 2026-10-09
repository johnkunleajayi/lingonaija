import {ArrowRight, Check} from 'lucide-react';
import {Character} from './Character';
import {courses, type Language} from './courses';
import './language-showcase.css';

const introductions = {
  yoruba: {greeting: 'Báwo ni?', description: 'Learn greetings, introductions and everyday expressions through Yorùbá language and context.'},
  igbo: {greeting: 'Kedụ?', description: 'Build practical Igbo for greetings, introductions and everyday conversations.'},
  hausa: {greeting: 'Sannu!', description: 'Learn useful Hausa for greetings, introductions and everyday communication.'},
};

export function LanguageShowcase({language, onLanguage, busy=false}: {language:Language; onLanguage:(language:Language)=>void; busy?:boolean}) {
  return <section id="languages" className="language-showcase" aria-labelledby="language-showcase-title">
    <div className="language-showcase-heading">
      <h2 id="language-showcase-title">Choose a language. Enter a culture.</h2>
      <p>Start with Yorùbá, Igbo or Hausa and learn through practical everyday communication.</p>
    </div>
    <div className="language-showcase-grid">
      {(Object.keys(introductions) as Language[]).map(key => <article className={`showcase-card showcase-${key} ${language===key?'is-selected':''}`} key={key}>
        <div className="showcase-portrait">
          <span className="showcase-pattern" aria-hidden="true"/>
          {language===key&&<span className="showcase-selected"><Check size={14} aria-hidden="true"/> Selected</span>}
          <Character language={key}/>
          <span className="showcase-greeting">{introductions[key].greeting}</span>
        </div>
        <div className="showcase-content">
          <h3>{courses[key].name}</h3>
          <p className="showcase-companion">With {courses[key].person}, your {courses[key].name} companion</p>
          <p className="showcase-description">{introductions[key].description}</p>
          <button disabled={busy} onClick={()=>onLanguage(key)} aria-pressed={language===key}>Explore {courses[key].name}<ArrowRight size={19} aria-hidden="true"/></button>
        </div>
      </article>)}
    </div>
    <p className="showcase-selection">Selected: <strong>{courses[language].name}</strong></p>
  </section>;
}
