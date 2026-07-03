import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Role = "admin" | "outlet";
export type User = { email: string; role: Role; branch: string; label: string };

export const BRANCHES = ["branch_1", "branch_2", "branch_3"] as const;

export type BranchSettings = {
  label: string;
  password: string;
};

export const DEFAULT_BRANCH_SETTINGS: Record<string, BranchSettings> = {
  branch_1: { label: "Anna Nagar", password: "branch123" },
  branch_2: { label: "T. Nagar", password: "branch123" },
  branch_3: { label: "Velachery", password: "branch123" },
};
export const DEFAULT_ADMIN_PASSWORD = "admin123";

// Live lookup helper used everywhere a label is rendered.
export const BRANCH_LABELS: Record<string, string> = new Proxy(
  { all: "All Branches" } as Record<string, string>,
  {
    get(target, prop: string) {
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("pos:branchSettings");
          if (raw) {
            const s = JSON.parse(raw) as Record<string, BranchSettings>;
            if (s[prop]?.label) return s[prop].label;
          }
        } catch {}
      }
      return target[prop] ?? DEFAULT_BRANCH_SETTINGS[prop]?.label ?? prop;
    },
  }
);

export type Category = { id: string; name: string };
export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  inStock: boolean;
  stock: Record<string, number>;
};

export type SaleItem = {
  productId: string;
  name: string;
  price: number;
  qty: number;
  isCustomCake?: boolean;
  customNote?: string;
};
export type Sale = {
  id: string;
  branch: string;
  cashier: string;
  items: SaleItem[];
  subtotal: number;
  tax: number;
  total: number;
  at: string;
};

const SEED_CATEGORIES: Category[] = [
  { id: "sweets", name: "Sweets" },
  { id: "savouries", name: "Savouries" },
  { id: "cakes", name: "Cakes" },
  { id: "drinks", name: "Drinks" },
];

const mkStock = (a: number, b: number, c: number) => ({ branch_1: a, branch_2: b, branch_3: c });

const SEED_PRODUCTS: Product[] = [
  { id: "p1", name: "Kaju Katli", category: "sweets", price: 80, inStock: true, stock: mkStock(40, 25, 30) },
  { id: "p2", name: "Mysore Pak", category: "sweets", price: 45, inStock: true, stock: mkStock(50, 20, 35) },
  { id: "p3", name: "Ghee Ladoo", category: "sweets", price: 35, inStock: true, stock: mkStock(60, 40, 50) },
  { id: "p4", name: "Badam Halwa", category: "sweets", price: 120, inStock: true, stock: mkStock(15, 10, 12) },
  { id: "p5", name: "Murukku", category: "savouries", price: 25, inStock: true, stock: mkStock(80, 60, 70) },
  { id: "p6", name: "Mixture", category: "savouries", price: 30, inStock: true, stock: mkStock(70, 50, 65) },
  { id: "p7", name: "Thattai", category: "savouries", price: 20, inStock: false, stock: mkStock(0, 40, 55) },
  { id: "p8", name: "Black Forest Cake", category: "cakes", price: 650, inStock: true, stock: mkStock(5, 3, 4) },
  { id: "p9", name: "Vanilla Pastry", category: "cakes", price: 60, inStock: true, stock: mkStock(20, 15, 18) },
  { id: "p10", name: "Chocolate Truffle", category: "cakes", price: 75, inStock: true, stock: mkStock(25, 20, 22) },
  { id: "p11", name: "Filter Coffee", category: "drinks", price: 30, inStock: true, stock: mkStock(100, 100, 100) },
  { id: "p12", name: "Masala Chai", category: "drinks", price: 20, inStock: true, stock: mkStock(100, 100, 100) },
];

type Store = {
  user: User | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  categories: Category[];
  setCategories: (c: Category[]) => void;
  products: Product[];
  setProducts: (p: Product[]) => void;
  sales: Sale[];
  recordSale: (s: Omit<Sale, "id" | "at">) => void;
  branchSettings: Record<string, BranchSettings>;
  setBranchSettings: (s: Record<string, BranchSettings>) => void;
  adminPassword: string;
  setAdminPassword: (p: string) => void;
};

const Ctx = createContext<Store | null>(null);

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

// Migrate seeded products that may lack inStock (older localStorage payloads)
function normalizeProducts(list: Product[]): Product[] {
  return list.map((p) => ({ ...p, inStock: p.inStock ?? true }));
}

export function PosProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [categories, setCategoriesState] = useState<Category[]>(SEED_CATEGORIES);
  const [products, setProductsState] = useState<Product[]>(SEED_PRODUCTS);
  const [sales, setSales] = useState<Sale[]>([]);
  const [branchSettings, setBranchSettingsState] = useState<Record<string, BranchSettings>>(DEFAULT_BRANCH_SETTINGS);
  const [adminPassword, setAdminPasswordState] = useState<string>(DEFAULT_ADMIN_PASSWORD);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setUser(load<User | null>("pos:user", null));
    setCategoriesState(load("pos:categories", SEED_CATEGORIES));
    setProductsState(normalizeProducts(load("pos:products", SEED_PRODUCTS)));
    setSales(load<Sale[]>("pos:sales", []));
    setBranchSettingsState(load("pos:branchSettings", DEFAULT_BRANCH_SETTINGS));
    setAdminPasswordState(load("pos:adminPassword", DEFAULT_ADMIN_PASSWORD));
    setHydrated(true);
  }, []);

  useEffect(() => { if (hydrated) save("pos:user", user); }, [user, hydrated]);
  useEffect(() => { if (hydrated) save("pos:categories", categories); }, [categories, hydrated]);
  useEffect(() => { if (hydrated) save("pos:products", products); }, [products, hydrated]);
  useEffect(() => { if (hydrated) save("pos:sales", sales); }, [sales, hydrated]);
  useEffect(() => { if (hydrated) save("pos:branchSettings", branchSettings); }, [branchSettings, hydrated]);
  useEffect(() => { if (hydrated) save("pos:adminPassword", adminPassword); }, [adminPassword, hydrated]);

  const login = (email: string, password: string) => {
    const key = email.toLowerCase().trim();
    if (key === "admin@bakery.com" && password === adminPassword) {
      setUser({ email: key, role: "admin", branch: "all", label: "Admin" });
      return true;
    }
    const match = key.match(/^branch([123])@bakery\.com$/);
    if (match) {
      const branch = `branch_${match[1]}`;
      const settings = branchSettings[branch];
      if (settings && settings.password === password) {
        setUser({ email: key, role: "outlet", branch, label: settings.label });
        return true;
      }
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("pos:user");
        sessionStorage.clear();
      } catch {}
      window.location.replace("/");
    }
  };

  const setCategories = (c: Category[]) => setCategoriesState(c);
  const setProducts = (p: Product[]) => setProductsState(p);
  const setBranchSettings = (s: Record<string, BranchSettings>) => setBranchSettingsState(s);
  const setAdminPassword = (p: string) => setAdminPasswordState(p);

  const recordSale = (s: Omit<Sale, "id" | "at">) => {
    const sale: Sale = { ...s, id: crypto.randomUUID(), at: new Date().toISOString() };
    setSales((prev) => [sale, ...prev]);
    setProductsState((prev) =>
      prev.map((p) => {
        const item = s.items.find((i) => i.productId === p.id && !i.isCustomCake);
        if (!item) return p;
        const next = { ...p.stock, [s.branch]: Math.max(0, (p.stock[s.branch] ?? 0) - item.qty) };
        return { ...p, stock: next };
      })
    );
  };

  return (
    <Ctx.Provider
      value={{
        user, login, logout,
        categories, setCategories,
        products, setProducts,
        sales, recordSale,
        branchSettings, setBranchSettings,
        adminPassword, setAdminPassword,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function usePos() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePos must be inside PosProvider");
  return ctx;
}

// ---------- Per-branch sequential KOT counter ----------
export function nextBillNo(branch: string): number {
  if (typeof window === "undefined") return 1;
  const key = `pos:billcounter:${branch}`;
  const curr = parseInt(localStorage.getItem(key) || "0", 10) || 0;
  const next = curr + 1;
  localStorage.setItem(key, String(next));
  return next;
}

// ---------- Receipt HTML (80mm thermal style) ----------
export function buildReceiptHtml(opts: {
  sale: Omit<Sale, "id" | "at">;
  outletLabel: string;
  cashier: string;
  billNo?: number;
}): string {
  const { sale, outletLabel, cashier, billNo } = opts;
  const now = new Date();
  const dt = now.toLocaleString("en-IN", { hour12: true });
  const rows = sale.items
    .map(
      (i) => `
      <tr>
        <td class="item-name">${escapeHtml(i.name)}${i.isCustomCake && i.customNote ? `<div style="font-size:11px;font-style:italic;font-weight:600;">${escapeHtml(i.customNote)}</div>` : ""}</td>
        <td class="item-qty">${i.qty}</td>
        <td class="item-amt">₹${(i.price * i.qty).toFixed(2)}</td>
      </tr>`
    )
    .join("");

  const totalQty = sale.items.reduce((s, i) => s + i.qty, 0);
  const grandTotal = sale.items.reduce((s, i) => s + i.price * i.qty, 0);

  return `<!doctype html><html><head><meta charset="utf-8"><title>Receipt</title>
<style>
  @media print { @page { size: 72mm auto; margin: 0; } }
  html, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; margin:0; padding:0; }
  * { color: #000 !important; border-color: #000 !important; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; color:#000; background:#fff; width: 72mm; max-width: 72mm; margin: 0; padding: 2mm; font-size: 13px; font-weight: 600; line-height: 1.35; overflow-x: hidden; word-wrap: break-word; box-sizing: border-box; }
  h1,h2,h3,p { margin: 0; font-family: Arial, sans-serif; }
  .center { text-align:center; }
  .row { display:flex; justify-content:space-between; font-weight: 700; }
  .hr { border-bottom: 1px solid #000 !important; margin: 5px 0; height: 0; }
  table { width:100%; table-layout: fixed; border-collapse: collapse; }
  th, td { word-wrap: break-word; overflow-wrap: break-word; word-break: break-word; }
  th { font-size:11px; text-align:left; border-bottom: 1px solid #000 !important; padding: 3px 1px; font-weight: 700; text-transform: uppercase; }
  td { padding: 3px 1px; border-bottom: 1px solid #000 !important; vertical-align: top; }
  col.c-name { width: 50%; }
  col.c-qty  { width: 20%; }
  col.c-rate { width: 30%; }
  .item-name { font-size: 13px; font-weight: 700; }
  .item-qty { font-size: 15px; font-weight: 800; text-align: center; }
  .item-amt { text-align: right; font-weight: 700; font-size: 13px; }
  .grand { font-weight: 800; font-size: 17px; }
  .store-name { text-align:center; font-size:17px; font-weight:800; letter-spacing:1px; text-transform: uppercase; margin-bottom: 2px; }
  .branch { text-align:center; font-size:13px; font-weight:700; margin-bottom:3px; }
  .bill-no { text-align:center; font-size: 14px; font-weight: 800; margin-bottom: 3px; }
  .date { text-align:center; font-size:10px; font-weight:600; margin-bottom:5px; }
</style></head><body>
  <div class="store-name">KUMARAN EDGE</div>
  <div class="branch">${escapeHtml(outletLabel)}</div>
  ${billNo != null ? `<div class="bill-no">Bill No: #${billNo}</div>` : ""}
  <div class="date">${dt}</div>
  <div class="hr"></div>
  <table>
    <colgroup><col class="c-name"/><col class="c-qty"/><col class="c-rate"/></colgroup>
    <thead><tr><th>Product</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Amount</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="hr"></div>
  <div class="row grand"><span>GRAND TOTAL</span><span>₹${grandTotal.toFixed(2)}</span></div>
  <div class="hr"></div>
  <p style="font-size:11px;font-weight:600;">Cashier: ${escapeHtml(cashier)}</p>
  <p class="center" style="font-size:11px;font-weight:600;margin-top:5px;">Thank you, visit again 🍰</p>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
