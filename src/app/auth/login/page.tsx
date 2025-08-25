'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { apiClient } from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState<string | null>(null);
  const [showForgot, setShowForgot] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await apiClient.login(email, password, remember);

      if (response.error) {
        setError(response.error);
        return;
      }

      if (response.user && response.token) {
        localStorage.setItem('user', JSON.stringify(response.user));
        localStorage.setItem('token', response.token);
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="max-w-md w-full">
        {/* Login Box */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <p className="text-center text-gray-600 mb-6">
                Sign in to start your session
              </p>

              {/* Email */}
              <div className="mb-4 relative">
                <input
                  type="email"
                  className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Password */}
              <div className="mb-4 relative">
                <input
                  type="password"
                  className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {error}
                </div>
              )}

              {/* Remember + SignIn */}
              <div className="flex items-center justify-between mb-4">
                <label className="flex items-center text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2">Remember Me</span>
                </label>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md disabled:opacity-50 transition-colors"
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </button>
              </div>

              {/* Forgot Password toggle */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowForgot(!showForgot)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Forgot Password UI (only if toggled) */}
        {showForgot && (
          <div className="w-full max-w-md mt-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-center text-sm text-gray-700 mb-2">
                Reset your password
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setForgotSent(null);
                      const resp = await fetch(
                        (process.env.NEXT_PUBLIC_API_URL ||
                          'http://localhost:3001') +
                          '/api/auth/forgot-password',
                        {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email: forgotEmail }),
                        }
                      );
                      const data = await resp.json();
                      if (!resp.ok)
                        throw new Error(data.error || 'Failed to send reset email');
                      setForgotSent(
                        'Reset email sent. Please check your inbox.'
                      );
                    } catch (e: any) {
                      setForgotSent(
                        e.message || 'Failed to send reset email'
                      );
                    }
                  }}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                >
                  Send reset link
                </button>
              </div>
              {forgotSent && (
                <div className="mt-2 text-sm text-gray-600 text-center">
                  {forgotSent}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
