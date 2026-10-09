// @vitest-environment jsdom
import React from 'react';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {App} from './App';
beforeEach(()=>{localStorage.clear();sessionStorage.clear();vi.stubGlobal('matchMedia',()=>({matches:false}));vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:401}));history.replaceState(null,'','/')});
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
 expect(screen.queryByRole('button',{name:'Practise with Adé'})).toBeNull();
 expect((screen.getByRole('button',{name:'Everyday Greetings, locked'}) as HTMLButtonElement).disabled).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:'Close lesson'}));
 fireEvent.click(screen.getByRole('button',{name:'A Warm Welcome, current'}));
 expect(screen.getByRole('dialog').textContent).toContain('Exercise 1 of 4');
 expect(requests).toHaveBeenCalledTimes(2);
});

it('restores real completion and XP on the Yoruba dashboard',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({id:'123',display_name:'Ada',preferred_language:'yoruba',progress:{total_xp:10,completions:[{language:'yoruba',lesson_id:'a-warm-welcome',status:'completed',first_choice_score:3,completed_at:'2026-10-08',xp:10}]}})}).mockResolvedValue({ok:true}));
 render(<App/>);await screen.findByRole('button',{name:'Sign out'});
 fireEvent.click(screen.getAllByRole('button',{name:'Continue learning'})[0]);
 await screen.findByRole('heading',{name:'Your Yorùbá journey'});
 expect(screen.getByRole('button',{name:'A Warm Welcome, completed'})).toBeTruthy();
 expect(screen.getByText('10 course XP')).toBeTruthy();
 expect(screen.getByRole('button',{name:'Practise with Adé'})).toBeTruthy();
 expect((screen.getByRole('button',{name:'Everyday Greetings, current'}) as HTMLButtonElement).disabled).toBe(false);
 fireEvent.click(screen.getByRole('button',{name:'Continue the journey'}));
 expect(screen.getByRole('dialog').textContent).toContain('Everyday Greetings');
 expect(screen.getByText('1 of 5 available lessons complete')).toBeTruthy();
 expect(screen.queryByText('2 of 8 lessons complete · demo')).toBeNull();
});

it('shows both completed lessons and 20 XP from real progress',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({id:'123',display_name:'Ada',preferred_language:'yoruba',progress:{total_xp:20,completions:['a-warm-welcome','everyday-greetings'].map(lesson_id=>({language:'yoruba',lesson_id,status:'completed',first_choice_score:4,completed_at:'2026-10-08',xp:10}))}})}).mockResolvedValue({ok:true}));
 render(<App/>);await screen.findByRole('button',{name:'Sign out'});
 fireEvent.click(screen.getAllByRole('button',{name:'Continue learning'})[0]);
 await screen.findByRole('heading',{name:'Your Yorùbá journey'});
 expect(screen.getByText('20 course XP')).toBeTruthy();
 expect(screen.getByText('2 of 5 available lessons complete')).toBeTruthy();
 expect(screen.getByRole('button',{name:'Everyday Greetings, completed'})).toBeTruthy();
});

it('keeps Yoruba and Igbo progress separate while completing the Igbo lesson',async()=>{
 const yoruba={language:'yoruba',lesson_id:'a-warm-welcome',status:'completed',first_choice_score:3,completed_at:'2026-10-08',xp:10};
 const igbo={...yoruba,language:'igbo',first_choice_score:4};
 const requests=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({id:'123',display_name:'Ada',preferred_language:'igbo',progress:{total_xp:10,completions:[yoruba]}})})
 .mockResolvedValueOnce({ok:true}).mockResolvedValueOnce({ok:true,json:async()=>({total_xp:20,completions:[yoruba,igbo]})}).mockResolvedValue({ok:true});
 vi.stubGlobal('fetch',requests);render(<App/>);await screen.findByRole('button',{name:'Sign out'});
 fireEvent.click(screen.getAllByRole('button',{name:'Continue learning'})[0]);await screen.findByRole('heading',{name:'Your Igbo journey'});
 expect(screen.getByText('0 course XP')).toBeTruthy();
 expect((screen.getByRole('button',{name:'Everyday Greetings, locked'}) as HTMLButtonElement).disabled).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:'Continue the journey'}));
 expect(screen.getByText('Igbo · Unit 1')).toBeTruthy();
 for(const choice of ['Nnọọ','Ndewo','Kedu?','Ọ dị mma']){
  fireEvent.click(screen.getByRole('button',{name:choice}));
  fireEvent.click(screen.getByRole('button',{name:choice==='Ọ dị mma'?'Finish lesson':'Next exercise'}));
 }
 await waitFor(()=>expect(screen.getByRole('status').textContent).toContain('Completion saved'));
 expect(requests).toHaveBeenCalledWith('/api/learning/igbo/a-warm-welcome/complete',expect.objectContaining({body:JSON.stringify({answers:[0,2,1,0]})}));
 fireEvent.click(screen.getByRole('button',{name:'Back to my journey'}));
 expect(screen.getByText('10 course XP')).toBeTruthy();
 expect(screen.getByRole('button',{name:'A Warm Welcome, completed'})).toBeTruthy();
 fireEvent.change(screen.getByRole('combobox'),{target:{value:'yoruba'}});
 await screen.findByRole('heading',{name:'Your Yorùbá journey'});
 expect(screen.getByText('10 course XP')).toBeTruthy();
});

it('completes Hausa independently and preserves Igbo and Yoruba dashboard progress',async()=>{
 const records=['yoruba','igbo'].map(language=>({language,lesson_id:'a-warm-welcome',status:'completed',first_choice_score:3,completed_at:'2026-10-08',xp:10}));
 const requests=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({id:'123',display_name:'Ada',preferred_language:'hausa',progress:{total_xp:20,completions:records}})})
 .mockResolvedValueOnce({ok:true}).mockResolvedValueOnce({ok:true,json:async()=>({total_xp:30,completions:[...records,{...records[0],language:'hausa'}]})}).mockResolvedValue({ok:true});
 vi.stubGlobal('fetch',requests);render(<App/>);await screen.findByRole('button',{name:'Sign out'});
 fireEvent.click(screen.getAllByRole('button',{name:'Continue learning'})[0]);await screen.findByRole('heading',{name:'Your Hausa journey'});
 expect(screen.getByText('0 course XP')).toBeTruthy();
 expect((screen.getByRole('button',{name:'Everyday Greetings, locked'}) as HTMLButtonElement).disabled).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:'Continue the journey'}));
 expect(screen.getByText('Hausa · Unit 1')).toBeTruthy();
 for(const [i,choice] of ['Sannu da zuwa','Sannu','Ina kwana?','Lafiya lau'].entries()){
  fireEvent.click(screen.getByRole('button',{name:choice}));
  fireEvent.click(screen.getByRole('button',{name:i===3?'Finish lesson':'Next exercise'}));
 }
 await waitFor(()=>expect(screen.getByRole('status').textContent).toContain('Completion saved'));
 expect(requests).toHaveBeenCalledWith('/api/learning/hausa/a-warm-welcome/complete',expect.objectContaining({body:JSON.stringify({answers:[1,0,2,1]})}));
 fireEvent.click(screen.getByRole('button',{name:'Back to my journey'}));expect(screen.getByText('10 course XP')).toBeTruthy();
 for(const [language,name,progress] of [['yoruba','Yorùbá','10 course XP'],['igbo','Igbo','10 course XP']]){
  fireEvent.change(screen.getByRole('combobox'),{target:{value:language}});
  await screen.findByRole('heading',{name:`Your ${name} journey`});expect(screen.getByText(progress)).toBeTruthy();
 }
});

it('restores a persistent daily streak on the authenticated dashboard',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({id:'123',display_name:'Ada',preferred_language:'hausa',progress:{total_xp:0,completions:[],current_streak:3,longest_streak:7}})}).mockResolvedValue({ok:true}));
 render(<App/>);await screen.findByRole('button',{name:'Sign out'});
 fireEvent.click(screen.getAllByRole('button',{name:'Continue learning'})[0]);await screen.findByRole('heading',{name:'Your Hausa journey'});
 expect(screen.getByLabelText('Daily learning streak').textContent).toContain('3 day streak');
 expect(screen.getByLabelText('Daily learning streak').textContent).toContain('Longest: 7 days');
});

it('shows global level progress while course XP remains separate after switching languages',async()=>{
 const completions=[{language:'yoruba',lesson_id:'a-warm-welcome',status:'completed',first_choice_score:4,completed_at:'2026-10-08',xp:10},{language:'igbo',lesson_id:'a-warm-welcome',status:'completed',first_choice_score:4,completed_at:'2026-10-08',xp:10}];
 vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({id:'123',display_name:'Ada',preferred_language:'yoruba',progress:{total_xp:20,completions}})}).mockResolvedValue({ok:true}));
 render(<App/>);await screen.findByRole('button',{name:'Sign out'});
 fireEvent.click(screen.getAllByRole('button',{name:'Continue learning'})[0]);await screen.findByRole('heading',{name:'Your Yorùbá journey'});
 expect(screen.getByText('Level 2')).toBeTruthy();expect(screen.getByText('20 total XP')).toBeTruthy();
 expect(screen.getByText('10 course XP')).toBeTruthy();
 expect(screen.getByRole('progressbar',{name:'Progress toward next level'}).getAttribute('aria-valuenow')).toBe('0');
 fireEvent.change(screen.getByRole('combobox'),{target:{value:'hausa'}});await screen.findByRole('heading',{name:'Your Hausa journey'});
 expect(screen.getByText('Level 2')).toBeTruthy();expect(screen.getByText('20 total XP')).toBeTruthy();expect(screen.getByText('0 course XP')).toBeTruthy();
});

it('unlocks practice only for the selected completed language',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({id:'123',display_name:'Ada',preferred_language:'igbo',progress:{total_xp:10,completions:[{language:'igbo',lesson_id:'a-warm-welcome',status:'completed',first_choice_score:4,completed_at:'2026-10-08',xp:10}]}})}).mockResolvedValue({ok:true}));
 render(<App/>);await screen.findByRole('button',{name:'Sign out'});fireEvent.click(screen.getAllByRole('button',{name:'Continue learning'})[0]);await screen.findByRole('heading',{name:'Your Igbo journey'});
 expect(screen.getByRole('button',{name:'Practise with Ada'})).toBeTruthy();
 fireEvent.change(screen.getByRole('combobox'),{target:{value:'hausa'}});await screen.findByRole('heading',{name:'Your Hausa journey'});
 expect(screen.queryByRole('button',{name:'Practise with Amina'})).toBeNull();
 fireEvent.change(screen.getByRole('combobox'),{target:{value:'yoruba'}});await screen.findByRole('heading',{name:'Your Yorùbá journey'});
 expect(screen.queryByRole('button',{name:'Practise with Adé'})).toBeNull();
});


it('has no false demo activity or stale reward claims',async()=>{
 const requests=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({id:'123',display_name:'Ada',preferred_language:'yoruba',progress:{total_xp:0,completions:[]}})}).mockResolvedValue({ok:true});
 vi.stubGlobal('fetch',requests);const {container}=render(<App/>);await screen.findByRole('button',{name:'Sign out'});
 expect(container.textContent).not.toMatch(/demo|sample|preview|interactive lessons coming next|backend reward logic is not active|achievements/i);
 expect(screen.getAllByText(/Coming later/i).length).toBeGreaterThan(0);
 expect(container.querySelector('.finished')).toBeNull();
 fireEvent.click(screen.getAllByRole('button',{name:'Continue learning'})[0]);await screen.findByRole('heading',{name:'Your Yorùbá journey'});
 expect(container.textContent).not.toMatch(/demo|sample|preview/i);
 expect(container.querySelector('.week')).toBeNull();
 expect(screen.queryByRole('link',{name:'Go to conversation practice'})).toBeNull();
});

it.each([['yoruba','Yorùbá',5],['igbo','Igbo',5],['hausa','Hausa',5]])('honestly ends available %s content without silently replaying',async(language,name,size)=>{
 const completions=['a-warm-welcome','everyday-greetings','introduce-yourself','family-and-people','food-and-drink'].map(lesson_id=>({language,lesson_id,status:'completed',first_choice_score:4,completed_at:'2026-10-08',xp:10}));
 vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({id:'123',display_name:'Ada',preferred_language:language,progress:{total_xp:size*10,completions}})}).mockResolvedValue({ok:true}));
 const scroll=vi.fn();Object.defineProperty(HTMLElement.prototype,'scrollIntoView',{configurable:true,value:scroll});
 render(<App/>);await screen.findByRole('button',{name:'Sign out'});fireEvent.click(screen.getAllByRole('button',{name:'Continue learning'})[0]);await screen.findByRole('heading',{name:`Your ${name} journey`});
 expect(screen.queryByRole('button',{name:'Continue the journey'})).toBeNull();
 expect(screen.getByRole('link',{name:'Go to conversation practice'}).getAttribute('href')).toBe('#conversation-practice');
 const progress=screen.getByRole('progressbar',{name:'Available lesson progress'});
 expect(progress.getAttribute('aria-valuemax')).toBe(String(size));expect(progress.getAttribute('aria-valuenow')).toBe(String(size));
 expect(document.body.textContent).not.toContain('100%');expect(screen.queryByText('COMING LATER')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Practise conversation'}));expect(scroll).toHaveBeenCalledOnce();expect(screen.queryByRole('dialog')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'A Warm Welcome, completed'}));expect(screen.getByRole('dialog')).toBeTruthy();
});

it.each(['igbo','hausa'])('preserves anonymous %s selection across Google redirect and enrolls after sign-in',async language=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:401}));render(<App/>);
 await waitFor(()=>expect((screen.getByRole('combobox') as HTMLSelectElement).disabled).toBe(false));
 fireEvent.change(screen.getByRole('combobox'),{target:{value:language}});expect(sessionStorage.getItem('lingonaija.pendingLanguage')).toBe(language);cleanup();
 history.replaceState(null,'','/?signed_in=1');const requests=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({id:'123',display_name:'Ada',preferred_language:'yoruba'})}).mockResolvedValue({ok:true});vi.stubGlobal('fetch',requests);
 render(<App/>);await screen.findByRole('heading',{name:`Your ${language==='igbo'?'Igbo':'Hausa'} journey`});
 expect(requests).toHaveBeenCalledWith('/api/enrollments',expect.objectContaining({body:JSON.stringify({language})}));
 expect(sessionStorage.getItem('lingonaija.pendingLanguage')).toBeNull();expect(location.search).toBe('');
});

it('retains the chosen language and allows retry when post-login enrollment fails',async()=>{
 sessionStorage.setItem('lingonaija.pendingLanguage','hausa');history.replaceState(null,'','/?signed_in=1');
 const requests=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({id:'123',display_name:'Ada',preferred_language:'yoruba'})}).mockResolvedValueOnce({ok:false,status:503}).mockResolvedValue({ok:true});vi.stubGlobal('fetch',requests);
 render(<App/>);await screen.findByText(/Signed in, but your selected language could not be saved/);
 expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('hausa');expect(sessionStorage.getItem('lingonaija.pendingLanguage')).toBe('hausa');
 fireEvent.click(screen.getAllByRole('button',{name:'Continue learning'})[0]);await screen.findByRole('heading',{name:'Your Hausa journey'});expect(sessionStorage.getItem('lingonaija.pendingLanguage')).toBeNull();
});


it.each([['yoruba','Yorùbá'],['igbo','Igbo'],['hausa','Hausa']])('opens Unit 2 only after the three %s starter lessons',async(language,name)=>{
 const completions=['a-warm-welcome','everyday-greetings','introduce-yourself'].map(lesson_id=>({language,lesson_id,status:'completed',first_choice_score:4,completed_at:'2026-10-09',xp:10}));
 vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({id:'123',display_name:'Ada',preferred_language:language,progress:{total_xp:30,completions}})}).mockResolvedValue({ok:true}));
 render(<App/>);await screen.findByRole('button',{name:'Sign out'});fireEvent.click(screen.getAllByRole('button',{name:'Continue learning'})[0]);await screen.findByRole('heading',{name:`Your ${name} journey`});
 expect(screen.getByRole('heading',{name:'Getting Started'})).toBeTruthy();expect(screen.getByRole('heading',{name:'Everyday Life'})).toBeTruthy();
 expect(screen.getByText('3 of 5 available lessons complete')).toBeTruthy();
 expect((screen.getByRole('button',{name:'Food & Drink, locked'}) as HTMLButtonElement).disabled).toBe(true);
 expect(screen.getByText('Complete Family & People to unlock')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Continue the journey'}));
 expect(screen.getByRole('dialog').textContent).toContain('Family & People');expect(screen.getByText(`${name} · Unit 2`)).toBeTruthy();
});
