import {requireOrganiser} from '@/lib/organiser/auth';
import '@/app/organiser/workspace.css';
export const dynamic='force-dynamic';
import Review from '../Review';
import '../study-one-reference.css';
import '../review.css';
export const metadata={title:'Study Two — organiser review tools'};
export default async function Page(){await requireOrganiser("/study-two/review");return <Review/>;}
