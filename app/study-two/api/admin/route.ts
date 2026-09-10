import {proxyStudyTwo} from '@/lib/study-two/server';
export const dynamic='force-dynamic';
export async function POST(request:Request){return proxyStudyTwo(request,true);}
