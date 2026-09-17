import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {COOKIE_NAME,verifyAdminCookie} from '@/lib/admin';
export const dynamic='force-dynamic';
// Existing bookmarks enter the unified organiser workspace; legacy authenticated tools remain intact.
export default async function Layout({children}:{children:React.ReactNode}){
 const configured=process.env.NODE_ENV!=='production'||Boolean(process.env.ADMIN_PASSWORD&&process.env.ADMIN_COOKIE_SECRET);
 if(!configured||!verifyAdminCookie((await cookies()).get(COOKIE_NAME)?.value))redirect('https://experiments.evolvable.me/organiser/sign-in?next=%2Fadministration');
 return <><header className="topbar"><a href="https://experiments.evolvable.me/results">Results</a><a href="https://experiments.evolvable.me/administration">Administration</a><form action="/api/admin/logout" method="post"><button className="secondary">Sign out</button></form></header>{children}</>;
}
