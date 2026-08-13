// Unified Financial Calculations & Inventory Helpers
// Ensures 100% mathematical consistency across POS, Dashboard, Reports, and Inventory.

export const getTransactionTotal = (tx: any): number => {
  if (!tx) return 0;
  if (typeof tx.totalAmount === 'number' && !isNaN(tx.totalAmount) && tx.totalAmount > 0) return tx.totalAmount;
  if (typeof tx.total === 'number' && !isNaN(tx.total) && tx.total > 0) return tx.total;
  if (typeof tx.totalUSD === 'number' && !isNaN(tx.totalUSD) && tx.totalUSD > 0) return tx.totalUSD;
  if (typeof tx.amount === 'number' && !isNaN(tx.amount) && tx.amount > 0) return tx.amount;
  if (typeof tx.grandTotal === 'number' && !isNaN(tx.grandTotal) && tx.grandTotal > 0) return tx.grandTotal;
  
  const sub = typeof tx.subtotal === 'number' ? tx.subtotal : (Number(tx.subtotal) || 0);
  const disc = typeof tx.discount === 'number' ? tx.discount : (typeof tx.discountAmount === 'number' ? (Number(tx.discountAmount) || 0) : 0);
  const tax = typeof tx.tax === 'number' ? tx.tax : (typeof tx.taxAmount === 'number' ? (Number(tx.taxAmount) || 0) : 0);
  
  return Math.max(0, sub - disc + tax);
};

export const getTransactionCost = (tx: any): number => {
  if (!tx) return 0;
  if (Array.isArray(tx.items) && tx.items.length > 0) {
    return tx.items.reduce((sum: number, i: any) => {
      const qty = Number(i.quantity || i.qtySold) || 1;
      const unitCost = Number(i.cost || i.unitCost) || (Number(i.price || i.unitPrice || 0) * 0.7);
      return sum + (unitCost * qty);
    }, 0);
  }
  const total = getTransactionTotal(tx);
  return total * 0.7; // Standard 30% margin fallback
};

export const getTransactionProfit = (tx: any): number => {
  const total = getTransactionTotal(tx);
  const cost = getTransactionCost(tx);
  return Math.max(0, total - cost);
};

export const isBatchDeleted = (batch: any, deletedIds: string[]): boolean => {
  if (!batch || !Array.isArray(deletedIds) || deletedIds.length === 0) return false;
  const bId = String(batch.id || '');
  const dId = String(batch.drugId || '');
  const name = String(batch.name || '');
  const sku = String(batch.sku || '');

  return (
    (bId && deletedIds.includes(bId)) ||
    (dId && deletedIds.includes(dId)) ||
    (name && deletedIds.includes(name)) ||
    (sku && deletedIds.includes(sku))
  );
};
