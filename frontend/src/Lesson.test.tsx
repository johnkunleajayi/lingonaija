// @vitest-environment jsdom
import {act,render, screen, fireEvent, cleanup, waitFor} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {Lesson} from './Lesson';
import {type Exercise,type Choice,courseUnits,learningCourses, warmWelcome, everydayGreetings} from './lessonContent';
function choiceExercise(exercise:Exercise):Choice {if(exercise.type==='sentence_order')throw new Error('Expected choice exercise');return exercise;}
function answerCorrect(exercise:Exercise){
 if(exercise.type==='sentence_order'){
  for(const id of exercise.correctOrder)fireEvent.click(screen.getByRole('button',{name:`Add ${exercise.tiles.find(t=>t.id===id)!.text}`}));
  fireEvent.click(screen.getByRole('button',{name:'Check'}));
 }else fireEvent.click(screen.getByRole('button',{name:choiceExercise(exercise).answer}));
}
afterEach(cleanup);
it('gives immediate feedback, prevents repeat answers and completes all exercises', () => {
  const close = vi.fn(); render(<Lesson content={warmWelcome} onClose={close}/>);
  warmWelcome.exercises.forEach((exercise, index) => {
    expect(screen.getByText(`Exercise ${index + 1} of 4`)).toBeTruthy();
    const choice = index === 0 ? choiceExercise(exercise).options[1] : choiceExercise(exercise).answer;
    fireEvent.click(screen.getByRole('button', {name: choice}));
    expect(screen.getByRole('status').textContent).toContain(index === 0 ? 'Not quite' : 'Correct!');
    expect(screen.getByRole('status').textContent).toContain(exercise.explanation);
    if (index === 0) expect(screen.getByRole('status').textContent).toContain(`Correct answer: ${choiceExercise(exercise).answer}`);
    expect((screen.getByRole('button', {name: choice}) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', {name: index === 3 ? 'Finish lesson' : 'Next exercise'}));
  });
  expect(screen.getByText('Exercises finished')).toBeTruthy();
  expect(screen.getByText('3 of 4 correct on your first choice. Keep practising!')).toBeTruthy();
  expect(screen.getByText('This practice session is not saved yet.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', {name: 'Leave without saving'})); expect(close).toHaveBeenCalledOnce();
});
it('closes with Escape and restores focus when unmounted', () => {
  const trigger = document.createElement('button'); document.body.append(trigger); trigger.focus();
  const close = vi.fn(); const view = render(<Lesson content={warmWelcome} onClose={close}/>);
  fireEvent.keyDown(screen.getByRole('dialog'), {key: 'Escape'}); expect(close).toHaveBeenCalledOnce();
  view.unmount(); expect(document.activeElement).toBe(trigger); trigger.remove();
});
it('starts fresh when reopened and keeps content structurally valid', () => {
  const view = render(<Lesson content={warmWelcome} onClose={() => {}}/>);
  fireEvent.click(screen.getByRole('button', {name: choiceExercise(warmWelcome.exercises[0]).answer})); view.unmount();
  render(<Lesson content={warmWelcome} onClose={() => {}}/>);
  expect(screen.queryByRole('status')).toBeNull();
  expect(Object.keys(learningCourses)).toEqual(['yoruba','igbo','hausa']);
  expect(new Set(warmWelcome.exercises.map(item => item.id)).size).toBe(4);
  for (const item of warmWelcome.exercises) expect(choiceExercise(item).options.filter(option => option === choiceExercise(item).answer)).toHaveLength(1);
});

it('submits first choices and retries a failed save without losing the session',async()=>{
 const save=vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
 render(<Lesson content={warmWelcome} onClose={()=>{}} onComplete={save}/>);
 for(let i=0;i<4;i++){
  fireEvent.click(screen.getByRole('button',{name:choiceExercise(warmWelcome.exercises[i]).answer}));
  fireEvent.click(screen.getByRole('button',{name:i===3?'Finish lesson':'Next exercise'}));
 }
 await screen.findByRole('button',{name:'Retry saving'});
 expect(save).toHaveBeenCalledWith([0,1,2,1]);
 fireEvent.click(screen.getByRole('button',{name:'Retry saving'}));
 await waitFor(()=>expect(screen.getByRole('status').textContent).toContain('Completion saved'));
 expect(save).toHaveBeenCalledTimes(2);
});

it('plays Everyday Greetings with its own content and first-choice answers',async()=>{
 const save=vi.fn().mockResolvedValue(undefined);
 render(<Lesson content={everydayGreetings} onClose={()=>{}} onComplete={save}/>);
 expect(screen.getByRole('heading',{name:'Everyday Greetings'})).toBeTruthy();
 for(let i=0;i<4;i++){
  expect(screen.getByRole('heading',{name:everydayGreetings.exercises[i].prompt})).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:choiceExercise(everydayGreetings.exercises[i]).answer}));
  expect(screen.getByRole('status').textContent).toContain(everydayGreetings.exercises[i].explanation);
  fireEvent.click(screen.getByRole('button',{name:i===3?'Finish lesson':'Next exercise'}));
 }
 await waitFor(()=>expect(save).toHaveBeenCalledWith([1,0,2,1]));
 expect(screen.getByText(everydayGreetings.summary!)).toBeTruthy();
});

it('uses the shared player for Igbo greetings and submits its own answer key',async()=>{
 const content=learningCourses.igbo!.sections[0].units[0].lessons[0];const save=vi.fn().mockResolvedValue(undefined);
 render(<Lesson language="igbo" content={content} onClose={()=>{}} onComplete={save}/>);
 expect(screen.getByText('Igbo · Unit 1')).toBeTruthy();
 for(let i=0;i<4;i++){
  fireEvent.click(screen.getByRole('button',{name:choiceExercise(content.exercises[i]).answer}));
  expect(screen.getByRole('status').textContent).toContain(content.exercises[i].explanation);
  fireEvent.click(screen.getByRole('button',{name:i===3?'Finish lesson':'Next exercise'}));
 }
 await waitFor(()=>expect(save).toHaveBeenCalledWith([0,2,1,0]));
 expect(screen.getByText(content.summary!)).toBeTruthy();
});

it('plays Hausa using the shared lesson player and submits first choices',async()=>{
 const content=learningCourses.hausa!.sections[0].units[0].lessons[0];const save=vi.fn().mockResolvedValue(undefined);
 render(<Lesson language="hausa" content={content} onClose={()=>{}} onComplete={save}/>);
 expect(screen.getByText('Hausa · Unit 1')).toBeTruthy();
 for(let i=0;i<4;i++){
  fireEvent.click(screen.getByRole('button',{name:choiceExercise(content.exercises[i]).answer}));
  expect(screen.getByRole('status').textContent).toContain(content.exercises[i].explanation);
  fireEvent.click(screen.getByRole('button',{name:i===3?'Finish lesson':'Next exercise'}));
 }
 await waitFor(()=>expect(save).toHaveBeenCalledWith([1,0,2,1]));
 expect(screen.getByText(content.summary!)).toBeTruthy();
});


it('distinguishes pending, failed and saved completion and blocks exiting while saving',async()=>{
 let finish!:(value?:unknown)=>void;let fail!:(reason?:unknown)=>void;
 const save=vi.fn().mockImplementationOnce(()=>new Promise((resolve,reject)=>{finish=resolve;fail=reject})).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}));
 const close=vi.fn();render(<Lesson content={warmWelcome} onClose={close} onComplete={save}/>);
 for(const [i,exercise] of warmWelcome.exercises.entries()){
  fireEvent.click(screen.getByRole('button',{name:choiceExercise(exercise).answer}));fireEvent.click(screen.getByRole('button',{name:i===3?'Finish lesson':'Next exercise'}));
 }
 expect(screen.getByRole('heading',{name:'Saving your completion…'})).toBeTruthy();expect(screen.queryByText('Lesson complete!')).toBeNull();
 expect((screen.getByRole('button',{name:'Saving…'}) as HTMLButtonElement).disabled).toBe(true);
 expect((screen.getByRole('button',{name:'Close lesson without saving'}) as HTMLButtonElement).disabled).toBe(true);
 fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'});expect(close).not.toHaveBeenCalled();
 fail(new Error('offline'));await screen.findByRole('heading',{name:'Completion not saved'});
 expect(screen.getByRole('status').textContent).toContain('not been confirmed saved');expect(screen.queryByText('Lesson complete!')).toBeNull();
 expect((screen.getByRole('button',{name:'Leave without saving'}) as HTMLButtonElement).disabled).toBe(false);
 fireEvent.click(screen.getByRole('button',{name:'Retry saving'}));expect(screen.queryByRole('button',{name:'Back to my journey'})).toBeNull();
 finish();await screen.findByRole('heading',{name:'Lesson complete!'});
 expect(screen.getByRole('status').textContent).toContain('Completion saved');fireEvent.click(screen.getByRole('button',{name:'Back to my journey'}));expect(close).toHaveBeenCalledOnce();
});

it.each(Object.entries(learningCourses).flatMap(([language,course])=>courseUnits(course).flatMap((unit,index)=>unit.lessons.filter(lesson=>lesson.sourceIds).map(content=>({language:language as 'yoruba'|'igbo'|'hausa',unitNumber:index+1,content})))))('plays $language / $content.title through the shared player',async({language,unitNumber,content})=>{
 const save=vi.fn().mockResolvedValue(undefined);render(<Lesson language={language} unitNumber={unitNumber} content={content} onClose={()=>{}} onComplete={save}/>);
 expect(screen.getByText(`${{yoruba:'Yorùbá',igbo:'Igbo',hausa:'Hausa'}[language]} · Unit ${unitNumber}`)).toBeTruthy();
 for(const [index,exercise] of content.exercises.entries()){
  answerCorrect(exercise);expect(screen.getByRole('status').textContent).toContain('Correct!');
  fireEvent.click(screen.getByRole('button',{name:index===content.exercises.length-1?'Finish lesson':'Next exercise'}));
 }
 await waitFor(()=>expect(save).toHaveBeenCalledWith(content.exercises.map(exercise=>exercise.type==='sentence_order'?exercise.correctOrder:exercise.options.indexOf(exercise.answer))));
 expect(screen.getByText(`${content.exercises.length} of ${content.exercises.length} correct on your first choice. Keep practising!`)).toBeTruthy();
  expect(screen.getByTestId('lesson-celebration')).toBeTruthy();
});

it.each(Object.entries(learningCourses).flatMap(([language,course])=>courseUnits(course).flatMap(unit=>unit.lessons.map(content=>({language,content})))))(
 'preserves all prompts and shows shared progress for $language / $content.title',({language,content})=>{
  const {container}=render(<Lesson language={language as 'yoruba'|'igbo'|'hausa'} content={content} onClose={()=>{}}/>);
  content.exercises.forEach((exercise,index)=>{
   const progress=screen.getByRole('progressbar',{name:'Exercise progress'});
   expect(progress.getAttribute('aria-valuenow')).toBe(String(index));
   expect(progress.getAttribute('aria-valuemax')).toBe(String(content.exercises.length));
   expect(progress.querySelectorAll('span')).toHaveLength(content.exercises.length);
   expect(progress.querySelectorAll('.finished')).toHaveLength(index);
   expect(progress.querySelectorAll('.current')).toHaveLength(1);
   expect(screen.getByRole('heading',{name:exercise.prompt}).textContent).toBe(exercise.prompt);
   expect(container.querySelector('.character')).toBeNull();
   answerCorrect(exercise);
   expect(progress.getAttribute('aria-valuenow')).toBe(String(index));
   expect(screen.getByRole('status').textContent).toContain(exercise.explanation);
   fireEvent.click(screen.getByRole('button',{name:index===content.exercises.length-1?'Finish lesson':'Next exercise'}));
  });
  expect(screen.queryByRole('progressbar',{name:'Exercise progress'})).toBeNull();
  expect(screen.getByText(`${content.exercises.length} of ${content.exercises.length} correct on your first choice. Keep practising!`)).toBeTruthy();
  expect(screen.getByTestId('lesson-celebration')).toBeTruthy();
 });

it('celebrates only after Finish lesson, saves immediately and does not save again on celebration rerenders',async()=>{
 const audio={play:vi.fn().mockResolvedValue(undefined),pause:vi.fn(),currentTime:0,volume:1};
 vi.stubGlobal('Audio',class {constructor(){return audio}});
 let resolveSave!:()=>void;const save=vi.fn(()=>new Promise<void>(resolve=>{resolveSave=resolve}));
 const {rerender,unmount}=render(<Lesson content={warmWelcome} onClose={()=>{}} onComplete={save}/>);
 for(let index=0;index<4;index++){
  expect(screen.queryByTestId('lesson-celebration')).toBeNull();fireEvent.click(screen.getByRole('button',{name:choiceExercise(warmWelcome.exercises[index]).answer}));
  expect(screen.queryByTestId('lesson-celebration')).toBeNull();fireEvent.click(screen.getByRole('button',{name:index===3?'Finish lesson':'Next exercise'}));
 }
 expect(screen.getByTestId('lesson-celebration')).toBeTruthy();expect(save).toHaveBeenCalledOnce();expect(save).toHaveBeenCalledWith([0,1,2,1]);
 await waitFor(()=>expect(audio.play).toHaveBeenCalledOnce());expect(audio.volume).toBe(.3);expect(screen.getByRole('status').textContent).toContain('Saving completion');
 rerender(<Lesson content={warmWelcome} onClose={()=>{}} onComplete={save}/>);expect(audio.play).toHaveBeenCalledOnce();
 resolveSave();await waitFor(()=>expect(screen.getByRole('status').textContent).toContain('awards 10 XP once; replaying adds no XP'));
 expect(save).toHaveBeenCalledOnce();unmount();vi.unstubAllGlobals();
});

it.each(['automatic','manual','slow-save'])('returns only after the visible saved completion screen: %s',async mode=>{
 vi.useFakeTimers();vi.stubGlobal('Audio',class {volume=1;currentTime=0;play=vi.fn().mockResolvedValue(undefined);pause=vi.fn();});
 let resolve!:()=>void;const close=vi.fn();const save=vi.fn(()=>mode==='slow-save'?new Promise<void>(r=>resolve=r):Promise.resolve());
 const view=render(<Lesson content={warmWelcome} onClose={close} onComplete={save}/>);
 for(let i=0;i<4;i++){fireEvent.click(screen.getByRole('button',{name:choiceExercise(warmWelcome.exercises[i]).answer}));fireEvent.click(screen.getByRole('button',{name:i===3?'Finish lesson':'Next exercise'}));}
 await act(async()=>{await Promise.resolve();});
 act(()=>vi.advanceTimersByTime(4000));expect(close).not.toHaveBeenCalled();
 if(mode==='slow-save'){act(()=>vi.advanceTimersByTime(10000));expect(close).not.toHaveBeenCalled();await act(async()=>resolve());}
 expect(screen.getByText('Lesson complete!')).toBeTruthy();
 if(mode==='manual'){fireEvent.click(screen.getByRole('button',{name:'Back to my journey'}));expect(close).toHaveBeenCalledOnce();act(()=>vi.advanceTimersByTime(7000));expect(close).toHaveBeenCalledOnce();}
 else {act(()=>vi.advanceTimersByTime(6999));expect(close).not.toHaveBeenCalled();act(()=>vi.advanceTimersByTime(1));expect(close).toHaveBeenCalledOnce();}
 expect(save).toHaveBeenCalledOnce();view.unmount();vi.useRealTimers();vi.unstubAllGlobals();
});

it.each([
 ['a-warm-welcome','warm-welcome'],['everyday-greetings','everyday-greetings'],['introduce-yourself','introduce-yourself'],
 ['family-and-people','family-and-people'],['food-and-drink','food-and-drink'],['numbers-and-money','numbers-and-money'],
 ['places-around-me','places-around-me'],['asking-for-directions','asking-for-directions'],['transport-and-travel','transport-and-travel'],
 ['time-and-daily-routine','time-and-daily-routine'],['shopping-and-the-market','shopping-and-the-market'],['making-requests','making-requests']
])('shows context media only on Exercise 1 for Yoruba %s', (id,filename)=>{
 const content=learningCourses.yoruba.sections.flatMap(s=>s.units.flatMap(u=>u.lessons)).find(item=>item.id===id)!;
 const save=vi.fn().mockResolvedValue(undefined);
 const {container}=render(<Lesson content={content} onClose={()=>{}} onComplete={save}/>);
 const media=content.exercises[0].media!;
 const img=screen.getByRole('img',{name:media.alt});expect(img.getAttribute('src')).toBe(`/images/lessons/yoruba/${filename}.png`);expect(media.alt.length).toBeGreaterThan(30);
 content.exercises.forEach((exercise,index)=>{
  expect(screen.getByRole('heading',{name:exercise.prompt})).toBeTruthy();
  if(index>0){expect(exercise.media).toBeUndefined();expect(container.querySelector('.lesson-context-media')).toBeNull();}
  fireEvent.click(screen.getByRole('button',{name:choiceExercise(exercise).answer}));expect(screen.getByRole('status').textContent).toContain(exercise.explanation);
  fireEvent.click(screen.getByRole('button',{name:index===3?'Finish lesson':'Next exercise'}));
 });
 expect(save).toHaveBeenCalledOnce();expect(save).toHaveBeenCalledWith(content.exercises.map(exercise=>choiceExercise(exercise).options.indexOf(choiceExercise(exercise).answer)));
 expect(screen.getByText('4 of 4 correct on your first choice. Keep practising!')).toBeTruthy();
});
it('keeps media-free lessons unchanged and supports optional exercise media with graceful failure',()=>{
 const base=learningCourses.hausa.sections[0].units[0].lessons[0];const view=render(<Lesson content={base} language="hausa" onClose={()=>{}}/>);expect(view.container.querySelector('.lesson-context-media')).toBeNull();view.unmount();
 const media={type:'image' as const,src:'/example.png',alt:'A visitor arriving for a greeting.'};render(<Lesson content={{...warmWelcome,exercises:[{...warmWelcome.exercises[0],media},...warmWelcome.exercises.slice(1)]}} onClose={()=>{}}/>);
 const img=screen.getByRole('img',{name:media.alt});expect(img.getAttribute('src')).toBe('/example.png');fireEvent.error(img);expect(document.querySelector('.lesson-context-media')).toBeNull();expect(screen.getByRole('heading',{name:warmWelcome.exercises[0].prompt})).toBeTruthy();
});

it('plays all eight image choices with mixed feedback, immutable first choices, saving and timed return',async()=>{
 vi.useFakeTimers();vi.stubGlobal('Audio',class {volume=1;currentTime=0;play=vi.fn().mockResolvedValue(undefined);pause=vi.fn();});
 const content=learningCourses.yoruba.sections[0].units[4].lessons[0];const save=vi.fn().mockResolvedValue(undefined);const close=vi.fn();
 const view=render(<Lesson content={content} unitNumber={5} onClose={close} onComplete={save}/>);
 const expected=['màmá','ìrẹsì','omi','ọjà','ilé ìwòsàn','ọwọ́ òsì','kẹ̀kẹ́','àbùlà'];
 for(const [index,exercise] of content.exercises.entries()){
  expect(exercise.type).toBe('image_choice');expect(choiceExercise(exercise).answer).toBe(expected[index]);
  const img=screen.getByRole('img',{name:exercise.media!.alt});expect(img.getAttribute('src')).toBe(exercise.media!.src);expect(exercise.media!.alt).not.toContain(choiceExercise(exercise).answer);
  expect(view.container.querySelectorAll('.lesson-context-media img')).toHaveLength(1);
  expect(view.container.querySelectorAll('.lesson-option')).toHaveLength(4);
  expect(screen.getByText(`Exercise ${index+1} of 8`)).toBeTruthy();
  const choice=index===0?choiceExercise(exercise).options[0]:choiceExercise(exercise).answer;fireEvent.click(screen.getByRole('button',{name:choice}));
  expect(screen.getByRole('status').textContent).toContain(index===0?'Not quite':'Correct!');
  if(index===0){expect(screen.getByText(`Correct answer: ${choiceExercise(exercise).answer}`)).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:choiceExercise(exercise).answer}));}
  expect(save).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:index===7?'Finish lesson':'Next exercise'}));
 }
 await act(async()=>{await Promise.resolve();});
 expect(save).toHaveBeenCalledOnce();expect(save).toHaveBeenCalledWith([0,3,0,2,1,3,0,2]);expect(screen.getByText('7 of 8 correct on your first choice. Keep practising!')).toBeTruthy();
 expect(screen.getByTestId('lesson-celebration')).toBeTruthy();act(()=>vi.advanceTimersByTime(4000));expect(close).not.toHaveBeenCalled();act(()=>vi.advanceTimersByTime(7000));expect(close).toHaveBeenCalledOnce();
 view.unmount();vi.useRealTimers();vi.unstubAllGlobals();
});
