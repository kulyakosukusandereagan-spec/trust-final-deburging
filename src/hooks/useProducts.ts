import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

export function useProducts(shopId: string) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!shopId) return;
    const q = query(collection(db, 'shops', shopId, 'products'));
    const unsub = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
      console.error("[useProducts] Firestore snapshot error:", error);
      setLoading(false);
    });
    return () => unsub();
  }, [shopId]);

  const addProduct = (data: any) => addDoc(collection(db, 'shops', shopId, 'products'), data);
  const updateProduct = (id: string, data: any) => updateDoc(doc(db, 'shops', shopId, 'products', id), data);
  const deleteProduct = (id: string) => deleteDoc(doc(db, 'shops', shopId, 'products', id));

  return { products, loading, addProduct, updateProduct, deleteProduct };
}
