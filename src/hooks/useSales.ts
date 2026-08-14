// Live Firestore subscription for a branch's sales, nested under the same
// single-pharmacy / fixed-branch path convention as products. No localStorage
// cache (rule 1 & 4: no local persistence, internet required).
import { useState, useEffect } from 'react';
import { onSnapshot, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { salesCollectionRef, saleDocRef, isValidBranchId } from '../lib/pharmacyConfig';
import { cleanFirestoreData } from '../lib/firebaseSync';

export function useSales(branchId: string) {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!branchId || !isValidBranchId(branchId)) {
      setSales([]);
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(
      salesCollectionRef(branchId),
      (snapshot) => {
        setSales(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (error) => {
        console.error('[useSales] Firestore snapshot error:', error);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [branchId]);

  const addSale = (data: any) =>
    addDoc(salesCollectionRef(branchId), cleanFirestoreData({ ...data, createdAt: new Date().toISOString() }));
  const updateSale = (id: string, data: any) => updateDoc(saleDocRef(branchId, id), cleanFirestoreData(data));
  const deleteSale = (id: string) => deleteDoc(saleDocRef(branchId, id));

  return { sales, loading, addSale, updateSale, deleteSale };
}
