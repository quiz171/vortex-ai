import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Lock, Mail, User as UserIcon, BookOpen, GraduationCap, CheckCircle2, AlertCircle } from 'lucide-react';
import { User } from '../../types';

interface AuthPageProps {
  onNavigate: (route: string) => void;
}

const getInitialTab = (): 'signup' | 'login' => {
  if (typeof window !== 'undefined') {
    const mode = localStorage.getItem('vortex_auth_mode');
    if (mode === 'login' || window.location.hash.includes('login')) {
      return 'login';
    }
  }
  return 'signup';
};

export const AuthPage: React.FC<AuthPageProps> = ({ onNavigate }) => {
  const [tab, setTab] = useState<'signup' | 'login'>(getInitialTab);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync tab with route hash or localStorage
  useEffect(() => {
    const syncTab = () => {
      const mode = localStorage.getItem('vortex_auth_mode');
      if (mode === 'login' || window.location.hash.includes('login')) {
        setTab('login');
      } else if (window.location.hash.includes('signup')) {
        setTab('signup');
      }
    };
    syncTab();
    window.addEventListener('hashchange', syncTab);
    return () => window.removeEventListener('hashchange', syncTab);
  }, []);

  // Signup form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [educationLevel, setEducationLevel] = useState('University');
  const [classYear, setClassYear] = useState('400L');
  const [course, setCourse] = useState('Computer Science');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Onboarding modal state
  const [onboardingUser, setOnboardingUser] = useState<User | null>(null);

  // Google Profile setup state (when registering/signing up via Google)
  const [googlePendingProfile, setGooglePendingProfile] = useState<{
    user: User;
    token: string;
  } | null>(null);

  const [setupEducationLevel, setSetupEducationLevel] = useState('University');
  const [setupClassYear, setSetupClassYear] = useState('100L');
  const [setupClassName, setSetupClassName] = useState('Computer Science');
  const [setupSchool, setSetupSchool] = useState('');

  // Listen for OAuth success message from Google popup
  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        const { user: authedUser, token: authToken, isNewUser } = event.data;
        if (authedUser && authToken) {
          // When signing up via Google (or if new user), present the form to choose class name and level
          if (tab === 'signup' || isNewUser) {
            setGooglePendingProfile({ user: authedUser, token: authToken });
            const initialLevel = authedUser.educationLevel || educationLevel || 'University';
            setSetupEducationLevel(initialLevel);
            setSetupClassYear(authedUser.classYear || classYear || '100L');
            setSetupClassName(authedUser.course && authedUser.course !== 'General Studies' ? authedUser.course : (course || 'Computer Science'));
            setSetupSchool(authedUser.school || '');
            setLoading(false);
          } else {
            localStorage.setItem('vortex_user', JSON.stringify(authedUser));
            localStorage.setItem('vortex_token', authToken);
            setLoading(false);
            onNavigate('/chat-app');
          }
        }
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, [tab, educationLevel, classYear, course, onNavigate]);

  // Google Identity Services (GSI) One-Tap / ID Token listener
  useEffect(() => {
    const handleCredentialResponse = async (response: any) => {
      if (response?.credential) {
        setLoading(true);
        try {
          const res = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              credential: response.credential,
              educationLevel,
              classYear,
              course,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Google authentication failed');
          if (tab === 'signup' || data.isNewUser) {
            setGooglePendingProfile({ user: data.user, token: data.token });
            const initialLevel = data.user.educationLevel || educationLevel || 'University';
            setSetupEducationLevel(initialLevel);
            setSetupClassYear(data.user.classYear || classYear || '100L');
            setSetupClassName(data.user.course && data.user.course !== 'General Studies' ? data.user.course : (course || 'Computer Science'));
            setSetupSchool(data.user.school || '');
            setLoading(false);
          } else {
            localStorage.setItem('vortex_user', JSON.stringify(data.user));
            localStorage.setItem('vortex_token', data.token);
            setLoading(false);
            onNavigate('/chat-app');
          }
        } catch (err: any) {
          setErrorMsg(err.message || 'Google authentication failed');
          setLoading(false);
        }
      }
    };

    if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
      try {
        (window as any).google.accounts.id.initialize({
          client_id: '533784833619-gv3ckilvv5kqbkt7l70ddpm1qh7jm94k.apps.googleusercontent.com',
          callback: handleCredentialResponse,
          auto_select: false,
        });
      } catch (e) {
        // GSI initialization caught
      }
    }
  }, [tab, educationLevel, classYear, course, onNavigate]);

  // Dynamic class year options based on selected level
  const getClassYearOptions = (level: string) => {
    switch (level) {
      case 'Primary':
        return ['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'];
      case 'JSS':
        return ['JSS1', 'JSS2', 'JSS3'];
      case 'SSS':
        return ['SS1', 'SS2', 'SS3', 'JAMB Candidate'];
      case 'Polytechnic':
        return ['ND1', 'ND2', 'HND1', 'HND2'];
      case 'University':
      default:
        return [
          '100L',
          '200L',
          '300L',
          '400L',
          '500L',
          '600L (MBBS / Vet Med / PharmD / BDS)',
          'Postgraduate / Masters',
          'PhD',
        ];
    }
  };

  const getClassNamePlaceholder = (level: string) => {
    switch (level) {
      case 'Primary':
        return 'e.g. Primary 5 Gold, Basic 4 Blue, Grade 5';
      case 'JSS':
        return 'e.g. JSS 1 Green, JSS 2 Blue, JSS 3 Gold';
      case 'SSS':
        return 'e.g. Science Class, SS3 Science A, Commercial Class';
      case 'Polytechnic':
        return 'e.g. Computer Engineering, ND1 Accountancy, Mass Comm';
      case 'Postgraduate':
        return 'e.g. M.Sc Computer Science, MBA, Public Health';
      case 'University':
      default:
        return 'e.g. Computer Science, Medicine & Surgery, Law';
    }
  };

  const getClassNameSuggestions = (level: string) => {
    switch (level) {
      case 'Primary':
        return ['Primary 5 Gold', 'Primary 6 Alpha', 'Basic 4 Blue', 'Primary 3', 'Grade 5'];
      case 'JSS':
        return ['JSS 1 Green', 'JSS 2 Blue', 'JSS 3 Gold', 'General Basic Science', 'Junior Arts'];
      case 'SSS':
        return ['Science Class', 'Commercial Class', 'Arts Class', 'SS3 Science A', 'SS3 Gold', 'JAMB Prep'];
      case 'Polytechnic':
        return ['Computer Engineering', 'Electrical Engineering', 'Mass Communication', 'Business Admin'];
      case 'Postgraduate':
        return ['M.Sc Computer Science', 'MBA Business Admin', 'M.Sc Public Health', 'PhD Research'];
      case 'University':
      default:
        return [
          'Computer Science',
          'Medicine & Surgery (MBBS)',
          'Law (LL.B)',
          'Software Engineering',
          'Mechanical Engineering',
          'Accounting',
          'Pharmacy (PharmD)',
          'Economics',
        ];
    }
  };

  const handleSetupEducationChange = (lvl: string) => {
    setSetupEducationLevel(lvl);
    const options = getClassYearOptions(lvl);
    if (options && options.length > 0) {
      setSetupClassYear(options[0]);
    }
    const suggestions = getClassNameSuggestions(lvl);
    if (suggestions && suggestions.length > 0) {
      setSetupClassName(suggestions[0]);
    }
  };

  const handleSaveGoogleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googlePendingProfile) return;

    if (!setupClassName.trim()) {
      setErrorMsg('Please enter or choose the class name you want to use.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${googlePendingProfile.token}`,
        },
        body: JSON.stringify({
          fullName: googlePendingProfile.user.fullName,
          educationLevel: setupEducationLevel,
          classYear: setupClassYear,
          course: setupClassName.trim(),
          school: setupSchool.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update academic profile');
      }

      const finalizedUser: User = {
        ...googlePendingProfile.user,
        ...(data.user || {}),
        educationLevel: setupEducationLevel,
        classYear: setupClassYear,
        course: setupClassName.trim(),
        school: setupSchool.trim() || googlePendingProfile.user.school,
      };

      localStorage.setItem('vortex_user', JSON.stringify(finalizedUser));
      localStorage.setItem('vortex_token', googlePendingProfile.token);

      setOnboardingUser(finalizedUser);
      setGooglePendingProfile(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving class settings');
    } finally {
      setLoading(false);
    }
  };

  // Standard Google Sign-In: opens Google Accounts popup directly like major web apps
  const handleGoogleSignIn = () => {
    setErrorMsg(null);
    setLoading(true);

    const width = 500;
    const height = 620;
    const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);

    const queryParams = new URLSearchParams({
      educationLevel: educationLevel || 'University',
      classYear: classYear || '100L',
      course: course || 'Computer Science',
      authMode: tab,
    });

    const popup = window.open(
      `/auth/google/popup?${queryParams.toString()}`,
      'GoogleSignIn',
      `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no`
    );

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      setErrorMsg('Popup was blocked by your browser. Please allow popups for this site.');
      setLoading(false);
      return;
    }

    popup.focus();

    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        setLoading(false);
      }
    }, 1000);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          password,
          educationLevel,
          classYear,
          course,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create account');
      }

      localStorage.setItem('vortex_user', JSON.stringify(data.user));
      localStorage.setItem('vortex_token', data.token);

      setOnboardingUser(data.user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to log in');
      }

      localStorage.setItem('vortex_user', JSON.stringify(data.user));
      localStorage.setItem('vortex_token', data.token);

      onNavigate('/chat-app');
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleEducationChange = (lvl: string) => {
    setEducationLevel(lvl);
    const options = getClassYearOptions(lvl);
    if (!options.includes(classYear)) {
      setClassYear(options[options.length - 1] || options[0]);
    }
    if (lvl === 'Primary') {
      setCourse('General Primary');
    }
  };

  return (
    <div className="min-h-screen bg-[#08080a] text-stone-100 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Dynamic Ambient Background Illumination */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[550px] h-[550px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-500/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Top Header / Back Link */}
      <div className="mb-6 text-center z-10">
        <button
          onClick={() => onNavigate('/landing-page')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-stone-400 hover:text-white transition-colors cursor-pointer mb-3 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10"
        >
          ← Back to Homepage
        </button>
        <div className="flex items-center justify-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-white to-stone-200 text-black font-black flex items-center justify-center text-sm shadow-md">
            V
          </div>
          <span className="text-2xl font-black tracking-tight text-white">VORTEX AI</span>
        </div>
      </div>

      {/* Glassmorphism Dark Modal */}
      <div className={`glass-panel w-full transition-all duration-300 ${googlePendingProfile ? 'max-w-lg' : 'max-w-md'} p-6 md:p-8 rounded-3xl relative z-10`}>
        {googlePendingProfile ? (
          /* Google Verified - Choose Class Name & Level Form */
          <form onSubmit={handleSaveGoogleProfile} className="space-y-4">
            {/* Google Verified Account Header */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.04] border border-white/10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center shrink-0 shadow-sm ring-2 ring-white/10 text-sm">
                  {googlePendingProfile.user.fullName?.charAt(0)?.toUpperCase() || 'G'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-white truncate">
                      {googlePendingProfile.user.fullName}
                    </p>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                      <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                      Verified
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 truncate">
                    {googlePendingProfile.user.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setGooglePendingProfile(null);
                  setErrorMsg(null);
                }}
                className="text-[11px] font-medium text-stone-400 hover:text-white px-2 py-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer shrink-0"
                title="Sign in with a different account"
              >
                Change
              </button>
            </div>

            {/* Title & Description */}
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 mb-2">
                <Sparkles className="w-3 h-3" />
                Step 2 of 2 • Profile Setup
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Choose Your Class Name & Level
              </h2>
              <p className="text-xs text-stone-400 leading-relaxed mt-1">
                Your Google account is verified! Select your academic level and specify the class name you want to use so VORTEX AI can personalize your syllabus, lecture notes, and practice tests.
              </p>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-950/40 border border-rose-800/50 p-3 rounded-2xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Academic Level Options */}
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                Academic Level
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'University', label: 'University', icon: '🎓' },
                  { id: 'SSS', label: 'Senior Sec (SSS)', icon: '🏫' },
                  { id: 'JSS', label: 'Junior Sec (JSS)', icon: '🎒' },
                  { id: 'Primary', label: 'Primary School', icon: '✏️' },
                  { id: 'Polytechnic', label: 'Polytechnic', icon: '🏛️' },
                  { id: 'Postgraduate', label: 'Postgraduate', icon: '🔬' },
                ].map((lvl) => {
                  const isSelected = setupEducationLevel === lvl.id;
                  return (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => handleSetupEducationChange(lvl.id)}
                      className={`p-2.5 rounded-2xl text-left border transition-all cursor-pointer flex flex-col gap-1 ${
                        isSelected
                          ? 'bg-emerald-500/20 border-emerald-500/60 text-white shadow-xs ring-1 ring-emerald-500/40'
                          : 'bg-white/5 border-white/10 text-stone-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="text-base">{lvl.icon}</span>
                      <span className="text-xs font-semibold">{lvl.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Class / Year Selector */}
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                Class Level / Year
              </label>
              <div className="relative">
                <GraduationCap className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={setupClassYear}
                  onChange={(e) => setSetupClassYear(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-xs text-white bg-stone-900 border border-white/15 cursor-pointer appearance-none"
                >
                  {getClassYearOptions(setupEducationLevel).map((yr) => (
                    <option key={yr} value={yr} className="text-black bg-white">
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Class Name You Want to Use */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-stone-300">
                  Class Name You Want to Use
                </label>
                <span className="text-[10px] text-stone-400">Type or click suggestion</span>
              </div>
              <div className="relative">
                <BookOpen className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={setupClassName}
                  onChange={(e) => setSetupClassName(e.target.value)}
                  placeholder={getClassNamePlaceholder(setupEducationLevel)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-sm text-white placeholder:text-stone-600 border border-white/15 focus:border-emerald-400"
                />
              </div>

              {/* Quick suggestions based on level */}
              <div className="mt-2">
                <p className="text-[10px] text-stone-400 mb-1.5 font-medium">
                  Quick selections for {setupEducationLevel}:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {getClassNameSuggestions(setupEducationLevel).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setSetupClassName(item)}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                        setupClassName === item
                          ? 'bg-emerald-500/25 border-emerald-500/60 text-emerald-300 font-semibold'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-stone-300 hover:text-white'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* School / Institution (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                School or Institution <span className="text-stone-500 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={setupSchool}
                onChange={(e) => setSetupSchool(e.target.value)}
                placeholder="e.g., University of Maiduguri, Kings College, etc."
                className="w-full px-4 py-2 rounded-2xl glass-input text-xs text-white placeholder:text-stone-600 border border-white/15"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !setupClassName.trim()}
              className="w-full mt-2 py-3 rounded-full bg-white text-black hover:bg-stone-200 active:scale-98 font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Save Class & Launch Assistant</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          <>
            {/* Tab Switcher */}
            <div className="flex bg-white/[0.04] p-1 rounded-2xl border border-white/10 mb-6">
          <button
            type="button"
            onClick={() => {
              setTab('signup');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              tab === 'signup'
                ? 'bg-white text-black shadow-md'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              tab === 'login'
                ? 'bg-white text-black shadow-md'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
        </div>

        {/* Google OAuth Quick Button */}
        <button
          type="button"
          onClick={() => handleGoogleSignIn()}
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 hover:border-emerald-500/50 text-stone-100 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50 group"
          title="Sign in or register with your Google Account"
        >
          <svg className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Or continue with email divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider">
            or continue with email
          </span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {errorMsg && (
          <div className="mb-5 flex items-center gap-2 text-xs text-rose-400 bg-rose-950/40 border border-rose-800/50 p-3 rounded-2xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Signup Form */}
        {tab === 'signup' ? (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nelson Wazini"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-sm text-white placeholder:text-stone-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nelson@student.unimaid.edu.ng"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-sm text-white placeholder:text-stone-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-sm text-white placeholder:text-stone-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                  Education Level
                </label>
                <select
                  value={educationLevel}
                  onChange={(e) => handleEducationChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl glass-input text-xs text-white bg-stone-900 cursor-pointer"
                >
                  <option value="Primary" className="text-black bg-white">Primary School</option>
                  <option value="JSS" className="text-black bg-white">Junior Sec (JSS)</option>
                  <option value="SSS" className="text-black bg-white">Senior Sec (SSS)</option>
                  <option value="University" className="text-black bg-white">University</option>
                  <option value="Polytechnic" className="text-black bg-white">Polytechnic</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                  Class / Year
                </label>
                <select
                  value={classYear}
                  onChange={(e) => setClassYear(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl glass-input text-xs text-white bg-stone-900 cursor-pointer"
                >
                  {getClassYearOptions(educationLevel).map((yr) => (
                    <option key={yr} value={yr} className="text-black bg-white">
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                Course / Department
              </label>
              <select
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl glass-input text-xs text-white bg-stone-900 cursor-pointer"
              >
                <option value="Medicine & Surgery (MBBS)" className="text-black bg-white">Medicine & Surgery (MBBS - 6 Yrs)</option>
                <option value="Veterinary Medicine (DVM)" className="text-black bg-white">Veterinary Medicine (DVM - 6 Yrs)</option>
                <option value="Pharmacy (PharmD)" className="text-black bg-white">Pharmacy (Doctor of Pharmacy - 6 Yrs)</option>
                <option value="Dentistry (BDS)" className="text-black bg-white">Dentistry (BDS - 6 Yrs)</option>
                <option value="Nursing Science" className="text-black bg-white">Nursing Science</option>
                <option value="Law (LL.B)" className="text-black bg-white">Law (LL.B - 5 Yrs)</option>
                <option value="Computer Science" className="text-black bg-white">Computer Science / Software Eng</option>
                <option value="Engineering" className="text-black bg-white">Engineering & Technology (5 Yrs)</option>
                <option value="Science" className="text-black bg-white">Science (WAEC/JAMB/NECO)</option>
                <option value="Commercial" className="text-black bg-white">Commercial / Accounting</option>
                <option value="Art" className="text-black bg-white">Arts & Humanities</option>
                <option value="General Primary" className="text-black bg-white">General Primary Curriculum</option>
                <option value="General" className="text-black bg-white">General Studies</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-full bg-white text-black hover:bg-stone-200 active:scale-98 font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* Login Form */
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="student@vortex.ai"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-sm text-white placeholder:text-stone-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-sm text-white placeholder:text-stone-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-full bg-white text-black hover:bg-stone-200 active:scale-98 font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Or Divider */}
        <div className="relative my-4 flex items-center justify-center">
          <div className="w-full border-t border-white/10" />
          <span className="bg-[#181818] px-3 text-[10px] font-semibold text-stone-400 uppercase tracking-wider absolute">
            or continue with
          </span>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={() => handleGoogleSignIn()}
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-stone-200 hover:text-white font-medium text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-98 shadow-xs"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span className="font-semibold">{tab === 'signup' ? 'Sign up with Google' : 'Sign in with Google'}</span>
        </button>
          </>
        )}
      </div>

      {/* Onboarding Celebration Modal */}
      {onboardingUser && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel border border-emerald-500/40 p-8 rounded-3xl max-w-sm w-full text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
              <Sparkles className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-bold text-white">
                Hi {onboardingUser.fullName}! 🎉
              </h3>
              <p className="text-xs text-stone-300">
                Your AI Assistant tailored for <strong className="text-emerald-400">{onboardingUser.educationLevel} ({onboardingUser.classYear})</strong> is primed and ready!
              </p>
            </div>

            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-left text-xs space-y-1">
              <div className="text-stone-400">Curriculum Target:</div>
              <div className="font-semibold text-white">
                {onboardingUser.course} • {onboardingUser.classYear}
              </div>
            </div>

            <button
              onClick={() => onNavigate('/chat-app')}
              className="w-full py-3 rounded-full bg-emerald-400 hover:bg-emerald-300 text-black font-black text-sm shadow-xl transition-all cursor-pointer"
            >
              Launch Assistant →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
