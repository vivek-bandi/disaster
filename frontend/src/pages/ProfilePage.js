// ProfilePage.js
import React, { useState } from 'react';
import { User, Save, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', phone: '', address: '' });
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '' });
  const [saving, setSaving] = useState(false);

  const updateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/users/me', form);
      toast.success('Profile updated');
    } catch (e) { toast.error('Update failed'); }
    finally { setSaving(false); }
  };

  const updatePassword = async (e) => {
    e.preventDefault();
    if (pwForm.new_password.length < 6) return toast.error('Password must be at least 6 characters');
    try {
      await api.put('/users/me/password', pwForm);
      toast.success('Password updated');
      setPwForm({ current_password: '', new_password: '' });
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to update password'); }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-surface-900 dark:text-white">Profile Settings</h1>
        <p className="text-surface-500 dark:text-gray-400 text-sm">Manage your account information</p>
      </div>

      <div className="card">
        <div className="flex items-center gap-4 mb-5 pb-5 border-b border-surface-200 dark:border-surface-700">
          <div className="w-16 h-16 rounded-full bg-primary-700 flex items-center justify-center text-surface-900 dark:text-white text-2xl font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-surface-900 dark:text-white font-semibold">{user?.name}</p>
            <p className="text-surface-500 dark:text-gray-400 text-sm">{user?.email}</p>
            <span className="badge bg-primary-700 text-primary-200 capitalize mt-1">{user?.role}</span>
          </div>
        </div>
        <form onSubmit={updateProfile} className="space-y-4">
          <div>
            <label className="text-surface-500 dark:text-gray-400 text-sm mb-1 block">Display Name</label>
            <input className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="text-surface-500 dark:text-gray-400 text-sm mb-1 block">Phone</label>
            <input className="input-field" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 XXXXX XXXXX" />
          </div>
          <div>
            <label className="text-surface-500 dark:text-gray-400 text-sm mb-1 block">Address</label>
            <textarea className="input-field resize-none" rows={2} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Your address" />
          </div>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} Save Changes
          </button>
        </form>
      </div>

      <div className="card">
        <h3 className="text-surface-900 dark:text-white font-semibold mb-4">Change Password</h3>
        <form onSubmit={updatePassword} className="space-y-4">
          <div>
            <label className="text-surface-500 dark:text-gray-400 text-sm mb-1 block">Current Password</label>
            <input type="password" className="input-field" value={pwForm.current_password} onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))} required />
          </div>
          <div>
            <label className="text-surface-500 dark:text-gray-400 text-sm mb-1 block">New Password</label>
            <input type="password" className="input-field" value={pwForm.new_password} onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))} placeholder="At least 6 characters" required />
          </div>
          <button type="submit" className="btn-secondary">Update Password</button>
        </form>
      </div>
    </div>
  );
}
