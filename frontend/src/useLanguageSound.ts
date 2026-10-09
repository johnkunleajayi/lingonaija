import {useEffect} from 'react';
import type {Language} from './courses';
const sounds:Record<Language,string>={yoruba:'/audio/talking-drum.ogg',igbo:'/audio/oja.ogg',hausa:'/audio/kakaaki.ogg'};
/** One sound for each selected-language entry, shared by public and learner views. */
export function useLanguageSound(language:Language){
 useEffect(()=>{
  let active=true, audio:HTMLAudioElement|undefined;
  let waiting=false, interacted=false, retried=false;
  const events=['pointerdown','keydown'] as const;
  function removeListeners(){for(const event of events)window.removeEventListener(event,interact);}
  function interact(){interacted=true;if(waiting){waiting=false;retried=true;removeListeners();play();}}
  function play(){
   if(!active||!audio)return;
   try{const result=audio.play();result?.then(()=>{if(active)removeListeners();}).catch(error=>{
    if(!active)return;
    if(error?.name==='NotAllowedError'&&!retried){
     if(interacted){retried=true;removeListeners();play();}else waiting=true;
    }else removeListeners();
   });}catch{removeListeners();}
  }
  // Defer only initialization so React StrictMode's discarded effect cannot play twice.
  queueMicrotask(()=>{
   if(!active)return;
   try{audio=new Audio(sounds[language]);audio.volume=0.25;
    for(const event of events)window.addEventListener(event,interact);
    play();
   }catch{removeListeners();}
  });
  return()=>{active=false;removeListeners();if(audio){try{audio.pause();audio.currentTime=0;}catch{}}};
 },[language]);
}
