import {useEffect,useRef,useState} from 'react';
import type {Language} from './courses';
export type Progress={current_streak?:number;longest_streak?:number;total_xp:number;completions:{language:Language;lesson_id:string;status:'completed';first_choice_score:number;completed_at:string;xp:number}[]};
export type User={id:string;display_name:string;avatar_url?:string|null;preferred_language:Language;enrollments?:Language[];progress?:Progress};
export function useAuth(){
 const [user,setUser]=useState<User|null>(null);
 const [loading,setLoading]=useState(true);
 const [enrolling,setEnrolling]=useState(false);
 const busy=useRef(false);
 useEffect(()=>{let active=true;fetch('/api/auth/me',{credentials:'include'}).then(async r=>{if(r.ok){const data=await r.json();if(active)setUser(data)}}).catch(()=>{}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[]);
 async function enroll(language:Language):Promise<boolean>{
  if(!user||busy.current)return false;
  busy.current=true;setEnrolling(true);
  try{
   const response=await fetch('/api/enrollments',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({language})});
   if(!response.ok)throw new Error('Enrollment failed');
   setUser(current=>current?.id===user.id?{...current,preferred_language:language,enrollments:[...new Set([...(current.enrollments??[]),language])]}:current);
   return true;
  }finally{busy.current=false;setEnrolling(false)}
 }
 async function logout(){const response=await fetch('/api/auth/logout',{method:'POST',credentials:'include'});if(!response.ok)throw new Error('Logout failed');setUser(null)}
 async function completeLesson(language:Language,lessonId:string,answers:number[]){
  const response=await fetch(`/api/learning/${language}/${lessonId}/complete`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({answers})});
  if(!response.ok)throw new Error('Completion could not be saved');
  const progress:Progress=await response.json();
  setUser(current=>current?.id===user?.id?{...current!,progress}:current);
 }
 return {user,loading,enrolling,enroll,logout,completeLesson};
}
