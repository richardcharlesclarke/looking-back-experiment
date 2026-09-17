import Link from 'next/link';
import SignIn from './SignIn';
import '../workspace.css';
export const metadata={title:'Sign in — Study workspace',robots:{index:false,follow:false}};
export default function Page(){return <main className="workspace"><section className="workspace-card workspace-sign-in"><p className="eyebrow">Private study workspace</p><h1>Sign in</h1><p>Use your study admin password to open results and administration for both studies.</p><SignIn/><Link prefetch={false} href="/">Back to public studies</Link></section></main>;}
