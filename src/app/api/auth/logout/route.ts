import { NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({ success: true });
  const cookieHeader = clearAuthCookie();
  response.headers.set('Set-Cookie', cookieHeader['Set-Cookie']);
  return response;
}
