import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Flame, Lock, User as UserIcon, Mail, ArrowLeft, CheckCircle, Fingerprint } from 'lucide-react';
import { User, RegisteredUser } from '../types';
import { authenticateBiometric, isBiometricSupported, hasBiometricCredential } from '../services/biometricService';

interface LoginScreenProps {
  onLogin: (user: User) => void;
  registeredUsers?: RegisteredUser[];
}

type AuthView = 'login' | 'forgot-password';

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, registeredUsers = [] }) => {
  const [view, setView] = useState<AuthView>('login');
  
  // Login State
  const [firstName, setFirstName] = useState('');
  const [password, setPassword] = useState('');
  
  // Reset State
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  // UI State
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Biometric State
  const [showBiometricBtn, setShowBiometricBtn] = useState(false);
  const [matchedUserForBio, setMatchedUserForBio] = useState<RegisteredUser | null>(null);

  // Check for biometric availability for the typed user
  useEffect(() => {
      const checkBiometric = async () => {
          if (!firstName || firstName.length < 2) {
              setShowBiometricBtn(false);
              return;
          }

          // 1. Find the user in the list
          const user = registeredUsers.find(u => u.firstName.toLowerCase() === firstName.toLowerCase());
          if (!user) {
              setShowBiometricBtn(false);
              return;
          }

          // 2. Check if device supports bio AND user has enrolled
          const supported = await isBiometricSupported();
          if (supported && hasBiometricCredential(user.technicianId)) {
              setShowBiometricBtn(true);
              setMatchedUserForBio(user);
          } else {
              setShowBiometricBtn(false);
              setMatchedUserForBio(null);
          }
      };

      const timer = setTimeout(checkBiometric, 500); // Debounce check
      return () => clearTimeout(timer);
  }, [firstName, registeredUsers]);

  const handleBiometricLogin = async () => {
      if (!matchedUserForBio) return;
      
      setIsLoading(true);
      setError('');
      
      const success = await authenticateBiometric(matchedUserForBio.technicianId);
      
      if (success) {
          onLogin({
              name: `${matchedUserForBio.firstName} ${matchedUserForBio.lastName}`,
              technicianId: matchedUserForBio.technicianId,
              role: matchedUserForBio.role,
              email: matchedUserForBio.email
          });
      } else {
          setError('Biometric authentication failed. Use PIN.');
          setIsLoading(false);
      }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      if (!firstName.trim() || !password.trim()) {
        setError('Please fill in all fields');
        setIsLoading(false);
        return;
      }

      const fName = firstName.trim().toLowerCase();

      // Check credentials against registered users
      // Match by First Name AND PIN to allow duplicate first names with different PINs
      const user = registeredUsers.find(u => 
          u.firstName.toLowerCase() === fName && 
          u.pin === password
      );
      
      if (user) {
          onLogin({
              name: `${user.firstName} ${user.lastName}`,
              technicianId: user.technicianId,
              role: user.role,
              email: user.email
          });
          setIsLoading(false);
      } else {
          // Fallback for default hardcoded admin if database is empty/corrupt
          if (fName === 'tobey' && password === '6876' && registeredUsers.length === 0) {
              onLogin({
                  name: 'Tobey Admin',
                  technicianId: 'TECH-001',
                  role: 'admin',
                  email: 'admin@dmfire.com'
              });
              setIsLoading(false);
              return;
          }

          setError('Invalid Name or PIN');
          setIsLoading(false);
      }
    }, 800);
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!resetEmail.trim() || !resetEmail.includes('@')) {
        setError('Please enter a valid email address');
        return;
    }

    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
        setIsLoading(false);
        setResetSent(true);
    }, 1200);
  };

  const handleBackToLogin = () => {
    setView('login');
    setResetSent(false);
    setResetEmail('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 w-full max-w-md overflow-hidden transition-all duration-300">
        {/* Header - Updated to Grey */}
        <div className="bg-gray-800 p-8 text-center">
            {/* Logo - Updated with Red Circle */}
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg mx-auto border-4 border-red-600">
                <Flame className="w-10 h-10 text-red-600" fill="currentColor" />
            </div>
            <h1 className="text-xl font-bold text-white mb-1">D&M Fire and Safety Equipment</h1>
            <p className="text-gray-300 text-sm font-medium">Technician Portal</p>
        </div>

        {/* Content Area */}
        <div className="p-8">
            {view === 'login' ? (
                <>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center">Technician Sign In</h2>
                    
                    <form onSubmit={handleLoginSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    placeholder="John"
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-safety-500 outline-none transition-shadow dark:bg-gray-700 dark:text-white"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password / PIN</label>
                                <button 
                                    type="button"
                                    onClick={() => setView('forgot-password')}
                                    className="text-xs text-red-600 hover:text-red-700 font-medium"
                                >
                                    Forgot Password?
                                </button>
                            </div>
                            <div className="relative flex gap-2">
                                <div className="relative flex-1">
                                    <Lock className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••"
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-safety-500 outline-none transition-shadow dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                                {showBiometricBtn && (
                                    <button 
                                        type="button" 
                                        onClick={handleBiometricLogin}
                                        className="bg-purple-100 hover:bg-purple-200 text-purple-700 p-2 rounded-lg border border-purple-200 transition-colors"
                                        title="Login with Biometrics"
                                    >
                                        <Fingerprint className="w-6 h-6" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {error && (
                            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg flex items-center animate-fadeIn">
                                <span className="w-1.5 h-1.5 bg-red-600 rounded-full mr-2"></span>
                                {error}
                            </div>
                        )}

                        <Button 
                            type="submit" 
                            className="w-full justify-center py-3" 
                            size="lg"
                            isLoading={isLoading}
                        >
                            Sign In
                        </Button>
                    </form>
                    
                    <p className="mt-6 text-center text-xs text-gray-400">
                        Protected System. Authorized Personnel Only.
                    </p>
                </>
            ) : (
                // Forgot Password View
                <div className="animate-fadeIn">
                    <button 
                        onClick={handleBackToLogin}
                        className="flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-6 text-sm transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Back to Sign In
                    </button>

                    {resetSent ? (
                        <div className="text-center py-4">
                            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle className="w-8 h-8 text-green-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Check your email</h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
                                We have sent password reset instructions to <strong>{resetEmail}</strong>.
                            </p>
                            <Button 
                                onClick={handleBackToLogin}
                                className="w-full justify-center"
                                variant="secondary"
                            >
                                Return to Login
                            </Button>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Reset Password</h2>
                            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
                                Enter your email address and we'll send you instructions to reset your password.
                            </p>
                            
                            <form onSubmit={handleResetSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                                        <input
                                            type="email"
                                            value={resetEmail}
                                            onChange={(e) => setResetEmail(e.target.value)}
                                            placeholder="tech@example.com"
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-safety-500 outline-none transition-shadow dark:bg-gray-700 dark:text-white"
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg flex items-center animate-fadeIn">
                                        <span className="w-1.5 h-1.5 bg-red-600 rounded-full mr-2"></span>
                                        {error}
                                    </div>
                                )}

                                <Button 
                                    type="submit" 
                                    className="w-full justify-center py-3" 
                                    size="lg"
                                    isLoading={isLoading}
                                >
                                    Send Reset Link
                                </Button>
                            </form>
                        </>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};