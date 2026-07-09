export type AuthSession = {
  email?: string | null;
  fullName?: string | null;
  id: string;
  mode: "supabase" | "supabase_anonymous" | "local_apple";
  provider: "apple" | "anonymous";
  signedInAt: string;
};
