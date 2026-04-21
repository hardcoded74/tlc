/**
 * Centralized runtime env access. Validated once at module-load so failures
 * surface on first import, not inside a request handler.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export const env = {
  googleAiStudioKey: optional("GOOGLE_AI_STUDIO_KEY"),
  databaseUrl: optional("DATABASE_URL"),
  ipSalt: optional("IP_SALT") ?? "tlc-dev-salt-change-in-prod",
  appUrl: optional("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000",
  sentryDsn: optional("SENTRY_DSN"),
  isProd: process.env.NODE_ENV === "production",
};

export function requireGoogleKey(): string {
  if (!env.googleAiStudioKey) {
    throw new Error("GOOGLE_AI_STUDIO_KEY not set — see .env.example");
  }
  return env.googleAiStudioKey;
}

export function requireDatabaseUrl(): string {
  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL not set — see .env.example");
  }
  return env.databaseUrl;
}

export { required, optional };
