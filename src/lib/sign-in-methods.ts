// How an account can sign in, for the admin screens: "Password", "Google", "Fanvue"...

const PROVIDER_LABEL: Record<string, string> = { google: "Google", fanvue: "Fanvue" };

/** Labels for an account's sign-in methods, password first, each provider once. */
export function signInMethods(passwordHash: string | null | undefined, accounts: { provider: string }[]): string[] {
  const providers = [...new Set(accounts.map((a) => PROVIDER_LABEL[a.provider] ?? a.provider))];
  return [...(passwordHash ? ["Password"] : []), ...providers];
}
