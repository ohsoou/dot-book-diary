export { updateSession as middleware } from '@/lib/supabase/middleware';

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sprites|fonts|api/books).*)'],
};