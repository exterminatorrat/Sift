import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AppleAuthentication from "expo-apple-authentication";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";
import { AuthSession } from "../types/auth";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const LOCAL_AUTH_KEY = "sift:authSession";
const SUPABASE_AUTH_STORAGE_KEY = "sift:supabaseAuth";
const SECURE_STORE_CHUNK_SIZE = 1800;

const secureAuthStorage = {
  getItem: async (key: string) => {
    const chunkCountValue = await SecureStore.getItemAsync(chunkCountKey(key));
    const chunkCount = chunkCountValue ? Number(chunkCountValue) : 0;

    if (Number.isFinite(chunkCount) && chunkCount > 0) {
      const chunks = await Promise.all(
        Array.from({ length: chunkCount }, (_, index) => SecureStore.getItemAsync(chunkKey(key, index)))
      );
      return chunks.every((chunk): chunk is string => typeof chunk === "string") ? chunks.join("") : null;
    }

    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    await removeSecureStoreValue(key);

    if (value.length <= SECURE_STORE_CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      return;
    }

    const chunks = value.match(new RegExp(`.{1,${SECURE_STORE_CHUNK_SIZE}}`, "g")) ?? [];
    await SecureStore.setItemAsync(chunkCountKey(key), String(chunks.length));
    await Promise.all(
      chunks.map((chunk, index) => SecureStore.setItemAsync(chunkKey(key, index), chunk))
    );
  },
  removeItem: async (key: string) => {
    await removeSecureStoreValue(key);
  }
};

const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: false,
          persistSession: true,
          storage: secureAuthStorage,
          storageKey: SUPABASE_AUTH_STORAGE_KEY
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
  await removeLegacySupabaseAuthStorage();
  const storedSession = await loadLocalAuthSession();

  if (supabase) {
    const session = await ensureSupabaseSession();
    if (session?.user) {
      return createSupabaseSession(session.user, storedSession);
    }
  }

  return storedSession;
}

export async function getSupabaseAccessToken(): Promise<string | null> {
  if (!supabase) {
    return null;
  }

  const session = await ensureSupabaseSession();
  return session?.access_token ?? null;
}

export async function refreshSupabaseAccessToken(): Promise<string | null> {
  if (!supabase) {
    return null;
  }

  const { data } = await supabase.auth.refreshSession();
  if (data.session?.access_token) {
    return data.session.access_token;
  }

  await supabase.auth.signOut();
  const session = await ensureSupabaseSession();
  return session?.access_token ?? null;
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
      if (error && isProviderDisabledError(error.message)) {
        const session = createLocalAppleSession(credential, fullName);
        await saveLocalAuthSession(session);
        return session;
      }

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

  const session = createLocalAppleSession(credential, fullName);
  await saveLocalAuthSession(session);
  return session;
}

export async function signOut() {
  if (supabase) {
    await supabase.auth.signOut();
  }

  await removeSecureStoreValue(LOCAL_AUTH_KEY);
  await AsyncStorage.removeItem(LOCAL_AUTH_KEY);
}

async function ensureSupabaseSession() {
  const { data: sessionData } = await supabase!.auth.getSession();
  if (sessionData.session) {
    return sessionData.session;
  }

  const { data, error } = await supabase!.auth.signInAnonymously();
  if (error) {
    return null;
  }

  return data.session ?? null;
}

async function loadLocalAuthSession(): Promise<AuthSession | null> {
  const secureValue = await SecureStore.getItemAsync(LOCAL_AUTH_KEY);
  if (secureValue) {
    return parseStoredAuthSession(secureValue);
  }

  const legacyValue = await AsyncStorage.getItem(LOCAL_AUTH_KEY);
  if (!legacyValue) {
    return null;
  }

  await AsyncStorage.removeItem(LOCAL_AUTH_KEY);
  const session = parseStoredAuthSession(legacyValue);
  if (session) {
    await SecureStore.setItemAsync(LOCAL_AUTH_KEY, legacyValue);
  }

  return session;
}

async function saveLocalAuthSession(session: AuthSession) {
  await SecureStore.setItemAsync(LOCAL_AUTH_KEY, JSON.stringify(session));
  await AsyncStorage.removeItem(LOCAL_AUTH_KEY);
}

async function removeLegacySupabaseAuthStorage() {
  await AsyncStorage.multiRemove([
    SUPABASE_AUTH_STORAGE_KEY,
    `${SUPABASE_AUTH_STORAGE_KEY}-code-verifier`,
    `${SUPABASE_AUTH_STORAGE_KEY}-user`,
    getDefaultSupabaseAuthStorageKey(SUPABASE_URL),
    `${getDefaultSupabaseAuthStorageKey(SUPABASE_URL)}-code-verifier`,
    `${getDefaultSupabaseAuthStorageKey(SUPABASE_URL)}-user`
  ].filter(Boolean) as string[]);
}

async function removeSecureStoreValue(key: string) {
  const chunkCountValue = await SecureStore.getItemAsync(chunkCountKey(key));
  const chunkCount = chunkCountValue ? Number(chunkCountValue) : 0;
  const keysToRemove = [key, chunkCountKey(key)];

  if (Number.isFinite(chunkCount) && chunkCount > 0) {
    for (let index = 0; index < chunkCount; index += 1) {
      keysToRemove.push(chunkKey(key, index));
    }
  }

  await Promise.all(keysToRemove.map((item) => SecureStore.deleteItemAsync(item)));
}

function createSupabaseSession(
  user: { id: string; email?: string | null; is_anonymous?: boolean },
  storedSession: AuthSession | null
): AuthSession {
  const isAnonymous = user.is_anonymous === true;
  return {
    email: user.email ?? storedSession?.email ?? null,
    fullName: isAnonymous ? null : storedSession?.fullName ?? null,
    id: user.id,
    mode: isAnonymous ? "supabase_anonymous" : "supabase",
    provider: isAnonymous ? "anonymous" : "apple",
    signedInAt: storedSession?.signedInAt ?? new Date().toISOString()
  };
}

function parseStoredAuthSession(value: string) {
  try {
    return JSON.parse(value) as AuthSession;
  } catch {
    return null;
  }
}

function formatAppleName(fullName: AppleAuthentication.AppleAuthenticationFullName | null) {
  if (!fullName) {
    return null;
  }

  const name = [fullName.givenName, fullName.familyName].filter(Boolean).join(" ").trim();
  return name.length > 0 ? name : null;
}

function createLocalAppleSession(
  credential: AppleAuthentication.AppleAuthenticationCredential,
  fullName: string | null
): AuthSession {
  return {
    email: credential.email ?? null,
    fullName,
    id: credential.user,
    mode: "local_apple",
    provider: "apple",
    signedInAt: new Date().toISOString()
  };
}

function isProviderDisabledError(message: string) {
  const normalizedMessage = message.toLowerCase();
  return normalizedMessage.includes("provider") && normalizedMessage.includes("not enabled");
}

function getDefaultSupabaseAuthStorageKey(value?: string) {
  if (!value) {
    return "";
  }

  try {
    const host = new URL(value).host;
    const projectRef = host.split(".")[0];
    return projectRef ? `sb-${projectRef}-auth-token` : "";
  } catch {
    return "";
  }
}

function chunkCountKey(key: string) {
  return `${key}:chunkCount`;
}

function chunkKey(key: string, index: number) {
  return `${key}:chunk:${index}`;
}
