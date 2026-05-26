import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Box, Layers, Zap, Eye, Copy, Check, LogOut, User, ChevronRight } from "lucide-react";
import { useClerk } from "@clerk/react";

interface ClientMe {
  isAdmin: boolean;
  isClient: boolean;
  clientId: number | null;
  clientName: string;
  clientCompany: string;
  email: string;
  folderIds: number[];
}

interface ClientStats {
  totalProjects: number;
  liveARs: number;
  avgLoadSpeedMs: number;
}

interface ClientProject {
  id: number;
  name: string;
  companyName: string;
  thumbnail: string | null;
  isLive: boolean;
  publicSlug: string;
  folderId: number | null;
  environment: string;
  updatedAt: string;
}

function StatCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">{label}</span>
        <Icon className="w-4 h-4 text-amber-600" />
      </div>
      <div className="text-3xl font-semibold text-stone-800">{value}</div>
      {sub && <div className="text-xs text-stone-400 mt-1">{sub}</div>}
    </div>
  );
}

export default function ClientDashboard() {
  const [, setLocation] = useLocation();
  const { signOut } = useClerk();
  const [me, setMe] = useState<ClientMe | null>(null);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/client/me", { credentials: "include" })
      .then(r => r.json()).then(setMe).catch(() => {});
    fetch("/api/client/stats", { credentials: "include" })
      .then(r => r.json()).then(setStats).catch(() => {});
    fetch("/api/client/projects", { credentials: "include" })
      .then(r => r.json()).then(d => setProjects(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const firstFolderId = me?.folderIds?.[0] ?? null;
  const preloadSnippet = firstFolderId
    ? `<script src="${window.location.origin}/api/preload.js?client=${firstFolderId}" async></script>`
    : null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayName = me?.clientName || me?.email?.split("@")[0] || "there";

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #faf8f5 0%, #f5f0e8 100%)" }}>
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-8 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Box className="w-6 h-6 text-amber-600" />
          <span className="font-serif text-xl font-bold text-stone-800 tracking-wide">AR Studio</span>
          <span className="text-stone-300 mx-2">|</span>
          <span className="text-sm text-stone-500 font-medium">Client Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <User className="w-4 h-4" />
            <span>{me?.email ?? ""}</span>
          </div>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-800 transition-colors px-3 py-1.5 rounded-lg hover:bg-stone-100"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-8 py-10 space-y-10">
        {/* Welcome */}
        <div>
          <h1 className="font-serif text-4xl font-bold text-stone-800 mb-1">
            Welcome back, {displayName}.
          </h1>
          {me?.clientCompany && (
            <p className="text-stone-500 text-lg">{me.clientCompany}</p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            icon={Layers}
            label="Total Projects"
            value={stats?.totalProjects ?? "—"}
            sub="across all your folders"
          />
          <StatCard
            icon={Eye}
            label="Active AR Experiences"
            value={stats?.liveARs ?? "—"}
            sub="currently live & accessible"
          />
          <StatCard
            icon={Zap}
            label="Avg Load Speed"
            value={stats ? `${stats.avgLoadSpeedMs}ms` : "—"}
            sub="estimated first load time"
          />
        </div>

        {/* Preloader Snippet */}
        {preloadSnippet && (
          <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-stone-800 mb-1">Speed Preloader</h2>
                <p className="text-sm text-stone-500 mb-4 leading-relaxed">
                  Add this one line to your website's <code className="font-mono text-xs bg-stone-100 px-1.5 py-0.5 rounded">&lt;head&gt;</code> section.
                  It silently pre-downloads all your AR experiences in the background so visitors see them load instantly.
                </p>
                <div className="relative">
                  <pre className="text-[11px] font-mono bg-stone-50 border border-stone-200 rounded-lg p-3.5 overflow-x-auto whitespace-pre-wrap break-all text-stone-600 leading-relaxed pr-12">
                    {preloadSnippet}
                  </pre>
                  <button
                    onClick={() => handleCopy(preloadSnippet)}
                    className="absolute top-3 right-3 p-1.5 text-stone-400 hover:text-stone-700 transition-colors bg-stone-50"
                    title="Copy"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                  <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">How to add it (any website)</p>
                  <ol className="space-y-1.5 text-xs text-amber-700">
                    <li><span className="font-semibold">Shopify:</span> Online Store → Themes → Edit Code → <code className="font-mono bg-amber-100 px-1 rounded">theme.liquid</code> → paste before <code className="font-mono bg-amber-100 px-1 rounded">&lt;/head&gt;</code></li>
                    <li><span className="font-semibold">Wix/Webflow:</span> Settings → Custom Code → Head → paste snippet</li>
                    <li><span className="font-semibold">WordPress:</span> Appearance → Theme Editor → header.php → paste before <code className="font-mono bg-amber-100 px-1 rounded">&lt;/head&gt;</code></li>
                    <li><span className="font-semibold">Custom HTML:</span> Paste directly inside the <code className="font-mono bg-amber-100 px-1 rounded">&lt;head&gt;</code> tag on your homepage</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Projects Grid */}
        <div>
          <h2 className="font-serif text-2xl font-bold text-stone-800 mb-6">Your AR Experiences</h2>
          {projects.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-xl p-12 text-center">
              <Box className="w-12 h-12 text-stone-200 mx-auto mb-4" />
              <p className="text-stone-400 font-medium">No AR experiences assigned yet.</p>
              <p className="text-stone-400 text-sm mt-1">Contact your AR Studio team to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {projects.map(p => (
                <div
                  key={p.id}
                  className="group bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-amber-300 transition-all cursor-pointer"
                  onDoubleClick={() => setLocation(`/client/project/${p.id}`)}
                  onClick={() => setLocation(`/client/project/${p.id}`)}
                >
                  <div className="aspect-video bg-stone-100 relative">
                    {p.thumbnail ? (
                      <img src={p.thumbnail} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Box className="w-8 h-8 text-stone-300" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${p.isLive ? "bg-green-500 text-white" : "bg-stone-200 text-stone-500"}`}>
                        {p.isLive ? "Live" : "Offline"}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <div className="min-w-0">
                      <h3 className="font-medium text-stone-800 truncate text-sm">{p.name}</h3>
                      <p className="text-xs text-stone-400 truncate">{p.companyName}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-amber-500 transition-colors shrink-0 ml-2" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
