/**
 * Demo mode utilities.
 * When DEMO_MODE=true, the app runs in a read-mostly mode
 * with pre-seeded data and a demo user account.
 */

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === 'true';
}

export const DEMO_USER = {
  name: 'Demo User',
  email: 'demo@example.com',
  password: 'demo1234!',
} as const;

/** GitHub repo URL shown in the demo banner */
export const DEMO_REPO_URL = 'https://github.com/smithadifd/starting-six';
