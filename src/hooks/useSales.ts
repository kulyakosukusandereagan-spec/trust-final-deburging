import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

export function useSales(shopId: string) {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!shopId) return;
    const q = query(collection(db, 'shops', shopId, 'sales'));
    const unsub = onSnapshot(q, (snapshot) => {
      setSales(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
      console.error("[useSales] Firestore snapshot error:", error);
      setLoading(false);
    });
    return () => unsub();
  }, [shopId]);

  const addSale = (data: any) => addDoc(collection(db, 'shops', shopId, 'sales'), {
    ...data,
    createdAt: new Date().toISOString()
  });
  const updateSale = (id: string, data: any) => updateDoc(doc(db, 'shops', shopId, 'sales', id), data);
  const deleteSale = (id: string) => deleteDoc(doc(db, 'shops', shopId, 'sales', id));

  return { sales, loading, addSale, updateSale, deleteSale };
}
