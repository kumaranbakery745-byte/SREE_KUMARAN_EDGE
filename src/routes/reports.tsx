import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { usePos, BRANCHES, BRANCH_LABELS } from "@/lib/pos-store";
import { AppHeader } from "@/components/pos/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Download } from "lucide-react";

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const { user, sales, products } = usePos();
  const navigate = useNavigate();
  useEffect(() => { if (!user) navigate({ to: "/" }); }, [user, navigate]);
  if (!user) return null;

  const isAdmin = user.role === "admin";
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [branch, setBranch] = useState<string>(isAdmin ? "all" : user.branch);

  const rows = useMemo(() => {
    const filtered = sales.filter((s) => {
      if (s.at.slice(0, 10) !== date) return false;
      if (branch !== "all" && s.branch !== branch) return false;
      if (!isAdmin && s.branch !== user.branch) return false;
      return true;
    });
    const agg = new Map<string, { name: string; qty: number; price: number; revenue: number }>();
    for (const sale of filtered) {
      for (const item of sale.items) {
        const key = item.productId;
        const prev = agg.get(key);
        if (prev) {
          prev.qty += item.qty;
          prev.revenue += item.qty * item.price;
        } else {
          agg.set(key, { name: item.name, qty: item.qty, price: item.price, revenue: item.qty * item.price });
        }
      }
    }
    return Array.from(agg.values()).sort((a, b) => b.revenue - a.revenue);
  }, [sales, date, branch, isAdmin, user.branch, products]);

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalQty = rows.reduce((s, r) => s + r.qty, 0);
  const net = totalRevenue / 1.05; // ex-tax

  const exportCsv = () => {
    const headers = "Product,Qty Sold,Unit Price,Total Revenue,Net Revenue";
    const lines = rows.map((r) => `"${r.name}",${r.qty},${r.price.toFixed(2)},${r.revenue.toFixed(2)},${(r.revenue / 1.05).toFixed(2)}`);
    const blob = new Blob([`${headers}\n${lines.join("\n")}\n`], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `report-${date}-${branch}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <div className="max-w-[1400px] mx-auto p-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Daily Sales Report</h1>
        <p className="text-sm text-slate-500 mb-6">{isAdmin ? "All branches" : `Restricted to ${BRANCH_LABELS[user.branch]}`}</p>

        <Card className="p-4 border-slate-200 mb-4 flex flex-wrap gap-3 items-end">
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
          </div>
          {isAdmin && (
            <div className="space-y-1.5">
              <Label>Branch</Label>
              <Select value={branch} onValueChange={setBranch}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {BRANCHES.map((b) => <SelectItem key={b} value={b}>{BRANCH_LABELS[b]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button variant="outline" className="ml-auto" onClick={exportCsv} disabled={rows.length === 0}>
            <Download className="h-4 w-4 mr-2" />Export CSV
          </Button>
        </Card>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <Stat label="Total Items Sold" value={totalQty.toString()} />
          <Stat label="Gross Revenue" value={`₹${totalRevenue.toFixed(2)}`} />
          <Stat label="Net Revenue (ex-tax)" value={`₹${net.toFixed(2)}`} />
        </div>

        <Card className="border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                <tr>
                  <th className="text-left p-3">Product</th>
                  <th className="text-right p-3">Qty Sold</th>
                  <th className="text-right p-3">Unit Price</th>
                  <th className="text-right p-3">Total Revenue</th>
                  <th className="text-right p-3">Net Revenue</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-400">No sales for this filter</td></tr>
                )}
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="p-3 font-medium text-slate-900">{r.name}</td>
                    <td className="p-3 text-right">{r.qty}</td>
                    <td className="p-3 text-right">₹{r.price.toFixed(2)}</td>
                    <td className="p-3 text-right font-semibold">₹{r.revenue.toFixed(2)}</td>
                    <td className="p-3 text-right text-slate-600">₹{(r.revenue / 1.05).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4 border-slate-200">
      <div className="text-xs uppercase font-semibold text-slate-500">{label}</div>
      <div className="text-2xl font-black text-slate-900 mt-1">{value}</div>
    </Card>
  );
}
