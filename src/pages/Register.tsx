import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setError('');

    let res: Response;
    let data: any;

    try {
      res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
    } catch {
      setError('Network error — please try again.');
      setStatus('error');
      return;
    }

    try {
      data = await res.json();
    } catch {
      setError('Server did not send valid JSON.');
      setStatus('error');
      return;
    }

    if (!res.ok) {
      setError(data.error || 'Registration failed');
      setStatus('error');
      return;
    }

    setStatus('idle');
    navigate('/login');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-lg shadow p-6 space-y-4"
      >
        <h1 className="text-2xl font-semibold text-center">Register</h1>
        {status === 'error' && (
          <div className="text-red-600 text-sm">{error}</div>
        )}
        <input
          type="text"
          placeholder="Username"
          required
          value={username}
          onChange={e => setUsername(e.target.value)}
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring"
        />
        <input
          type="password"
          placeholder="Password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600 disabled:opacity-50"
        >
          {status === 'loading' ? 'Registering…' : 'Register'}
        </button>
        <p className="text-center text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-green-500 hover:underline">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}
