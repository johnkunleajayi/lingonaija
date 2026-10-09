import {BookOpen, MessageCircle, TrendingUp, Leaf} from 'lucide-react';
import './landing-features.css';

const features = [
  {Icon: BookOpen, title: 'Interactive Lessons', description: 'Practical, bite-sized lessons designed for everyday communication.'},
  {Icon: MessageCircle, title: 'Conversation Practice', description: 'Practice realistic exchanges with your LingoNaija language companion.'},
  {Icon: TrendingUp, title: 'Track Your Progress', description: 'Build XP, maintain your streak and see your progress as you learn.'},
  {Icon: Leaf, title: 'Nigerian Context', description: 'Learn useful expressions alongside the culture and context that give them meaning.'},
];

export function LandingFeatures() {
  return <section className="landing-features" aria-labelledby="landing-features-title">
    <div className="landing-features-inner">
      <div className="landing-features-heading">
        <h2 id="landing-features-title">Built for real conversations</h2>
        <p>Learn more than words. Build practical language skills through lessons, conversation and Nigerian cultural context.</p>
      </div>
      <div className="landing-features-grid">
        {features.map(({Icon, title, description}) => <article className="landing-feature" key={title}>
          <span className="landing-feature-icon"><Icon size={26} strokeWidth={1.8} aria-hidden="true"/></span>
          <h3>{title}</h3>
          <p>{description}</p>
        </article>)}
      </div>
    </div>
  </section>;
}
