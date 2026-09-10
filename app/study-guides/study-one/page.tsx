import Link from 'next/link';
import content from './content.json';
import '../../study-two/review.css';
export const metadata={title:'Study One — facilitator guide'};
// Static HTML generated from the separately verified facilitator guide, preserved in docs.
export default function Guide(){return <main><header className="topbar"><Link className="mark" href="/">Initiatives at evolvable.me</Link><a href="/study-one">Open Study One</a></header><article className="study-guide" dangerouslySetInnerHTML={{__html:content}}/></main>;}
