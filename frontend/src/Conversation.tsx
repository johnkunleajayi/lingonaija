import {apiUrl} from './api';
import './conversation.css';
import {Character} from './Character';
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
   const result=await fetch(apiUrl(start?`/api/conversation/${language}`:`/api/conversation/${language}/evaluate`),start?{credentials:'include'}:{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({turn:turn!.index,response:answer})});
   if(!result.ok){const data=await result.json();throw new Error(typeof data.detail==='string'?data.detail:'Practice is unavailable. Please try again.')}
   const data=await result.json();if(start){if(data.scenario_title)setTitle(data.scenario_title);setTurn(data.turn);setFeedback(null);setAnswer('');setOpened(true);setWrongAttempts(0);setFinished(false)}else {setFeedback(data);if(!data.meaning_correct)setWrongAttempts(value=>value+1);}
  }catch(e){setError(e instanceof Error?e.message:'Practice is unavailable. Please try again.')}
  finally{lock.current=false;setBusy(false)}
 }
 return <section className="conversation-card" aria-label="Conversation practice">
  <div className="conversation-heading"><div><span className="eyebrow">REAL-LIFE CONNECTIONS</span><h2>Conversation practice with {character}</h2><p>{title} · 3 short greeting turns</p></div><Character language={language}/></div>
  {!opened?<button className="primary" disabled={busy} onClick={()=>{void call(true)}}>{busy?'Opening…':`Practise with ${character}`}</button>:<>
   {finished?<><h3>Conversation complete!</h3><p>You welcomed {character} and exchanged everyday greetings.</p></>:<>
    <div className="conversation-turn-progress">
     <p className="conversation-turn"><strong>Turn {(turn?.index??0)+1} of 3</strong></p>
     <div className="conversation-turn-segments" role="progressbar" aria-label="Conversation turn progress" aria-valuemin={0} aria-valuemax={3} aria-valuenow={turn?.index??0} aria-valuetext={`${turn?.index??0} of 3 turns finished; turn ${(turn?.index??0)+1} is current`}>
      {[0,1,2].map(index=><span key={index} aria-hidden="true" className={index<(turn?.index??0)?'finished':index===(turn?.index??0)?'current':'pending'}/>)}
     </div>
    </div>
    <div className="conversation-message"><div className="conversation-speaker"><Character language={language}/><strong>{character}</strong></div><p className="conversation-prompt">{turn?.ade}</p></div>
    <form onSubmit={e=>{e.preventDefault();if(answer.trim()&&!feedback)void call(false)}}>
     <label htmlFor="conversation-response">Your {courses[language].name} response</label>
     <input ref={input} autoFocus id="conversation-response" maxLength={500} aria-describedby="conversation-guidance" value={answer} disabled={busy||!!feedback} onChange={e=>setAnswer(e.target.value)} className="conversation-input"/>
     <p id="conversation-guidance" className="conversation-guidance">Tone marks are welcome, but you can type without them. We’ll focus on your meaning.</p>
     {!feedback&&<button className="primary" disabled={busy||!answer.trim()}>{busy?'Checking…':'Send response'}</button>}
    </form>
   </>}
   {feedback&&!finished&&<div className="conversation-feedback" data-correct={feedback.meaning_correct} role="status">
    <p><strong>{feedback.meaning_correct?'Meaning understood':'Let’s try again'}</strong></p><p>{feedback.feedback}</p>
    {(feedback.meaning_correct||wrongAttempts>=2)&&<><p>Preferred form: <strong>{feedback.preferred_form}</strong></p><p>{feedback.orthography_note}</p></>}
    {feedback.meaning_correct&&<blockquote aria-label={`${character}’s reply`} className="character-reply"><strong>{character}</strong><p>{feedback.character_reply??(language==='yoruba'?adeReplies[turn!.index]:'Thank you for your greeting!')}</p></blockquote>}
    <button className="primary" onClick={()=>{
     if(feedback.complete){setFinished(true);return;}
     setTurn(feedback.next_turn);setFeedback(null);setAnswer('');
     if(feedback.meaning_correct)setWrongAttempts(0);
     setTimeout(()=>input.current?.focus(),0);
    }}>{feedback.complete?'Finish conversation':feedback.meaning_correct?'Next turn':'Try again'}</button>
   </div>}
   <button className="account-button conversation-close" disabled={busy} onClick={()=>{setOpened(false);setTurn(null);setFeedback(null);setError('');setWrongAttempts(0);setFinished(false)}}>Close practice</button>
  </>}
  {error&&<p role="alert">{error}</p>}
 </section>;
}
