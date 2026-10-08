// @vitest-environment jsdom
import {render, screen, fireEvent, cleanup} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {Lesson} from './Lesson';
import {learningCourses, warmWelcome} from './lessonContent';
afterEach(cleanup);
it('gives immediate feedback, prevents repeat answers and completes all exercises', () => {
  const close = vi.fn(); render(<Lesson content={warmWelcome} onClose={close}/>);
  warmWelcome.exercises.forEach((exercise, index) => {
    expect(screen.getByText(`Exercise ${index + 1} of 4`)).toBeTruthy();
    const choice = index === 0 ? exercise.options[1] : exercise.answer;
    fireEvent.click(screen.getByRole('button', {name: choice}));
    expect(screen.getByRole('status').textContent).toContain(index === 0 ? 'Not quite' : 'Correct!');
    expect(screen.getByRole('status').textContent).toContain(exercise.explanation);
    if (index === 0) expect(screen.getByRole('status').textContent).toContain(`Correct answer: ${exercise.answer}`);
    expect((screen.getByRole('button', {name: choice}) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', {name: index === 3 ? 'Finish lesson' : 'Next exercise'}));
  });
  expect(screen.getByText('Lesson complete!')).toBeTruthy();
  expect(screen.getByText('3 of 4 correct on your first choice. Keep practising!')).toBeTruthy();
  expect(screen.getByText('This practice session is not saved yet.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', {name: 'Back to my journey'})); expect(close).toHaveBeenCalledOnce();
});
it('closes with Escape and restores focus when unmounted', () => {
  const trigger = document.createElement('button'); document.body.append(trigger); trigger.focus();
  const close = vi.fn(); const view = render(<Lesson content={warmWelcome} onClose={close}/>);
  fireEvent.keyDown(screen.getByRole('dialog'), {key: 'Escape'}); expect(close).toHaveBeenCalledOnce();
  view.unmount(); expect(document.activeElement).toBe(trigger); trigger.remove();
});
it('starts fresh when reopened and keeps content structurally valid', () => {
  const view = render(<Lesson content={warmWelcome} onClose={() => {}}/>);
  fireEvent.click(screen.getByRole('button', {name: warmWelcome.exercises[0].answer})); view.unmount();
  render(<Lesson content={warmWelcome} onClose={() => {}}/>);
  expect(screen.queryByRole('status')).toBeNull();
  expect(Object.keys(learningCourses)).toEqual(['yoruba']);
  expect(new Set(warmWelcome.exercises.map(item => item.id)).size).toBe(4);
  for (const item of warmWelcome.exercises) expect(item.options.filter(option => option === item.answer)).toHaveLength(1);
});
