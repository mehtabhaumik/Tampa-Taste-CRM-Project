import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Mail, 
  Phone, 
  Key, 
  ChevronRight, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  Apple,
  Globe,
  Info
} from 'lucide-react';
import { 
  auth, 
  db, 
  appleProvider,
  microsoftProvider,
  signInAnonymously,
  signInWithPopup, 
  handleFirestoreError, 
  OperationType
} from '../firebase';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult 
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from '../utils';
import { useFirebase } from '../App';

interface StaffLoginProps {
  onLoginSuccess: (roles: string[], employeeCode: string, firstName: string, lastName: string) => void;
  onShowDevInfo?: () => void;
  onBack?: () => void;
}

export default function StaffLogin({ onLoginSuccess, onShowDevInfo, onBack }: StaffLoginProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employeeCode, setEmployeeCode] = useState('');
  const { user, profile } = useFirebase();

  useEffect(() => {
    if (user && profile && profile.roles && profile.roles.some(r => ['Admin', 'Manager', 'Chef', 'Waiter', 'Accountant'].includes(r))) {
      onLoginSuccess(profile.roles, profile.employeeCode || '', profile.firstName || '', profile.lastName || '');
    }
  }, [user, profile, onLoginSuccess]);

  const handleCodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const trimmedCode = employeeCode.trim();
    if (!trimmedCode) {
      setError('Please enter your employee code.');
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch employee data using the code
      let empDoc;
      try {
        empDoc = await getDoc(doc(db, 'employees', trimmedCode));
      } catch (err: any) {
        handleFirestoreError(err, OperationType.GET, `employees/${trimmedCode}`);
        throw err;
      }

      if (empDoc.exists()) {
        const employee = empDoc.data();
        
        // Check if account is active
        if (employee.active === false) {
          setError('Your account is inactive. Please contact your manager.');
          setLoading(false);
          return;
        }

        const allowedRoles = ['Admin', 'Manager', 'Chef', 'Waiter', 'Accountant'];
        const roles = Array.isArray(employee.roles) ? employee.roles : [];
        const hasStaffRole = roles.some((role: string) => allowedRoles.includes(role));
        
        if (hasStaffRole) {
          // 2. Ensure user is authenticated with Firebase Auth
          let currentUser = auth.currentUser;
          if (!currentUser) {
            try {
              const userCredential = await signInAnonymously(auth);
              currentUser = userCredential.user;
            } catch (authErr: any) {
              console.error('Auth Error:', authErr);
              if (authErr.code === 'auth/admin-restricted-operation') {
                setError('Anonymous authentication is disabled in Firebase. Please enable it in the Firebase Console (Authentication > Sign-in method).');
              } else {
                setError(`Authentication failed: ${authErr.message}`);
              }
              setLoading(false);
              return;
            }
          }

          // 3. Update the user profile with the employee code and roles
          if (currentUser) {
            try {
              await setDoc(doc(db, 'users', currentUser.uid), {
                uid: currentUser.uid,
                email: currentUser.email || 'staff@tampataste.com',
                roles: roles,
                employeeCode: trimmedCode,
                displayName: employee.name || 'Staff',
                firstName: employee.firstName || '',
                lastName: employee.lastName || '',
                lastLoggedIn: serverTimestamp()
              }, { merge: true });
              
              // Add a small delay to ensure the users document is available for the next update
              await new Promise(resolve => setTimeout(resolve, 1000));

              // 4. Update the employee record with the last login timestamp
              await setDoc(doc(db, 'employees', trimmedCode), {
                lastLoggedIn: serverTimestamp()
              }, { merge: true });
              
              // Add a larger delay to ensure Firestore propagation before navigating
              // This helps prevent "Missing or insufficient permissions" errors on the dashboard
              await new Promise(resolve => setTimeout(resolve, 4000));
            } catch (userErr: any) {
              handleFirestoreError(userErr, OperationType.WRITE, `users/${currentUser.uid}`);
              throw userErr;
            }
          }

          onLoginSuccess(roles, trimmedCode, employee.firstName || '', employee.lastName || '');
        } else {
          setError('Access denied. Insufficient permissions.');
        }
      } else {
        setError('Invalid employee code.');
      }
    } catch (err: any) {
      console.error('Login Error:', err);
      if (!error) setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="relative z-10">
        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3 text-sm font-medium"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </motion.div>
        )}

        <div className="space-y-6">
          <div className="p-4 bg-brand-100 rounded-2xl border border-brand-200">
            <p className="text-xs text-brand-950 font-semibold leading-relaxed">
              Please enter your unique 4-digit employee code to access the staff dashboard.
            </p>
          </div>

          <form onSubmit={handleCodeLogin} className="space-y-4">
            <div className="relative">
              <Key className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="password"
                required
                placeholder="Enter Employee Code"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                className="w-full p-5 pl-14 bg-white rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand-500 text-lg font-bold tracking-widest text-center text-slate-900 placeholder:text-slate-400"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full p-5 bg-brand-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-brand-800 transition-all disabled:opacity-50 shadow-xl shadow-brand-900/20"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>Login to Dashboard <ChevronRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {onShowDevInfo && (
            <button
              onClick={onShowDevInfo}
              className="w-full p-4 bg-brand-50 text-brand-900 rounded-2xl border border-brand-100 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest hover:bg-brand-100 transition-all"
            >
              <Info className="w-4 h-4" />
              How to use this CRM?
            </button>
          )}
        </div>

        {onBack && (
          <button
            onClick={onBack}
            className="mt-8 w-full text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
          >
            ← Back
          </button>
        )}
      </div>
    </div>
  );
}
