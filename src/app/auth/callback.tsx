import { Redirect } from 'expo-router';

// Cette route ne s'affiche que lorsque _layout.tsx a confirmé la session.
// La détection PKCE est gérée par detectSessionInUrl:true dans supabase.ts,
// et la session est propagée via onAuthStateChange dans _layout.tsx.
export default function AuthCallback() {
  return <Redirect href="/" />;
}
