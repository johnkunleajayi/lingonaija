// @vitest-environment jsdom
import React from 'react';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {App} from './App';
beforeEach(()=>{localStorage.clear();vi.stubGlobal('matchMedia',()=>({matches:false}));vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:401}));history.replaceState(null,'','/')});
afterEach(()=>{cleanup();vi.unstubAllGlobals()});
describe('landing experience',()=>{
 it('switches all three language worlds and keeps the premium headline',async()=>{render(<App/>);await waitFor(()=>expect((screen.getByRole('combobox') as HTMLSelectElement).disabled).toBe(false));expect(screen.getByRole('heading',{level:1}).textContent).toContain('Learn the languages.');fireEvent.click(screen.getByRole('button',{name:'Explore Igbo'}));expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('igbo');expect(screen.getAllByText('Nnọọ!').length).toBeGreaterThan(0);fireEvent.change(screen.getByRole('combobox'),{target:{value:'hausa'}});expect(screen.getAllByText('Sannu!').length).toBeGreaterThan(0);fireEvent.click(screen.getByRole('button',{name:'Explore Yorùbá'}));expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('yoruba')});
 it('persists theme choice and provides accessible theme controls',()=>{const {container}=render(<App/>);fireEvent.click(screen.getByRole('button',{name:'Use dark mode'}));expect(container.querySelector('.app.dark')).not.toBeNull();expect(localStorage.getItem('theme')).toBe('dark');fireEvent.click(screen.getByRole('button',{name:'Use light mode'}));expect(container.querySelector('.app.dark')).toBeNull()});
 it('restores an authenticated learner and signs out',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({id:'123',display_name:'Ada',preferred_language:'igbo'})}).mockResolvedValue({ok:true}));render(<App/>);await screen.findByRole('button',{name:'Sign out'});fireEvent.click(screen.getAllByRole('button',{name:'Continue learning'})[0]);expect(await screen.findByRole('heading',{name:'Your Igbo journey'})).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Sign out'}));await waitFor(()=>expect(screen.getAllByRole('button',{name:'Sign in'}).length).toBeGreaterThan(0));expect(screen.getByRole('heading',{level:1}).textContent).toContain('Learn the languages.')});
 it('reports missing Google configuration without faking a login',()=>{history.replaceState(null,'','/?auth_error=configuration');render(<App/>);expect(screen.getByRole('status').textContent).toContain('needs configuration');expect(screen.queryByRole('button',{name:'Sign out'})).toBeNull()});
});

describe('persistent enrollment controls',()=>{
 it('saves an authenticated selection through the enrollment API',async()=>{
  const requests=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({id:'123',display_name:'Ada',preferred_language:'yoruba',enrollments:[]})}).mockResolvedValue({ok:true});
  vi.stubGlobal('fetch',requests);render(<App/>);
  await screen.findByRole('button',{name:'Sign out'});
  fireEvent.click(screen.getByRole('button',{name:'Explore Igbo'}));
  await waitFor(()=>expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('igbo'));
  expect(requests).toHaveBeenCalledWith('/api/enrollments',expect.objectContaining({method:'POST',credentials:'include',body:JSON.stringify({language:'igbo'})}));
 });
 it('keeps the previous course and reports an unsuccessful save',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({id:'123',display_name:'Ada',preferred_language:'yoruba',enrollments:[]})}).mockResolvedValue({ok:false,status:503}));
  render(<App/>);await screen.findByRole('button',{name:'Sign out'});
  fireEvent.change(screen.getByRole('combobox'),{target:{value:'hausa'}});
  await waitFor(()=>expect(screen.getByRole('status').textContent).toContain('Could not save your language'));
  expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('yoruba');
 });
 it('previews anonymous selections without creating enrollments',async()=>{
  const requests=vi.fn().mockResolvedValue({ok:false,status:401});vi.stubGlobal('fetch',requests);
  render(<App/>);await waitFor(()=>expect((screen.getByRole('combobox') as HTMLSelectElement).disabled).toBe(false));
  fireEvent.click(screen.getByRole('button',{name:'Explore Hausa'}));
  expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('hausa');
  expect(requests).toHaveBeenCalledTimes(1);
 });
});

it('opens the real Yoruba lesson from the dashboard without saving progress',async()=>{
 const requests=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({id:'123',display_name:'Ada',preferred_language:'yoruba',enrollments:['yoruba']})}).mockResolvedValue({ok:true});
 vi.stubGlobal('fetch',requests);render(<App/>);await screen.findByRole('button',{name:'Sign out'});
 fireEvent.click(screen.getAllByRole('button',{name:'Continue learning'})[0]);
 await screen.findByRole('heading',{name:'Your Yorùbá journey'});
 fireEvent.click(screen.getByRole('button',{name:'Continue the journey'}));
 expect(screen.getByRole('dialog').textContent).toContain('A Warm Welcome');
 expect((screen.getByRole('button',{name:'Everyday greetings, locked'}) as HTMLButtonElement).disabled).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:'Close lesson'}));
 fireEvent.click(screen.getByRole('button',{name:'A warm welcome, current'}));
 expect(screen.getByRole('dialog').textContent).toContain('Exercise 1 of 4');
 expect(requests).toHaveBeenCalledTimes(2);
});

it('restores real completion and XP on the Yoruba dashboard',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({id:'123',display_name:'Ada',preferred_language:'yoruba',progress:{total_xp:10,completions:[{language:'yoruba',lesson_id:'a-warm-welcome',status:'completed',first_choice_score:3,completed_at:'2026-10-08',xp:10}]}})}).mockResolvedValue({ok:true}));
 render(<App/>);await screen.findByRole('button',{name:'Sign out'});
 fireEvent.click(screen.getAllByRole('button',{name:'Continue learning'})[0]);
 await screen.findByRole('heading',{name:'Your Yorùbá journey'});
 expect(screen.getByRole('button',{name:'A warm welcome, completed'})).toBeTruthy();
 expect(screen.getByText('50% · 10 XP')).toBeTruthy();
 expect((screen.getByRole('button',{name:'Everyday greetings, current'}) as HTMLButtonElement).disabled).toBe(false);
 fireEvent.click(screen.getByRole('button',{name:'Continue the journey'}));
 expect(screen.getByRole('dialog').textContent).toContain('Everyday Greetings');
 expect(screen.getByText('1 of 2 available lessons complete')).toBeTruthy();
 expect(screen.queryByText('2 of 8 lessons complete · demo')).toBeNull();
});

it('shows both completed lessons and 20 XP from real progress',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({id:'123',display_name:'Ada',preferred_language:'yoruba',progress:{total_xp:20,completions:['a-warm-welcome','everyday-greetings'].map(lesson_id=>({language:'yoruba',lesson_id,status:'completed',first_choice_score:4,completed_at:'2026-10-08',xp:10}))}})}).mockResolvedValue({ok:true}));
 render(<App/>);await screen.findByRole('button',{name:'Sign out'});
 fireEvent.click(screen.getAllByRole('button',{name:'Continue learning'})[0]);
 await screen.findByRole('heading',{name:'Your Yorùbá journey'});
 expect(screen.getByText('100% · 20 XP')).toBeTruthy();
 expect(screen.getByText('2 of 2 available lessons complete')).toBeTruthy();
 expect(screen.getByRole('button',{name:'Everyday greetings, completed'})).toBeTruthy();
});

it('keeps Yoruba and Igbo progress separate while completing the Igbo lesson',async()=>{
 const yoruba={language:'yoruba',lesson_id:'a-warm-welcome',status:'completed',first_choice_score:3,completed_at:'2026-10-08',xp:10};
 const igbo={...yoruba,language:'igbo',first_choice_score:4};
 const requests=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({id:'123',display_name:'Ada',preferred_language:'igbo',progress:{total_xp:10,completions:[yoruba]}})})
 .mockResolvedValueOnce({ok:true}).mockResolvedValueOnce({ok:true,json:async()=>({total_xp:20,completions:[yoruba,igbo]})}).mockResolvedValue({ok:true});
 vi.stubGlobal('fetch',requests);render(<App/>);await screen.findByRole('button',{name:'Sign out'});
 fireEvent.click(screen.getAllByRole('button',{name:'Continue learning'})[0]);await screen.findByRole('heading',{name:'Your Igbo journey'});
 expect(screen.getByText('0% · 0 XP')).toBeTruthy();
 expect((screen.getByRole('button',{name:'How are you?, locked'}) as HTMLButtonElement).disabled).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:'Continue the journey'}));
 expect(screen.getByText('Igbo · Unit 1')).toBeTruthy();
 for(const choice of ['Nnọọ','Ndewo','Kedu?','Ọ dị mma']){
  fireEvent.click(screen.getByRole('button',{name:choice}));
  fireEvent.click(screen.getByRole('button',{name:choice==='Ọ dị mma'?'Finish lesson':'Next exercise'}));
 }
 await waitFor(()=>expect(screen.getByRole('status').textContent).toContain('Completion saved'));
 expect(requests).toHaveBeenCalledWith('/api/learning/igbo/a-warm-welcome/complete',expect.objectContaining({body:JSON.stringify({answers:[0,2,1,0]})}));
 fireEvent.click(screen.getByRole('button',{name:'Back to my journey'}));
 expect(screen.getByText('100% · 10 XP')).toBeTruthy();
 expect(screen.getByRole('button',{name:'A warm welcome, completed'})).toBeTruthy();
 fireEvent.change(screen.getByRole('combobox'),{target:{value:'yoruba'}});
 await screen.findByRole('heading',{name:'Your Yorùbá journey'});
 expect(screen.getByText('50% · 10 XP')).toBeTruthy();
});

it('completes Hausa independently and preserves Igbo and Yoruba dashboard progress',async()=>{
 const records=['yoruba','igbo'].map(language=>({language,lesson_id:'a-warm-welcome',status:'completed',first_choice_score:3,completed_at:'2026-10-08',xp:10}));
 const requests=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({id:'123',display_name:'Ada',preferred_language:'hausa',progress:{total_xp:20,completions:records}})})
 .mockResolvedValueOnce({ok:true}).mockResolvedValueOnce({ok:true,json:async()=>({total_xp:30,completions:[...records,{...records[0],language:'hausa'}]})}).mockResolvedValue({ok:true});
 vi.stubGlobal('fetch',requests);render(<App/>);await screen.findByRole('button',{name:'Sign out'});
 fireEvent.click(screen.getAllByRole('button',{name:'Continue learning'})[0]);await screen.findByRole('heading',{name:'Your Hausa journey'});
 expect(screen.getByText('0% · 0 XP')).toBeTruthy();
 expect((screen.getByRole('button',{name:'Welcome a friend, locked'}) as HTMLButtonElement).disabled).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:'Continue the journey'}));
 expect(screen.getByText('Hausa · Unit 1')).toBeTruthy();
 for(const [i,choice] of ['Sannu da zuwa','Sannu','Ina kwana?','Lafiya lau'].entries()){
  fireEvent.click(screen.getByRole('button',{name:choice}));
  fireEvent.click(screen.getByRole('button',{name:i===3?'Finish lesson':'Next exercise'}));
 }
 await waitFor(()=>expect(screen.getByRole('status').textContent).toContain('Completion saved'));
 expect(requests).toHaveBeenCalledWith('/api/learning/hausa/a-warm-welcome/complete',expect.objectContaining({body:JSON.stringify({answers:[1,0,2,1]})}));
 fireEvent.click(screen.getByRole('button',{name:'Back to my journey'}));expect(screen.getByText('100% · 10 XP')).toBeTruthy();
 for(const [language,name,progress] of [['yoruba','Yorùbá','50% · 10 XP'],['igbo','Igbo','100% · 10 XP']]){
  fireEvent.change(screen.getByRole('combobox'),{target:{value:language}});
  await screen.findByRole('heading',{name:`Your ${name} journey`});expect(screen.getByText(progress)).toBeTruthy();
 }
});
