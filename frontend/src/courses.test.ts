import {it,expect} from 'vitest';
import {courses,type Language} from './courses';
import {learningCourses,courseLessons} from './lessonContent';
it.each(['yoruba','igbo','hausa'] as Language[])('%s has five real lessons in two units',language=>{
 const course=learningCourses[language];expect(course.units.map(unit=>unit.title)).toEqual(['Getting Started','Everyday Life']);expect(course.units.map(unit=>unit.lessons.length)).toEqual([3,2]);
 expect(courses[language].lessons).toEqual(courseLessons(language).map(lesson=>lesson.title));
 expect(courseLessons(language).map(lesson=>lesson.id)).toEqual(['a-warm-welcome','everyday-greetings','introduce-yourself','family-and-people','food-and-drink']);
 for(const lesson of courseLessons(language)){
  expect(lesson.exercises).toHaveLength(4);expect(new Set(lesson.exercises.map(exercise=>exercise.id)).size).toBe(4);
  for(const exercise of lesson.exercises){expect(exercise.options).toHaveLength(3);expect(new Set(exercise.options).size).toBe(3);expect(exercise.options.filter(option=>option===exercise.answer)).toHaveLength(1);expect(exercise.prompt.length).toBeGreaterThan(30)}
 }
});
