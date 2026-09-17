import {requireOrganiser} from '@/lib/organiser/auth';
import '@/app/organiser/workspace.css';
export const dynamic='force-dynamic';
import Results from './Results';
import '../study-one-reference.css';
import './results.css';
export const metadata={title:'Study Two — speaker results',robots:{index:false,follow:false}};
export default async function Page(){await requireOrganiser("/study-two/results");return <Results/>;}
