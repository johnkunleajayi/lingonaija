import {useState} from 'react';
import type {VisualMedia} from './lessonContent';
import './lesson-media.css';
export function LessonMedia({media}:{media:VisualMedia}){
 const [failed,setFailed]=useState(false);
 if(failed)return null;
 return <figure className="lesson-context-media"><img src={media.src} alt={media.alt} decoding="async" onError={()=>setFailed(true)}/></figure>;
}
