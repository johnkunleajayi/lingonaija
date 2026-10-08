import type {Language} from './courses';

export interface Exercise {
  id: string;
  prompt: string;
  options: string[];
  answer: string;
  explanation: string;
}
export interface LessonContent {
  id: string;
  title: string;
  introduction: string;
  exercises: Exercise[];
}
export interface LearningCourse {
  language: Language;
  units: {id: string; lessons: LessonContent[]}[];
}

// Content is independent of UI and learner records. Only the first lesson is real.
export const learningCourses: Partial<Record<Language, LearningCourse>> = {
  yoruba: {
    language: 'yoruba',
    units: [{id: 'unit-1', lessons: [{
      id: 'a-warm-welcome', title: 'A Warm Welcome',
      introduction: 'Start with a warm hello. Practise polite greetings you can use when meeting someone or welcoming a guest.',
      exercises: [
        {id: 'welcome', prompt: 'A guest arrives at your home. Which phrase means “Welcome”?', options: ['Ẹ káàbọ̀', 'Ẹ káàárọ̀', 'Ẹ káàsán'], answer: 'Ẹ káàbọ̀', explanation: 'Ẹ káàbọ̀ means “Welcome.” Ẹ is a respectful form of address, also used for more than one person.'},
        {id: 'morning', prompt: 'You meet a neighbour in the morning. Choose “Good morning.”', options: ['Ẹ káàsán', 'Ẹ káàárọ̀', 'Ẹ káàbọ̀'], answer: 'Ẹ káàárọ̀', explanation: 'Ẹ káàárọ̀ means “Good morning.” Use it as a polite morning greeting.'},
        {id: 'afternoon', prompt: 'It is afternoon. How would you politely greet someone?', options: ['Ẹ káàárọ̀', 'Ẹ káàbọ̀', 'Ẹ káàsán'], answer: 'Ẹ káàsán', explanation: 'Ẹ káàsán means “Good afternoon.” The greeting changes with the time of day.'},
        {id: 'meaning', prompt: 'Someone says “Ẹ káàbọ̀” as you arrive. What are they saying?', options: ['Good afternoon', 'Welcome', 'Good morning'], answer: 'Welcome', explanation: 'Ẹ káàbọ̀ welcomes someone who has arrived. You have practised three useful greetings!'}
      ]
    }]}]
  }
};
export const warmWelcome = learningCourses.yoruba!.units[0].lessons[0];
