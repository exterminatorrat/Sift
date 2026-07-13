export type AuthSession = {
  email?: string | null;
  fullName?: string | null;
  id: string;
  mode: "supabase" | "supabase_anonymous";
  provider: "apple" | "anonymous";
  signedInAt: string;
};
