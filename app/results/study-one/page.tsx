import {requireOrganiser} from '@/lib/organiser/auth';
import StudyOneResults from './Results';
import '@/app/organiser/workspace.css';
export const dynamic='force-dynamic';
export const metadata={title:'How We Disagree — Results',robots:{index:false,follow:false}};
export default async function Page(){await requireOrganiser('/results/study-one');return <StudyOneResults/>;}
