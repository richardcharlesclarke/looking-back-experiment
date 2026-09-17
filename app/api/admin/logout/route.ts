import {NextResponse} from 'next/server';
import {COOKIE_NAME} from '@/lib/admin';
import {privateHeaders} from '@/lib/organiser/auth';
export async function POST(request:Request){const origin=request.headers.get('origin'),host=request.headers.get('x-forwarded-host')??request.headers.get('host');if(origin&&new URL(origin).host!==host)return Response.json({error:'Use the study workspace to sign out.'},{status:403,headers:privateHeaders});const response=new NextResponse(null,{status:303,headers:{...privateHeaders,Location:'/organiser/sign-in'}});response.cookies.set(COOKIE_NAME,'',{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:0,expires:new Date(0)});return response;}
