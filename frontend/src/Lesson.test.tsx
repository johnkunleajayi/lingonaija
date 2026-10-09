// @vitest-environment jsdom
import {render, screen, fireEvent, cleanup, waitFor} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {Lesson} from './Lesson';
import {learningCourses, warmWelcome, everydayGreetings} from './lessonContent';
afterEach(cleanup);
it('gives immediate feedback, prevents repeat answers and completes all exercises', () => {
  const close = vi.fn(); render(<Lesson content={warmWelcome} onClose={close}/>);
  warmWelcome.exercises.forEach((exercise, index) => {
    expect(screen.getByText(`Exercise ${index + 1} of 4`)).toBeTruthy();
    const choice = index === 0 ? exercise.options[1] : exercise.answer;
    fireEvent.click(screen.getByRole('button', {name: choice}));
    expect(screen.getByRole('status').textContent).toContain(index === 0 ? 'Not quite' : 'Correct!');
    expect(screen.getByRole('status').textContent).toContain(exercise.explanation);
    if (index === 0) expect(screen.getByRole('status').textContent).toContain(`Correct answer: ${exercise.answer}`);
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
  fireEvent.click(screen.getByRole('button', {name: warmWelcome.exercises[0].answer})); view.unmount();
  render(<Lesson content={warmWelcome} onClose={() => {}}/>);
  expect(screen.queryByRole('status')).toBeNull();
  expect(Object.keys(learningCourses)).toEqual(['yoruba','igbo','hausa']);
  expect(new Set(warmWelcome.exercises.map(item => item.id)).size).toBe(4);
  for (const item of warmWelcome.exercises) expect(item.options.filter(option => option === item.answer)).toHaveLength(1);
});

it('submits first choices and retries a failed save without losing the session',async()=>{
 const save=vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
 render(<Lesson content={warmWelcome} onClose={()=>{}} onComplete={save}/>);
 for(let i=0;i<4;i++){
  fireEvent.click(screen.getByRole('button',{name:warmWelcome.exercises[i].answer}));
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
  fireEvent.click(screen.getByRole('button',{name:everydayGreetings.exercises[i].answer}));
  expect(screen.getByRole('status').textContent).toContain(everydayGreetings.exercises[i].explanation);
  fireEvent.click(screen.getByRole('button',{name:i===3?'Finish lesson':'Next exercise'}));
 }
 await waitFor(()=>expect(save).toHaveBeenCalledWith([1,0,2,1]));
 expect(screen.getByText(everydayGreetings.summary!)).toBeTruthy();
});

it('uses the shared player for Igbo greetings and submits its own answer key',async()=>{
 const content=learningCourses.igbo!.units[0].lessons[0];const save=vi.fn().mockResolvedValue(undefined);
 render(<Lesson language="igbo" content={content} onClose={()=>{}} onComplete={save}/>);
 expect(screen.getByText('Igbo · Unit 1')).toBeTruthy();
 for(let i=0;i<4;i++){
  fireEvent.click(screen.getByRole('button',{name:content.exercises[i].answer}));
  expect(screen.getByRole('status').textContent).toContain(content.exercises[i].explanation);
  fireEvent.click(screen.getByRole('button',{name:i===3?'Finish lesson':'Next exercise'}));
 }
 await waitFor(()=>expect(save).toHaveBeenCalledWith([0,2,1,0]));
 expect(screen.getByText(content.summary!)).toBeTruthy();
});

it('plays Hausa using the shared lesson player and submits first choices',async()=>{
 const content=learningCourses.hausa!.units[0].lessons[0];const save=vi.fn().mockResolvedValue(undefined);
 render(<Lesson language="hausa" content={content} onClose={()=>{}} onComplete={save}/>);
 expect(screen.getByText('Hausa · Unit 1')).toBeTruthy();
 for(let i=0;i<4;i++){
  fireEvent.click(screen.getByRole('button',{name:content.exercises[i].answer}));
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
  fireEvent.click(screen.getByRole('button',{name:exercise.answer}));fireEvent.click(screen.getByRole('button',{name:i===3?'Finish lesson':'Next exercise'}));
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

it.each(Object.entries(learningCourses).flatMap(([language,course])=>course.units.flatMap((unit,index)=>unit.lessons.filter(lesson=>lesson.sourceIds).map(content=>({language:language as 'yoruba'|'igbo'|'hausa',unitNumber:index+1,content})))))('plays $language / $content.title through the shared player',async({language,unitNumber,content})=>{
 const save=vi.fn().mockResolvedValue(undefined);render(<Lesson language={language} unitNumber={unitNumber} content={content} onClose={()=>{}} onComplete={save}/>);
 expect(screen.getByText(`${{yoruba:'Yorùbá',igbo:'Igbo',hausa:'Hausa'}[language]} · Unit ${unitNumber}`)).toBeTruthy();
 for(const [index,exercise] of content.exercises.entries()){
  fireEvent.click(screen.getByRole('button',{name:exercise.answer}));expect(screen.getByRole('status').textContent).toContain('Correct!');
  fireEvent.click(screen.getByRole('button',{name:index===3?'Finish lesson':'Next exercise'}));
 }
 await waitFor(()=>expect(save).toHaveBeenCalledWith(content.exercises.map(exercise=>exercise.options.indexOf(exercise.answer))));
 expect(screen.getByText('4 of 4 correct on your first choice. Keep practising!')).toBeTruthy();
});

it.each(Object.entries(learningCourses).flatMap(([language,course])=>course.units.flatMap(unit=>unit.lessons.map(content=>({language,content})))))(
 'preserves all four prompts and shows shared progress for $language / $content.title',({language,content})=>{
  const {container}=render(<Lesson language={language as 'yoruba'|'igbo'|'hausa'} content={content} onClose={()=>{}}/>);
  content.exercises.forEach((exercise,index)=>{
   const progress=screen.getByRole('progressbar',{name:'Exercise progress'});
   expect(progress.getAttribute('aria-valuenow')).toBe(String(index));
   expect(progress.getAttribute('aria-valuemax')).toBe('4');
   expect(progress.querySelectorAll('span')).toHaveLength(4);
   expect(progress.querySelectorAll('.finished')).toHaveLength(index);
   expect(progress.querySelectorAll('.current')).toHaveLength(1);
   expect(screen.getByRole('heading',{name:exercise.prompt}).textContent).toBe(exercise.prompt);
   expect(container.querySelector('.character')).toBeNull();
   fireEvent.click(screen.getByRole('button',{name:exercise.answer}));
   expect(progress.getAttribute('aria-valuenow')).toBe(String(index));
   expect(screen.getByRole('status').textContent).toContain(exercise.explanation);
   fireEvent.click(screen.getByRole('button',{name:index===3?'Finish lesson':'Next exercise'}));
  });
  expect(screen.queryByRole('progressbar',{name:'Exercise progress'})).toBeNull();
  expect(screen.getByText('4 of 4 correct on your first choice. Keep practising!')).toBeTruthy();
 });
