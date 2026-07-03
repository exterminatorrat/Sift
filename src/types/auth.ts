export type AuthSession = {
  email?: string | null;
  fullName?: string | null;
  id: string;
  mode: "supabase" | "local_apple";
  provider: "apple";
  signedInAt: string;
};
