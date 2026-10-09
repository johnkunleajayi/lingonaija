import './character-amina.css';
import './character-ada.css';
import './character-ade.css';
import {type Language} from './courses';
export function Character({language}:{language:Language}){if(language==='yoruba')return <img className="character character-ade" src="/brand/ade.png" alt="Adé in a blue agbádá and patterned fìlà" width="1254" height="1254"/>;if(language==='igbo')return <img className="character character-ada" src="/brand/ada.png" alt="Ada in a patterned outfit and red headwrap with coral beads" width="1254" height="1254"/>;return <img className="character character-amina" src="/brand/amina.png" alt="Amina in a green outfit and headscarf with gold embroidery" width="1254" height="1254"/>;}
