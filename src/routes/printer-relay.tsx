import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Printer, Wifi, Zap } from "lucide-react";

declare global {
  interface Window { qz?: any }
}

const QZ_SRC = "https://cdn.jsdelivr.net/npm/qz-tray@2.2.4/qz-tray.min.js";
const TARGET_PRINTER = "Gobbler";

export const Route = createFileRoute("/printer-relay")({
  component: PrinterRelay,
});

type Job = {
  id: string;
  created_at: string;
  receipt_html: string;
  outlet_name: string;
  status: string;
};

function PrinterRelay() {
  const [active, setActive] = useState(false);
  const [qzReady, setQzReady] = useState(false);
  const [recent, setRecent] = useState<Job[]>([]);
  const [pendingJob, setPendingJob] = useState<Job | null>(null);
  const [flashOutlet, setFlashOutlet] = useState<string | null>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const qzReadyRef = useRef(false);

  // Load QZ Tray script + connect websocket on mount
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        if (!document.querySelector(`script[src="${QZ_SRC}"]`)) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement("script");
            s.src = QZ_SRC;
            s.async = true;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error("Failed to load qz-tray"));
            document.head.appendChild(s);
          });
        }
        const qz = window.qz;
        if (!qz) throw new Error("qz global missing");

        // Suppress certificate / signature prompts
        qz.security.setCertificatePromise((resolve: any) => resolve());
        qz.security.setSignaturePromise(() => (resolve: any) => resolve());

        if (!qz.websocket.isActive()) {
          await qz.websocket.connect();
        }
        if (cancelled) return;
        qzReadyRef.current = true;
        setQzReady(true);
      } catch (e) {
        console.error("QZ Tray init failed — falling back to browser print", e);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-print watcher — fires the moment a pending job is set into state.
  useEffect(() => {
    if (!pendingJob) return;
    const job = pendingJob;
    let cancelled = false;

    (async () => {
      setFlashOutlet(job.outlet_name);

      let printed = false;
      const qz = window.qz;

      if (qzReadyRef.current && qz?.websocket?.isActive()) {
        try {
          // Try named printer first, fall back to default
          let config;
          try {
            const found = await qz.printers.find(TARGET_PRINTER);
            config = qz.configs.create(found);
          } catch {
            const def = await qz.printers.getDefault();
            config = qz.configs.create(def);
          }
          const printData = [
            { type: "pixel", format: "html", flavor: "plain", data: job.receipt_html },
          ];
          await qz.print(config, printData);
          printed = true;
        } catch (e) {
          console.error("QZ print failed, falling back to iframe print", e);
        }
      }

      if (!printed) {
        const iframe = iframeRef.current;
        if (iframe?.contentWindow) {
          const doc = iframe.contentWindow.document;
          doc.open();
          doc.write(job.receipt_html);
          doc.close();
          await new Promise((r) => setTimeout(r, 250));
          if (cancelled) return;
          try {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          } catch (e) {
            console.error("Auto-print failed", e);
          }
        }
      }

      await supabase.from("print_jobs").update({ status: "printed" }).eq("id", job.id);
      setRecent((prev) => [{ ...job, status: "printed" }, ...prev].slice(0, 10));

      setTimeout(() => {
        if (cancelled) return;
        setFlashOutlet(null);
        setPendingJob(null);
      }, 2000);
    })();

    return () => {
      cancelled = true;
    };
  }, [pendingJob]);

  const enqueue = (job: Job) => {
    if (seenRef.current.has(job.id)) return;
    seenRef.current.add(job.id);
    // Only one job processes at a time; if busy, retry shortly.
    setPendingJob((curr) => {
      if (curr) {
        setTimeout(() => enqueue(job), 500);
        return curr;
      }
      return job;
    });
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from("print_jobs")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      if (cancelled) return;
      (data ?? []).forEach((j) => enqueue(j as Job));
    })();

    const channel = supabase
      .channel("print-jobs-relay")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "print_jobs" },
        (payload) => {
          const job = payload.new as Job;
          if (job.status === "pending") enqueue(job);
        }
      )
      .subscribe((status) => {
        setActive(status === "SUBSCRIBED");
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 grid place-items-center p-6 relative overflow-hidden">
      {/* Giant yellow auto-print flash banner */}
      {flashOutlet && (
        <div className="fixed inset-x-0 top-0 z-50 bg-yellow-400 text-black py-8 px-6 shadow-2xl animate-pulse">
          <div className="flex items-center justify-center gap-4 text-3xl md:text-5xl font-black tracking-wide text-center">
            <Zap className="h-12 w-12" />
            ⚡ AUTO-PRINTING BILL FOR {flashOutlet.toUpperCase()}...
          </div>
        </div>
      )}

      <div className="w-full max-w-3xl">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-3 text-3xl md:text-5xl font-black tracking-[0.18em]">
            <Printer className="h-10 w-10" />
            KUMARAN EDGE
          </div>
          <p className="text-xs text-slate-400 tracking-widest mt-1">an app by sree kumaran</p>

          <div
            className={`mt-10 flex items-center gap-3 px-6 py-4 rounded-2xl border ${
              active ? "border-emerald-500/40 bg-emerald-500/10" : "border-amber-500/40 bg-amber-500/10"
            }`}
          >
            <span className={`h-3 w-3 rounded-full ${active ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
            <span className="text-lg md:text-2xl font-bold">
              {active ? "🟢 PRINT RELAY ACTIVE" : "🟡 Connecting…"}
            </span>
          </div>
          <div className={`mt-3 text-xs font-semibold tracking-wider px-3 py-1.5 rounded-full border ${qzReady ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-slate-700 bg-slate-800/50 text-slate-400"}`}>
            {qzReady ? `🖨️ QZ TRAY CONNECTED → ${TARGET_PRINTER}` : "QZ Tray not detected · using browser print"}
          </div>
          <p className="text-slate-400 mt-3 text-sm">
            Fully automated — bills print the instant a POS sale closes. Zero clicks.
          </p>

          <div className="mt-8 w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 text-left">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Wifi className="h-4 w-4" /> Live Activity
              </div>
            </div>
            {recent.length === 0 ? (
              <div className="text-slate-500 text-sm py-8 text-center">
                Waiting for the first job…
              </div>
            ) : (
              <ul className="space-y-2 text-sm">
                {recent.map((j) => (
                  <li key={j.id} className="flex justify-between p-2 rounded bg-slate-800/60">
                    <span className="font-semibold">{j.outlet_name}</span>
                    <span className="text-slate-400">{new Date(j.created_at).toLocaleTimeString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="mt-6 text-[11px] text-slate-500">
            Keep this tab open on the kiosk PC connected to your 80mm thermal printer.
          </p>
        </div>

        {/* Hidden printable iframe — auto-print target */}
        <iframe
          id="silent-print-frame"
          ref={iframeRef}
          title="receipt-printer"
          style={{
            position: "fixed",
            right: 0,
            bottom: 0,
            width: "80mm",
            height: "1px",
            opacity: 0,
            pointerEvents: "none",
            border: 0,
          }}
        />
      </div>
    </div>
  );
}
