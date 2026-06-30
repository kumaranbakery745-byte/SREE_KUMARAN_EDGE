import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { usePos, BRANCH_LABELS, buildReceiptHtml, nextBillNo, type SaleItem } from "@/lib/pos-store";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/pos/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Minus, Plus, Printer, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pos")({
  component: PosScreen,
});

const TAX_RATE = 0.05;
const TENDER_PRESETS = [100, 500];

function PosScreen() {
  const { user, products, categories, recordSale } = usePos();
  const navigate = useNavigate();
  useEffect(() => { if (!user) navigate({ to: "/" }); }, [user, navigate]);
  if (!user) return null;

  const branch = user.branch === "all" ? "branch_1" : user.branch;
  const [activeCat, setActiveCat] = useState<string>("all");
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [cakeOpen, setCakeOpen] = useState(false);
  const [tendered, setTendered] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(
    () => products.filter((p) => activeCat === "all" || p.category === activeCat),
    [products, activeCat]
  );

  const addToCart = (productId: string) => {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    if (!p.inStock) {
      toast.error(`${p.name} is marked out of stock`);
      return;
    }
    const stock = p.stock[branch] ?? 0;
    const inCart = cart.find((c) => c.productId === productId)?.qty ?? 0;
    if (inCart + 1 > stock) {
      toast.error(`${p.name}: no stock at ${BRANCH_LABELS[branch]}`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === productId);
      if (existing) {
        return prev.map((c) => (c.productId === productId ? { ...c, qty: c.qty + 1 } : c));
      }
      return [...prev, { productId, name: p.name, price: p.price, qty: 1 }];
    });
  };

  const updateQty = (idx: number, delta: number) => {
    setCart((prev) => {
      const item = prev[idx];
      const nextQty = item.qty + delta;
      if (nextQty <= 0) return prev.filter((_, i) => i !== idx);
      if (!item.isCustomCake) {
        const p = products.find((x) => x.id === item.productId);
        const stock = p?.stock[branch] ?? 0;
        if (nextQty > stock) {
          toast.error("Stock limit reached");
          return prev;
        }
      }
      return prev.map((c, i) => (i === idx ? { ...c, qty: nextQty } : c));
    });
  };

  const removeItem = (idx: number) =>
    setCart((prev) => prev.filter((_, i) => i !== idx));

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;
  const change = tendered != null ? tendered - total : null;

  const hasEmptyCakeNote = cart.some((i) => i.isCustomCake && !i.customNote?.trim());
  const canCheckout = cart.length > 0 && !hasEmptyCakeNote && !submitting;

import { ref, push } from "firebase/database";
import { db } from "@/lib/firebase"; // Path correct-aa irukka?

const checkout = async () => {
  // ...
  try {
    const printRef = ref(db, 'print_jobs');
    await push(printRef, {  // Inga dhaan data Firebase-kku pogum
      receipt_html: receiptHtml,
      status: "pending",
      timestamp: Date.now()
    });
    console.log("Data pushed to Firebase!"); // Idhu console-la vandha, database-la vizhum
  } catch (err) {
    console.error("Error:", err);
  }
};

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4 p-4 max-w-[1600px] mx-auto">
        {/* LEFT 60% */}
        <div className="min-w-0">
          {/* Sticky category bar */}
          <div className="sticky top-16 z-30 -mx-4 px-4 py-3 bg-slate-50/95 backdrop-blur border-b border-slate-200">
            <div className="flex gap-2 overflow-x-auto">
              <CatPill active={activeCat === "all"} onClick={() => setActiveCat("all")}>All</CatPill>
              {categories.map((c) => (
                <CatPill key={c.id} active={activeCat === c.id} onClick={() => setActiveCat(c.id)}>
                  {c.name}
                </CatPill>
              ))}
            </div>
          </div>

          {/* Product grid with pinned custom cake card */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {/* Pinned custom cake card */}
            <button
              onClick={() => setCakeOpen(true)}
              className="text-left rounded-xl border-2 border-amber-400 bg-amber-50 hover:bg-amber-100 transition-colors p-4 col-span-2 sm:col-span-1"
            >
              <div className="flex items-start justify-between">
                <div className="text-2xl">🍰</div>
                <Sparkles className="h-4 w-4 text-amber-600" />
              </div>
              <div className="mt-2 font-bold text-amber-950 leading-snug">Custom Cake Order</div>
              <div className="text-[11px] text-amber-800/80 mt-0.5">Birthday · Anniversary · Custom price</div>
            </button>

            {filtered.map((p) => {
              const stock = p.stock[branch] ?? 0;
              const outOfStock = !p.inStock || stock <= 0;
              return (
                <button
                  key={p.id}
                  disabled={outOfStock}
                  onClick={() => addToCart(p.id)}
                  className={cn(
                    "group relative text-left rounded-xl border bg-white p-4 transition-all",
                    outOfStock
                      ? "border-slate-200 opacity-40 cursor-not-allowed"
                      : "border-slate-200 hover:border-slate-900 hover:shadow-sm active:scale-[0.98]"
                  )}
                >
                  <div className="font-semibold text-slate-900 leading-snug line-clamp-2">{p.name}</div>
                  <div className="mt-3 text-lg font-bold text-slate-900">₹{p.price}</div>
                  {outOfStock && (
                    <div className="absolute inset-0 grid place-items-center pointer-events-none">
                      <span className="px-2.5 py-1 rounded bg-red-600 text-white text-[10px] font-bold tracking-widest uppercase shadow">
                        Out of Stock
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT 40% — Cart */}
        <aside className="lg:sticky lg:top-[80px] lg:self-start">
          <Card className="border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Current Order</div>
                <div className="text-lg font-bold text-slate-900">{cart.length} item{cart.length !== 1 ? "s" : ""}</div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full bg-slate-900 text-white text-xs font-semibold">
                {BRANCH_LABELS[branch]}
              </span>
            </div>

            <div className="max-h-[42vh] overflow-y-auto divide-y divide-slate-100">
              {cart.length === 0 && (
                <div className="p-8 text-center text-sm text-slate-400">Tap a product to start</div>
              )}
              {cart.map((item, idx) => (
                <div key={idx} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-900 text-sm">{item.name}</div>
                      <div className="text-xs text-slate-500">₹{item.price} × {item.qty}</div>
                      {item.isCustomCake && (
                        <div className="mt-1 text-[11px] text-amber-700 italic line-clamp-2">{item.customNote || <span className="text-red-600">Description required</span>}</div>
                      )}
                    </div>
                    <div className="font-bold text-slate-900 text-sm whitespace-nowrap">
                      ₹{(item.price * item.qty).toFixed(2)}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQty(idx, -1)}>
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <input
                      type="number"
                      min={1}
                      value={item.qty}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) => {
                        const next = parseInt(e.target.value, 10);
                        if (isNaN(next) || next < 1) return;
                        setCart((prev) => {
                          const cur = prev[idx];
                          if (!cur.isCustomCake) {
                            const p = products.find((x) => x.id === cur.productId);
                            const stock = p?.stock[branch] ?? 0;
                            if (next > stock) {
                              toast.error("Stock limit reached");
                              return prev.map((c, i) => (i === idx ? { ...c, qty: stock } : c));
                            }
                          }
                          return prev.map((c, i) => (i === idx ? { ...c, qty: next } : c));
                        });
                      }}
                      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                      className="w-12 text-center font-bold text-sm bg-transparent border-0 outline-none focus:ring-2 focus:ring-slate-900 rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQty(idx, +1)}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 ml-auto text-red-600" onClick={() => removeItem(idx)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-200 space-y-1.5 text-sm">
              <Row label="Subtotal" value={`₹${subtotal.toFixed(2)}`} />
              <Row label="Tax (5%)" value={`₹${tax.toFixed(2)}`} />
              <div className="flex justify-between items-baseline pt-2 border-t border-slate-100">
                <span className="font-semibold text-slate-900">Grand Total</span>
                <span className="text-2xl font-black text-slate-900">₹{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Quick tender */}
            <div className="px-4 pb-3">
              <div className="text-[11px] uppercase font-semibold text-slate-500 mb-2">Quick Cash Tender</div>
              <div className="grid grid-cols-3 gap-2">
                {TENDER_PRESETS.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setTendered(amt)}
                    className="h-10 rounded-lg border border-slate-200 hover:border-slate-900 hover:bg-slate-50 font-semibold text-sm"
                  >
                    ₹{amt}
                  </button>
                ))}
                <button
                  onClick={() => setTendered(total)}
                  className="h-10 rounded-lg border border-slate-200 hover:border-slate-900 hover:bg-slate-50 font-semibold text-xs"
                >
                  Exact Cash
                </button>
              </div>
              {tendered != null && (
                <div className={cn(
                  "mt-2 px-3 py-2 rounded-lg text-sm font-semibold",
                  (change ?? 0) < 0 ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"
                )}>
                  Tendered ₹{tendered.toFixed(2)} · Change: ₹{(change ?? 0).toFixed(2)}
                </div>
              )}
            </div>

            <div className="p-4 pt-0">
              <Button
                onClick={checkout}
                disabled={!canCheckout}
                className="w-full h-14 text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40"
              >
                <Printer className="h-5 w-5 mr-2" />
                {submitting ? "QUEUEING…" : "PAY & PRINT"}
              </Button>
              {hasEmptyCakeNote && (
                <div className="mt-2 text-xs text-red-600 text-center">Custom cake description is required</div>
              )}
            </div>
          </Card>
        </aside>
      </div>

      <CustomCakeDialog
        open={cakeOpen}
        onOpenChange={setCakeOpen}
        onAdd={(item) => {
          setCart((prev) => [...prev, item]);
          setCakeOpen(false);
        }}
      />
    </div>
  );
}

function CatPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 h-9 rounded-full text-sm font-semibold whitespace-nowrap transition-colors border",
        active ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
      )}
    >
      {children}
    </button>
  );
}

function StockBadge({ stock }: { stock: number }) {
  const tone = stock <= 0 ? "bg-red-100 text-red-700" : stock < 10 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600";
  return <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded", tone)}>{stock <= 0 ? "Out" : `${stock} left`}</span>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-slate-600"><span>{label}</span><span className="font-medium text-slate-900">{value}</span></div>
  );
}

function CustomCakeDialog({
  open, onOpenChange, onAdd,
}: { open: boolean; onOpenChange: (v: boolean) => void; onAdd: (i: SaleItem) => void }) {
  const [price, setPrice] = useState("");
  const [weight, setWeight] = useState("");
  const [flavour, setFlavour] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) { setPrice(""); setWeight(""); setFlavour(""); setNote(""); }
  }, [open]);

  const submit = () => {
    const p = parseFloat(price);
    if (!p || p <= 0) return toast.error("Enter a valid price");
    if (!note.trim()) return toast.error("Description is mandatory");
    onAdd({
      productId: `custom-${crypto.randomUUID()}`,
      name: `Custom Cake${weight ? ` · ${weight}kg` : ""}${flavour ? ` · ${flavour}` : ""}`,
      price: p,
      qty: 1,
      isCustomCake: true,
      customNote: note.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>🍰 Custom Cake Order</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Custom Price (₹) *</Label>
            <Input type="number" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 1200" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Weight (Kg)</Label>
              <Input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="1.5" />
            </div>
            <div className="space-y-1.5">
              <Label>Flavour</Label>
              <Input value={flavour} onChange={(e) => setFlavour(e.target.value)} placeholder="Chocolate" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description / Message *</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Happy Birthday Riya 🎂" rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} className="bg-slate-900 hover:bg-slate-800">Add to Cart</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
