import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  
  // Clear all NextAuth cookies
  const cookieNames = [
    'next-auth.session-token',
    '__Secure-next-auth.session-token',
    'next-auth.csrf-token',
    '__Secure-next-auth.csrf-token',
    'next-auth.callback-url',
    '__Secure-next-auth.callback-url',
  ];
  
  cookieNames.forEach(name => {
    cookieStore.delete(name);
  });
  
  return NextResponse.json({ success: true, message: 'Cookies cleared' });
}
