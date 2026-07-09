import { supabase } from './supabase'
import type { Session, User } from '@supabase/supabase-js'

// ---- domain enums mirroring the DB CHECK constraints ----
export type BuildingCode = 'thomas' | 'union'
export type FloorCode = 'ground' | 't1' | 't2' | 't3' | 'u2' | 'u3'
export type ClassStanding = 'freshman' | 'sophomore' | 'junior' | 'senior'
export type VerificationStatus = 'pending' | 'verified' | 'rejected'

export interface Profile {
  id: string
  email: string | null
  name: string
  profile_photo_url: string | null
  student_id_number: string | null
  whatsapp_number: string | null
  building: BuildingCode | null
  floor: FloorCode | null
  room_number: string | null
  batch_year: number | null
  class_standing: ClassStanding | null
  verification_status: VerificationStatus
  verification_doc_url: string | null
  role: 'user' | 'admin'
  is_banned: boolean
  created_at: string
  updated_at: string
}

// Fields a user fills in during the "complete your profile" step.
export interface ProfileDetails {
  building?: BuildingCode
  floor?: FloorCode
  room_number?: string
  batch_year?: number
  class_standing?: ClassStanding
  whatsapp_number?: string
  student_id_number?: string
}

// ============================================================
// AUTH
// ============================================================

// Email/password sign-up. `name` is stashed in user metadata so the DB trigger
// (handle_new_user) can seed the profiles row. Depending on your project's
// email-confirmation setting, the user may need to confirm before a session
// exists — see supabase/SETUP.md.
export async function signUpWithEmail(params: { name: string; email: string; password: string }) {
  const { name, email, password } = params
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  })
  if (error) throw error
  return data
}

export async function signInWithEmail(params: { email: string; password: string }) {
  const { data, error } = await supabase.auth.signInWithPassword(params)
  if (error) throw error
  return data
}

// Google OAuth. Redirects to Google, then back to `redirectTo` (defaults to the
// app root). Configure the Google provider in the Supabase dashboard first.
export async function signInWithGoogle(redirectTo: string = window.location.origin) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function getUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser()
  return data.user
}

export function onAuthStateChange(cb: (session: Session | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session))
  return () => data.subscription.unsubscribe()
}

// ============================================================
// PROFILE
// ============================================================

export async function getMyProfile(): Promise<Profile | null> {
  const user = await getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  if (error) throw error
  return data as Profile
}

// "Complete your profile" — updates the caller's own profile row. Cannot touch
// role / verification_status / is_banned (blocked by DB trigger).
export async function completeProfile(details: ProfileDetails): Promise<Profile> {
  const user = await getUser()
  if (!user) throw new Error('Not signed in')
  const { data, error } = await supabase
    .from('profiles')
    .update(details)
    .eq('id', user.id)
    .select()
    .single()
  if (error) throw error
  return data as Profile
}

// ============================================================
// STORAGE UPLOADS
// ============================================================

// Student ID verification photo → PRIVATE bucket. Stored under <uid>/... so RLS
// only lets the owner (and admins) read it. Saves the object path (not a public
// URL) on the profile and leaves verification_status as 'pending' for review.
export async function uploadVerificationDoc(file: File): Promise<string> {
  const user = await getUser()
  if (!user) throw new Error('Not signed in')
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${user.id}/student-id.${ext}`
  const { error: upErr } = await supabase.storage
    .from('verification-docs')
    .upload(path, file, { upsert: true })
  if (upErr) throw upErr
  const { error: updErr } = await supabase
    .from('profiles')
    .update({ verification_doc_url: path })
    .eq('id', user.id)
  if (updErr) throw updErr
  return path
}

// Read a signed, time-limited URL for a private verification doc (owner/admin).
export async function getVerificationDocUrl(path: string, expiresInSeconds = 60): Promise<string> {
  const { data, error } = await supabase.storage
    .from('verification-docs')
    .createSignedUrl(path, expiresInSeconds)
  if (error) throw error
  return data.signedUrl
}

// Profile avatar → PUBLIC bucket. Returns a public URL and saves it on the profile.
export async function uploadProfilePhoto(file: File): Promise<string> {
  const user = await getUser()
  if (!user) throw new Error('Not signed in')
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${user.id}/avatar.${ext}`
  const { error: upErr } = await supabase.storage
    .from('profile-photos')
    .upload(path, file, { upsert: true })
  if (upErr) throw upErr
  const { data } = supabase.storage.from('profile-photos').getPublicUrl(path)
  const publicUrl = data.publicUrl
  const { error: updErr } = await supabase
    .from('profiles')
    .update({ profile_photo_url: publicUrl })
    .eq('id', user.id)
  if (updErr) throw updErr
  return publicUrl
}
