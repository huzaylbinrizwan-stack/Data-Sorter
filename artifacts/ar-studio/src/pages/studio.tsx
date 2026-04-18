import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "wouter";
import {
  useGetStudioProjectMeta,
  useGetStudioProject,
  useGetStudioMeasurements,
  getGetStudioProjectMetaQueryKey,
  getGetStudioProjectQueryKey,
  getGetStudioMeasurementsQueryKey,
} from "@workspace/api-client-react";
import type { StudioProjectMeta, StudioProject, ProjectMaterial, StudioVariant } from "@workspace/api-client-react";
import { Box, Camera, ChevronLeft, ChevronRight, Palette, Ruler } from "lucide-react";

const ENV_STYLES: Record<string, React.CSSProperties> = {
  black: { background: "#0a0a0a" },
  white: { background: "#fafafa" },
  "luxury-home": { backgroundImage: "radial-gradient(ellipse at 30% 70%, #2d1b0e 0%, #0f0804 100%)" },
  "classic-luxury": { backgroundImage: "linear-gradient(135deg, #0d1b2a 0%, #1a2332 50%, #2d1b0e 100%)" },
  "walls-plants": { backgroundImage: "radial-gradient(ellipse at 70% 30%, #e8e0d4 0%, #c4b8a8 100%)" },
};

const ENV_TEXT: Record<string, string> = {
  black: "text-white",
  white: "text-gray-900",
  "luxury-home": "text-white",
  "classic-luxury": "text-white",
  "walls-plants": "text-gray-800",
};

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
}

function LuxuryLoadingScreen({ projectName, opacity }: { projectName?: string; opacity: number }) {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-50"
      style={{
        background: "linear-gradient(135deg, #0d0d0d 0%, #1a1410 50%, #0d0d0d 100%)",
        opacity,
        transition: "opacity 0.5s ease",
        pointerEvents: opacity === 0 ? "none" : "auto",
      }}
    >
      <div className="relative w-20 h-20 mb-8">
        <div
          className="absolute inset-0 rounded-full animate-spin"
          style={{
            background: "conic-gradient(from 0deg, transparent 0%, hsl(44,54%,54%) 30%, transparent 60%)",
            mask: "radial-gradient(transparent 55%, black 56%)",
            WebkitMask: "radial-gradient(transparent 55%, black 56%)",
          }}
        />
        <div
          className="absolute inset-[6px] rounded-full"
          style={{ border: "1px solid hsl(44,54%,54%,0.15)" }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Box className="w-6 h-6" style={{ color: "hsl(44,54%,54%)" }} />
        </div>
      </div>

      <div className="text-center px-8 max-w-xs">
        {projectName ? (
          <>
            <p
              className="text-sm font-light tracking-widest uppercase mb-2"
              style={{ color: "hsl(44,54%,54%)" }}
            >
              {projectName}
            </p>
            <p className="text-white/50 text-xs font-light leading-relaxed tracking-wide">
              We are arranging your AR experience,<br />please be patient.
            </p>
          </>
        ) : (
          <p className="text-white/50 text-xs font-light leading-relaxed tracking-wide">
            We are arranging the AR Studio for you,<br />please be patient.
          </p>
        )}
      </div>

      <div
        className="absolute bottom-6 flex items-center gap-1.5 text-xs font-light tracking-widest"
        style={{ color: "hsl(44,54%,54%,0.4)" }}
      >
        <Box className="w-3 h-3" />
        <span>AR STUDIO</span>
      </div>
    </div>
  );
}

function SidebarSkeleton({ isLightBg }: { isLightBg: boolean }) {
  const pulse = isLightBg ? "bg-gray-200 animate-pulse" : "bg-white/10 animate-pulse";
  return (
    <div className="flex flex-col gap-2 p-2.5">
      {[1, 2, 3].map((i) => (
        <div key={i} className={`h-11 rounded-xl ${pulse}`} style={{ opacity: 1 - i * 0.2 }} />
      ))}
    </div>
  );
}

function MaterialItem({
  mat,
  isActive,
  isLightBg,
  labelColor,
  onSelect,
}: {
  mat: ProjectMaterial;
  isActive: boolean;
  isLightBg: boolean;
  labelColor: string;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`flex items-center gap-2 p-1.5 rounded-lg border transition-all text-left w-full ${
        isActive
          ? isLightBg
            ? "border-gray-700 bg-gray-50"
            : "border-[hsl(44,54%,54%)]/60 bg-[hsl(44,54%,54%)]/5"
          : isLightBg
          ? "border-gray-200 hover:border-gray-300"
          : "border-white/10 hover:border-white/20"
      }`}
    >
      {mat.thumbnailUrl ? (
        <img src={mat.thumbnailUrl} alt={mat.name} className="w-6 h-6 rounded object-cover shrink-0" />
      ) : (
        <div className={`w-6 h-6 rounded shrink-0 flex items-center justify-center ${isLightBg ? "bg-gray-100 border border-gray-200" : "bg-white/5 border border-white/10"}`}>
          <Palette className={`w-3 h-3 ${isLightBg ? "text-gray-400" : "text-white/30"}`} />
        </div>
      )}
      <span className={`text-xs truncate ${labelColor}`}>{mat.name}</span>
    </button>
  );
}

type SidebarMode = "variants" | "materials";

function VariationSidebar({
  project,
  meta,
  isLightBg,
  activeVariantId,
  activeMaterialId,
  isLoadingData,
  onSelectVariant,
  onSelectMaterial,
}: {
  project: StudioProject | null;
  meta: StudioProjectMeta | null | undefined;
  isLightBg: boolean;
  activeVariantId: number | null;
  activeMaterialId: number | null;
  isLoadingData: boolean;
  onSelectVariant: (variant: StudioVariant | null) => void;
  onSelectMaterial: (material: ProjectMaterial | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [mode, setMode] = useState<SidebarMode>("variants");

  const sidebarColor = meta?.studioSidebarColor ?? "#000000";
  const sidebarOpacity = meta?.studioSidebarOpacity ?? 0.65;
  const [r, g, b] = hexToRgb(sidebarColor);
  const glassStyle: React.CSSProperties = {
    background: `rgba(${r}, ${g}, ${b}, ${sidebarOpacity})`,
    borderColor: isLightBg ? "rgba(200,200,200,0.5)" : "rgba(255,255,255,0.1)",
  };

  const labelColor = isLightBg ? "text-gray-700" : "text-white/80";
  const subColor = isLightBg ? "text-gray-400" : "text-white/40";
  const dividerColor = isLightBg ? "border-gray-200/60" : "border-white/10";
  const tabActive = isLightBg ? "bg-gray-800 text-white" : "bg-[hsl(44,54%,54%)] text-black";
  const tabInactive = isLightBg ? "text-gray-500 hover:text-gray-700" : "text-white/40 hover:text-white/70";

  const hasVariants = !!(project?.enableVariants && project.variants && project.variants.length > 0);
  const baseMaterials = project?.materials ?? [];
  const variants = project?.variants ?? [];

  const activeVariant = variants.find((v) => v.id === activeVariantId) ?? null;
  const activeMaterials = activeVariantId === null
    ? baseMaterials
    : (activeVariant?.materials ?? []);

  const panelW = 252;

  return (
    <div
      className="absolute right-0 top-0 h-full flex items-stretch"
      style={{ zIndex: 20 }}
    >
      {/* Toggle tab — always visible, on left edge of drawer */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Collapse variations" : "Expand variations"}
        className="flex items-center justify-center backdrop-blur-md shadow-xl transition-all border-l border-y rounded-l-lg self-center shrink-0"
        style={{ ...glassStyle, width: "20px", height: "52px" }}
      >
        {isOpen
          ? <ChevronLeft className={`w-3 h-3 ${subColor}`} />
          : <ChevronRight className={`w-3 h-3 ${subColor}`} />}
      </button>

      {/* Drawer panel — always mounted, slides via max-width */}
      <div
        className="border-l backdrop-blur-xl shadow-2xl flex flex-col h-full overflow-hidden"
        style={{
          ...glassStyle,
          maxWidth: isOpen ? `${panelW}px` : "0px",
          transition: "max-width 0.3s ease",
        }}
      >
        <div
          className="flex flex-col h-full"
          style={{ width: `${panelW}px`, minWidth: `${panelW}px` }}
        >
          {hasVariants ? (
            /* Mode B: two tabs — Variants | Materials */
            <>
              <div className={`flex shrink-0 border-b ${dividerColor}`}>
                <button
                  onClick={() => setMode("variants")}
                  className={`flex-1 py-2 text-[10px] font-semibold uppercase tracking-widest transition-colors ${mode === "variants" ? tabActive : tabInactive}`}
                >
                  Variants
                </button>
                <button
                  onClick={() => setMode("materials")}
                  className={`flex-1 py-2 text-[10px] font-semibold uppercase tracking-widest transition-colors ${mode === "materials" ? tabActive : tabInactive}`}
                >
                  Materials
                </button>
              </div>

              <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
                {isLoadingData ? (
                  <SidebarSkeleton isLightBg={isLightBg} />
                ) : mode === "variants" ? (
                  <div className="p-2.5 flex flex-col gap-1">
                    {/* Base model option */}
                    <button
                      onClick={() => { onSelectVariant(null); onSelectMaterial(null); }}
                      className={`flex items-center gap-2 p-2 rounded-xl border transition-all text-left w-full ${
                        activeVariantId === null
                          ? isLightBg ? "border-gray-800 bg-gray-100" : "border-[hsl(44,54%,54%)] bg-[hsl(44,54%,54%)]/10"
                          : isLightBg ? "border-gray-200 hover:border-gray-300" : "border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${isLightBg ? "bg-gray-100 border border-gray-200" : "bg-white/5 border border-white/10"}`}>
                        <Box className={`w-3.5 h-3.5 ${isLightBg ? "text-gray-400" : "text-white/30"}`} />
                      </div>
                      <span className={`text-xs font-medium flex-1 truncate ${labelColor}`}>
                        {project?.defaultModelName || "Original"}
                      </span>
                    </button>
                    {/* Variant options */}
                    {variants.map((variant) => (
                      <button
                        key={variant.id}
                        onClick={() => { onSelectVariant(variant); onSelectMaterial(null); setMode("materials"); }}
                        className={`flex items-center gap-2 p-2 rounded-xl border transition-all text-left w-full ${
                          activeVariantId === variant.id
                            ? isLightBg ? "border-gray-800 bg-gray-100" : "border-[hsl(44,54%,54%)] bg-[hsl(44,54%,54%)]/10"
                            : isLightBg ? "border-gray-200 hover:border-gray-300" : "border-white/10 hover:border-white/20"
                        }`}
                      >
                        {variant.thumbnailUrl ? (
                          <img src={variant.thumbnailUrl} alt={variant.name} className="w-8 h-8 rounded-lg object-cover shrink-0 border border-white/10" />
                        ) : (
                          <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${isLightBg ? "bg-gray-100 border border-gray-200" : "bg-white/5 border border-white/10"}`}>
                            <Box className={`w-3.5 h-3.5 ${isLightBg ? "text-gray-400" : "text-white/30"}`} />
                          </div>
                        )}
                        <span className={`text-xs font-medium flex-1 truncate ${labelColor}`}>{variant.name}</span>
                        <ChevronRight className={`w-3 h-3 shrink-0 ${subColor}`} />
                      </button>
                    ))}
                  </div>
                ) : (
                  /* Materials tab */
                  <div className="p-2.5 flex flex-col gap-1">
                    <button
                      onClick={() => onSelectMaterial(null)}
                      className={`flex items-center gap-2 p-1.5 rounded-lg border transition-all text-left w-full ${
                        activeMaterialId === null
                          ? isLightBg ? "border-gray-700 bg-gray-50" : "border-[hsl(44,54%,54%)]/60 bg-[hsl(44,54%,54%)]/5"
                          : isLightBg ? "border-gray-200 hover:border-gray-300" : "border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className={`w-6 h-6 rounded shrink-0 flex items-center justify-center ${isLightBg ? "bg-gray-100 border border-gray-200" : "bg-white/5 border border-white/10"}`}>
                        <Palette className={`w-3 h-3 ${isLightBg ? "text-gray-400" : "text-white/30"}`} />
                      </div>
                      <span className={`text-xs ${labelColor}`}>{project?.defaultColorName || "Original Color"}</span>
                    </button>
                    {activeMaterials.map((mat) => (
                      <MaterialItem
                        key={mat.id}
                        mat={mat}
                        isActive={activeMaterialId === mat.id}
                        isLightBg={isLightBg}
                        labelColor={labelColor}
                        onSelect={() => onSelectMaterial(mat)}
                      />
                    ))}
                    {activeMaterials.length === 0 && (
                      <p className={`text-[10px] px-1 py-3 text-center ${subColor}`}>No colors for this model</p>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Mode A: only materials, no variants */
            <>
              <div className={`px-3 py-2.5 border-b shrink-0 ${dividerColor}`}>
                <span className={`text-[10px] font-semibold uppercase tracking-widest ${labelColor}`}>Colors</span>
              </div>
              <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
                {isLoadingData ? (
                  <SidebarSkeleton isLightBg={isLightBg} />
                ) : (
                  <div className="p-2.5 flex flex-col gap-1">
                    <button
                      onClick={() => onSelectMaterial(null)}
                      className={`flex items-center gap-2 p-1.5 rounded-lg border transition-all text-left w-full ${
                        activeMaterialId === null
                          ? isLightBg ? "border-gray-700 bg-gray-50" : "border-[hsl(44,54%,54%)]/60 bg-[hsl(44,54%,54%)]/5"
                          : isLightBg ? "border-gray-200 hover:border-gray-300" : "border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className={`w-6 h-6 rounded shrink-0 flex items-center justify-center ${isLightBg ? "bg-gray-100 border border-gray-200" : "bg-white/5 border border-white/10"}`}>
                        <Palette className={`w-3 h-3 ${isLightBg ? "text-gray-400" : "text-white/30"}`} />
                      </div>
                      <span className={`text-xs ${labelColor}`}>{project?.defaultColorName || "Original Color"}</span>
                    </button>
                    {baseMaterials.map((mat) => (
                      <MaterialItem
                        key={mat.id}
                        mat={mat}
                        isActive={activeMaterialId === mat.id}
                        isLightBg={isLightBg}
                        labelColor={labelColor}
                        onSelect={() => onSelectMaterial(mat)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MeasurementsOverlay({
  slug,
  isLightBg,
  metaReady,
}: {
  slug: string;
  isLightBg: boolean;
  metaReady: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { data: measurements } = useGetStudioMeasurements(slug, {
    query: {
      enabled: !!slug && metaReady,
      queryKey: getGetStudioMeasurementsQueryKey(slug),
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  const items = measurements ?? [];
  if (items.length === 0) return null;

  return (
    <div ref={panelRef} className="absolute bottom-16 left-4" style={{ zIndex: 25 }}>
      {/* Toggle button */}
      <button
        data-testid="button-measurements-toggle"
        onClick={() => setIsOpen((v) => !v)}
        title="Dimensions"
        className={`flex items-center justify-center w-9 h-9 rounded-full border shadow-lg transition-all ${
          isOpen
            ? "bg-[hsl(44,54%,54%)] border-[hsl(44,54%,54%)] text-black"
            : isLightBg
            ? "bg-white/80 border-gray-300 text-gray-700 hover:bg-white"
            : "bg-black/50 border-white/20 text-white/80 hover:bg-black/60"
        }`}
        style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
      >
        <Ruler className="w-4 h-4" />
      </button>

      {/* Panel */}
      <div
        className="absolute bottom-11 left-0"
        style={{
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? "scale(1) translateY(0)" : "scale(0.95) translateY(6px)",
          transition: "opacity 0.2s ease, transform 0.2s ease",
          pointerEvents: isOpen ? "auto" : "none",
        }}
      >
        <div
          className="rounded-xl shadow-2xl overflow-hidden"
          style={{
            background: "rgba(0,0,0,0.72)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.1)",
            minWidth: "180px",
            maxWidth: "240px",
          }}
        >
          <div className="px-3 py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-white/60">
              Dimensions
            </span>
          </div>
          <div className="p-2 flex flex-col gap-1 max-h-48 overflow-y-auto">
            {items.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-3 px-2 py-1.5 rounded-lg"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <span className="text-xs text-white/60 truncate">{m.label}</span>
                <span
                  className="text-xs font-medium shrink-0 tabular-nums"
                  style={{ color: "hsl(44,54%,54%)" }}
                >
                  {m.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Studio() {
  const { slug } = useParams<{ slug: string }>();
  const projectSlug = slug ?? "";
  const [activeVariant, setActiveVariant] = useState<StudioVariant | null>(null);
  const [activeMaterial, setActiveMaterial] = useState<ProjectMaterial | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [overlayOpacity, setOverlayOpacity] = useState(1);
  const [loadProgress, setLoadProgress] = useState(0);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [pendingSrc, setPendingSrc] = useState<string | null>(null);
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);
  const arButtonRef = useRef<HTMLButtonElement>(null);
  const modelViewerRef = useRef<HTMLElement>(null);

  const {
    data: meta,
    isLoading: isMetaLoading,
    isError: isMetaError,
  } = useGetStudioProjectMeta(projectSlug, {
    query: {
      enabled: !!projectSlug,
      queryKey: getGetStudioProjectMetaQueryKey(projectSlug),
      retry: false,
    },
  });

  const {
    data: fullProject,
    isLoading: isFullLoading,
  } = useGetStudioProject(projectSlug, {
    query: {
      enabled: !!meta,
      queryKey: getGetStudioProjectQueryKey(projectSlug),
      retry: false,
    },
  });

  const dismissOverlay = useCallback(() => {
    setOverlayOpacity(0);
    setTimeout(() => setOverlayVisible(false), 600);
  }, []);

  useEffect(() => {
    if (isMetaError && !isMetaLoading) {
      dismissOverlay();
      return undefined;
    }

    if (!meta) return undefined;

    const src = (() => {
      if (activeMaterial?.modelUrl) return activeMaterial.modelUrl;
      if (activeVariant?.modelUrl) return activeVariant.modelUrl;
      return meta.modelUrl;
    })();

    if (!src) {
      setTimeout(dismissOverlay, 400);
      return undefined;
    }

    const mv = modelViewerRef.current;
    if (!mv) {
      setTimeout(dismissOverlay, 800);
      return undefined;
    }

    const onLoad = () => dismissOverlay();
    const onError = () => dismissOverlay();

    mv.addEventListener("load", onLoad);
    mv.addEventListener("error", onError);

    const fallback = setTimeout(dismissOverlay, 8000);

    return () => {
      mv.removeEventListener("load", onLoad);
      mv.removeEventListener("error", onError);
      clearTimeout(fallback);
    };
  }, [meta, isMetaError, isMetaLoading, activeMaterial, activeVariant, dismissOverlay]);

  const baseModelUrl = meta?.modelUrl ?? null;

  const activeSrc = (() => {
    if (activeMaterial?.modelUrl) return activeMaterial.modelUrl;
    if (activeVariant?.modelUrl) return activeVariant.modelUrl;
    return baseModelUrl;
  })();

  useEffect(() => {
    if (!activeSrc) return;
    if (activeSrc === pendingSrc) return;
    setPendingSrc(activeSrc);
    setLoadProgress(0);
  }, [activeSrc, pendingSrc]);

  const handleSelectVariant = (variant: StudioVariant | null) => {
    setActiveVariant(variant);
    setActiveMaterial(null);
  };

  const handleSelectMaterial = (material: ProjectMaterial | null) => {
    setActiveMaterial(material);
  };

  useEffect(() => {
    const mv = modelViewerRef.current;
    if (!mv || !pendingSrc) return;
    const onProgress = (e: Event) => {
      const p = ((e as CustomEvent).detail?.totalProgress ?? 0) * 100;
      setLoadProgress(p);
    };
    const onLoad = () => {
      setLoadProgress(100);
      setDisplaySrc(pendingSrc);
    };
    mv.addEventListener("progress", onProgress);
    mv.addEventListener("load", onLoad);
    return () => {
      mv.removeEventListener("progress", onProgress);
      mv.removeEventListener("load", onLoad);
    };
  }, [pendingSrc]);

  const handlePhotoCapture = useCallback(async () => {
    const mv = modelViewerRef.current as any;
    if (!mv) return;
    try {
      const blob: Blob = await mv.toBlob({ idealAspect: false });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${meta?.name ?? "model"}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 2000);
    } catch (err) {
      console.warn("[AR Studio] Photo capture failed:", err);
    }
  }, [meta?.name]);

  if (isMetaError && !isMetaLoading && !overlayVisible) {
    return (
      <div className="min-h-dvh bg-background flex flex-col items-center justify-center gap-6">
        <div className="w-20 h-20 rounded-full border border-primary/20 flex items-center justify-center">
          <Box className="w-8 h-8 text-primary/40" />
        </div>
        <div className="text-center">
          <h1 className="font-serif text-2xl font-bold mb-2">Experience Not Found</h1>
          <p className="text-muted-foreground font-light text-sm max-w-xs">
            This AR experience is not available or has been deactivated.
          </p>
        </div>
        <a href="/" className="text-primary text-sm hover:underline font-medium">
          Return to Studio
        </a>
      </div>
    );
  }

  const envStyle = meta ? (ENV_STYLES[meta.environment] ?? ENV_STYLES.black) : { background: "#0a0a0a" };
  const textClass = meta ? (ENV_TEXT[meta.environment] ?? "text-white") : "text-white";
  const isLightBg = !!meta && (meta.environment === "white" || meta.environment === "walls-plants");

  const showSidebar = !!(
    meta &&
    (isFullLoading || !fullProject ||
      (fullProject.variants?.length ?? 0) > 0 ||
      (fullProject.materials?.length ?? 0) > 0)
  );

  return (
    <>
      {overlayVisible && (
        <LuxuryLoadingScreen projectName={meta?.name} opacity={overlayOpacity} />
      )}

      <div
        className="flex flex-col"
        style={{
          height: "100dvh",
          ...envStyle,
          opacity: 1 - overlayOpacity,
          transition: "opacity 0.5s ease",
        }}
        data-testid="studio-page"
      >
        <div className="flex-1 relative min-h-0">
          <div
            style={{
              position: "absolute", top: 0, left: 0, zIndex: 10,
              height: 4,
              width: `${loadProgress}%`,
              background: "hsl(44,54%,54%)",
              borderRadius: "0 2px 2px 0",
              transition: "width 0.2s ease, opacity 0.5s ease",
              opacity: loadProgress >= 100 ? 0 : 1,
              pointerEvents: "none",
            }}
          />

          {pendingSrc ? (
            <model-viewer
              ref={modelViewerRef}
              src={pendingSrc}
              alt={meta?.name ?? ""}
              camera-controls
              auto-rotate
              ar
              ar-modes="scene-viewer quick-look"
              ar-scale="fixed"
              shadow-intensity="1"
              camera-target={meta ? `${meta.hotspotX}m ${meta.hotspotY}m ${meta.hotspotZ}m` : undefined}
              style={{
                width: "100%",
                height: "100%",
                display: "block",
                opacity: displaySrc === pendingSrc ? 1 : 0.6,
                transition: "opacity 0.3s ease",
              }}
              interaction-prompt="none"
              data-testid="studio-model-viewer"
            >
              <button
                ref={arButtonRef}
                slot="ar-button"
                data-testid="button-view-in-ar"
                aria-hidden="true"
                style={{ display: "none" }}
              />
            </model-viewer>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <div className={`w-20 h-20 rounded-full border-2 border-dashed flex items-center justify-center ${isLightBg ? "border-gray-300" : "border-white/20"}`}>
                <Box className={`w-8 h-8 ${isLightBg ? "text-gray-400" : "text-white/30"}`} />
              </div>
              <p className={`text-sm font-light ${isLightBg ? "text-gray-500" : "text-white/50"}`}>
                No 3D model configured
              </p>
            </div>
          )}

          {showSidebar && (
            <VariationSidebar
              project={fullProject ?? null}
              meta={meta}
              isLightBg={isLightBg}
              activeVariantId={activeVariant?.id ?? null}
              activeMaterialId={activeMaterial?.id ?? null}
              isLoadingData={isFullLoading}
              onSelectVariant={handleSelectVariant}
              onSelectMaterial={handleSelectMaterial}
            />
          )}

          {projectSlug && (
            <MeasurementsOverlay slug={projectSlug} isLightBg={isLightBg} metaReady={!!meta} />
          )}
        </div>

        <footer
          className={`flex items-center justify-between px-4 py-3 shrink-0 ${isLightBg ? "border-t border-gray-200/60" : "border-t border-white/8"}`}
          style={{ background: "rgba(0,0,0,0.15)" }}
        >
          <div className="flex flex-col min-w-0">
            {meta?.name && (
              <p className={`text-sm font-semibold tracking-wide truncate leading-tight ${textClass}`}>
                {meta.name}
              </p>
            )}
            {meta?.companyName && (
              <p
                className="text-[10px] font-light tracking-widest uppercase truncate"
                style={{ color: "hsl(44,54%,54%,0.8)" }}
              >
                {meta.companyName}
              </p>
            )}
          </div>
          {pendingSrc && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                data-testid="footer-photo-capture"
                onClick={handlePhotoCapture}
                title="Save photo"
                className={`relative flex items-center justify-center w-9 h-9 rounded-full border transition-all ${
                  isLightBg
                    ? "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                    : "bg-white/10 border-white/20 text-white/80 hover:bg-white/15"
                }`}
              >
                <Camera className="w-4 h-4" />
                <span
                  className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap pointer-events-none"
                  style={{
                    background: "hsl(44,54%,54%)",
                    color: "#000",
                    opacity: savedFeedback ? 1 : 0,
                    transition: "opacity 0.25s ease",
                  }}
                >
                  Saved!
                </span>
              </button>

              <button
                data-testid="footer-view-in-ar"
                onClick={() => arButtonRef.current?.click()}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all ${
                  isLightBg
                    ? "bg-gray-900 text-white hover:bg-gray-700"
                    : "bg-[hsl(44,54%,54%)] text-black hover:opacity-90"
                }`}
              >
                View in AR
              </button>
            </div>
          )}
        </footer>
      </div>
    </>
  );
}
