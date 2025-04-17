import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

// Enhanced profanity filter implementation
// Core profanity list with more comprehensive coverage
const PROFANITY_LIST = [
  "fuck", "shit", "bitch", "cunt", "twat", "wanker", "asshole",
  "faggot", "nigger", "nigga", "bastard", "dick", "piss", "slut", 
  "whore", "cock", "ass", "pussy", "prick"
];

// Leetspeak + symbol map for normalization
const CHAR_SUBSTITUTIONS = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '9': 'g',
  '@': 'a', '$': 's', '!': 'i', '|': 'l', '*': '', '.': '', '_': '', '-': '', '+': '', '=': ''
};

// Normalize text to detect leetspeak and symbol substitutions
function normalizeText(text: string): string {
  return text.toLowerCase().split('').map(char => CHAR_SUBSTITUTIONS[char as keyof typeof CHAR_SUBSTITUTIONS] || char).join('');
}

// Enhanced profanity check
function containsProfanity(text: string): boolean {
  const normalized = normalizeText(text);
  
  // Check for exact matches and embedded words
  return PROFANITY_LIST.some(word => {
    // Full word match check (with word boundaries)
    if (new RegExp(`\\b${word}\\b`).test(normalized)) {
      return true;
    }
    
    // Embedded match check (for substrings)
    return normalized.includes(word);
  });
}

// Password strength visual indicator component
const PasswordStrengthMeter: React.FC<{ password: string }> = ({ password }) => {
  const calculateStrength = (pwd: string): number => {
    let strength = 0;
    
    if (pwd.length >= 8) strength += 1;
    if (pwd.length >= 12) strength += 1;
    if (/[A-Z]/.test(pwd)) strength += 1;
    if (/[a-z]/.test(pwd)) strength += 1;
    if (/[0-9]/.test(pwd)) strength += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) strength += 1;
    
    return Math.min(strength, 5); // Max 5 strength
  };

  const strength = calculateStrength(password);
  
  // Only display once user starts typing
  if (!password) return null;
  
  const getStrengthLabel = (str: number): string => {
    switch (str) {
      case 0: return 'Very Weak';
      case 1: return 'Weak';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Strong';
      case 5: return 'Very Strong';
      default: return '';
    }
  };
  
  const getStrengthColor = (str: number): string => {
    switch (str) {
      case 0: return '#ff4d4f';
      case 1: return '#ff7a45';
      case 2: return '#ffa940';
      case 3: return '#bae637';
      case 4: return '#73d13d';
      case 5: return '#389e0d';
      default: return '#d9d9d9';
    }
  };
  
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <div style={{ 
          height: '4px', 
          flex: 1, 
          backgroundColor: '#f0f0f0',
          borderRadius: '2px',
          overflow: 'hidden'
        }}>
          <div style={{ 
            height: '100%', 
            width: `${(strength / 5) * 100}%`, 
            backgroundColor: getStrengthColor(strength),
            transition: 'width 0.3s ease, background-color 0.3s ease' 
          }}></div>
        </div>
        <span style={{ 
          fontSize: '12px', 
          color: getStrengthColor(strength),
          minWidth: '80px'
        }}>
          {getStrengthLabel(strength)}
        </span>
      </div>
    </div>
  );
};

// Form validation types
interface ValidationError {
  field: string;
  message: string;
}

// Main Register component
const Register: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [generalError, setGeneralError] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({
    username: false,
    password: false,
    confirmPassword: false
  });
  const [formValid, setFormValid] = useState(false);

  // Validation logic with enhanced profanity filter
  const validateUsername = (value: string): string | null => {
    if (!value) return 'Username is required';
    if (value.length < 3) return 'Username must be at least 3 characters';
    if (value.length > 20) return 'Username must be less than 20 characters';
    if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Username can only contain letters, numbers, and underscores';
    
    // Enhanced profanity check using our new implementation
    if (containsProfanity(value)) {
      return 'Username contains inappropriate language';
    }
    
    return null;
  };
  
  const validatePassword = (value: string): string | null => {
    if (!value) return 'Password is required';
    if (value.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(value)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(value)) return 'Password must contain at least one lowercase letter';
    if (!/[0-9]/.test(value)) return 'Password must contain at least one number';
    return null;
  };
  
  const validateConfirmPassword = (value: string): string | null => {
    if (!value) return 'Please confirm your password';
    if (value !== password) return 'Passwords do not match';
    return null;
  };

  // Validate form on input change
  useEffect(() => {
    // Only validate touched fields
    const newErrors: ValidationError[] = [];
    
    if (touched.username) {
      const usernameError = validateUsername(username);
      if (usernameError) {
        newErrors.push({ field: 'username', message: usernameError });
      }
    }
    
    if (touched.password) {
      const passwordError = validatePassword(password);
      if (passwordError) {
        newErrors.push({ field: 'password', message: passwordError });
      }
    }
    
    if (touched.confirmPassword) {
      const confirmError = validateConfirmPassword(confirmPassword);
      if (confirmError) {
        newErrors.push({ field: 'confirmPassword', message: confirmError });
      }
    }
    
    setErrors(newErrors);
    
    // Form is valid if all fields are touched and there are no errors
    const allTouched = Object.values(touched).every(t => t);
    setFormValid(allTouched && newErrors.length === 0);
  }, [username, password, confirmPassword, touched]);

  // Handle field blur for validation
  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  // Get error message for a specific field
  const getFieldError = (field: string): string | undefined => {
    return errors.find(error => error.field === field)?.message;
  };

  // Handle registration submission
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields on submit
    setTouched({
      username: true,
      password: true,
      confirmPassword: true
    });
    
    // Check if form is valid
    const usernameError = validateUsername(username);
    const passwordError = validatePassword(password);
    const confirmError = validateConfirmPassword(confirmPassword);
    
    if (usernameError || passwordError || confirmError) {
      const newErrors = [];
      if (usernameError) newErrors.push({ field: 'username', message: usernameError });
      if (passwordError) newErrors.push({ field: 'password', message: passwordError });
      if (confirmError) newErrors.push({ field: 'confirmPassword', message: confirmError });
      
      setErrors(newErrors);
      return;
    }
    
    setStatus('loading');
    setGeneralError('');

    try {
      // Rate limiting check (could be middleware in a real app)
      const throttleKey = `register_attempts_${btoa(username)}`;
      const attempts = localStorage.getItem(throttleKey);
      const maxAttempts = 5;
      const throttleTimeMs = 10 * 60 * 1000; // 10 minutes
      
      if (attempts) {
        const { count, timestamp } = JSON.parse(attempts);
        const elapsed = Date.now() - timestamp;
        
        if (elapsed < throttleTimeMs && count >= maxAttempts) {
          setGeneralError('Too many registration attempts. Please try again later.');
          setStatus('error');
          return;
        }
        
        // Update attempts
        if (elapsed < throttleTimeMs) {
          localStorage.setItem(throttleKey, JSON.stringify({ 
            count: count + 1, 
            timestamp 
          }));
        } else {
          // Reset if the throttle time has passed
          localStorage.setItem(throttleKey, JSON.stringify({ 
            count: 1, 
            timestamp: Date.now() 
          }));
        }
      } else {
        // First attempt
        localStorage.setItem(throttleKey, JSON.stringify({ 
          count: 1, 
          timestamp: Date.now() 
        }));
      }
      
      // Send registration request
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username, 
          password,
          // Add metadata for analytics
          metadata: {
            registrationTimestamp: Date.now(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            locale: navigator.language,
            screenWidth: window.innerWidth,
          }
        })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Registration failed');

      // Clear registration throttling on success
      localStorage.removeItem(throttleKey);
      
      setStatus('success');
      
      // Add a slight delay before redirecting
      setTimeout(() => {
        navigate('/login'); 
      }, 1500);
    } catch (err: any) {
      console.error('Registration error:', err);
      setStatus('error');
      setGeneralError(err.message || 'An error occurred during registration');
    }
  };

  // Field styling helper
  const getInputStyle = (field: string) => {
    const baseStyle = { 
      width: '100%', 
      padding: '10px', 
      marginBottom: '6px',
      borderRadius: '4px',
      border: '1px solid #d9d9d9',
      transition: 'border-color 0.3s ease',
      outline: 'none'
    };
    
    const error = getFieldError(field);
    
    if (error) {
      return { 
        ...baseStyle, 
        borderColor: '#ff4d4f',
        backgroundColor: 'rgba(255, 77, 79, 0.05)'
      };
    }
    
    if (touched[field as keyof typeof touched]) {
      return { 
        ...baseStyle, 
        borderColor: '#52c41a',
        backgroundColor: 'rgba(82, 196, 26, 0.05)'
      };
    }
    
    return baseStyle;
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '20px',
      backgroundColor: '#f5f5f5',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        maxWidth: '450px',
        width: '100%',
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
      }}>
        <h1 style={{ 
          textAlign: 'center', 
          marginBottom: '24px',
          fontSize: '24px',
          color: '#1f2937'
        }}>
          Create a WorldFund Account
        </h1>

        {status === 'success' && (
          <div style={{ 
            color: '#389e0d', 
            backgroundColor: '#f6ffed',
            border: '1px solid #b7eb8f',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="#52c41a">
              <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-.997-6l7.07-7.071-1.414-1.414-5.656 5.657-2.829-2.829-1.414 1.414L11.003 16z" />
            </svg>
            <span>Registration successful! Redirecting to login...</span>
          </div>
        )}
        
        {generalError && (
          <div style={{ 
            color: '#cf1322', 
            backgroundColor: '#fff1f0',
            border: '1px solid #ffa39e',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="#f5222d">
              <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm0-8v6h2V7h-2z" />
            </svg>
            <span>{generalError}</span>
          </div>
        )}

        <form onSubmit={handleRegister}>
          <div style={{ marginBottom: '16px' }}>
            <label 
              htmlFor="username" 
              style={{ 
                display: 'block', 
                marginBottom: '6px',
                fontWeight: 500,
                fontSize: '14px',
                color: '#374151'
              }}
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              placeholder="Choose a username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onBlur={() => handleBlur('username')}
              required
              style={getInputStyle('username')}
            />
            {getFieldError('username') && (
              <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>
                {getFieldError('username')}
              </div>
            )}
            <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px' }}>
              3-20 characters, letters, numbers and underscores only
            </div>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label 
              htmlFor="password" 
              style={{ 
                display: 'block', 
                marginBottom: '6px',
                fontWeight: 500,
                fontSize: '14px',
                color: '#374151'
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Create a strong password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onBlur={() => handleBlur('password')}
              required
              style={getInputStyle('password')}
            />
            <PasswordStrengthMeter password={password} />
            {getFieldError('password') && (
              <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>
                {getFieldError('password')}
              </div>
            )}
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <label 
              htmlFor="confirmPassword" 
              style={{ 
                display: 'block', 
                marginBottom: '6px',
                fontWeight: 500,
                fontSize: '14px',
                color: '#374151'
              }}
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              onBlur={() => handleBlur('confirmPassword')}
              required
              style={getInputStyle('confirmPassword')}
            />
            {getFieldError('confirmPassword') && (
              <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>
                {getFieldError('confirmPassword')}
              </div>
            )}
          </div>
          
          <button
            type="submit"
            disabled={status === 'loading' || !formValid}
            style={{
              backgroundColor: formValid ? '#3b82f6' : '#9ca3af',
              color: 'white',
              border: 'none',
              padding: '12px 20px',
              width: '100%',
              borderRadius: '6px',
              cursor: formValid ? 'pointer' : 'not-allowed',
              fontWeight: 500,
              fontSize: '16px',
              transition: 'background-color 0.3s ease',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {status === 'loading' ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" style={{
                  animation: 'spin 1s linear infinite',
                }}>
                  <style>
                    {`
                      @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                      }
                    `}
                  </style>
                  <path d="M12 2A10 10 0 1 0 22 12A10 10 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8A8 8 0 0 1 12 20Z" opacity=".5" fill="currentColor"/>
                  <path d="M20 12h2A10 10 0 0 0 12 2V4A8 8 0 0 1 20 12Z" fill="currentColor"/>
                </svg>
                <span>Creating Account...</span>
              </>
            ) : 'Create Account'}
          </button>
          
          <div style={{ 
            marginTop: '24px', 
            textAlign: 'center', 
            color: '#6b7280',
            fontSize: '14px'
          }}>
            <p style={{ marginBottom: '8px' }}>
              By registering, you agree to our{' '}
              <a 
                href="/terms" 
                style={{ 
                  color: '#3b82f6', 
                  textDecoration: 'none',
                  borderBottom: '1px dotted #3b82f6'
                }}
              >
                Terms of Service
              </a>
              {' '}and{' '}
              <a 
                href="/privacy" 
                style={{ 
                  color: '#3b82f6', 
                  textDecoration: 'none',
                  borderBottom: '1px dotted #3b82f6'
                }}
              >
                Privacy Policy
              </a>
            </p>
            
            <div style={{ marginTop: '16px' }}>
              Already have an account?{' '}
              <Link
                to="/login"
                style={{
                  color: '#3b82f6',
                  textDecoration: 'none',
                  fontWeight: 500,
                  borderBottom: '1px solid #3b82f6'
                }}
              >
                Log in here
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;