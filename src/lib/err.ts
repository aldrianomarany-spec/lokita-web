// Human-readable message from ANY thrown value. Supabase/PostgREST errors are
// plain objects (not Error instances), so `e instanceof Error ? e.message : …`
// masked every database error as "unknown error". This helper surfaces the
// real cause no matter what was thrown.
export function errText(e: unknown, fallback = 'Something went wrong'): string {
  if (e instanceof Error && e.message) return e.message
  const m = (e as { message?: unknown })?.message
  if (typeof m === 'string' && m) return m
  if (typeof e === 'string' && e) return e
  return fallback
}
