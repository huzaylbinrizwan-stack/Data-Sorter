import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Box, ArrowLeft, ExternalLink, QrCode, Copy, Check, Eye, EyeOff } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface ClientProject {
  id: number;
  name: string;
  companyName: string;
  thumbnail: string | null;
  isLive: boolean;
  publicSlug: string;
  folderId: number | null;
  environment: string;
  isScalable: boolean;
}

export default function ClientProject() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [project, setProject] = useState<ClientProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    fetch("/api/client/projects", { credentials: "include" })
      .then(r => r.json())
      .then((projects: ClientProject[]) => {
        const found = projects.find(p => p.id === parseInt(id ?? "", 10));
        setProject(found ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const studioUrl = project ? `${window.location.origin}/studio/${project.publicSlug}` : "";

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #faf8f5 0%, #f5f0e8 100%)" }}>
        <div className="w-8 h-8 rounded-full border-2 border-amber-200 border-t-amber-600 animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "linear-gradient(135deg, #faf8f5 0%, #f5f0e8 100%)" }}>
        <Box className="w-12 h-12 text-stone-200" />
        <p className="text-stone-500">Project not found or not accessible.</p>
        <button onClick={() => setLocation("/client")} className="text-amber-600 hover:underline text-sm">
          Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #faf8f5 0%, #f5f0e8 100%)" }}>
      <header className="bg-white border-b border-stone-200 px-8 py-4 flex items-center gap-4 shadow-sm">
        <button
          onClick={() => setLocation("/client")}
          className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center gap-2">
          <Box className="w-5 h-5 text-amber-600" />
          <span className="font-serif text-lg font-bold text-stone-800">AR Studio</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-8 py-10 space-y-8">
        {/* Title */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold text-stone-800 mb-1">{project.name}</h1>
            <p className="text-stone-500">{project.companyName}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mt-1 ${project.isLive ? "bg-green-100 text-green-700 border border-green-200" : "bg-stone-100 text-stone-500 border border-stone-200"}`}>
            {project.isLive ? "Live" : "Offline"}
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Preview */}
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
            <div className="aspect-video bg-stone-100 relative">
              {project.thumbnail ? (
                <img src={project.thumbnail} alt={project.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Box className="w-12 h-12 text-stone-200" />
                </div>
              )}
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs text-stone-400 uppercase tracking-wider font-medium">
                <Eye className="w-3.5 h-3.5" />
                Environment: {project.environment}
              </div>
              {project.isScalable && (
                <div className="text-xs text-stone-400">Scalable model (AR size adjustment enabled)</div>
              )}
            </div>
          </div>

          {/* Links & Actions */}
          <div className="space-y-4">
            {/* AR Link */}
            <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm space-y-3">
              <h3 className="font-semibold text-stone-800 text-sm">AR Experience Link</h3>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 flex-1 text-stone-600 truncate">
                  {studioUrl}
                </code>
                <button
                  onClick={() => handleCopy(studioUrl)}
                  className="p-2 text-stone-400 hover:text-stone-700 transition-colors shrink-0"
                  title="Copy link"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex gap-2">
                {project.isLive && (
                  <a
                    href={studioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open AR Experience
                  </a>
                )}
                <button
                  onClick={() => setShowQr(!showQr)}
                  className="flex items-center gap-2 text-sm border border-stone-200 text-stone-600 hover:border-stone-300 hover:text-stone-800 px-4 py-2 rounded-lg transition-colors"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  QR Code
                </button>
              </div>
            </div>

            {/* QR Code */}
            {showQr && project.isLive && (
              <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm flex flex-col items-center gap-3">
                <p className="text-xs text-stone-500 font-medium uppercase tracking-wider">Scan to open on phone</p>
                <div className="bg-white p-3 rounded-lg border border-stone-100">
                  <QRCodeSVG value={studioUrl} size={160} />
                </div>
                <p className="text-xs text-stone-400 text-center max-w-xs">
                  Print or share this QR code. When scanned, it opens the AR experience directly.
                </p>
              </div>
            )}

            {/* Iframe Embed */}
            <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm space-y-3">
              <h3 className="font-semibold text-stone-800 text-sm">Embed on Your Website</h3>
              <p className="text-xs text-stone-500">Paste this code anywhere on your website to embed the AR viewer.</p>
              <div className="relative">
                <pre className="text-[10px] font-mono bg-stone-50 border border-stone-200 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all text-stone-500 pr-8 leading-relaxed">
{`<iframe
  src="${studioUrl}"
  width="100%"
  height="680"
  style="border:none;border-radius:12px;"
  allow="camera; xr-spatial-tracking"
></iframe>`}
                </pre>
                <button
                  onClick={() => handleCopy(`<iframe\n  src="${studioUrl}"\n  width="100%"\n  height="680"\n  style="border:none;border-radius:12px;"\n  allow="camera; xr-spatial-tracking"\n></iframe>`)}
                  className="absolute top-2 right-2 text-stone-400 hover:text-stone-700 transition-colors"
                  title="Copy"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
