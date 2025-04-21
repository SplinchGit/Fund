// Register.tsx
import React, { useState, useEffect } from 'react';
// Import useNavigate and Link directly
import { useNavigate, Link } from 'react-router-dom';

// --- Profanity Filter Functions (Keep as is) ---
const PROFANITY_LIST = [ "fuck", "shit", "bitch", "cunt", "twat", "wanker", "asshole", "faggot", "nigger", "nigga", "bastard", "dick", "piss", "slut", "whore", "cock", "ass", "pussy", "prick" ];
const CHAR_SUBSTITUTIONS = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '9': 'g', '@': 'a', '$': 's', '!': 'i', '|': 'l', '*': '', '.': '', '_': '', '-': '', '+': '', '=': '' };
function normalizeText(text: string): string { return text.toLowerCase().split('').map(char => CHAR_SUBSTITUTIONS[char as keyof typeof CHAR_SUBSTITUTIONS] || char).join(''); }
function containsProfanity(text: string): boolean { const normalized = normalizeText(text); return PROFANITY_LIST.some(word => new RegExp(`\\b${word}\\b`).test(normalized) || normalized.includes(word)); }

// --- Password Strength Meter Component (Keep as is) ---
const PasswordStrengthMeter: React.FC<{ password: string }> = ({ password }) => {
  const calculateStrength = (pwd: string): number => { let strength = 0; if (pwd.length >= 8) strength += 1; if (pwd.length >= 12) strength += 1; if (/[A-Z]/.test(pwd)) strength += 1; if (/[a-z]/.test(pwd)) strength += 1; if (/[0-9]/.test(pwd)) strength += 1; if (/[^A-Za-z0-9]/.test(pwd)) strength += 1; return Math.min(strength, 5); };
  const strength = calculateStrength(password);
  if (!password) return null;
  const getStrengthLabel = (str: number): string => { switch (str) { case 0: return 'Very Weak'; case 1: return 'Weak'; case 2: return 'Fair'; case 3: return 'Good'; case 4: return 'Strong'; case 5: return 'Very Strong'; default: return ''; } };
  const getStrengthColor = (str: number): string => { switch (str) { case 0: return '#ff4d4f'; case 1: return '#ff7a45'; case 2: return '#ffa940'; case 3: return '#bae637'; case 4: return '#73d13d'; case 5: return '#389e0d'; default: return '#d9d9d9'; } };
  return ( <div style={{ marginBottom: '10px' }}> <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}> <div style={{ height: '4px', flex: 1, backgroundColor: '#f0f0f0', borderRadius: '2px', overflow: 'hidden' }}> <div style={{ height: '100%', width: `${(strength / 5) * 100}%`, backgroundColor: getStrengthColor(strength), transition: 'width 0.3s ease, background-color 0.3s ease' }}></div> </div> <span style={{ fontSize: '12px', color: getStrengthColor(strength), minWidth: '80px' }}> {getStrengthLabel(strength)} </span> </div> </div> );
};

// --- Form validation types (Keep as is) ---
interface ValidationError { field: string; message: string; }

// --- Main Register component ---
const Register: React.FC = () => {
  // ***** CORRECT useNavigate ASSIGNMENT *****
  const navigate = useNavigate();

  // --- State Definitions (Keep as is) ---
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [generalError, setGeneralError] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({ username: false, password: false, confirmPassword: false });
  const [formValid, setFormValid] = useState(false);

  // --- Validation Functions (Keep as is) ---
  const validateUsername = (value: string): string | null => { if (!value) return 'Username is required'; if (value.length < 3) return 'Username must be at least 3 characters'; if (value.length > 20) return 'Username must be less than 20 characters'; if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Username can only contain letters, numbers, and underscores'; if (containsProfanity(value)) { return 'Username contains inappropriate language'; } return null; };
  const validatePassword = (value: string): string | null => { if (!value) return 'Password is required'; if (value.length < 8) return 'Password must be at least 8 characters'; if (!/[A-Z]/.test(value)) return 'Password must contain one uppercase letter'; if (!/[a-z]/.test(value)) return 'Password must contain one lowercase letter'; if (!/[0-9]/.test(value)) return 'Password must contain one number'; return null; };
  const validateConfirmPassword = (value: string): string | null => { if (!value) return 'Please confirm your password'; if (value !== password) return 'Passwords do not match'; return null; };

  // --- useEffect for Validation (Keep as is) ---
  useEffect(() => {
    const newErrors: ValidationError[] = [];
    if (touched.username) { const err = validateUsername(username); if (err) newErrors.push({ field: 'username', message: err }); }
    if (touched.password) { const err = validatePassword(password); if (err) newErrors.push({ field: 'password', message: err }); }
    if (touched.confirmPassword) { const err = validateConfirmPassword(confirmPassword); if (err) newErrors.push({ field: 'confirmPassword', message: err }); }
    setErrors(newErrors);
    const allTouched = Object.values(touched).every(t => t);
    // Also check fields aren't empty for validity
    const isValid = allTouched && newErrors.length === 0 && !!username && !!password && !!confirmPassword;
    setFormValid(isValid);
  }, [username, password, confirmPassword, touched]);

  // --- handleBlur (Keep as is) ---
  const handleBlur = (field: string) => { setTouched(prev => ({ ...prev, [field]: true })); };

  // --- getFieldError (Keep as is) ---
  const getFieldError = (field: string): string | undefined => { return errors.find(error => error.field === field)?.message; };


  // ***** CORRECTED handleRegister FUNCTION (using fetch) *****
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // --- Client-side validation ---
    setTouched({ username: true, password: true, confirmPassword: true });
    const usernameError = validateUsername(username);
    const passwordError = validatePassword(password);
    const confirmError = validateConfirmPassword(confirmPassword);
    const currentErrors = [];
    if (usernameError) currentErrors.push({ field: 'username', message: usernameError });
    if (passwordError) currentErrors.push({ field: 'password', message: passwordError });
    if (confirmError) currentErrors.push({ field: 'confirmPassword', message: confirmError });
    setErrors(currentErrors);

    if (currentErrors.length > 0 || !username || !password || !confirmPassword) {
        console.log("Register: Client-side validation failed on submit.");
        setGeneralError("Please fix the errors in the form.");
        return;
    }
    // --- End validation ---

    setStatus('loading');
    setGeneralError('');

    // --- Get Backend API Base URL ---
    const apiBaseUrl = import.meta.env.VITE_AMPLIFY_API;
    if (!apiBaseUrl) {
        console.error("Register Error: VITE_AMPLIFY_API environment variable is not set.");
        setGeneralError("Configuration error. Cannot contact registration server.");
        setStatus('error');
        return;
    }
    // *** Adjust '/register' if your backend endpoint path is different ***
    const registerEndpoint = `${apiBaseUrl}/register`;
    console.log(`Register: Attempting registration to ${registerEndpoint}`);

    try {
      // --- Backend API Call ---
      const response = await fetch(registerEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      // --- Handle Backend Response ---
      if (!response.ok) {
        let errorMessage = `Registration failed (Code: ${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (jsonError) {
          console.error("Register: Could not parse error response JSON", jsonError);
        }
        throw new Error(errorMessage);
      }

      // --- Backend Success ---
      // const responseData = await response.json(); // Parse if needed
      console.log("Register: Backend registration successful.");
      setStatus('success');

      // --- Redirect ---
      console.log("Register: Redirecting to login...");
      navigate('/login'); // Use real navigate

    } catch (err: any) {
      console.error('Register: Registration error:', err);
      setStatus('error');
      setGeneralError(err.message || 'An unexpected error occurred.');
    }
  }; // ***** END OF CORRECT handleRegister FUNCTION *****

  // ***** NO DUPLICATE localStorage LOGIC SHOULD BE HERE *****


  // --- Field styling helper (Keep as is) ---
  const getInputStyle = (field: string) => { const baseStyle = { width: '100%', padding: '10px', marginBottom: '6px', borderRadius: '4px', border: '1px solid #d9d9d9', transition: 'border-color 0.3s ease', outline: 'none' }; const error = getFieldError(field); if (error) { return { ...baseStyle, borderColor: '#ff4d4f', backgroundColor: 'rgba(255, 77, 79, 0.05)' }; } if (touched[field as keyof typeof touched]) { return { ...baseStyle, borderColor: '#52c41a', backgroundColor: 'rgba(82, 196, 26, 0.05)' }; } return baseStyle; };


  // --- RETURN JSX (Keep as is) ---
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px', backgroundColor: '#f5f5f5', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: '450px', width: '100%', backgroundColor: 'white', borderRadius: '8px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
        {/* Title */}
        <h1 style={{ textAlign: 'center', marginBottom: '24px', fontSize: '24px', color: '#1f2937' }}> Create a WorldFund Account </h1>
        {/* Success Message Area */}
        {status === 'success' && ( <div style={{ color: '#389e0d', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', padding: '12px', borderRadius: '4px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}> <svg viewBox="0 0 24 24" width="16" height="16" fill="#52c41a"><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-.997-6l7.07-7.071-1.414-1.414-5.656 5.657-2.829-2.829-1.414 1.414L11.003 16z" /></svg> <span>Registration successful! Redirecting...</span> </div> )}
        {/* General Error Message Area */}
        {generalError && ( <div style={{ color: '#cf1322', backgroundColor: '#fff1f0', border: '1px solid #ffa39e', padding: '12px', borderRadius: '4px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}> <svg viewBox="0 0 24 24" width="16" height="16" fill="#f5222d"><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm0-8v6h2V7h-2z" /></svg> <span>{generalError}</span> </div> )}
        {/* Form Element */}
        <form onSubmit={handleRegister}>
          {/* Username Field */}
          <div style={{ marginBottom: '16px' }}> <label htmlFor="username" style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px', color: '#374151' }}>Username</label> <input id="username" type="text" placeholder="Choose a username" value={username} onChange={e => setUsername(e.target.value)} onBlur={() => handleBlur('username')} required style={getInputStyle('username')} aria-invalid={!!getFieldError('username')} aria-describedby={getFieldError('username') ? 'username-error' : undefined} /> {touched.username && getFieldError('username') && ( <div id="username-error" style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>{getFieldError('username')}</div> )} <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px' }}>3-20 characters, letters, numbers and underscores only</div> </div>
          {/* Password Field */}
          <div style={{ marginBottom: '16px' }}> <label htmlFor="password" style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px', color: '#374151' }}>Password</label> <input id="password" type="password" placeholder="Create a strong password" value={password} onChange={e => setPassword(e.target.value)} onBlur={() => handleBlur('password')} required style={getInputStyle('password')} aria-invalid={!!getFieldError('password')} aria-describedby={getFieldError('password') ? 'password-error' : undefined}/> <PasswordStrengthMeter password={password} /> {touched.password && getFieldError('password') && ( <div id="password-error" style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>{getFieldError('password')}</div> )} </div>
          {/* Confirm Password Field */}
          <div style={{ marginBottom: '24px' }}> <label htmlFor="confirmPassword" style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px', color: '#374151' }}>Confirm Password</label> <input id="confirmPassword" type="password" placeholder="Confirm your password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} onBlur={() => handleBlur('confirmPassword')} required style={getInputStyle('confirmPassword')} aria-invalid={!!getFieldError('confirmPassword')} aria-describedby={getFieldError('confirmPassword') ? 'confirmPassword-error' : undefined}/> {touched.confirmPassword && getFieldError('confirmPassword') && ( <div id="confirmPassword-error" style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>{getFieldError('confirmPassword')}</div> )} </div>
          {/* Submit Button */}
          <button type="submit" disabled={status === 'loading' || !formValid} style={{ backgroundColor: (status !== 'loading' && formValid) ? '#3b82f6' : '#9ca3af', color: 'white', border: 'none', padding: '12px 20px', width: '100%', borderRadius: '6px', cursor: (status !== 'loading' && formValid) ? 'pointer' : 'not-allowed', fontWeight: 500, fontSize: '16px', transition: 'background-color 0.3s ease', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}> {status === 'loading' ? ( <> <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite', }}> <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style> <path d="M12 2A10 10 0 1 0 22 12A10 10 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8A8 8 0 0 1 12 20Z" opacity=".5" fill="currentColor"/> <path d="M20 12h2A10 10 0 0 0 12 2V4A8 8 0 0 1 20 12Z" fill="currentColor"/> </svg> <span>Creating Account...</span> </> ) : 'Create Account'} </button>
          {/* Footer Links */}
          <div style={{ marginTop: '24px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}> <p style={{ marginBottom: '8px' }}> By registering, you agree to our{' '} <a href="/terms" style={{ color: '#3b82f6', textDecoration: 'none', borderBottom: '1px dotted #3b82f6' }}>Terms of Service</a> {' '}and{' '} <a href="/privacy" style={{ color: '#3b82f6', textDecoration: 'none', borderBottom: '1px dotted #3b82f6' }}>Privacy Policy</a> </p> <div style={{ marginTop: '16px' }}> Already have an account?{' '} <Link to="/login" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500, borderBottom: '1px solid #3b82f6' }}> Log in here </Link> </div> </div>
        </form>
      </div>
    </div>
  );
};

export default Register;