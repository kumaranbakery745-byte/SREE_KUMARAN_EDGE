import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { usePos } from "@/lib/pos-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: LoginPage,
});

function LoginPage() {
  const { user, login } = usePos();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@bakery.com");
  const [password, setPassword] = useState("admin123");

  useEffect(() => {
    if (user) navigate({ to: "/pos" });
  }, [user, navigate]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(email, password)) {
      toast.success("Welcome back");
      navigate({ to: "/pos" });
    } else {
      toast.error("Invalid credentials");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md p-8 shadow-lg border-slate-200">
        <div className="flex flex-col items-start mb-6">
          <h1 className="text-2xl font-black tracking-[0.22em] text-slate-900">KUMARAN EDGE</h1>
          <p className="text-xs text-slate-500 tracking-wide mt-0.5">an app by sree kumaran</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@bakery.com" />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white">
            Sign in
          </Button>
        </form>
        <div className="mt-6 text-[11px] text-slate-500 space-y-1 border-t border-slate-100 pt-4">
          <div className="font-medium text-slate-700 mb-1">Demo accounts</div>
          <div>admin@bakery.com / admin123</div>
          <div>branch1@bakery.com / branch123</div>
          <div>branch2@bakery.com / branch123</div>
          <div>branch3@bakery.com / branch123</div>
          <div className="pt-1 text-slate-400">Passwords editable from Admin → Outlet Settings.</div>
        </div>
      </Card>
    </div>
  );
}
