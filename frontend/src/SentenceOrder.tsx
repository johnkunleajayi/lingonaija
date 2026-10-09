import {useState} from 'react';
import type {SentenceOrderExercise} from './lessonContent';
import './sentence-order.css';
export function SentenceOrder({exercise,checked,onCheck}:{exercise:SentenceOrderExercise;checked:boolean;onCheck:(ids:string[],correct:boolean)=>void}){
 const [selected,setSelected]=useState<string[]>([]);
 const tileById=new Map(exercise.tiles.map(tile=>[tile.id,tile]));
 return <div className="sentence-order">
  <p className="lesson-note">Tap tiles to build your answer. Tap an answer tile to move it back.</p>
  <div className="sentence-answer" role="group" aria-label="Your sentence">
   {selected.length===0?<span>Build your sentence here</span>:selected.map((id,index)=><button className="lesson-option" key={id} disabled={checked} aria-label={`Remove ${tileById.get(id)!.text}, position ${index+1}`} onClick={()=>setSelected(ids=>ids.filter(item=>item!==id))}>{tileById.get(id)!.text}</button>)}
  </div>
  <div className="sentence-bank" role="group" aria-label="Available tiles">
   {exercise.tiles.filter(tile=>!selected.includes(tile.id)).map(tile=><button className="lesson-option" key={tile.id} disabled={checked} aria-label={`Add ${tile.text}`} data-tile-id={tile.id} onClick={()=>setSelected(ids=>[...ids,tile.id])}>{tile.text}</button>)}
  </div>
  <button className="primary" disabled={checked||selected.length!==exercise.tiles.length} onClick={()=>onCheck([...selected],selected.every((id,index)=>tileById.get(id)!.text===tileById.get(exercise.correctOrder[index])!.text))}>Check</button>
 </div>;
}
