// Single-tenant auth context. There is no more "shop code" concept — every
// signed-in user belongs to the one pharmacy (PHARMACY_ID). The old
// multi-tenant "enter shop code" modal has been removed entirely.
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { getDoc, setDoc } from 'firebase/firestore';
import { auth } from '../lib/firebase';
import { PHARMACY_ID, PHARMACY_NAME, userDocRef } from '../lib/pharmacyConfig';

export interface AuthContextType {
  currentUser: FirebaseUser | null;
  userDoc: any;
  pharmacyId: string;
  pharmacyName: string;
  loading: boolean;
  isOnline: boolean;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userDoc: null,
  pharmacyId: PHARMACY_ID,
  pharmacyName: PHARMACY_NAME,
  loading: true,
  isOnline: true,
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userDoc, setUserDoc] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Network listener — app must require internet (rule 4); this only drives
  // the status banner, nothing is cached locally while offline.
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auth listener & user doc loader — scoped under the single pharmacy doc.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userRef = userDocRef(user.uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            setUserDoc(snap.data());
          } else {
            const newDoc = {
              email: user.email || '',
              pharmacyId: PHARMACY_ID,
              updatedAt: new Date().toISOString(),
            };
            await setDoc(userRef, newDoc, { merge: true });
            setUserDoc(newDoc);
          }
        } catch (err) {
          console.warn('[AuthContext] Notice loading user document:', err);
        }
      } else {
        setUserDoc(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userDoc,
        pharmacyId: PHARMACY_ID,
        pharmacyName: PHARMACY_NAME,
        loading,
        isOnline,
        logout,
      }}
    >
      {!isOnline ? (
        <div className="bg-red-600 text-white px-4 py-2 text-center text-sm font-semibold flex items-center justify-center gap-2 sticky top-0 z-[9999] shadow-md animate-pulse">
          <span className="h-2.5 w-2.5 rounded-full bg-white inline-block"></span>
          NO INTERNET - App paused. Internet connection required for live operations.
        </div>
      ) : (
        <div className="bg-emerald-800 text-emerald-100 px-4 py-1.5 text-center text-xs font-medium flex items-center justify-center gap-2 sticky top-0 z-[9999] border-b border-emerald-700 shadow-xs">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping inline-block"></span>
          Connected: <span className="font-bold text-white bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-600/40">{PHARMACY_NAME}</span> | STRICTLY ONLINE
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
}
