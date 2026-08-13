import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

export interface AuthContextType {
  currentUser: FirebaseUser | null;
  userDoc: any;
  shopId: string;
  loading: boolean;
  isOnline: boolean;
  setShopId: (newShopId: string) => Promise<void>;
  logout: () => Promise<void>;
  showShopModal: boolean;
  setShowShopModal: (show: boolean) => void;
}

export const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userDoc: null,
  shopId: 'junub-main-001',
  loading: true,
  isOnline: true,
  setShopId: async () => {},
  logout: async () => {},
  showShopModal: false,
  setShowShopModal: () => {}
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userDoc, setUserDoc] = useState<any>(null);
  const [shopId, setShopIdState] = useState<string>('junub-main-001');
  const [loading, setLoading] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [showShopModal, setShowShopModal] = useState<boolean>(false);
  const [inputShopCode, setInputShopCode] = useState<string>('junub-main-001');

  // Network listener
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

  // Auth Listener & User Doc Loader
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userRef);
          if (snap.exists() && snap.data().shopId) {
            const sid = snap.data().shopId;
            setShopIdState(sid);
            setUserDoc(snap.data());
            setShowShopModal(false);
          } else {
            // User doc missing shopId -> prompt modal or set default
            setShowShopModal(true);
            const defaultSid = 'junub-main-001';
            setShopIdState(defaultSid);
            await setDoc(userRef, {
              email: user.email || '',
              shopId: defaultSid,
              updatedAt: new Date().toISOString()
            }, { merge: true });
            setUserDoc({ email: user.email || '', shopId: defaultSid });
          }
        } catch (err) {
          console.warn("[AuthContext] Notice loading user document:", err);
          setShopIdState('junub-main-001');
        }
      } else {
        setUserDoc(null);
        setShopIdState('junub-main-001');
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const setShopId = async (newShopId: string) => {
    const cleanId = (newShopId || 'junub-main-001').trim();
    setShopIdState(cleanId);
    if (currentUser) {
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        await setDoc(userRef, { shopId: cleanId, updatedAt: new Date().toISOString() }, { merge: true });
        setUserDoc((prev: any) => ({ ...prev, shopId: cleanId }));
      } catch (err) {
        console.error("[AuthContext] Error updating shopId:", err);
      }
    }
    setShowShopModal(false);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputShopCode) {
      await setShopId(inputShopCode);
    }
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      userDoc,
      shopId,
      loading,
      isOnline,
      setShopId,
      logout,
      showShopModal,
      setShowShopModal
    }}>
      {/* Online/Offline Status Banner at top */}
      {!isOnline ? (
        <div className="bg-red-600 text-white px-4 py-2 text-center text-sm font-semibold flex items-center justify-center gap-2 sticky top-0 z-[9999] shadow-md animate-pulse">
          <span className="h-2.5 w-2.5 rounded-full bg-white inline-block"></span>
          NO INTERNET - App paused. Internet connection required for live operations.
        </div>
      ) : (
        <div className="bg-emerald-800 text-emerald-100 px-4 py-1.5 text-center text-xs font-medium flex items-center justify-center gap-2 sticky top-0 z-[9999] border-b border-emerald-700 shadow-xs">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping inline-block"></span>
          Connected to shop: <span className="font-bold text-white bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-600/40">{shopId}</span> | STRICTLY ONLINE
        </div>
      )}

      {/* Enter Shop Code Modal */}
      {showShopModal && currentUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[99999] p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 text-slate-100 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Enter Shop Code</h3>
            <p className="text-sm text-slate-400 mb-4">
              All data (inventory, sales, POS) will be strictly synced live to this shop in Firestore.
            </p>
            <form onSubmit={handleModalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Shop ID / Code
                </label>
                <input
                  type="text"
                  required
                  value={inputShopCode}
                  onChange={(e) => setInputShopCode(e.target.value)}
                  placeholder="e.g. junub-main-001"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:border-sky-500 font-mono"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShopId('junub-main-001')}
                  className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Use Default (junub-main-001)
                </button>
                <button
                  type="submit"
                  className="bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors"
                >
                  Save & Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {children}
    </AuthContext.Provider>
  );
}
