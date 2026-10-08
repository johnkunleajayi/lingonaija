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
 fireEvent.click(screen.getByRole('button',{name:'Close lesson'}));
 fireEvent.click(screen.getByRole('button',{name:'A warm welcome, completed'}));
 expect(screen.getByRole('dialog').textContent).toContain('Exercise 1 of 4');
 expect(requests).toHaveBeenCalledTimes(2);
});
