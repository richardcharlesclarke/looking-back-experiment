import {requireOrganiser} from '@/lib/organiser/auth';
import OrganiserNav from '@/app/components/OrganiserNav';
import '@/app/organiser/workspace.css';
export const dynamic='force-dynamic';
import content from './content.json';
import '../../study-two/review.css';
export const metadata={title:'Study One — facilitator guide'};
// Static HTML generated from the separately verified facilitator guide, preserved in docs.
export default async function Guide(){await requireOrganiser("/study-guides/study-one");return <main><OrganiserNav/><article className="study-guide" dangerouslySetInnerHTML={{__html:content}}/></main>;}
