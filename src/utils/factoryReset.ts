/**
 * Comprehensive system factory reset utility.
 * Clears backend in-memory state, all localStorage keys, sessionStorage,
 * indexedDB database instances/indexes, service worker caches, cookies,
 * and global application context state, followed by dispatching reset events
 * and performing a hard page reload.
 */

import { wipeAndResetFirestoreDatabase, SYSTEM_RESET_EPOCH } from '../lib/firebaseSync';

function deleteIDBDatabase(dbName: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      if (typeof window === 'undefined' || !window.indexedDB) {
        resolve();
        return;
      }
      const request = window.indexedDB.deleteDatabase(dbName);
      const timeout = setTimeout(() => resolve(), 600);
      request.onsuccess = () => {
        clearTimeout(timeout);
        resolve();
      };
      request.onerror = () => {
        clearTimeout(timeout);
        resolve();
      };
      request.onblocked = () => {
        clearTimeout(timeout);
        resolve();
      };
    } catch (e) {
      resolve();
    }
  });
}

export async function performComprehensiveFactoryReset(): Promise<void> {
  try {
    console.log("Initiating comprehensive system factory reset...");

    // 0. Wipe Firestore Cloud database and re-seed clean baseline
    try {
      await wipeAndResetFirestoreDatabase();
    } catch (e) {
      console.warn("Notice wiping Firestore database during reset:", e);
    }

    // 1. Notify backend service to purge server-side in-memory catalogs, inventory, and transactions
    try {
      await fetch('/api/v1/system/reset', { method: 'POST' });
    } catch (err) {
      console.warn("Backend reset endpoint notice:", err);
    }

    // 2. Invoke registered global application context state reset handlers
    if (typeof window !== 'undefined') {
      try {
        if (typeof (window as any).__performGlobalStateReset === 'function') {
          (window as any).__performGlobalStateReset();
        }
      } catch (e) {
        console.warn("Global application context reset warning:", e);
      }
    }

    // 3. Known storage keys to explicitly target for clearance
    const knownStorageKeys = [
      'trust_pharmacy_tenants',
      'trust_pharmacy_logo',
      'trust_pharmacy_contact',
      'trust_pharmacy_exchange_rate',
      'trust_pharmacy_pos_cart',
      'trust_pharmacy_inventory_batches',
      'junub_inventory_master_backup',
      'trust_pharmacy_sales',
      'junub_offline_sales',
      'trust_pharmacy_customers',
      'trust_pharmacy_prescriptions',
      'trust_pharmacy_branches',
      'trust_pharmacy_staff',
      'trust_pharmacy_settings',
      'juba_audit_logs',
      'trust_pharmacy_audit_logs',
      'junub_app_theme',
      'junub_app_currency',
      'junub_expenditures',
      'trust_pharmacy_expenditures',
      'firebaseLocalStorageDb'
    ];

    // 4. Iterate through and delete all keys in localStorage explicitly
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const localKeys: string[] = [...knownStorageKeys];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && !localKeys.includes(key)) localKeys.push(key);
        }
        Object.keys(localStorage).forEach((k) => {
          if (!localKeys.includes(k)) localKeys.push(k);
        });

        localKeys.forEach((key) => {
          try {
            localStorage.removeItem(key);
          } catch (e) {
            // ignore item error
          }
        });

        // Set explicit cleared flags so re-fetches don't bring back cached state
        localStorage.setItem('junub_inventory_cleared_shared-global-tenant-v1', 'true');
        localStorage.clear();
      } catch (e) {
        console.warn("localStorage wipe warning:", e);
      }
    }

    // 5. Iterate through and delete all keys in sessionStorage explicitly
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        const sessionKeys: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key) sessionKeys.push(key);
        }
        Object.keys(sessionStorage).forEach((k) => {
          if (!sessionKeys.includes(k)) sessionKeys.push(k);
        });

        sessionKeys.forEach((key) => {
          try {
            sessionStorage.removeItem(key);
          } catch (e) {
            // ignore item error
          }
        });

        sessionStorage.clear();
      } catch (e) {
        console.warn("sessionStorage wipe warning:", e);
      }
    }

    // 6. Purge IndexedDB databases and indexes cleanly
    if (typeof window !== 'undefined' && window.indexedDB) {
      const knownDbs = [
        'trust_pharmacy_db',
        'junub_pharmacy_db',
        'junub_db',
        'juba_db',
        'pharmacy_pos_db',
        'firebaseLocalStorageDb',
        'firestore/[DEFAULT]/ai-studio-junubpharmacare-2e9fb2eb-8725-4108-9132-6f2404aa2232',
        'keyval-store',
        'workbox-expiration',
        'leveldb',
        'localforage',
        'idb-database',
        'firebase-auth-database',
        'firestore-db'
      ];

      try {
        if (typeof window.indexedDB.databases === 'function') {
          const dbs = await window.indexedDB.databases();
          await Promise.all(
            dbs.map((db) => (db.name ? deleteIDBDatabase(db.name) : Promise.resolve()))
          );
        }
      } catch (e) {
        console.warn("IndexedDB.databases enumeration warning:", e);
      }

      // Explicitly delete known database names as fallback
      await Promise.all(knownDbs.map((dbName) => deleteIDBDatabase(dbName)));
    }

    // 7. Purge CacheStorage if available
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      } catch (e) {
        console.warn("CacheStorage wipe warning:", e);
      }
    }

    // 8. Unregister Service Workers if present
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((r) => r.unregister().catch(() => false)));
      } catch (e) {
        console.warn("ServiceWorker unregistration warning:", e);
      }
    }

    // 9. Clear document cookies
    if (typeof document !== 'undefined' && document.cookie) {
      try {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i];
          const eqPos = cookie.indexOf('=');
          const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
          if (typeof window !== 'undefined') {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
          }
        }
      } catch (e) {
        console.warn("Cookie wipe warning:", e);
      }
    }

    // 10. Set factory reset marker in localStorage & dispatch custom reset events
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('trust_pharmacy_factory_reset', 'true');
        localStorage.setItem('junub_app_reset_epoch', SYSTEM_RESET_EPOCH);
        localStorage.setItem('junub_expenditures', JSON.stringify([]));
      }
    } catch (e) {
      // ignore
    }

    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('junub_system_reset'));
        window.dispatchEvent(new CustomEvent('system_factory_reset'));
        window.dispatchEvent(new CustomEvent('juba_audit_log_added'));
        window.dispatchEvent(new CustomEvent('trust_pharmacy_reset_complete'));
        window.dispatchEvent(new Event('storage'));
      } catch (e) {
        // ignore
      }
    }
  } catch (error) {
    console.error("Critical error during comprehensive factory reset:", error);
  } finally {
    // 11. Perform a hard page reload to purge memory state
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        window.location.reload();
      }, 250);
    }
  }
}

