// RegisterPage.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'citizen', phone: '' });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created! Welcome!');
      navigate('/dashboard');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-danger-600 rounded-2xl mb-4">
            <Activity size={28} className="text-surface-900 dark:text-white" />
          </div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Join DisasterWatch</h1>
          <p className="text-surface-500 dark:text-gray-400 mt-1">Help your community be prepared</p>
        </div>
        <div className="card">
          <h2 className="text-surface-900 dark:text-white font-semibold text-lg mb-5">Create Account</h2>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-surface-500 dark:text-gray-400 text-sm mb-1 block">Full Name</label>
              <input className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="John Doe" required minLength={2} />
            </div>
            <div>
              <label className="text-surface-500 dark:text-gray-400 text-sm mb-1 block">Email</label>
              <input type="email" className="input-field" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="you@example.com" required />
            </div>
            <div>
              <label className="text-surface-500 dark:text-gray-400 text-sm mb-1 block">Password</label>
              <input type="password" className="input-field" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="At least 6 characters" required />
            </div>
            <div>
              <label className="text-surface-500 dark:text-gray-400 text-sm mb-1 block">Phone (optional)</label>
              <input className="input-field" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 XXXXX XXXXX" />
            </div>
            <div>
              <label className="text-surface-500 dark:text-gray-400 text-sm mb-1 block">Register as</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {['citizen', 'volunteer'].map(role => (
                  <button key={role} type="button" onClick={() => setForm(f => ({ ...f, role }))}
                    className={`py-2 rounded-lg text-sm font-medium capitalize border transition-all ${form.role === role ? 'bg-primary-600 border-primary-500 text-surface-900 dark:text-white' : 'bg-surface-50 dark:bg-surface-700 border-surface-200 dark:border-surface-600 text-surface-500 dark:text-gray-400 hover:text-surface-900 dark:text-white'}`}>
                    {role === 'citizen' ? '👤' : '🦺'} {role}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
              {loading ? <RefreshCw size={15} className="animate-spin" /> : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-surface-500 dark:text-gray-400 text-sm mt-4">
            Already have an account? <Link to="/login" className="text-primary-400 hover:text-primary-300">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
