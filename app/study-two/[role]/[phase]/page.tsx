import {notFound} from 'next/navigation';
import Participant from '../../Participant';
import '../../study-one-reference.css';
import '../../review.css';
export async function generateMetadata({params}:{params:Promise<{role:string;phase:string}>}){const {role,phase}=await params;return {title:`Study Two — ${role} ${phase} the panel`};}
export async function generateStaticParams(){return ['speaker','audience'].flatMap(role=>['before','after'].map(phase=>({role,phase})));}
export default async function Page({params}:{params:Promise<{role:string;phase:string}>}){const {role,phase}=await params;if((role!=='speaker'&&role!=='audience')||(phase!=='before'&&phase!=='after'))notFound();return <Participant key={`${role}-${phase}`} role={role} wave={phase==='before'?'pre':'post'}/>;}
