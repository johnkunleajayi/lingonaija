// @vitest-environment jsdom
import {act,cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {SentenceOrder} from './SentenceOrder';
import {Lesson} from './Lesson';
import {courseLessons,correctAnswerText,type SentenceOrderExercise} from './lessonContent';
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();});
const lesson=courseLessons('yoruba').find(l=>l.id==='build-the-sentence')!;
const exercises=lesson.exercises as SentenceOrderExercise[];
const expected=['Ẹ káàárọ̀','Orúkọ mi ni Adé','Eélòó ni ata yìí?','Báwo ni o ṣe máa dé ọjà?','Mo máa lọ','Mo fẹ́ sùn','Ẹ jọ̀wọ́, tún un sọ','Ẹ fún mi ní àbùlà'];
it.each(exercises.map((exercise,index)=>({exercise,index})))('keeps the answer key and scrambled initial bank for $exercise.id',({exercise,index})=>{
 expect(correctAnswerText(exercise)).toBe(expected[index]);
 render(<SentenceOrder exercise={exercise} checked={false} onCheck={()=>{}}/>);
 expect(within(screen.getByRole('group',{name:'Available tiles'})).getAllByRole('button').map(b=>b.textContent)).toEqual(exercise.tiles.map(t=>t.text));
 expect(exercise.tiles.map(t=>t.id)).not.toEqual(exercise.correctOrder);
 expect(screen.getByRole('group',{name:'Your sentence'}).textContent).not.toContain(expected[index]);
 expect((screen.getByRole('button',{name:'Check'}) as HTMLButtonElement).disabled).toBe(true);
});
it('moves, removes and reorders tiles by stable identity, including repeated text',()=>{
 const exercise:SentenceOrderExercise={id:'repeat',type:'sentence_order',prompt:'Build the repeated phrase.',explanation:'Repeated tokens.',tiles:[{id:'b',text:'word'},{id:'c',text:'end'},{id:'a',text:'word'}],correctOrder:['a','b','c']};
 const check=vi.fn();const view=render(<SentenceOrder exercise={exercise} checked={false} onCheck={check}/>);
 fireEvent.click(view.container.querySelector('[data-tile-id="b"]')!);fireEvent.click(view.container.querySelector('[data-tile-id="c"]')!);
 fireEvent.click(screen.getByRole('button',{name:'Remove end, position 2'}));
 expect(view.container.querySelector('[data-tile-id="c"]')).toBeTruthy();
 fireEvent.click(view.container.querySelector('[data-tile-id="a"]')!);fireEvent.click(view.container.querySelector('[data-tile-id="c"]')!);
 expect(within(screen.getByRole('group',{name:'Your sentence'})).getAllByRole('button').map(b=>b.textContent)).toEqual(['word','word','end']);
 fireEvent.click(screen.getByRole('button',{name:'Check'}));expect(check).toHaveBeenCalledWith(['b','a','c'],true);
});
it('runs all eight sentences with first-attempt feedback, saving, celebration and automatic return',async()=>{
 vi.useFakeTimers();vi.stubGlobal('Audio',class {volume=1;currentTime=0;play=vi.fn().mockResolvedValue(undefined);pause=vi.fn();});
 const save=vi.fn().mockResolvedValue(undefined);const close=vi.fn();render(<Lesson content={lesson} unitNumber={5} onClose={close} onComplete={save}/>);
 const submitted:string[][]=[];
 for(const [index,exercise] of exercises.entries()){
  expect(screen.getByText(`Exercise ${index+1} of 8`)).toBeTruthy();expect(screen.queryByRole('status')).toBeNull();
  const order=index===0?[...exercise.correctOrder].reverse():exercise.correctOrder;
  for(const id of order)fireEvent.click(screen.getByRole('button',{name:`Add ${exercise.tiles.find(t=>t.id===id)!.text}`}));
  if(index===1){const last=order.at(-1)!;fireEvent.click(screen.getByRole('button',{name:`Remove ${exercise.tiles.find(t=>t.id===last)!.text}, position ${order.length}`}));expect((screen.getByRole('button',{name:'Check'}) as HTMLButtonElement).disabled).toBe(true);fireEvent.click(screen.getByRole('button',{name:`Add ${exercise.tiles.find(t=>t.id===last)!.text}`}));}
  fireEvent.click(screen.getByRole('button',{name:'Check'}));submitted.push([...order]);
  expect(screen.getByRole('status').textContent).toContain(index===0?'Not quite':'Correct!');
  if(index===0){expect(screen.getByText(`Correct answer: ${expected[index]}`)).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Check'}));expect((screen.getByRole('button',{name:'Remove káàárọ̀, position 1'}) as HTMLButtonElement).disabled).toBe(true);}
  expect(save).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:index===7?'Finish lesson':'Next exercise'}));
 }
 await act(async()=>{await Promise.resolve();});expect(save).toHaveBeenCalledOnce();expect(save).toHaveBeenCalledWith(submitted);
 expect(screen.getByText('7 of 8 correct on your first choice. Keep practising!')).toBeTruthy();expect(screen.getByTestId('lesson-celebration')).toBeTruthy();
 act(()=>vi.advanceTimersByTime(4000));expect(close).not.toHaveBeenCalled();act(()=>vi.advanceTimersByTime(7000));expect(close).toHaveBeenCalledOnce();expect(save).toHaveBeenCalledOnce();
});
