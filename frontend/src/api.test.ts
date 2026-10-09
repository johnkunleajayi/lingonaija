import {afterEach,expect,it,vi} from 'vitest';
import {apiUrl} from './api';
afterEach(()=>vi.unstubAllEnvs());
it.each([undefined,'','  '])('uses the relative proxy fallback for an absent/empty base (%s)',base=>{
 vi.stubEnv('VITE_API_BASE_URL',base);
 expect(apiUrl('/api/auth/me')).toBe('/api/auth/me');
});
it.each(['/api/auth/me','/api/auth/google','/api/auth/logout','/api/enrollments','/api/learning/yoruba/a-warm-welcome/complete','/api/conversation/igbo','/api/conversation/hausa/evaluate'])('prefixes backend endpoint %s with the configured origin',path=>{
 vi.stubEnv('VITE_API_BASE_URL','https://backend.example.test');
 expect(apiUrl(path)).toBe(`https://backend.example.test${path}`);
});
it('normalizes surrounding whitespace and trailing slashes',()=>{
 vi.stubEnv('VITE_API_BASE_URL',' https://backend.example.test/// ');
 expect(apiUrl('/api/auth/me')).toBe('https://backend.example.test/api/auth/me');
});
