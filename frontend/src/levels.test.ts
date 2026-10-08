import {expect,it} from 'vitest';
import {learnerLevel} from './levels';
it.each([[0,1,20],[19,1,20],[20,2,60],[40,2,60],[59,2,60],[60,3,120],[119,3,120],[120,4,200],[199,4,200],[200,5,300]])('derives the level at %i XP', (xp,level,next)=>{
 const result=learnerLevel(xp);expect(result.level).toBe(level);expect(result.nextLevelXp).toBe(next);
 expect(result.remainingXp).toBe(next-xp);expect(result.percent).toBeGreaterThanOrEqual(0);expect(result.percent).toBeLessThan(100);
});
it('resets next-level progress at a threshold and shows intermediate progress',()=>{
 expect(learnerLevel(20).earnedXp).toBe(0);
 expect(learnerLevel(40)).toMatchObject({level:2,earnedXp:20,requiredXp:40,remainingXp:20,percent:50});
});
