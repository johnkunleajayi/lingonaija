import {it,expect} from 'vitest';
import {courses,type Language} from './courses';
import {courseEntries,courseUnits,learningCourses,courseLessons} from './lessonContent';
it.each(['yoruba','igbo','hausa'] as Language[])('%s exposes its real lessons and units',language=>{
 const course=learningCourses[language];expect(courseUnits(course).map(unit=>unit.title)).toEqual(language==='yoruba'?['Getting Started','Everyday Life','Getting Around','Daily Connections','Section Review']:['Getting Started','Everyday Life']);expect(courseUnits(course).map(unit=>unit.lessons.length)).toEqual(language==='yoruba'?[3,3,3,3,2]:[3,2]);
 expect(courses[language].lessons).toEqual(courseLessons(language).map(lesson=>lesson.title));
 expect(courseLessons(language).map(lesson=>lesson.id)).toEqual(['a-warm-welcome','everyday-greetings','introduce-yourself','family-and-people','food-and-drink',...(language==='yoruba'?['numbers-and-money','places-around-me','asking-for-directions','transport-and-travel','time-and-daily-routine','shopping-and-the-market','making-requests','visual-review','build-the-sentence']:[])]);
 for(const lesson of courseLessons(language)){
  const size=lesson.exercises[0].type==='image_choice'||lesson.exercises[0].type==='sentence_order'?8:4;expect(lesson.exercises).toHaveLength(size);expect(new Set(lesson.exercises.map(exercise=>exercise.id)).size).toBe(size);
  for(const exercise of lesson.exercises){if(exercise.type==='sentence_order'){expect(new Set(exercise.tiles.map(t=>t.id)).size).toBe(exercise.tiles.length);expect([...exercise.correctOrder].sort()).toEqual(exercise.tiles.map(t=>t.id).sort());expect(exercise.tiles.map(t=>t.id)).not.toEqual(exercise.correctOrder);continue;}const options=exercise.type==='image_choice'?4:3;expect(exercise.options).toHaveLength(options);expect(new Set(exercise.options).size).toBe(options);expect(exercise.options.filter(option=>option===exercise.answer)).toHaveLength(1);expect(exercise.prompt.length).toBeGreaterThan(30)}
 }
});

it('traverses ordered sections and units without fixed lesson boundaries',()=>{
 const base=learningCourses.yoruba;
 const course={...base,sections:[{id:'second',title:'Next',order:2,units:[{id:'u3',title:'Next unit',order:1,lessons:[base.sections[0].units[0].lessons[0]]}]},base.sections[0]]};
 const entries=courseEntries(course);
 expect(entries).toHaveLength(15);expect(entries[0].sectionTitle).toBe('Foundations');expect(entries[3].startsUnit).toBe(true);expect(entries[14].startsSection).toBe(true);expect(entries[14].sectionNumber).toBe(2);
});

it('crosses Unit 3 into Unit 4 in Foundations with four exercises and optional first-exercise context media per new lesson',()=>{
 const entries=courseEntries(learningCourses.yoruba);
 expect(entries.slice(8,12).map(e=>e.content.id)).toEqual(['transport-and-travel','time-and-daily-routine','shopping-and-the-market','making-requests']);
 expect(entries[9]).toMatchObject({unitNumber:4,unitTitle:'Daily Connections',startsUnit:true,startsSection:false,sectionTitle:'Foundations'});
 for(const entry of entries.slice(9,12)){expect(entry.content.exercises).toHaveLength(4);expect(entry.content.exercises[0].media?.alt).toContain("Adé");expect(entry.content.exercises.slice(1).every(e=>!e.media)).toBe(true);}
});
