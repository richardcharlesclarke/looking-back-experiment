import 'server-only';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {COOKIE_NAME,verifyAdminCookie} from '@/lib/admin';
export async function organiserAuthenticated(){return verifyAdminCookie((await cookies()).get(COOKIE_NAME)?.value);}
export async function requireOrganiser(destination:string){if(!await organiserAuthenticated())redirect('/organiser/sign-in?next='+encodeURIComponent(destination));}
export const privateHeaders={'Cache-Control':'private, no-store, max-age=0','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow'};
