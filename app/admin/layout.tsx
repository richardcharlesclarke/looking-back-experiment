import {requireOrganiser} from '@/lib/organiser/auth';
import OrganiserNav from '@/app/components/OrganiserNav';
import '../organiser/workspace.css';
export const dynamic='force-dynamic';
export default async function Layout({children}:{children:React.ReactNode}){await requireOrganiser('/admin');return <><OrganiserNav/>{children}</>;}
