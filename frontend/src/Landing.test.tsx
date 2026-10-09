// @vitest-environment jsdom
import {render,screen,fireEvent,cleanup,within} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import {Landing} from './Landing';
afterEach(cleanup);
it('shows the requested hero copy and approved portraits without rendering the reference',()=>{
 const {container}=render(<Landing language="yoruba" onLanguage={()=>{}} onStart={()=>{}} signedIn={false}/>);
 const hero=screen.getByRole('region',{name:'Learn Nigerian languages'});
 expect(hero.textContent).toContain('LEARN • PRACTICE • CONNECT');
 expect(hero.textContent).toContain('Learn Yorùbá, Igbo and Hausa through practical lessons, real conversations and Nigerian cultural context.');
 expect([...hero.querySelectorAll('img')].map(image=>image.getAttribute('src'))).toEqual(['/brand/ade.png','/brand/ada.png','/brand/amina.png']);
 expect(container.querySelector('img[src*="landing-hero-reference"]')).toBeNull();
});
it.each([false,true])('routes the hero CTA through the existing start handler (signed in: %s)',signedIn=>{
 const start=vi.fn();const select=vi.fn();render(<Landing language="igbo" onLanguage={select} onStart={start} signedIn={signedIn}/>);
 fireEvent.click(within(screen.getByRole('region',{name:'Learn Nigerian languages'})).getByRole('button',{name:'Start Learning Free'}));expect(start).toHaveBeenCalledOnce();expect(select).not.toHaveBeenCalled();
 expect(screen.queryByRole('link',{name:'Find your language'})).toBeNull();
});
it('keeps the start action disabled while the existing auth/enrollment flow is busy',()=>{
 const start=vi.fn();render(<Landing language="hausa" onLanguage={()=>{}} onStart={start} signedIn={false} busy/>);
 const button=within(screen.getByRole('region',{name:'Learn Nigerian languages'})).getByRole('button',{name:'Start Learning Free'});expect((button as HTMLButtonElement).disabled).toBe(true);fireEvent.click(button);expect(start).not.toHaveBeenCalled();
});

it('places the four real-conversation feature cards directly after the unchanged hero',()=>{
 render(<Landing language="yoruba" onLanguage={()=>{}} onStart={()=>{}} signedIn={false}/>);
 const hero=screen.getByRole('region',{name:'Learn Nigerian languages'});
 const features=screen.getByRole('region',{name:'Built for real conversations'});
 expect(hero.nextElementSibling).toBe(features);
 expect([...features.querySelectorAll('h3')].map(heading=>heading.textContent)).toEqual(['Interactive Lessons','Conversation Practice','Track Your Progress','Nigerian Context']);
 expect(features.textContent).toContain('Learn more than words. Build practical language skills through lessons, conversation and Nigerian cultural context.');
 expect(features.querySelectorAll('article')).toHaveLength(4);
 expect(features.querySelectorAll('button,a')).toHaveLength(0);
 expect(features.nextElementSibling?.id).toBe('languages');
});

it('uses the existing selection callback for each language showcase card',()=>{
 const select=vi.fn();render(<Landing language="igbo" onLanguage={select} onStart={()=>{}} signedIn={false}/>);
 const section=screen.getByRole('region',{name:'Choose a language. Enter a culture.'});
 expect(section.textContent).toContain('Báwo ni?');expect(section.textContent).toContain('Kedụ?');expect(section.textContent).toContain('Sannu!');
 for(const [language,name] of [['yoruba','Yorùbá'],['igbo','Igbo'],['hausa','Hausa']]){
  const button=screen.getByRole('button',{name:`Explore ${name}`});expect(button.getAttribute('aria-pressed')).toBe(String(language==='igbo'));
  fireEvent.click(button);expect(select).toHaveBeenLastCalledWith(language);
 }
 expect(select).toHaveBeenCalledTimes(3);
});
it('disables language showcase selections while existing enrollment is busy',()=>{
 const select=vi.fn();render(<Landing language="yoruba" onLanguage={select} onStart={()=>{}} signedIn busy/>);
 for(const name of ['Yorùbá','Igbo','Hausa']){const button=screen.getByRole('button',{name:`Explore ${name}`});expect((button as HTMLButtonElement).disabled).toBe(true);fireEvent.click(button)}
 expect(select).not.toHaveBeenCalled();
});

it('places a connected three-step learning journey after the language showcase',()=>{
 render(<Landing language="yoruba" onLanguage={()=>{}} onStart={()=>{}} signedIn={false}/>);
 const showcase=screen.getByRole('region',{name:'Choose a language. Enter a culture.'});
 const journey=screen.getByRole('region',{name:'A learning journey that keeps you moving'});
 expect(showcase.nextElementSibling).toBe(journey);
 expect(journey.textContent).toContain('Learn in small steps, practise what matters and build momentum as you progress.');
 expect([...journey.querySelectorAll('li h3')].map(heading=>heading.textContent)).toEqual(['Learn','Practise','Keep growing']);
 expect([...journey.querySelectorAll('.how-it-works-number')].map(number=>number.textContent)).toEqual(['01','02','03']);
 expect(journey.querySelectorAll('ol > li')).toHaveLength(3);
 expect(journey.querySelectorAll('button,a')).toHaveLength(0);
 expect(journey.nextElementSibling?.classList.contains('landing-final')).toBe(true);
});

it.each([false,true])('keeps the final CTA on the existing start flow (signed in: %s)',signedIn=>{
 const start=vi.fn();const {container}=render(<Landing language="hausa" onLanguage={()=>{}} onStart={start} signedIn={signedIn}/>);
 const final=screen.getByRole('region',{name:'There’s a whole world in your next hello.'});
 expect(final.textContent).toContain('Start learning Yorùbá, Igbo or Hausa today.');
 fireEvent.click(within(final).getByRole('button',{name:'Start Learning Free'}));expect(start).toHaveBeenCalledOnce();
 expect(container.querySelector('footer')?.textContent).toBe('© 2026 LingoNaija · Real conversations. Richer connections.');
 expect(container.querySelector('#journey,#culture,.play-section')).toBeNull();
 expect(screen.queryByText(/A path that makes|Culture isn’t a chapter|Make room for your next win/)).toBeNull();
});
