import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Mail, Lock, RefreshCw, ChevronDown, ChevronUp, AlertCircle, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate   = useNavigate();
  const [form, setForm]           = useState({ email: '', password: '' });
  const [loading, setLoading]     = useState(false);
  const [showDemo, setShowDemo]   = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate('/dashboard');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Invalid email or password');
    } finally { setLoading(false); }
  };

  const fillDemo = (email, password) => {
    setForm({ email, password });
    setShowDemo(false);
    toast('Credentials filled — click Sign In', { icon: '👆' });
  };

  // Generate an array of random sparkling dots representing the starry background
  const sparkingDots = React.useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => {
      const size = Math.random() * 2 + 1; // 1px to 3px
      const top = Math.random() * 100;
      const left = Math.random() * 100;
      const animationDelay = Math.random() * 3 + 's';
      const animationDuration = Math.random() * 2 + 2 + 's'; // 2s to 4s
      const isCyan = Math.random() > 0.7; // 30% cyan stars
      return (
        <div
          key={i}
          className={`absolute rounded-full animate-pulse ${isCyan ? 'bg-cyan-400 shadow-[0_0_8px_cyan]' : 'bg-white opacity-60'}`}
          style={{
            width: size,
            height: size,
            top: `${top}%`,
            left: `${left}%`,
            animationDelay,
            animationDuration,
          }}
        />
      );
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col md:flex-row relative pb-16 md:pb-0 overflow-y-auto overflow-x-hidden md:overflow-hidden bg-surface-50 dark:bg-[#070b14] transition-colors duration-300">
      
      {/* Left Side: Presentation Area with Sparkling Stars */}
      <div className="hidden md:flex flex-col w-1/2 relative justify-between p-12 lg:p-16 z-10 overflow-hidden">
        
        {/* The Sparkling Starry Background entirely filling the left side */}
        <div className="absolute inset-0 pointer-events-none z-0 dark:block hidden">
          {sparkingDots}
        </div>

        {/* Logo Top Left */}
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-cyan-400 to-[#06b6d4] rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)]">
            <Activity size={28} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-[26px] font-bold text-surface-900 dark:text-white tracking-wide leading-tight">DisasterWatch</h1>
            <p className="text-[11px] text-primary-500 dark:text-cyan-400 font-bold tracking-[0.25em] uppercase mt-0.5">AI Response System</p>
          </div>
        </div>

        {/* Central Video Graphic (Aggressive Elliptical Fade) */}
        <div className="flex-1 flex items-center justify-center relative w-full h-full z-10">
          
          {/* Subtle Warm Glow behind the video center for a positive atmosphere */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[250px] bg-amber-500/10 dark:bg-amber-500/15 blur-[100px] rounded-[100%] z-0 animate-pulse" style={{ animationDuration: '6s' }}></div>

          <div className="relative w-full max-w-[700px] aspect-video flex items-center justify-center translate-x-[2%] z-10">
            <video
              autoPlay
              loop
              muted
              playsInline
              src="/bg-video.mp4"
              className="w-full h-full object-cover mix-blend-screen dark:mix-blend-screen scale-[1.02] contrast-110 saturate-105"
              style={{ 
                /* Aggressive elliptical mask explicitly matching the user's hand-drawn oval fade */
                maskImage: 'radial-gradient(ellipse 55% 50% at center, black 40%, transparent 95%)',
                WebkitMaskImage: 'radial-gradient(ellipse 55% 50% at center, black 40%, transparent 95%)'
              }}
            />
            {/* Very light overlay to smooth the UI blending without darkening the scene */}
            <div className="absolute inset-0 bg-white/20 dark:bg-[#0b1220]/20 rounded-full blur-2xl z-20 pointer-events-none scale-100"></div>
          </div>
        </div>

        {/* Bottom Left Text Block */}
        <div className="relative z-10 mb-8 mt-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-2 bg-primary-500 rounded-full shadow-[0_0_8px_rgba(6,182,212,1)] animate-pulse"></div>
            <h3 className="text-surface-600 dark:text-gray-300 text-xs font-bold tracking-[0.25em] uppercase">AI Monitoring Active</h3>
          </div>
          <div className="pl-4 border-l-2 border-surface-300 dark:border-gray-700 mt-1">
            <p className="text-surface-500 dark:text-gray-400 text-sm font-medium leading-[1.6]">
              Real-time Disaster Intelligence &<br/> Resource Allocation System.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side: LOGIN LOGIC - Reverted to Original Clean Glassmorphism */}
      <div className="w-full md:w-1/2 min-h-screen md:min-h-0 flex items-center justify-center p-6 lg:p-12 relative z-20">
        <div className="w-full max-w-[420px] z-10 block mb-12 md:mb-0">
          
          {/* Mobile Logo Only */}
          <div className="md:hidden text-center mb-10 mt-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-500 rounded-2xl mb-4 shadow-lg shadow-primary-500/20">
              <Activity size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-gray-200">DisasterWatch</h1>
            <p className="text-primary-500 dark:text-primary-400 mt-1 text-xs tracking-widest uppercase font-medium">AI Response System</p>
          </div>

          <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-surface-200 dark:border-white/10 shadow-lg dark:shadow-none hover:scale-[1.02] transition-all duration-300 rounded-2xl p-8 relative">
            <h2 className="text-surface-900 dark:text-gray-200 font-semibold text-xl mb-6 tracking-tight">Sign In</h2>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="text-surface-500 dark:text-gray-400 text-xs font-medium mb-1.5 block uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400 dark:text-gray-500" />
                  <input
                    type="email"
                    className="w-full bg-surface-50 dark:bg-[#111827] border border-surface-200 dark:border-white/10 text-surface-900 dark:text-gray-200 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-surface-400 dark:placeholder-gray-600 transition-all duration-200 text-sm"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="you@example.com"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="text-surface-500 dark:text-gray-400 text-xs font-medium mb-1.5 block uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400 dark:text-gray-500" />
                  <input
                    type="password"
                    className="w-full bg-surface-50 dark:bg-[#111827] border border-surface-200 dark:border-white/10 text-surface-900 dark:text-gray-200 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-surface-400 dark:placeholder-gray-600 transition-all duration-200 text-sm tracking-widest"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary-500 hover:bg-primary-600 dark:hover:bg-primary-400 text-white font-medium py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary-500/30 active:scale-[0.98] text-sm"
                >
                  {loading ? <RefreshCw size={16} className="animate-spin" /> : 'Sign In'}
                </button>
              </div>
            </form>

            <div className="flex items-center my-6">
              <div className="flex-1 border-t border-surface-200 dark:border-white/10"></div>
              <span className="px-4 text-[10px] text-surface-400 dark:text-gray-500 font-semibold tracking-[0.2em]">OR</span>
              <div className="flex-1 border-t border-surface-200 dark:border-white/10"></div>
            </div>

            <button type="button" className="w-full bg-surface-50 dark:bg-white/5 border border-surface-200 dark:border-white/10 hover:bg-surface-100 dark:hover:bg-white/10 text-surface-700 dark:text-gray-300 font-medium py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 active:scale-[0.98] text-sm">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <p className="text-center text-surface-500 dark:text-gray-400 text-xs mt-6">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary-600 dark:text-primary-400 font-medium hover:text-primary-500 dark:hover:text-primary-300 transition-colors">Register</Link>
            </p>

            {/* Demo credentials */}
            <div className="mt-6 pt-5 border-t border-surface-200 dark:border-white/5 relative z-10">
              <button
                onClick={() => setShowDemo(!showDemo)}
                className="w-full flex items-center justify-between text-surface-500 dark:text-gray-500 hover:text-surface-700 dark:hover:text-gray-300 text-[11px] transition-colors outline-none font-medium uppercase tracking-wider"
              >
                <span>Testing Capabilities</span>
                {showDemo ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showDemo && (
                <div className="mt-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  {[
                    { role: 'Admin',     email: 'admin@disaster.com',     pass: 'Admin@123' },
                    { role: 'Volunteer', email: 'volunteer@disaster.com', pass: 'Vol@123'   },
                    { role: 'Citizen',   email: 'citizen@disaster.com',   pass: 'Cit@123'   },
                  ].map(({ role, email, pass }) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => fillDemo(email, pass)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-surface-200 dark:border-white/5 bg-surface-50 dark:bg-[#111827]/50 hover:bg-surface-100 dark:hover:bg-white/5 transition-colors text-left group`}
                    >
                      <div>
                        <p className="text-surface-700 dark:text-gray-300 text-xs font-medium">{role}</p>
                        <p className="text-surface-500 dark:text-gray-500 text-[10px] truncate">{email}</p>
                      </div>
                      <span className="text-primary-600 dark:text-primary-500 text-[10px] bg-primary-100 dark:bg-primary-500/10 px-2 py-1 flex items-center gap-1 rounded opacity-0 sm:opacity-70 group-hover:opacity-100 transition-opacity font-medium">Auto-fill</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Emergency Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#070b14]/95 border-t border-surface-200 dark:border-gray-800 h-14 z-50 flex items-center px-4 md:px-10">
        <div className="w-full max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-y-2">
          
          <div className="flex items-center gap-2 border border-danger-200 dark:border-red-900/50 bg-danger-50 dark:bg-red-950/20 px-3 py-1.5 rounded-full">
            <AlertCircle size={14} className="text-danger-500 animate-pulse" strokeWidth={2.5} />
            <span className="text-danger-500 text-[10px] font-bold tracking-[0.15em] uppercase">Emergency Response:</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
            <a href="tel:1078" className="flex items-center gap-2 hover:opacity-75 transition-opacity cursor-pointer group">
              <Phone size={14} className="text-surface-400 dark:text-gray-600"/>
              <span className="text-surface-500 dark:text-gray-400 text-[10px] font-bold tracking-[0.1em] uppercase">Calamity Helpline:</span>
              <span className="text-surface-900 dark:text-white text-xs font-bold tracking-wide group-hover:text-primary-500 dark:group-hover:text-cyan-400 hover:underline">1078</span>
            </a>
            <a href="tel:108" className="flex items-center gap-2 hover:opacity-75 transition-opacity cursor-pointer group">
              <Phone size={14} className="text-surface-400 dark:text-gray-600"/>
              <span className="text-surface-500 dark:text-gray-400 text-[10px] font-bold tracking-[0.1em] uppercase">Ambulance:</span>
              <span className="text-surface-900 dark:text-white text-xs font-bold tracking-wide group-hover:text-primary-500 dark:group-hover:text-cyan-400 hover:underline">108</span>
            </a>
            <a href="tel:100" className="hidden lg:flex items-center gap-2 hover:opacity-75 transition-opacity cursor-pointer group">
              <Phone size={14} className="text-surface-400 dark:text-gray-600"/>
              <span className="text-surface-500 dark:text-gray-400 text-[10px] font-bold tracking-[0.1em] uppercase">Police:</span>
              <span className="text-surface-900 dark:text-white text-xs font-bold tracking-wide group-hover:text-primary-500 dark:group-hover:text-cyan-400 hover:underline">100</span>
            </a>
          </div>

        </div>
      </div>

    </div>
  );
}
