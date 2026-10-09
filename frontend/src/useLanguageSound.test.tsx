// @vitest-environment jsdom
import {StrictMode} from 'react';
import {renderHook,cleanup,fireEvent,waitFor} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import {useLanguageSound} from './useLanguageSound';
import type {Language} from './courses';
afterEach(()=>{cleanup();vi.unstubAllGlobals()});
function mockAudio(block=false){
 const instances:{src:string;volume:number;currentTime:number;play:ReturnType<typeof vi.fn>;pause:ReturnType<typeof vi.fn>}[]=[];
 vi.stubGlobal('Audio',class {
  volume=1;currentTime=12;pause=vi.fn();play=vi.fn().mockResolvedValue(undefined);
  constructor(public src:string){if(block&&instances.length===0)this.play.mockRejectedValueOnce(new DOMException('blocked','NotAllowedError'));instances.push(this);}
 });return instances;
}
it('plays default Yoruba once, avoids rerender/StrictMode repeats and stops before switching',async()=>{
 const instances=mockAudio();
 const {rerender,unmount}=renderHook(({language}:{language:Language})=>useLanguageSound(language),{initialProps:{language:'yoruba' as Language},wrapper:StrictMode});
 await waitFor(()=>expect(instances).toHaveLength(1));expect(instances[0].src).toBe('/audio/talking-drum.ogg');expect(instances[0].volume).toBe(0.25);expect(instances[0].play).toHaveBeenCalledOnce();
 rerender({language:'yoruba'});expect(instances).toHaveLength(1);
 rerender({language:'igbo'});await waitFor(()=>expect(instances).toHaveLength(2));expect(instances[0].pause).toHaveBeenCalledOnce();expect(instances[0].currentTime).toBe(0);expect(instances[1].src).toBe('/audio/oja.ogg');
 rerender({language:'hausa'});await waitFor(()=>expect(instances).toHaveLength(3));expect(instances[1].pause).toHaveBeenCalledOnce();expect(instances[2].src).toBe('/audio/kakaaki.ogg');
 rerender({language:'yoruba'});await waitFor(()=>expect(instances).toHaveLength(4));expect(instances[2].pause).toHaveBeenCalledOnce();expect(instances[3].src).toBe('/audio/talking-drum.ogg');unmount();expect(instances[3].pause).toHaveBeenCalledOnce();
});
it.each(['pointerdown','keydown'])('retries blocked autoplay once on the first %s interaction',async event=>{
 const instances=mockAudio(true);renderHook(()=>useLanguageSound('yoruba'));
 await waitFor(()=>expect(instances[0]?.play).toHaveBeenCalledOnce());
 fireEvent(window,new Event(event));await waitFor(()=>expect(instances[0].play).toHaveBeenCalledTimes(2));fireEvent(window,new Event(event));expect(instances[0].play).toHaveBeenCalledTimes(2);
});
it('handles unavailable audio and cancels the old fallback when language changes',async()=>{
 const instances=mockAudio(true);const {rerender}=renderHook(({language}:{language:Language})=>useLanguageSound(language),{initialProps:{language:'yoruba' as Language}});
 await waitFor(()=>expect(instances[0]?.play).toHaveBeenCalledOnce());rerender({language:'hausa'});await waitFor(()=>expect(instances).toHaveLength(2));fireEvent.pointerDown(window);expect(instances[0].play).toHaveBeenCalledOnce();
 instances[1].play.mockRejectedValue(new DOMException('unsupported','NotSupportedError'));
});
it('silently tolerates audio construction failure',async()=>{
 vi.stubGlobal('Audio',class {constructor(){throw new Error('unavailable')}});const {unmount}=renderHook(()=>useLanguageSound('yoruba'));await Promise.resolve();unmount();
});
