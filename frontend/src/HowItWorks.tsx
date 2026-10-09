import {BookOpen, MessageCircle, TrendingUp} from 'lucide-react';
import './how-it-works.css';

const steps = [
  {number: '01', title: 'Learn', Icon: BookOpen, description: 'Complete short, practical lessons built around everyday situations.'},
  {number: '02', title: 'Practise', Icon: MessageCircle, description: 'Use Conversation Practice with your language companion to reinforce what you learn.'},
  {number: '03', title: 'Keep growing', Icon: TrendingUp, description: 'Earn XP, build your streak and unlock the next lessons as you progress.'},
];

export function HowItWorks() {
  return <section id="real-life" className="how-it-works" aria-labelledby="how-it-works-title">
    <div className="how-it-works-inner">
      <div className="how-it-works-heading">
        <span className="how-it-works-label">How LingoNaija works</span>
        <h2 id="how-it-works-title">A learning journey that keeps you moving</h2>
        <p>Learn in small steps, practise what matters and build momentum as you progress.</p>
      </div>
      <ol className="how-it-works-path">
        {steps.map(({number, title, Icon, description}) => <li className="how-it-works-step" key={number}>
          <div className="how-it-works-node"><Icon size={28} strokeWidth={1.8} aria-hidden="true"/><span className="how-it-works-number" aria-hidden="true">{number}</span></div>
          <div className="how-it-works-copy"><h3>{title}</h3><p>{description}</p></div>
        </li>)}
      </ol>
    </div>
  </section>;
}
