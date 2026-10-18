import { useSyncExternalStore } from "react";

export type CartLine = {
  productId: string;
  name: string;
  price: number;
  image: string | null;
  storeId: string | null;
  storeName: string | null;
  sellerId: string | null;
  quantity: number;
};

const STORAGE_KEY = "aks.cart.v1";

function isLine(value: unknown): value is CartLine {
  if (!value || typeof value !== "object") return false;
  const line = value as Record<string, unknown>;
  return (
    typeof line["productId"] === "string" &&
    typeof line["name"] === "string" &&
    typeof line["price"] === "number" &&
    typeof line["quantity"] === "number"
  );
}

function read(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isLine) : [];
  } catch {
    return [];
  }
}

let lines: CartLine[] = read();
const listeners = new Set<() => void>();

function commit(next: CartLine[]) {
  lines = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* stockage local indisponible : le panier reste en mémoire */
    }
  }
  for (const listener of listeners) listener();
}

export function subscribeCart(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getCartLines(): CartLine[] {
  return lines;
}

const EMPTY: CartLine[] = [];
export function getServerCartLines(): CartLine[] {
  return EMPTY;
}

export function addToCart(line: Omit<CartLine, "quantity">, quantity = 1) {
  const existing = lines.find((l) => l.productId === line.productId);
  if (existing) {
    commit(
      lines.map((l) =>
        l.productId === line.productId ? { ...l, quantity: l.quantity + quantity } : l,
      ),
    );
    return;
  }
  commit([...lines, { ...line, quantity }]);
}

export function setCartQuantity(productId: string, quantity: number) {
  if (quantity <= 0) {
    removeFromCart(productId);
    return;
  }
  commit(lines.map((l) => (l.productId === productId ? { ...l, quantity } : l)));
}

export function removeFromCart(productId: string) {
  commit(lines.filter((l) => l.productId !== productId));
}

export function clearCart() {
  commit([]);
}

export function cartCount(items: CartLine[]): number {
  return items.reduce((total, line) => total + line.quantity, 0);
}

export function cartTotal(items: CartLine[]): number {
  return items.reduce((total, line) => total + line.quantity * line.price, 0);
}

export function useCart() {
  const items = useSyncExternalStore(subscribeCart, getCartLines, getServerCartLines);
  return {
    items,
    count: cartCount(items),
    total: cartTotal(items),
    add: addToCart,
    setQuantity: setCartQuantity,
    remove: removeFromCart,
    clear: clearCart,
  };
}
