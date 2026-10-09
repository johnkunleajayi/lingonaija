import {useState} from 'react';
import './user-identity.css';
export function firstName(name?:string){return name?.trim().split(/\s+/)[0]||'Learner'}
export function UserIdentity({name,avatarUrl}:{name:string;avatarUrl?:string|null}){
 const [failedUrl,setFailedUrl]=useState<string|null>(null);
 const words=name.trim().split(/\s+/).filter(Boolean);
 const initials=words.length?Array.from(words[0])[0]+(words.length>1?Array.from(words[words.length-1])[0]:''):'L';
 return <div className="user-identity">
 {avatarUrl&&failedUrl!==avatarUrl?<img className="user-avatar" src={avatarUrl} alt={`${name}'s profile`} referrerPolicy="no-referrer" onError={()=>setFailedUrl(avatarUrl)}/>:<span className="user-avatar user-initials" role="img" aria-label={`${name||'Learner'}'s initials`}>{initials.toUpperCase()}</span>}
 <span className="user-name">{name.trim()||'Learner'}</span>
 </div>;
}
