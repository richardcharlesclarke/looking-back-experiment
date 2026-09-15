import type {ParticipationSnapshot} from '@/lib/study-two/participation';
export default function SpeakerInformation({information}:{information:ParticipationSnapshot}){
 return <>{information.sections.map(section=><section className="s1-information" key={section.title}><h2>{section.title}</h2><p>{section.text}</p>{section.title==='Questions or withdrawal'&&information.contactEmail&&<p><a href={`mailto:${information.contactEmail}`}>Contact {information.contactName}</a></p>}</section>)}</>;
}
