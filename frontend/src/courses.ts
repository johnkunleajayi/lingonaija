import {learningCourses} from './lessonContent';
export type Language = 'yoruba'|'igbo'|'hausa';
const culturalCourses = {
 yoruba:{name:'Yorùbá',greeting:'Ẹ káàbọ̀',meaning:'You are welcome',person:'Adé',color:'#cb774f',clothing:'Contemporary agbádá-inspired outfit and patterned fìlà'},
 igbo:{name:'Igbo',greeting:'Nnọọ',meaning:'Welcome',person:'Ada',color:'#8a6aab',clothing:'Contemporary blouse and patterned wrapper with coral-inspired accessories'},
 hausa:{name:'Hausa',greeting:'Sannu',meaning:'Hello',person:'Amina',color:'#458d98',clothing:'Contemporary long dress and matching headscarf with geometric embroidery'}
};

export const courses = Object.fromEntries(Object.entries(culturalCourses).map(([language,course])=>[language,{...course,units:learningCourses[language as Language].units.map(unit=>unit.title),lessons:learningCourses[language as Language].units.flatMap(unit=>unit.lessons.map(lesson=>lesson.title))}])) as Record<Language,typeof culturalCourses.yoruba & {units:string[];lessons:string[]}>;
