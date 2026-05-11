import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Simplified middleware - auth handled client-side
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|manifest.json|icon.png|icon.svg|logo.svg|.*\\.png|.*\\.jpg|.*\\.jpeg).*)'],
};
