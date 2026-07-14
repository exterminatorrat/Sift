import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

loadDotEnv(path.resolve(".env"));

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  fail("EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are required.");
}

const functionUrl = `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/analyze-menu`;
const unauthenticated = await fetch(functionUrl, {
  method: "POST",
  headers: {
    apikey: supabaseKey,
    "Content-Type": "application/json"
  },
  body: "{}"
});

if (unauthenticated.status !== 401) {
  fail(`Expected unauthenticated request to return 401, received ${unauthenticated.status}.`);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const { data, error } = await supabase.auth.signInAnonymously();
if (error || !data.session) {
  fail(`Anonymous sign-in failed: ${error?.message ?? "missing session"}`);
}

try {
  const malformed = await fetch(functionUrl, {
    method: "POST",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${data.session.access_token}`,
      "Content-Type": "application/json"
    },
    body: "{}"
  });

  if (malformed.status !== 400) {
    fail(`Expected authenticated malformed request to return 400, received ${malformed.status}.`);
  }

  for (let attempt = 2; attempt <= 12; attempt += 1) {
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${data.session.access_token}`,
        "Content-Type": "application/json"
      },
      body: "{}"
    });

    if (response.status !== 400) {
      fail(`Expected malformed request ${attempt} to return 400, received ${response.status}.`);
    }
  }

  const throttled = await fetch(functionUrl, {
    method: "POST",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${data.session.access_token}`,
      "Content-Type": "application/json"
    },
    body: "{}"
  });
  const throttleBody = await throttled.json().catch(() => null);

  if (throttled.status !== 429 || throttleBody?.code !== "scan_rate_limited") {
    fail(
      `Expected authenticated request 13 to return typed 429, received ${throttled.status} (${throttleBody?.code ?? "no code"}).`
    );
  }

  console.log(
    "Backend smoke checks passed: anonymous auth, 401 boundary, twelve pre-provider 400 validations, and typed request 13 throttle."
  );
} finally {
  await supabase.auth.signOut({ scope: "local" });
}

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
