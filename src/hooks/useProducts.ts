// Live Firestore subscription for a branch's products, at the required path:
// /pharmacy/{pharmacyId}/branches/{branchId}/products
// No localStorage cache — the app is 100% online, so this hook is the single
// source of truth for product data (rule 1 & 4: no local persistence).
import { useState, useEffect } from 'react';
import { onSnapshot, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { productsCollectionRef, productDocRef, isValidBranchId } from '../lib/pharmacyConfig';
import { cleanFirestoreData } from '../lib/firebaseSync';

export function useProducts(branchId: string) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Refuse to subscribe to anything outside the 3 fixed branches.
    if (!branchId || !isValidBranchId(branchId)) {
      setProducts([]);
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(
      productsCollectionRef(branchId),
      (snapshot) => {
        setProducts(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (error) => {
        console.error('[useProducts] Firestore snapshot error:', error);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [branchId]);

  const addProduct = (data: any) => addDoc(productsCollectionRef(branchId), cleanFirestoreData(data));
  const updateProduct = (id: string, data: any) => updateDoc(productDocRef(branchId, id), cleanFirestoreData(data));
  const deleteProduct = (id: string) => deleteDoc(productDocRef(branchId, id));

  return { products, loading, addProduct, updateProduct, deleteProduct };
}
