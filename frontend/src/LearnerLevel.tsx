import {learnerLevel} from './levels';
import './level.css';

export function LearnerLevel({totalXp}: {totalXp: number}) {
  const progress = learnerLevel(totalXp);
  return <section className="learner-level" aria-label="Learner level">
    <div className="learner-level-heading"><strong>Level {progress.level}</strong><span>{progress.totalXp} total XP</span></div>
    <p>Across all your languages</p>
    <div className="learner-level-track" role="progressbar" aria-label="Progress toward next level"
      aria-valuemin={0} aria-valuemax={progress.requiredXp} aria-valuenow={progress.earnedXp}
      aria-valuetext={`${progress.earnedXp} of ${progress.requiredXp} XP toward Level ${progress.level + 1}`}>
      <span style={{width: `${progress.percent}%`}}/>
    </div>
    <p>{progress.remainingXp} XP to Level {progress.level + 1} · Next level at {progress.nextLevelXp} total XP</p>
  </section>;
}
