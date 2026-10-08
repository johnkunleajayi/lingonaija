// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import {Conversation} from './Conversation';
afterEach(()=>{cleanup();vi.unstubAllGlobals()});
it('submits typed greetings with Enter, shows marked feedback and finishes three turns',async()=>{
 const turns=[0,1,2].map(index=>({index,ade:`Adé situation ${index}`,preferred_form:'Ẹ káàbọ̀'}));
 const fetch=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({turn:turns[0]})});
 for(let i=0;i<3;i++)fetch.mockResolvedValueOnce({ok:true,json:async()=>({meaning_correct:true,preferred_form:'Ẹ káàbọ̀',orthography_note:'Notice the marks.',feedback:'Meaning understood.',next_turn:i===2?null:turns[i+1],complete:i===2})});
 vi.stubGlobal('fetch',fetch);render(<Conversation/>);fireEvent.click(screen.getByRole('button',{name:'Practise with Adé'}));
 for(let i=0;i<3;i++){
  const input=await screen.findByLabelText('Your Yorùbá response');fireEvent.change(input,{target:{value:'E kaabo'}});fireEvent.submit(input.closest('form')!);
  await screen.findByRole('status');expect(screen.getByText('Notice the marks.')).toBeTruthy();
  expect(screen.getByLabelText('Adé’s reply')).toBeTruthy();
  expect(screen.queryByText('Conversation complete!')).toBeNull();
  if(i<2){expect(screen.queryByText(`Adé situation ${i+1}`)).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Next turn'}));}
  else fireEvent.click(screen.getByRole('button',{name:'Finish conversation'}));
 }
 expect(screen.getByText('Conversation complete!')).toBeTruthy();
 expect(fetch).toHaveBeenCalledWith('/api/conversation/yoruba/evaluate',expect.objectContaining({body:JSON.stringify({turn:0,response:'E kaabo'}),credentials:'include'}));
});
it('shows request failures and allows retry without fake feedback',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({turn:{index:0,ade:'Welcome me',preferred_form:'Ẹ káàbọ̀'}})}).mockResolvedValue({ok:false,json:async()=>({detail:'Practice is unavailable. Please try again.'})}));
 render(<Conversation/>);fireEvent.click(screen.getByRole('button',{name:'Practise with Adé'}));
 const input=await screen.findByLabelText('Your Yorùbá response');fireEvent.change(input,{target:{value:'E kaabo'}});fireEvent.submit(input.closest('form')!);
 await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('Practice is unavailable'));expect(screen.queryByRole('status')).toBeNull();
 expect((screen.getByRole('button',{name:'Send response'}) as HTMLButtonElement).disabled).toBe(false);
});

it('hints before revealing an answer and resets attempts on each new turn',async()=>{
 const first={index:0,ade:'I have arrived for a visit.',preferred_form:'Ẹ káàbọ̀'};
 const next={index:1,ade:'We meet at breakfast.',preferred_form:'Ẹ káàárọ̀'};
 const wrong=(turn:typeof first)=>({meaning_correct:false,preferred_form:turn.preferred_form,orthography_note:'Notice the marks.',feedback:'Think about welcoming a visitor.',next_turn:turn,complete:false});
 const fetch=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({turn:first})})
 .mockResolvedValueOnce({ok:true,json:async()=>wrong(first)})
 .mockResolvedValueOnce({ok:true,json:async()=>wrong(first)})
 .mockResolvedValueOnce({ok:true,json:async()=>({...wrong(first),meaning_correct:true,feedback:'That greeting fits.',next_turn:next})})
 .mockResolvedValueOnce({ok:true,json:async()=>wrong(next)});
 vi.stubGlobal('fetch',fetch);render(<Conversation/>);fireEvent.click(screen.getByRole('button',{name:'Practise with Adé'}));
 async function submit(answer:string){const input=await screen.findByLabelText('Your Yorùbá response');fireEvent.change(input,{target:{value:answer}});fireEvent.submit(input.closest('form')!);await screen.findByRole('status');}
 await submit('E kaasan');expect(screen.getByText('Think about welcoming a visitor.')).toBeTruthy();expect(screen.queryByText('Ẹ káàbọ̀')).toBeNull();expect(screen.queryByLabelText('Adé’s reply')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Try again'}));
 await waitFor(()=>expect(document.activeElement).toBe(screen.getByLabelText('Your Yorùbá response')));
 await submit('E kaaro');expect(screen.getByText('Ẹ káàbọ̀')).toBeTruthy();expect(screen.getAllByText(/Preferred form:/)).toHaveLength(1);
 fireEvent.click(screen.getByRole('button',{name:'Try again'}));await submit('E kaabo');expect(screen.getByLabelText('Adé’s reply').textContent).toContain('Thank you for welcoming me');
 fireEvent.click(screen.getByRole('button',{name:'Next turn'}));await submit('E kaabo');expect(screen.queryByText('Ẹ káàárọ̀')).toBeNull();
});

it.each([['igbo','Ada',['Nnoo','Kedu?','O di mma']],['hausa','Amina',['Sannu da zuwa','Ina kwana?','Lafiya lau']]] as const)('uses the shared hint/reveal/reply flow for %s',async(language,character,answers)=>{
 const turn={index:0,ade:'Welcome me on arrival.',preferred_form:language==='igbo'?'Nnọọ':'Sannu da zuwa'};
 const wrong={meaning_correct:false,preferred_form:turn.preferred_form,orthography_note:'Notice the spelling.',feedback:'Think about an arrival.',next_turn:turn,complete:false,character_reply:null};
 const fetch=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({turn})})
 .mockResolvedValueOnce({ok:true,json:async()=>wrong}).mockResolvedValueOnce({ok:true,json:async()=>wrong});
 for(let i=0;i<3;i++)fetch.mockResolvedValueOnce({ok:true,json:async()=>({...wrong,meaning_correct:true,character_reply:`${character} reply ${i}`,next_turn:i===2?null:{...turn,index:i+1},complete:i===2})});
 vi.stubGlobal('fetch',fetch);render(<Conversation language={language}/>);fireEvent.click(screen.getByRole('button',{name:`Practise with ${character}`}));
 async function submit(answer:string){const input=await screen.findByLabelText(`Your ${language==='igbo'?'Igbo':'Hausa'} response`);fireEvent.change(input,{target:{value:answer}});fireEvent.submit(input.closest('form')!);await screen.findByRole('status');}
 await submit('wrong');expect(screen.queryByText(turn.preferred_form)).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Try again'}));
 await submit('wrong again');expect(screen.getByText(turn.preferred_form)).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Try again'}));
 for(let i=0;i<3;i++){
  await submit(answers[i]);expect(screen.getByLabelText(`${character}’s reply`).textContent).toContain(`${character} reply ${i}`);
  fireEvent.click(screen.getByRole('button',{name:i===2?'Finish conversation':'Next turn'}));
 }
 expect(screen.getByText('Conversation complete!')).toBeTruthy();
 expect(fetch).toHaveBeenCalledWith(`/api/conversation/${language}/evaluate`,expect.objectContaining({body:JSON.stringify({turn:0,response:answers[0]})}));
});
