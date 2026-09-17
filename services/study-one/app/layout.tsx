import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'How We Disagree · Big Brue',robots:{index:false,follow:false},referrer:'no-referrer'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
