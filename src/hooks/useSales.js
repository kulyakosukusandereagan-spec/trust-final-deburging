import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';

export function useSales(shopId) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const addSale = (data) => addDoc(collection(db, 'shops', shopId, 'sales'), {
    ...data,
    createdAt: new Date().toISOString()
  });
  const updateSale = (id, data) => updateDoc(doc(db, 'shops', shopId, 'sales', id), data);
  const deleteSale = (id) => deleteDoc(doc(db, 'shops', shopId, 'sales', id));

  return { sales, loading, addSale, updateSale, deleteSale };
}
