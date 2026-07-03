import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AppleAuthentication from "expo-apple-authentication";
import { Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";
import { AuthSession } from "../types/auth";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const LOCAL_AUTH_KEY = "sift:authSession";

const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: false,
          persistSession: true,
          storage: AsyncStorage
        }
      })
    : null;

export async function isAppleSignInAvailable() {
  if (Platform.OS !== "ios") {
    return false;
  }

  return AppleAuthentication.isAvailableAsync();
}

export async function loadAuthSession(): Promise<AuthSession | null> {
  const storedSession = await loadLocalAuthSession();

  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      return {
        email: data.session.user.email ?? storedSession?.email ?? null,
        fullName: storedSession?.fullName ?? null,
        id: data.session.user.id,
        mode: "supabase",
        provider: "apple",
        signedInAt: storedSession?.signedInAt ?? new Date().toISOString()
      };
    }
  }

  return storedSession;
}

export async function signInWithApple(): Promise<AuthSession> {
  const available = await isAppleSignInAvailable();
  if (!available) {
    throw new Error("Apple sign-in is only available on supported iOS devices.");
  }

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME
    ]
  });

  const fullName = formatAppleName(credential.fullName);

  if (supabase) {
    if (!credential.identityToken) {
      throw new Error("Apple did not return an identity token.");
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: credential.identityToken
    });

    if (error || !data.user) {
      throw new Error(error?.message ?? "Could not sign in with Apple.");
    }

    const session: AuthSession = {
      email: data.user.email ?? credential.email ?? null,
      fullName,
      id: data.user.id,
      mode: "supabase",
      provider: "apple",
      signedInAt: new Date().toISOString()
    };
    await saveLocalAuthSession(session);
    return session;
  }

  const session: AuthSession = {
    email: credential.email ?? null,
    fullName,
    id: credential.user,
    mode: "local_apple",
    provider: "apple",
    signedInAt: new Date().toISOString()
  };
  await saveLocalAuthSession(session);
  return session;
}

export async function signOut() {
  if (supabase) {
    await supabase.auth.signOut();
  }

  await AsyncStorage.removeItem(LOCAL_AUTH_KEY);
}

async function loadLocalAuthSession(): Promise<AuthSession | null> {
  const value = await AsyncStorage.getItem(LOCAL_AUTH_KEY);
  return value ? JSON.parse(value) as AuthSession : null;
}

async function saveLocalAuthSession(session: AuthSession) {
  await AsyncStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(session));
}

function formatAppleName(fullName: AppleAuthentication.AppleAuthenticationFullName | null) {
  if (!fullName) {
    return null;
  }

  const name = [fullName.givenName, fullName.familyName].filter(Boolean).join(" ").trim();
  return name.length > 0 ? name : null;
}
