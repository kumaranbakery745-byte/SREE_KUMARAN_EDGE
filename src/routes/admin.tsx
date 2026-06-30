import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { usePos, BRANCHES, BRANCH_LABELS, type Product } from "@/lib/pos-store";
import { AppHeader } from "@/components/pos/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Pencil, Trash2, Plus, Download, Upload } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { user } = usePos();
  const navigate = useNavigate();
  useEffect(() => {
    if (!user) navigate({ to: "/" });
    else if (user.role !== "admin") navigate({ to: "/pos" });
  }, [user, navigate]);
  if (!user || user.role !== "admin") return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <div className="max-w-[1400px] mx-auto p-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Manage</h1>
        <p className="text-sm text-slate-500 mb-6">Products, categories, outlets, and bulk upload</p>
        <Tabs defaultValue="products">
          <TabsList>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
            <TabsTrigger value="outlets">Outlet Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="products"><ProductsPanel /></TabsContent>
          <TabsContent value="categories"><CategoriesPanel /></TabsContent>
          <TabsContent value="bulk"><BulkPanel /></TabsContent>
          <TabsContent value="outlets"><OutletsPanel /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ProductsPanel() {
  const { products, setProducts, categories } = usePos();
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);

  const openNew = () => {
    setEditing({
      id: `p-${crypto.randomUUID()}`, name: "", category: categories[0]?.id ?? "sweets", price: 0,
      inStock: true,
      stock: { branch_1: 0, branch_2: 0, branch_3: 0 },
    });
    setOpen(true);
  };
  const openEdit = (p: Product) => { setEditing({ ...p }); setOpen(true); };
  const del = (id: string) => {
    setProducts(products.filter((p) => p.id !== id));
    toast.success("Product deleted");
  };
  const toggleStock = (id: string, value: boolean) => {
    setProducts(products.map((p) => (p.id === id ? { ...p, inStock: value } : p)));
  };
  const save = () => {
    if (!editing) return;
    if (!editing.name.trim()) return toast.error("Name required");
    const exists = products.some((p) => p.id === editing.id);
    setProducts(exists ? products.map((p) => (p.id === editing.id ? editing : p)) : [...products, editing]);
    toast.success("Saved");
    setOpen(false);
  };

  return (
    <Card className="mt-4 p-0 overflow-hidden border-slate-200">
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <div className="font-semibold text-slate-900">{products.length} products</div>
        <Button onClick={openNew} className="bg-slate-900 hover:bg-slate-800"><Plus className="h-4 w-4 mr-1" />Add product</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Category</th>
              <th className="text-right p-3">Price</th>
              {BRANCHES.map((b) => <th key={b} className="text-right p-3">{BRANCH_LABELS[b]}</th>)}
              <th className="text-center p-3">In Stock</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="p-3 font-medium text-slate-900">{p.name}</td>
                <td className="p-3 text-slate-600">{categories.find((c) => c.id === p.category)?.name ?? p.category}</td>
                <td className="p-3 text-right">₹{p.price}</td>
                {BRANCHES.map((b) => <td key={b} className="p-3 text-right">{p.stock[b] ?? 0}</td>)}
                <td className="p-3 text-center">
                  <Switch checked={p.inStock} onCheckedChange={(v) => toggleStock(p.id, v)} />
                </td>
                <td className="p-3 text-right whitespace-nowrap">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-red-600" onClick={() => del(p.id)}><Trash2 className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing && products.some((p) => p.id === editing.id) ? "Edit" : "New"} Product</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>Name</Label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Category</Label>
                  <Select value={editing.category} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Price (₹)</Label>
                  <Input type="number" value={editing.price} onChange={(e) => setEditing({ ...editing, price: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {BRANCHES.map((b) => (
                  <div key={b} className="space-y-1.5">
                    <Label>{BRANCH_LABELS[b]} stock</Label>
                    <Input type="number" value={editing.stock[b] ?? 0}
                      onChange={(e) => setEditing({ ...editing, stock: { ...editing.stock, [b]: parseInt(e.target.value) || 0 } })} />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <div>
                  <div className="font-medium text-slate-900 text-sm">Available for sale</div>
                  <div className="text-xs text-slate-500">Disable to mark as Out of Stock everywhere.</div>
                </div>
                <Switch checked={editing.inStock} onCheckedChange={(v) => setEditing({ ...editing, inStock: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} className="bg-slate-900 hover:bg-slate-800">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function CategoriesPanel() {
  const { categories, setCategories, products } = usePos();
  const [name, setName] = useState("");

  const add = () => {
    const n = name.trim();
    if (!n) return;
    const id = n.toLowerCase().replace(/\s+/g, "-");
    if (categories.some((c) => c.id === id)) return toast.error("Already exists");
    setCategories([...categories, { id, name: n }]);
    setName("");
    toast.success("Category added");
  };
  const del = (id: string) => {
    if (products.some((p) => p.category === id)) return toast.error("Used by products");
    setCategories(categories.filter((c) => c.id !== id));
  };

  return (
    <Card className="mt-4 p-4 border-slate-200 space-y-4">
      <div className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name" />
        <Button onClick={add} className="bg-slate-900 hover:bg-slate-800"><Plus className="h-4 w-4 mr-1" />Add</Button>
      </div>
      <div className="space-y-2">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
            <div><span className="font-medium text-slate-900">{c.name}</span> <span className="text-xs text-slate-500 ml-2">{c.id}</span></div>
            <Button size="icon" variant="ghost" className="text-red-600" onClick={() => del(c.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function OutletsPanel() {
  const { branchSettings, setBranchSettings, adminPassword, setAdminPassword } = usePos();
  const [local, setLocal] = useState(branchSettings);
  const [admin, setAdmin] = useState(adminPassword);

  const saveAll = () => {
    setBranchSettings(local);
    setAdminPassword(admin || "admin123");
    toast.success("Outlet settings saved");
  };

  return (
    <Card className="mt-4 p-4 border-slate-200 space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
            <tr>
              <th className="text-left p-3">Outlet</th>
              <th className="text-left p-3">Login Email</th>
              <th className="text-left p-3">Display Name</th>
              <th className="text-left p-3">Password</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-slate-100">
              <td className="p-3 font-medium">Admin</td>
              <td className="p-3 text-slate-600 font-mono text-xs">admin@bakery.com</td>
              <td className="p-3 text-slate-400 italic">Admin</td>
              <td className="p-3">
                <Input value={admin} onChange={(e) => setAdmin(e.target.value)} />
              </td>
            </tr>
            {BRANCHES.map((b, idx) => (
              <tr key={b} className="border-t border-slate-100">
                <td className="p-3 font-medium">Branch {idx + 1}</td>
                <td className="p-3 text-slate-600 font-mono text-xs">branch{idx + 1}@bakery.com</td>
                <td className="p-3">
                  <Input
                    value={local[b]?.label ?? ""}
                    onChange={(e) => setLocal({ ...local, [b]: { ...local[b], label: e.target.value } })}
                  />
                </td>
                <td className="p-3">
                  <Input
                    value={local[b]?.password ?? ""}
                    onChange={(e) => setLocal({ ...local, [b]: { ...local[b], password: e.target.value } })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end">
        <Button onClick={saveAll} className="bg-slate-900 hover:bg-slate-800">Save Outlet Settings</Button>
      </div>
    </Card>
  );
}

function BulkPanel() {
  const { products, setProducts, categories } = usePos();
  const [preview, setPreview] = useState<Product[] | null>(null);

  const downloadTemplate = () => {
    const headers = "product_name,category,price,branch_1_stock,branch_2_stock,branch_3_stock";
    const sample = "Sample Sweet,sweets,50,10,10,10";
    const blob = new Blob([`${headers}\n${sample}\n`], { type: "text/csv" });
    triggerDownload(blob, "product-template.csv");
  };

  const onFile = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const [header, ...rows] = lines;
    const cols = header.split(",").map((s) => s.trim());
    const expected = ["product_name", "category", "price", "branch_1_stock", "branch_2_stock", "branch_3_stock"];
    if (!expected.every((e) => cols.includes(e))) return toast.error("Invalid headers");
    const idx = (k: string) => cols.indexOf(k);
    const parsed: Product[] = rows.map((r, i) => {
      const cells = r.split(",").map((s) => s.trim());
      const catName = cells[idx("category")];
      const catId = categories.find((c) => c.id === catName || c.name.toLowerCase() === catName.toLowerCase())?.id ?? catName.toLowerCase();
      return {
        id: `bulk-${Date.now()}-${i}`,
        name: cells[idx("product_name")],
        category: catId,
        price: parseFloat(cells[idx("price")]) || 0,
        inStock: true,
        stock: {
          branch_1: parseInt(cells[idx("branch_1_stock")]) || 0,
          branch_2: parseInt(cells[idx("branch_2_stock")]) || 0,
          branch_3: parseInt(cells[idx("branch_3_stock")]) || 0,
        },
      };
    });
    setPreview(parsed);
    toast.success(`Parsed ${parsed.length} rows — review and save`);
  };

  const commit = () => {
    if (!preview) return;
    setProducts([...products, ...preview]);
    setPreview(null);
    toast.success("Products imported");
  };

  return (
    <Card className="mt-4 p-6 border-slate-200 space-y-4">
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={downloadTemplate}><Download className="h-4 w-4 mr-2" />Download Template (.CSV)</Button>
        <label className="inline-flex">
          <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          <span className="inline-flex items-center px-4 h-10 rounded-md bg-slate-900 text-white text-sm font-medium cursor-pointer hover:bg-slate-800">
            <Upload className="h-4 w-4 mr-2" />Upload Feed File
          </span>
        </label>
      </div>
      {preview && (
        <div>
          <div className="text-sm font-semibold text-slate-700 mb-2">Preview ({preview.length})</div>
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                <tr>
                  <th className="text-left p-2">Name</th><th className="text-left p-2">Category</th>
                  <th className="text-right p-2">Price</th>
                  {BRANCHES.map((b) => <th key={b} className="text-right p-2">{BRANCH_LABELS[b]}</th>)}
                </tr>
              </thead>
              <tbody>
                {preview.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="p-2">{p.name}</td><td className="p-2">{p.category}</td>
                    <td className="p-2 text-right">₹{p.price}</td>
                    {BRANCHES.map((b) => <td key={b} className="p-2 text-right">{p.stock[b]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={commit} className="bg-emerald-600 hover:bg-emerald-700">Save to Catalogue</Button>
            <Button variant="outline" onClick={() => setPreview(null)}>Discard</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export { triggerDownload };
