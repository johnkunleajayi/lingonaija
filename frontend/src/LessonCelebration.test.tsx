// @vitest-environment jsdom
import {StrictMode} from 'react';
import {act,cleanup,render,screen,waitFor} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import {LessonCelebration} from './LessonCelebration';
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.useRealTimers()});
it('plays once under StrictMode, tolerates blocked audio and celebrates again on replay',async()=>{
 const play=vi.fn().mockRejectedValue(new DOMException('blocked','NotAllowedError'));const pause=vi.fn();
 vi.stubGlobal('Audio',class {volume=1;currentTime=0;play=play;pause=pause;});
 const first=render(<StrictMode><LessonCelebration/></StrictMode>);await waitFor(()=>expect(play).toHaveBeenCalledOnce());expect(screen.getByTestId('lesson-celebration')).toBeTruthy();first.unmount();
 render(<LessonCelebration/>);await waitFor(()=>expect(play).toHaveBeenCalledTimes(2));expect(pause).toHaveBeenCalled();
});
it('keeps the celebration visible through the hold and fade, then removes it at four seconds',async()=>{
 vi.useFakeTimers();
 vi.stubGlobal('Audio',class {volume=1;currentTime=0;play=vi.fn().mockResolvedValue(undefined);pause=vi.fn();});
 render(<LessonCelebration/>);expect(screen.getByTestId('lesson-celebration')).toBeTruthy();
 act(()=>vi.advanceTimersByTime(3200));expect(screen.getByTestId('lesson-celebration')).toBeTruthy();
 act(()=>vi.advanceTimersByTime(799));expect(screen.getByTestId('lesson-celebration')).toBeTruthy();
 act(()=>vi.advanceTimersByTime(1));expect(screen.queryByTestId('lesson-celebration')).toBeNull();
});
