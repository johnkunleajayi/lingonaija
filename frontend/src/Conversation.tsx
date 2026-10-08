import {courses,type Language} from './courses';
import {useRef, useState} from 'react';
type Turn={index:number;ade:string;preferred_form:string};
type Feedback={meaning_correct:boolean;preferred_form:string;orthography_note:string;feedback:string;next_turn:Turn|null;complete:boolean;character_reply?:string|null};
const adeReplies=[
 'Thank you for welcoming me! It is lovely to spend the weekend with you.',
 'Good morning to you too! I am glad we can share breakfast.',
 'Good afternoon to you too! It has been lovely chatting with you.',
];
export function Conversation({language='yoruba'}:{language?:Language}){
 const character=courses[language].person;
 const [title,setTitle]=useState(language==='yoruba'?'A weekend visit':'A friendly visit');
 const [opened,setOpened]=useState(false),[busy,setBusy]=useState(false),[answer,setAnswer]=useState(''),[error,setError]=useState('');
 const [turn,setTurn]=useState<Turn|null>(null),[feedback,setFeedback]=useState<Feedback|null>(null);
 const [wrongAttempts,setWrongAttempts]=useState(0),[finished,setFinished]=useState(false);
 const lock=useRef(false);const input=useRef<HTMLInputElement>(null);
 async function call(start:boolean){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');
  try{
   const result=await fetch(start?`/api/conversation/${language}`:`/api/conversation/${language}/evaluate`,start?{credentials:'include'}:{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({turn:turn!.index,response:answer})});
   if(!result.ok){const data=await result.json();throw new Error(typeof data.detail==='string'?data.detail:'Practice is unavailable. Please try again.')}
   const data=await result.json();if(start){if(data.scenario_title)setTitle(data.scenario_title);setTurn(data.turn);setFeedback(null);setAnswer('');setOpened(true);setWrongAttempts(0);setFinished(false)}else {setFeedback(data);if(!data.meaning_correct)setWrongAttempts(value=>value+1);}
  }catch(e){setError(e instanceof Error?e.message:'Practice is unavailable. Please try again.')}
  finally{lock.current=false;setBusy(false)}
 }
 return <section className="learner-level" aria-label="Conversation practice">
  <h2>Conversation practice with {character}</h2><p>{title} · 3 short greeting turns · no rewards or saved results</p>
  {!opened?<button className="primary" disabled={busy} onClick={()=>{void call(true)}}>{busy?'Opening…':`Practise with ${character}`}</button>:<>
   {finished?<><h3>Conversation complete!</h3><p>You welcomed {character} and exchanged everyday greetings.</p></>:<>
    <p><strong>Turn {(turn?.index??0)+1} of 3 · {character}</strong></p><p>{turn?.ade}</p>
    <form onSubmit={e=>{e.preventDefault();if(answer.trim()&&!feedback)void call(false)}}>
     <label htmlFor="conversation-response">Your {courses[language].name} response</label>
     <input ref={input} autoFocus id="conversation-response" maxLength={500} value={answer} disabled={busy||!!feedback} onChange={e=>setAnswer(e.target.value)} style={{display:'block',width:'100%',padding:12,margin:'10px 0',borderRadius:10,border:'1px solid var(--border)',background:'var(--surface)',color:'var(--ink)',fontSize:16}}/>
     <p>Tone marks are welcome, but you can type without them. We’ll focus on your meaning.</p>
     {!feedback&&<button className="primary" disabled={busy||!answer.trim()}>{busy?'Checking…':'Send response'}</button>}
    </form>
   </>}
   {feedback&&!finished&&<div role="status">
    <p><strong>{feedback.meaning_correct?'Meaning understood':'Let’s try again'}</strong></p><p>{feedback.feedback}</p>
    {(feedback.meaning_correct||wrongAttempts>=2)&&<><p>Preferred form: <strong>{feedback.preferred_form}</strong></p><p>{feedback.orthography_note}</p></>}
    {feedback.meaning_correct&&<blockquote aria-label={`${character}’s reply`} style={{margin:'16px 0',padding:16,borderLeft:'4px solid var(--accent)',background:'var(--soft)',borderRadius:10}}><strong>{character}</strong><p>{feedback.character_reply??(language==='yoruba'?adeReplies[turn!.index]:'Thank you for your greeting!')}</p></blockquote>}
    <button className="primary" onClick={()=>{
     if(feedback.complete){setFinished(true);return;}
     setTurn(feedback.next_turn);setFeedback(null);setAnswer('');
     if(feedback.meaning_correct)setWrongAttempts(0);
     setTimeout(()=>input.current?.focus(),0);
    }}>{feedback.complete?'Finish conversation':feedback.meaning_correct?'Next turn':'Try again'}</button>
   </div>}
   <button className="account-button" disabled={busy} onClick={()=>{setOpened(false);setTurn(null);setFeedback(null);setError('');setWrongAttempts(0);setFinished(false)}}>Close practice</button>
  </>}
  {error&&<p role="alert">{error}</p>}
 </section>;
}
