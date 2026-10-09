import {useEffect,useState,useRef} from 'react';
import './lesson-celebration.css';
let playing:HTMLAudioElement|null=null;
export function LessonCelebration({onFinished}:{onFinished?:()=>void}={}){
 const finishedCallback=useRef(onFinished);finishedCallback.current=onFinished;
 const [visible,setVisible]=useState(true);
 useEffect(()=>{
  let active=true, audio:HTMLAudioElement|null=null;
  // Avoid duplicate playback in React StrictMode's discarded effect.
  queueMicrotask(()=>{
   if(!active)return;
   try{playing?.pause();if(playing)playing.currentTime=0;
    audio=new Audio('/audio/celebration.ogg');playing=audio;audio.volume=0.3;
    audio.play()?.catch(()=>{});
   }catch{/* Playback failure never affects completion. */}
  });
  const timer=window.setTimeout(()=>{setVisible(false);finishedCallback.current?.();},4000);
  return()=>{active=false;window.clearTimeout(timer);try{audio?.pause();if(audio)audio.currentTime=0;}catch{}if(playing===audio)playing=null;};
 },[]);
 if(!visible)return null;
 return <div className="lesson-celebration" data-testid="lesson-celebration" aria-hidden="true">
  <div className="celebration-burst">{Array.from({length:12},(_,index)=><i key={index} style={{'--ray':index} as React.CSSProperties}/>)}
   <img src="/brand/lingonaija-icon.png" alt="" width="176" height="176"/>
  </div>
 </div>;
}
