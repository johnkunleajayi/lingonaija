import curriculum from '../../backend/app/curriculum.json';
import type {Language} from './courses';
import yorubaLessons from './content/yoruba.json';
import igboLessons from './content/igbo.json';
import hausaLessons from './content/hausa.json';

export type VisualMedia = {type:'image';src:string;alt:string};
interface ChoiceExercise {
  id: string;
  prompt: string;
  options: string[];
  answer: string;
  explanation: string;
}
export type Choice = ChoiceExercise & (
  {type?:'multiple_choice';media?:VisualMedia} |
  {type:'image_choice';media:VisualMedia}
);
export interface SentenceOrderExercise {
  id:string;type:'sentence_order';prompt:string;explanation:string;
  tiles:{id:string;text:string}[];correctOrder:string[];media?:VisualMedia;
}
export type Exercise = Choice | SentenceOrderExercise;
export type ExerciseAnswer = number | string[];
export function correctAnswerText(exercise:Exercise){
  return exercise.type==='sentence_order'?exercise.correctOrder.map(id=>exercise.tiles.find(tile=>tile.id===id)!.text).join(' '):exercise.answer;
}
export interface LessonContent {
  id: string;
  title: string;
  introduction: string;
  summary?: string;
  sourceIds?: string[];
  exercises: Exercise[];
}
export interface CurriculumUnit {id:string; title:string; order:number; lessons:LessonContent[]}
export interface CurriculumSection {id:string; title:string; order:number; units:CurriculumUnit[]}
export interface LearningCourse {id:string; language:Language; sections:CurriculumSection[]}


// Published lesson content is independent of UI and learner records.
const publishedCourses: Record<Language, {language:Language;units:{id:string;title:string;lessons:LessonContent[]}[]}> = {
  yoruba: {
    language: 'yoruba',
    units: [{id: 'unit-1', title: 'Getting Started', lessons: [{
      id: 'a-warm-welcome', title: 'A Warm Welcome',
      introduction: 'Start with a warm hello. Practise polite greetings you can use when meeting someone or welcoming a guest.',
      exercises: [
        {id: 'welcome', media:{type:'image',src:'/images/lessons/yoruba/warm-welcome.png',alt:'Young visitors greeting seated elders outside a home, with a respectful bow and prostration.'}, prompt: 'A guest arrives at your home. Which phrase means “Welcome”?', options: ['Ẹ káàbọ̀', 'Ẹ káàárọ̀', 'Ẹ káàsán'], answer: 'Ẹ káàbọ̀', explanation: 'Ẹ káàbọ̀ means “Welcome.” Ẹ is a respectful form of address, also used for more than one person.'},
        {id: 'morning', prompt: 'You meet a neighbour in the morning. Choose “Good morning.”', options: ['Ẹ káàsán', 'Ẹ káàárọ̀', 'Ẹ káàbọ̀'], answer: 'Ẹ káàárọ̀', explanation: 'Ẹ káàárọ̀ means “Good morning.” Use it as a polite morning greeting.'},
        {id: 'afternoon', prompt: 'It is afternoon. How would you politely greet someone?', options: ['Ẹ káàárọ̀', 'Ẹ káàbọ̀', 'Ẹ káàsán'], answer: 'Ẹ káàsán', explanation: 'Ẹ káàsán means “Good afternoon.” The greeting changes with the time of day.'},
        {id: 'meaning', prompt: 'Someone says “Ẹ káàbọ̀” as you arrive. What are they saying?', options: ['Good afternoon', 'Welcome', 'Good morning'], answer: 'Welcome', explanation: 'Ẹ káàbọ̀ welcomes someone who has arrived. You have practised three useful greetings!'}
      ]
    }, {
      id: 'everyday-greetings', title: 'Everyday Greetings',
      introduction: 'Follow a day of everyday encounters. Choose a greeting that fits the moment, from a morning hello to saying good night.',
      summary: 'You practised greetings for morning, afternoon and late evening, and a farewell at bedtime.',
      exercises: [
        {id: 'morning-neighbour', media:{type:'image',src:'/images/lessons/yoruba/everyday-greetings.png',alt:'Two people smiling and waving to greet each other outside a home.'}, prompt: 'You leave home at 8 a.m. and meet an older neighbour. How do you greet them politely?', options: ['Ẹ káalẹ́', 'Ẹ káàárọ̀', 'Ó dàárọ̀'], answer: 'Ẹ káàárọ̀', explanation: 'Ẹ káàárọ̀ is a polite morning greeting. Ẹ shows respect, and can also address more than one person.'},
        {id: 'afternoon-shop', prompt: 'At 2 p.m., you walk into a shop. Which greeting fits your first conversation with the shopkeeper?', options: ['Ẹ káàsán', 'Ẹ káàárọ̀', 'Ó dàárọ̀'], answer: 'Ẹ káàsán', explanation: 'Ẹ káàsán fits an afternoon encounter. You are greeting someone, not saying good night.'},
        {id: 'evening-visit', prompt: 'It is 8 p.m. You arrive to visit a relative and will stay for a chat. What greeting fits?', options: ['Ó dàárọ̀', 'Ẹ káàsán', 'Ẹ káalẹ́'], answer: 'Ẹ káalẹ́', explanation: 'Ẹ káalẹ́ greets someone in the late evening. It is useful when arriving after dark.'},
        {id: 'bedtime-farewell', prompt: 'After your evening chat, everyone is heading to bed. What would you say as you part for the night?', options: ['Ẹ káàárọ̀', 'Ó dàárọ̀', 'Ẹ káàsán'], answer: 'Ó dàárọ̀', explanation: 'Ó dàárọ̀ is a good-night farewell: until morning. Use it when parting for the night, rather than arriving for an evening visit.'}
      ]
    }]}]
  },
  igbo: {
    language: 'igbo',
    units: [{id: 'unit-1', title: 'Getting Started', lessons: [{
      id: 'a-warm-welcome', title: 'A Warm Welcome',
      introduction: 'Welcome a guest, greet a neighbour and check in with a friend. Practise these useful Igbo expressions; greetings can vary between communities.',
      summary: 'You practised welcoming someone, opening a conversation and exchanging a friendly greeting.',
      exercises: [
        {id: 'welcome-guest', prompt: 'A friend has just arrived at your home. Which expression specifically welcomes them?', options: ['Nnọọ', 'Kedu?', 'Ọ dị mma'], answer: 'Nnọọ', explanation: 'Nnọọ means “Welcome.” Use it to receive someone who has arrived.'},
        {id: 'greet-neighbour', prompt: 'You meet a neighbour on your walk. Choose a greeting to open the conversation, rather than welcome an arrival or say thank you.', options: ['Daalụ', 'Nnọọ', 'Ndewo'], answer: 'Ndewo', explanation: 'Ndewo is a greeting you can use to say hello. Daalụ can express thanks and also acknowledge someone; here you are practising Ndewo as an opening greeting.'},
        {id: 'check-in', prompt: 'After greeting a friend, you want to ask how they are. What do you say?', options: ['Ọ dị mma', 'Kedu?', 'Nnọọ'], answer: 'Kedu?', explanation: 'Kedu? asks “How are you?” It is a short way to check in with someone.'},
        {id: 'reply', prompt: 'A friend asks “Kedu?” You are doing fine. Choose a fitting reply.', options: ['Ọ dị mma', 'Kedu?', 'Nnọọ'], answer: 'Ọ dị mma', explanation: 'Ọ dị mma is a positive reply meaning “Fine” or “Good.” You have now practised both asking and responding.'}
      ]
    }]}]
  },
  hausa: {
    language: 'hausa',
    units: [{id: 'unit-1', title: 'Getting Started', lessons: [{
      id: 'a-warm-welcome', title: 'A Warm Welcome',
      introduction: 'Welcome a visitor, say hello and exchange a morning greeting. Hausa greetings often continue with questions and replies; start with these useful expressions.',
      summary: 'You practised welcoming a visitor, saying hello and exchanging a morning greeting and reply.',
      exercises: [
        {id: 'welcome-visitor', prompt: 'A friend arrives at your home for a visit. Choose the expression that specifically welcomes their arrival.', options: ['Lafiya lau', 'Sannu da zuwa', 'Ina kwana?'], answer: 'Sannu da zuwa', explanation: 'Sannu da zuwa welcomes someone on arrival. It is useful when receiving a visitor.'},
        {id: 'hello-friend', prompt: 'You meet a friend on a walk. Choose a simple hello to open the conversation, rather than a reply about your health.', options: ['Sannu', 'Lafiya lau', 'Sai an jima'], answer: 'Sannu', explanation: 'Sannu is a common hello. A greeting can lead into a longer exchange about how each person is doing.'},
        {id: 'morning-neighbour', prompt: 'In the morning, you meet a neighbour. Which greeting asks how they slept?', options: ['Sannu da zuwa', 'Lafiya lau', 'Ina kwana?'], answer: 'Ina kwana?', explanation: 'Ina kwana? is a morning greeting asking how someone slept. It is more than a word-for-word good morning.'},
        {id: 'morning-reply', prompt: 'Your neighbour greets you with “Ina kwana?” You are doing well. Choose a fitting positive reply.', options: ['Ina kwana?', 'Lafiya lau', 'Sannu da zuwa'], answer: 'Lafiya lau', explanation: 'Lafiya lau is a positive reply meaning you are very well. You have practised both sides of a short morning exchange.'}
      ]
    }]}]
  }
};
const additions: Record<Language, LessonContent[]> = {yoruba: yorubaLessons as LessonContent[], igbo: igboLessons, hausa: hausaLessons};
export const learningCourses = Object.fromEntries(
  (Object.keys(publishedCourses) as Language[]).map(language => {
    const lessons = [...publishedCourses[language].units[0].lessons, ...additions[language]];
    const byId=new Map(lessons.map(lesson=>[lesson.id,lesson]));
    const definition=curriculum[language];
    return [language,{id:definition.id,language,sections:definition.sections.map(section=>({
      ...section,units:section.units.map(unit=>({id:unit.id,title:unit.title,order:unit.order,lessons:unit.lesson_ids.map(id=>{
        const lesson=byId.get(id);if(!lesson)throw new Error(`Missing lesson ${language}/${id}`);return lesson;
      })}))
    }))}];
  })
) as Record<Language, LearningCourse>;
export function courseUnits(course:LearningCourse){return [...course.sections].sort((a,b)=>a.order-b.order).flatMap(section=>[...section.units].sort((a,b)=>a.order-b.order));}
export function courseEntries(course:LearningCourse){return [...course.sections].sort((a,b)=>a.order-b.order).flatMap((section,sectionIndex)=>[...section.units].sort((a,b)=>a.order-b.order).flatMap((unit,unitIndex)=>unit.lessons.map((content,index)=>({content,sectionId:section.id,sectionTitle:section.title,sectionNumber:sectionIndex+1,unitId:unit.id,unitTitle:unit.title,unitNumber:unitIndex+1,startsSection:unitIndex===0&&index===0,startsUnit:index===0}))));}
export const courseLessons = (language: Language) => courseEntries(learningCourses[language]).map(entry=>entry.content);
export const warmWelcome = courseLessons('yoruba')[0];
export const everydayGreetings = courseLessons('yoruba')[1];
