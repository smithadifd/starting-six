'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

export function SetupForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create account');
        setLoading(false);
        return;
      }

      const signInResult = await authClient.signIn.email({ email, password });
      if (signInResult.error) {
        router.push('/login');
        return;
      }
      router.push('/');
    } catch {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {['name', 'email', 'password', 'confirmPassword'].map((field) => (
        <div key={field}>
          <label htmlFor={field} className="block text-sm font-medium mb-1.5 capitalize">
            {field === 'confirmPassword' ? 'Confirm Password' : field}
          </label>
          <input
            id={field} name={field}
            type={field.includes('password') || field === 'confirmPassword' ? 'password' : field === 'email' ? 'email' : 'text'}
            required minLength={field.includes('assword') ? 8 : undefined}
            autoComplete={field === 'name' ? 'name' : field === 'email' ? 'email' : 'new-password'}
            autoFocus={field === 'name'}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
            placeholder={
              field === 'name' ? 'Your name' :
              field === 'email' ? 'you@example.com' :
              field === 'password' ? 'Min. 8 characters' : 'Re-enter password'
            }
          />
        </div>
      ))}
      <button
        type="submit" disabled={loading}
        className="w-full rounded-md bg-red-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-500/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Creating Account...' : 'Create Account'}
      </button>
    </form>
  );
}