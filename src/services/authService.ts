import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { AppState, Platform } from "react-native";
import { createClient, processLock } from "@supabase/supabase-js";
import { AuthSession } from "../types/auth";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const REQUIRE_APPLE_SIGN_IN = process.env.EXPO_PUBLIC_REQUIRE_APPLE_SIGN_IN === "true";
const LOCAL_AUTH_KEY = "sift.authSession";
const LEGACY_LOCAL_AUTH_KEY = "sift:authSession";
const SUPABASE_AUTH_STORAGE_KEY = "sift.supabaseAuth";
const LEGACY_SUPABASE_AUTH_STORAGE_KEY = "sift:supabaseAuth";
const SECURE_STORE_CHUNK_SIZE = 1800;
const webSecureMemory = new Map<string, string>();

const secureAuthStorage = {
  getItem: async (key: string) => {
    const chunkCountValue = await getSecureItem(chunkCountKey(key));
    const chunkCount = chunkCountValue ? Number(chunkCountValue) : 0;

    if (Number.isFinite(chunkCount) && chunkCount > 0) {
      const chunks = await Promise.all(
        Array.from({ length: chunkCount }, (_, index) => getSecureItem(chunkKey(key, index)))
      );
      return chunks.every((chunk): chunk is string => typeof chunk === "string") ? chunks.join("") : null;
    }

    return getSecureItem(key);
  },
  setItem: async (key: string, value: string) => {
    await removeSecureStoreValue(key);

    if (value.length <= SECURE_STORE_CHUNK_SIZE) {
      await setSecureItem(key, value);
      return;
    }

    const chunks = value.match(new RegExp(`.{1,${SECURE_STORE_CHUNK_SIZE}}`, "g")) ?? [];
    await setSecureItem(chunkCountKey(key), String(chunks.length));
    await Promise.all(
      chunks.map((chunk, index) => setSecureItem(chunkKey(key, index), chunk))
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
          lock: processLock,
          persistSession: true,
          storage: secureAuthStorage,
          storageKey: SUPABASE_AUTH_STORAGE_KEY
        }
      })
    : null;

if (supabase && Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

export function isAppleAccountRequired() {
  return REQUIRE_APPLE_SIGN_IN;
}

export function isDurableAuthSession(session: AuthSession | null) {
  return Boolean(session?.mode === "supabase" && session.provider === "apple");
}

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
    const session = await ensureSupabaseSession(!REQUIRE_APPLE_SIGN_IN);
    if (session?.user) {
      return createSupabaseSession(session.user, storedSession);
    }
  }

  return null;
}

export async function getSupabaseAccessToken(): Promise<string | null> {
  if (!supabase) {
    return null;
  }

  const session = await ensureSupabaseSession(!REQUIRE_APPLE_SIGN_IN);
  return session?.access_token ?? null;
}

export async function refreshSupabaseAccessToken(): Promise<string | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.refreshSession();
  if (error) {
    return null;
  }

  if (data.session?.access_token) {
    return data.session.access_token;
  }

  return null;
}

export async function signInWithApple(): Promise<AuthSession> {
  const available = await isAppleSignInAvailable();
  if (!available) {
    throw new Error("Apple sign-in is only available on supported iOS devices.");
  }

  if (!supabase) {
    throw new Error("Sift authentication is not configured for this build.");
  }

  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce
  );
  const requestState = Crypto.randomUUID();
  const credential = await AppleAuthentication.signInAsync({
    nonce: hashedNonce,
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME
    ],
    state: requestState
  });

  if (credential.state !== requestState) {
    throw new Error("Apple sign-in could not be verified. Please try again.");
  }

  const fullName = formatAppleName(credential.fullName);
  if (!credential.identityToken) {
    throw new Error("Apple did not return an identity token.");
  }

  const { data: currentSessionData } = await supabase.auth.getSession();
  const authResponse = currentSessionData.session?.user.is_anonymous
    ? await supabase.auth.linkIdentity({
        nonce: rawNonce,
        provider: "apple",
        token: credential.identityToken
      })
    : await supabase.auth.signInWithIdToken({
        nonce: rawNonce,
        provider: "apple",
        token: credential.identityToken
      });

  if (authResponse.error || !authResponse.data.user) {
    throw new Error(authResponse.error?.message ?? "Could not sign in with Apple.");
  }

  if (credential.fullName) {
    await supabase.auth.updateUser({
      data: {
        family_name: credential.fullName.familyName,
        full_name: fullName,
        given_name: credential.fullName.givenName
      }
    });
  }

  const session: AuthSession = {
    email: authResponse.data.user.email ?? credential.email ?? null,
    fullName: fullName ?? readMetadataName(authResponse.data.user.user_metadata),
    id: authResponse.data.user.id,
    mode: "supabase",
    provider: "apple",
    signedInAt: new Date().toISOString()
  };
  await saveLocalAuthSession(session);
  return session;
}

export async function signOut() {
  try {
    if (supabase) {
      await supabase.auth.signOut({ scope: "local" });
    }
  } finally {
    await Promise.all([
      removeSecureStoreValue(LOCAL_AUTH_KEY),
      removeSecureStoreValue(SUPABASE_AUTH_STORAGE_KEY),
      AsyncStorage.multiRemove([LOCAL_AUTH_KEY, LEGACY_LOCAL_AUTH_KEY])
    ]);
  }
}

async function ensureSupabaseSession(allowAnonymous: boolean) {
  const { data: sessionData } = await supabase!.auth.getSession();
  if (sessionData.session) {
    return sessionData.session;
  }

  if (!allowAnonymous) {
    return null;
  }

  const { data, error } = await supabase!.auth.signInAnonymously();
  if (error) {
    return null;
  }

  return data.session ?? null;
}

async function loadLocalAuthSession(): Promise<AuthSession | null> {
  const secureValue = await getSecureItem(LOCAL_AUTH_KEY);
  if (secureValue) {
    return parseStoredAuthSession(secureValue);
  }

  const legacyValue = await AsyncStorage.getItem(LEGACY_LOCAL_AUTH_KEY);
  if (!legacyValue) {
    return null;
  }

  await AsyncStorage.removeItem(LEGACY_LOCAL_AUTH_KEY);
  const session = parseStoredAuthSession(legacyValue);
  if (session) {
    await setSecureItem(LOCAL_AUTH_KEY, legacyValue);
  }

  return session;
}

async function saveLocalAuthSession(session: AuthSession) {
  await setSecureItem(LOCAL_AUTH_KEY, JSON.stringify(session));
  await AsyncStorage.multiRemove([LOCAL_AUTH_KEY, LEGACY_LOCAL_AUTH_KEY]);
}

async function removeLegacySupabaseAuthStorage() {
  await AsyncStorage.multiRemove([
    LEGACY_SUPABASE_AUTH_STORAGE_KEY,
    `${LEGACY_SUPABASE_AUTH_STORAGE_KEY}-code-verifier`,
    `${LEGACY_SUPABASE_AUTH_STORAGE_KEY}-user`,
    getDefaultSupabaseAuthStorageKey(SUPABASE_URL),
    `${getDefaultSupabaseAuthStorageKey(SUPABASE_URL)}-code-verifier`,
    `${getDefaultSupabaseAuthStorageKey(SUPABASE_URL)}-user`
  ].filter(Boolean) as string[]);
}

async function removeSecureStoreValue(key: string) {
  const chunkCountValue = await getSecureItem(chunkCountKey(key));
  const chunkCount = chunkCountValue ? Number(chunkCountValue) : 0;
  const keysToRemove = [key, chunkCountKey(key)];

  if (Number.isFinite(chunkCount) && chunkCount > 0) {
    for (let index = 0; index < chunkCount; index += 1) {
      keysToRemove.push(chunkKey(key, index));
    }
  }

  await Promise.all(keysToRemove.map((item) => deleteSecureItem(item)));
}

function getSecureItem(key: string) {
  return Platform.OS === "web"
    ? Promise.resolve(webSecureMemory.get(key) ?? null)
    : SecureStore.getItemAsync(key);
}

function setSecureItem(key: string, value: string) {
  if (Platform.OS === "web") {
    webSecureMemory.set(key, value);
    return Promise.resolve();
  }

  return SecureStore.setItemAsync(key, value);
}

function deleteSecureItem(key: string) {
  if (Platform.OS === "web") {
    webSecureMemory.delete(key);
    return Promise.resolve();
  }

  return SecureStore.deleteItemAsync(key);
}

function createSupabaseSession(
  user: {
    id: string;
    email?: string | null;
    is_anonymous?: boolean;
    user_metadata?: Record<string, unknown>;
  },
  storedSession: AuthSession | null
): AuthSession {
  const isAnonymous = user.is_anonymous === true;
  const metadataName = typeof user.user_metadata?.full_name === "string"
    ? user.user_metadata.full_name
    : null;
  return {
    email: user.email ?? storedSession?.email ?? null,
    fullName: isAnonymous ? null : metadataName ?? storedSession?.fullName ?? null,
    id: user.id,
    mode: isAnonymous ? "supabase_anonymous" : "supabase",
    provider: isAnonymous ? "anonymous" : "apple",
    signedInAt: storedSession?.signedInAt ?? new Date().toISOString()
  };
}

function parseStoredAuthSession(value: string) {
  try {
    const parsed = JSON.parse(value) as Partial<AuthSession> | null;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.id !== "string" ||
      parsed.id.length === 0 ||
      (parsed.mode !== "supabase" && parsed.mode !== "supabase_anonymous") ||
      (parsed.provider !== "apple" && parsed.provider !== "anonymous") ||
      typeof parsed.signedInAt !== "string" ||
      !Number.isFinite(Date.parse(parsed.signedInAt)) ||
      (parsed.email !== undefined && parsed.email !== null && typeof parsed.email !== "string") ||
      (parsed.fullName !== undefined && parsed.fullName !== null && typeof parsed.fullName !== "string")
    ) {
      return null;
    }

    return parsed as AuthSession;
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

function readMetadataName(metadata?: Record<string, unknown>) {
  return typeof metadata?.full_name === "string" && metadata.full_name.trim().length > 0
    ? metadata.full_name.trim()
    : null;
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
  return `${key}.chunkCount`;
}

function chunkKey(key: string, index: number) {
  return `${key}.chunk.${index}`;
}
