import {requireOrganiser} from '@/lib/organiser/auth';
import Contacts from './Contacts';
import '@/app/organiser/workspace.css';
export const dynamic='force-dynamic';
export const metadata={title:'Study One administration',robots:{index:false,follow:false}};
export default async function Page(){await requireOrganiser('/administration/study-one');return <Contacts/>;}
