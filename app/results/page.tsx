import Link from 'next/link';
import {requireOrganiser} from '@/lib/organiser/auth';
import OrganiserNav from '@/app/components/OrganiserNav';
import '../organiser/workspace.css';
export const dynamic='force-dynamic';
export const metadata={title:'Results — Study workspace',robots:{index:false,follow:false}};
export default async function Page(){await requireOrganiser('/results');return <main className="workspace"><OrganiserNav/><section className="workspace-card"><p className="eyebrow">Results</p><h1>Choose a study</h1><p>Browse each respondent’s saved answers, see before and after status, and download the answers you are viewing.</p><div className="workspace-choices"><Link prefetch={false} href="/results/study-one"><span>Study One</span><h2>How We Disagree</h2><p>Festival participants · before and after the festival.</p><strong>View results →</strong></Link><Link prefetch={false} href="/study-two/results"><span>Study Two</span><h2>Panel speakers</h2><p>Speakers · before and after their conversation.</p><strong>View results →</strong></Link></div></section></main>;}
