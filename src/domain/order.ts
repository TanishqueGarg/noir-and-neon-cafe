export interface CatalogRow { id: string; name: string; price: number; active: boolean; available: boolean }
export interface RequestedRow { menuItemId: string; quantity: number }

export function priceOrder(items: RequestedRow[], catalog: CatalogRow[]) {
  const byId = new Map(catalog.map((item) => [item.id, item]));
  const rows = items.map((requested) => {
    const item = byId.get(requested.menuItemId);
    if (!item || !item.active || !item.available) throw new Error(`UNAVAILABLE_ITEM:${requested.menuItemId}`);
    return { menuItemId: item.id, name: item.name, quantity: requested.quantity, unitPrice: item.price, lineTotal: item.price * requested.quantity };
  });
  return { rows, subtotal: rows.reduce((sum, row) => sum + row.lineTotal, 0) };
}

export function pickupDate(preference: string, leadMinutes: number, now = new Date()) {
  const requested = preference === "ASAP" ? leadMinutes : Number(preference);
  if (!Number.isInteger(requested) || requested < leadMinutes || requested > 180) throw new Error("INVALID_PICKUP_TIME");
  return new Date(now.getTime() + requested * 60_000);
}
