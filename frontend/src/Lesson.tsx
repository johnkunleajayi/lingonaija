import {LessonMedia} from './LessonMedia';
import {LessonCelebration} from './LessonCelebration';
import {useEffect, useRef, useState} from 'react';

import {BookOpen, Check, X} from 'lucide-react';

import {correctAnswerText, type LessonContent, type ExerciseAnswer} from './lessonContent';
import {SentenceOrder} from './SentenceOrder';

import './lesson.css';
import {courses, type Language} from './courses';



export function Lesson({content, onClose, onComplete, language='yoruba', unitNumber=1}: {content: LessonContent; language?: Language; unitNumber?: number; onClose: () => void; onComplete?: (answers:ExerciseAnswer[]) => Promise<void>}) {

  const [celebrationFinished,setCelebrationFinished]=useState(false);
  const returnTimer=useRef<number|undefined>(undefined);
  const closeRef=useRef(onClose);closeRef.current=onClose;
  function returnToJourney(){window.clearTimeout(returnTimer.current);closeRef.current();}
  const [step, setStep] = useState(0);

  const [answer, setAnswer] = useState<string | null>(null);

  const [feedbackCorrect,setFeedbackCorrect]=useState(false);
  const [correct, setCorrect] = useState(0);

  const answers = useRef<ExerciseAnswer[]>([]);

  const saving = useRef(false);

  const [saveState, setSaveState] = useState<'idle'|'saving'|'saved'|'failed'>('idle');

  async function saveCompletion(){

    if(!onComplete || saving.current)return;

    saving.current=true;setSaveState('saving');

    try{await onComplete(answers.current);setSaveState('saved')}catch{setSaveState('failed')}finally{saving.current=false}

  }

  const panel = useRef<HTMLElement>(null);

  const heading = useRef<HTMLHeadingElement>(null);

  const complete = step === content.exercises.length;

  const exercise = content.exercises[step];
  useEffect(()=>{
    if(!complete||!celebrationFinished||saveState!=='saved')return;
    returnTimer.current=window.setTimeout(()=>closeRef.current(),7000);
    return()=>window.clearTimeout(returnTimer.current);
  },[complete,celebrationFinished,saveState]);

  useEffect(() => {

    const previous = document.activeElement as HTMLElement | null;

    const oldOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    panel.current?.querySelector<HTMLButtonElement>('button')?.focus();

    return () => {document.body.style.overflow = oldOverflow; previous?.focus();};

  }, []);

  useEffect(() => {if (step > 0) heading.current?.focus();}, [step]);

  return <div className="backdrop" onKeyDown={event => {

    if (event.key === 'Escape') {event.stopPropagation(); if(saveState!=='saving')returnToJourney();}

    if (event.key === 'Tab') {

      const buttons = Array.from(panel.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);

      const first = buttons[0], last = buttons[buttons.length - 1];

      if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last?.focus();}

      else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first?.focus();}

    }

  }}><section ref={panel} className="modal lesson-player" role="dialog" aria-modal="true" aria-labelledby="lesson-title">

    <button className="icon close" disabled={saveState==='saving'} onClick={returnToJourney} aria-label={complete&&saveState!=='saved'?'Close lesson without saving':'Close lesson'}><X/></button>

    <BookOpen aria-hidden="true"/><span className="eyebrow">{courses[language].name} · Unit {unitNumber}</span>

    <h2 id="lesson-title">{content.title}</h2>

    {complete&&<LessonCelebration onFinished={()=>setCelebrationFinished(true)}/>}

    {complete ? <>

      <h3 ref={heading} tabIndex={-1}>{saveState==='saved'?'Lesson complete!':saveState==='saving'?'Saving your completion…':saveState==='failed'?'Completion not saved':'Exercises finished'}</h3>

      <p>{content.summary ?? 'You practised welcoming a guest and greeting someone in the morning and afternoon.'}</p>

      <p>{correct} of {content.exercises.length} correct on your first choice. Keep practising!</p>

      <p className="lesson-note" role="status">{saveState==='saved'?'Completion saved. This lesson awards 10 XP once; replaying adds no XP.':saveState==='saving'?'Saving completion…':saveState==='failed'?'Your progress and XP have not been confirmed saved. Retry saving before leaving.':'This practice session is not saved yet.'}</p>

      {saveState==='failed'&&<button className="primary" onClick={()=>{void saveCompletion()}}>Retry saving</button>}

      <button className="primary" disabled={saveState==='saving'} onClick={returnToJourney}>{saveState==='saved'?'Back to my journey':saveState==='saving'?'Saving…':'Leave without saving'}</button>

    </> : <>

      {step === 0 && <p>{content.introduction}</p>}

      <div className="lesson-exercise-progress">
        <div className="lesson-counter">Exercise {step + 1} of {content.exercises.length}</div>
        <div className="exercise-segments" role="progressbar" aria-label="Exercise progress" aria-valuemin={0} aria-valuemax={content.exercises.length} aria-valuenow={step} aria-valuetext={`${step} of ${content.exercises.length} exercises finished; exercise ${step + 1} is current`}>
          {content.exercises.map((item,index)=><span key={item.id} aria-hidden="true" className={index<step?'finished':index===step?'current':'pending'}/>)}
        </div>
      </div>

      {exercise.media&&<LessonMedia key={exercise.media.src} media={exercise.media}/>}
      <h3 ref={heading} tabIndex={-1}>{exercise.prompt}</h3>

      {exercise.type==='sentence_order'?<SentenceOrder key={exercise.id} exercise={exercise} checked={answer!==null} onCheck={(ids,isCorrect)=>{
        if(answers.current[step]===undefined){answers.current[step]=ids; if(isCorrect)setCorrect(value=>value+1);}
        setAnswer(ids.join('|'));setFeedbackCorrect(isCorrect);
      }}/> : <div className="lesson-options">{exercise.options.map(option => <button key={option} disabled={answer !== null} className={`lesson-option ${answer === option ? 'chosen' : ''}`} onClick={() => {

        if(answer !== null)return; answers.current[step]=exercise.options.indexOf(option); setAnswer(option);setFeedbackCorrect(option===exercise.answer); if (option === exercise.answer) setCorrect(value => value + 1);

      }}>{option}</button>)}</div>}

      {answer !== null && <div className="lesson-feedback" data-correct={feedbackCorrect} role="status">

        <strong>{feedbackCorrect ? <><Check size={18} aria-hidden="true"/> Correct!</> : 'Not quite — let’s learn it.'}</strong>

        {!feedbackCorrect && <p>Correct answer: {correctAnswerText(exercise)}</p>}

        <p>{exercise.explanation}</p>

        <button className="primary" onClick={() => {setAnswer(null); setStep(value => value + 1); if(step===content.exercises.length-1)void saveCompletion();}}>{step === content.exercises.length - 1 ? 'Finish lesson' : 'Next exercise'}</button>

      </div>}

    </>}

  </section></div>;

}

