/** Empty base keeps local requests on the existing Vite /api proxy. */
export function apiUrl(path:string):string {
 const base=(import.meta.env.VITE_API_BASE_URL??'').trim().replace(/\/+$/,'');
 return `${base}${path}`;
}
