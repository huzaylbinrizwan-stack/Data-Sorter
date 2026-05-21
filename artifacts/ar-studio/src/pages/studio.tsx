import { useState, useRef, useEffect, useCallback, lazy, Suspense } from "react";
const ThreeStudioViewer = lazy(() =>
  import("../components/ThreeStudioViewer").then((m) => ({ default: m.ThreeStudioViewer }))
);
import { useParams } from "wouter";
import { QRCodeSVG } from "qrcode.react";
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
  "warm-minimal": { background: "#cfc7ba" },
  "studio-grey": { background: "#8a8480" },
  "natural-arch": { background: "#c8b898" },
  "duplex-room": { background: "#b0a898" },
  "room-map-1": { background: "#c8c0b4" },
  "custom-room": { background: "#c0b8b0" },
};

const ENV_TEXT: Record<string, string> = {
  black: "text-white",
  white: "text-gray-900",
  "luxury-home": "text-white",
  "classic-luxury": "text-white",
  "walls-plants": "text-gray-800",
  "warm-minimal": "text-gray-800",
  "studio-grey": "text-white",
  "natural-arch": "text-gray-800",
  "duplex-room": "text-gray-800",
  "room-map-1": "text-gray-800",
  "custom-room": "text-gray-800",
};

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
}

function LuxuryLoadingScreen({ projectName, opacity, accentColor }: { projectName?: string; opacity: number; accentColor: string }) {
  const [ar, ag, ab] = hexToRgb(accentColor);
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-50"
      style={{
        background: "linear-gradient(135deg, #1a0f08 0%, #0f0804 50%, #1a0f08 100%)",
        opacity,
        transition: "opacity 0.5s ease",
        pointerEvents: opacity === 0 ? "none" : "auto",
      }}
    >
      <div className="relative w-20 h-20 mb-8">
        <div
          className="absolute inset-0 rounded-full animate-spin"
          style={{
            background: `conic-gradient(from 0deg, transparent 0%, ${accentColor} 30%, transparent 60%)`,
            mask: "radial-gradient(transparent 55%, black 56%)",
            WebkitMask: "radial-gradient(transparent 55%, black 56%)",
          }}
        />
        <div
          className="absolute inset-[6px] rounded-full"
          style={{ border: `1px solid rgba(${ar},${ag},${ab},0.15)` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Box className="w-6 h-6" style={{ color: accentColor }} />
        </div>
      </div>

      <div className="text-center px-8 max-w-xs">
        {projectName ? (
          <>
            <p
              className="text-sm font-light tracking-widest uppercase mb-2"
              style={{ color: accentColor }}
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
        style={{ color: `rgba(${ar},${ag},${ab},0.4)` }}
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
  accentColor,
  onSelect,
  textStyle,
}: {
  mat: ProjectMaterial;
  isActive: boolean;
  isLightBg: boolean;
  labelColor: string;
  accentColor: string;
  onSelect: () => void;
  textStyle?: React.CSSProperties;
}) {
  const [ar, ag, ab] = hexToRgb(accentColor);
  const activeDarkStyle: React.CSSProperties = !isLightBg && isActive
    ? { borderColor: `rgba(${ar},${ag},${ab},0.5)`, background: `rgba(${ar},${ag},${ab},0.05)` }
    : {};
  return (
    <button
      onClick={onSelect}
      className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all text-left w-full ${
        isActive
          ? isLightBg
            ? "border-gray-700 bg-gray-50"
            : "border-transparent"
          : isLightBg
          ? "border-gray-200 hover:border-gray-300"
          : "border-white/10 hover:border-white/20"
      }`}
      style={activeDarkStyle}
    >
      {mat.thumbnailUrl ? (
        <img src={mat.thumbnailUrl} alt={mat.name} className="w-7 h-7 rounded-lg object-cover shrink-0" />
      ) : (
        <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center ${isLightBg ? "bg-gray-100 border border-gray-200" : "bg-white/5 border border-white/8"}`}>
          <Palette className={`w-3.5 h-3.5 ${isLightBg ? "text-gray-400" : "text-white/25"}`} />
        </div>
      )}
      <span className={`text-xs truncate ${labelColor}`} style={textStyle}>{mat.name}</span>
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
  accentColor,
  onSelectVariant,
  onSelectMaterial,
}: {
  project: StudioProject | null;
  meta: StudioProjectMeta | null | undefined;
  isLightBg: boolean;
  activeVariantId: number | null;
  activeMaterialId: number | null;
  isLoadingData: boolean;
  accentColor: string;
  onSelectVariant: (variant: StudioVariant | null) => void;
  onSelectMaterial: (material: ProjectMaterial | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [mode, setMode] = useState<SidebarMode>("variants");

  const sidebarColor = meta?.studioSidebarColor ?? "#000000";
  const sidebarOpacity = meta?.studioSidebarOpacity ?? 0.65;
  const sidebarTextColor = meta?.studioSidebarTextColor ?? null;
  const [r, g, b] = hexToRgb(sidebarColor);
  const [ar, ag, ab] = hexToRgb(accentColor);

  // Compute effective luminance blending sidebar colour with the environment
  const sidebarLum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  const envLum = isLightBg ? 0.9 : 0.1;
  const effectiveLum = sidebarLum * sidebarOpacity + envLum * (1 - sidebarOpacity);
  const isSidebarLight = effectiveLum > 0.4;

  const glassStyle: React.CSSProperties = {
    background: `rgba(${r}, ${g}, ${b}, ${sidebarOpacity})`,
    borderColor: isSidebarLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.08)",
  };

  const labelColor = isSidebarLight ? "text-gray-800" : "text-white/90";
  const subColor = isSidebarLight ? "text-gray-500" : "text-white/45";
  const dividerColor = isSidebarLight ? "border-gray-300/50" : "border-white/8";
  const tabInactive = isSidebarLight ? "text-gray-500 hover:text-gray-800" : "text-white/40 hover:text-white/70";
  const tabActiveStyle: React.CSSProperties = isSidebarLight
    ? { background: "#111827", color: "#fff" }
    : { background: accentColor, color: "#000" };
  const activeItemBorderStyle: React.CSSProperties = isSidebarLight
    ? {}
    : { borderColor: `rgba(${ar},${ag},${ab},0.5)`, background: `rgba(${ar},${ag},${ab},0.08)` };
  const activeMaterialBorderStyle: React.CSSProperties = isSidebarLight
    ? {}
    : { borderColor: `rgba(${ar},${ag},${ab},0.5)`, background: `rgba(${ar},${ag},${ab},0.05)` };

  // Admin-overridden text colour — applied as inline style so it wins over Tailwind classes
  const textStyle: React.CSSProperties | undefined = sidebarTextColor ? { color: sidebarTextColor } : undefined;
  // Sub-text at 65 % opacity of the chosen text colour
  const subTextStyle: React.CSSProperties | undefined = sidebarTextColor
    ? { color: `${sidebarTextColor}a6` }
    : undefined;

  const hasVariants = !!(project?.enableVariants && project.variants && project.variants.length > 0);
  const baseMaterials = project?.materials ?? [];
  const variants = project?.variants ?? [];

  const activeVariant = variants.find((v) => v.id === activeVariantId) ?? null;
  const activeMaterials = activeVariantId === null
    ? baseMaterials
    : (activeVariant?.materials ?? []);

  // Responsive panel: 50 % of viewport on mobile, capped at 252 px on larger screens
  const panelSize = "min(50vw, 252px)";

  return (
    <div
      className="absolute right-0 top-0 h-full flex items-stretch"
      style={{ zIndex: 20 }}
    >
      {/* Toggle tab — always visible, on left edge of drawer */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Collapse variations" : "Expand variations"}
        className="flex items-center justify-center shadow-xl transition-all rounded-l-lg self-center shrink-0"
        style={{
          width: "18px",
          height: "44px",
          background: "rgba(15,10,5,0.72)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRight: "none",
        }}
      >
        {isOpen
          ? <ChevronLeft className="w-3 h-3 text-white/55" />
          : <ChevronRight className="w-3 h-3 text-white/55" />}
      </button>

      {/* Drawer panel — always mounted, slides via max-width */}
      <div
        className="border-l backdrop-blur-xl shadow-2xl flex flex-col h-full overflow-hidden"
        style={{
          ...glassStyle,
          maxWidth: isOpen ? panelSize : "0px",
          transition: "max-width 0.3s ease",
        }}
      >
        <div
          className="flex flex-col h-full"
          style={{ width: panelSize, minWidth: panelSize }}
        >
          {hasVariants ? (
            /* Mode B: two tabs — Variants | Materials */
            <>
              <div className={`flex shrink-0 border-b ${dividerColor}`}>
                <button
                  onClick={() => setMode("variants")}
                  className={`flex-1 py-2.5 text-[10px] font-semibold uppercase tracking-widest transition-colors ${mode === "variants" ? "" : tabInactive}`}
                  style={mode === "variants" ? tabActiveStyle : { ...textStyle }}
                >
                  Variants
                </button>
                <button
                  onClick={() => setMode("materials")}
                  className={`flex-1 py-2.5 text-[10px] font-semibold uppercase tracking-widest transition-colors ${mode === "materials" ? "" : tabInactive}`}
                  style={mode === "materials" ? tabActiveStyle : { ...textStyle }}
                >
                  Materials
                </button>
              </div>

              <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
                {isLoadingData ? (
                  <SidebarSkeleton isLightBg={isSidebarLight} />
                ) : mode === "variants" ? (
                  <div className="p-3 flex flex-col gap-1.5">
                    {/* Base model option */}
                    <button
                      onClick={() => { onSelectVariant(null); onSelectMaterial(null); }}
                      className={`flex items-center gap-2.5 p-2.5 rounded-2xl border transition-all text-left w-full ${
                        activeVariantId === null
                          ? isSidebarLight ? "border-gray-800 bg-gray-100" : "border-transparent"
                          : isSidebarLight ? "border-gray-200 hover:border-gray-300" : "border-white/10 hover:border-white/20"
                      }`}
                      style={activeVariantId === null && !isSidebarLight ? activeItemBorderStyle : undefined}
                    >
                      <div className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center ${isSidebarLight ? "bg-gray-100 border border-gray-200" : "bg-white/5 border border-white/8"}`}>
                        <Box className={`w-4 h-4 ${isSidebarLight ? "text-gray-400" : "text-white/25"}`} />
                      </div>
                      <span className={`text-xs font-medium flex-1 truncate ${labelColor}`} style={textStyle}>
                        {project?.defaultModelName || "Original"}
                      </span>
                    </button>
                    {/* Variant options */}
                    {variants.map((variant) => (
                      <button
                        key={variant.id}
                        onClick={() => { onSelectVariant(variant); onSelectMaterial(null); setMode("materials"); }}
                        className={`flex items-center gap-2.5 p-2.5 rounded-2xl border transition-all text-left w-full ${
                          activeVariantId === variant.id
                            ? isSidebarLight ? "border-gray-800 bg-gray-100" : "border-transparent"
                            : isSidebarLight ? "border-gray-200 hover:border-gray-300" : "border-white/10 hover:border-white/20"
                        }`}
                        style={activeVariantId === variant.id && !isSidebarLight ? activeItemBorderStyle : undefined}
                      >
                        {variant.thumbnailUrl ? (
                          <img src={variant.thumbnailUrl} alt={variant.name} className="w-9 h-9 rounded-xl object-cover shrink-0 border border-white/8" />
                        ) : (
                          <div className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center ${isSidebarLight ? "bg-gray-100 border border-gray-200" : "bg-white/5 border border-white/8"}`}>
                            <Box className={`w-4 h-4 ${isSidebarLight ? "text-gray-400" : "text-white/25"}`} />
                          </div>
                        )}
                        <span className={`text-xs font-medium flex-1 truncate ${labelColor}`} style={textStyle}>{variant.name}</span>
                        <ChevronRight className={`w-3 h-3 shrink-0 ${subColor}`} style={subTextStyle} />
                      </button>
                    ))}
                  </div>
                ) : (
                  /* Materials tab */
                  <div className="p-3 flex flex-col gap-1.5">
                    <button
                      onClick={() => onSelectMaterial(null)}
                      className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all text-left w-full ${
                        activeMaterialId === null
                          ? isSidebarLight ? "border-gray-700 bg-gray-50" : "border-transparent"
                          : isSidebarLight ? "border-gray-200 hover:border-gray-300" : "border-white/10 hover:border-white/20"
                      }`}
                      style={activeMaterialId === null && !isSidebarLight ? activeMaterialBorderStyle : undefined}
                    >
                      <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center ${isSidebarLight ? "bg-gray-100 border border-gray-200" : "bg-white/5 border border-white/8"}`}>
                        <Palette className={`w-3.5 h-3.5 ${isSidebarLight ? "text-gray-400" : "text-white/25"}`} />
                      </div>
                      <span className={`text-xs ${labelColor}`} style={textStyle}>{project?.defaultColorName || "Original Color"}</span>
                    </button>
                    {activeMaterials.map((mat) => (
                      <MaterialItem
                        key={mat.id}
                        mat={mat}
                        isActive={activeMaterialId === mat.id}
                        isLightBg={isSidebarLight}
                        labelColor={labelColor}
                        accentColor={accentColor}
                        onSelect={() => onSelectMaterial(mat)}
                        textStyle={textStyle}
                      />
                    ))}
                    {activeMaterials.length === 0 && (
                      <p className={`text-[10px] px-1 py-3 text-center ${subColor}`} style={subTextStyle}>No colors for this model</p>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Mode A: only materials, no variants */
            <>
              <div className={`px-3 py-3 border-b shrink-0 ${dividerColor}`}>
                <span className={`text-[10px] font-semibold uppercase tracking-widest ${labelColor}`} style={textStyle}>Colors</span>
              </div>
              <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
                {isLoadingData ? (
                  <SidebarSkeleton isLightBg={isSidebarLight} />
                ) : (
                  <div className="p-3 flex flex-col gap-1.5">
                    <button
                      onClick={() => onSelectMaterial(null)}
                      className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all text-left w-full ${
                        activeMaterialId === null
                          ? isSidebarLight ? "border-gray-700 bg-gray-50" : "border-transparent"
                          : isSidebarLight ? "border-gray-200 hover:border-gray-300" : "border-white/10 hover:border-white/20"
                      }`}
                      style={activeMaterialId === null && !isSidebarLight ? activeMaterialBorderStyle : undefined}
                    >
                      <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center ${isSidebarLight ? "bg-gray-100 border border-gray-200" : "bg-white/5 border border-white/8"}`}>
                        <Palette className={`w-3.5 h-3.5 ${isSidebarLight ? "text-gray-400" : "text-white/25"}`} />
                      </div>
                      <span className={`text-xs ${labelColor}`} style={textStyle}>{project?.defaultColorName || "Original Color"}</span>
                    </button>
                    {baseMaterials.map((mat) => (
                      <MaterialItem
                        key={mat.id}
                        mat={mat}
                        isActive={activeMaterialId === mat.id}
                        isLightBg={isSidebarLight}
                        labelColor={labelColor}
                        accentColor={accentColor}
                        onSelect={() => onSelectMaterial(mat)}
                        textStyle={textStyle}
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
  accentColor,
}: {
  slug: string;
  isLightBg: boolean;
  metaReady: boolean;
  accentColor: string;
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
    <div ref={panelRef} className="absolute bottom-24 left-4" style={{ zIndex: 25 }}>
      {/* Toggle button */}
      <button
        data-testid="button-measurements-toggle"
        onClick={() => setIsOpen((v) => !v)}
        title="Dimensions"
        className={`flex items-center justify-center w-9 h-9 rounded-full border shadow-lg transition-all ${
          isOpen
            ? ""
            : isLightBg
            ? "bg-white/80 border-gray-300 text-gray-700 hover:bg-white"
            : "bg-black/50 border-white/20 text-white/80 hover:bg-black/60"
        }`}
        style={{
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          ...(isOpen ? { background: accentColor, borderColor: accentColor, color: "#000" } : {}),
        }}
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
                  style={{ color: accentColor }}
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
  const [showQrModal, setShowQrModal] = useState(false);
  const arButtonRef = useRef<HTMLButtonElement>(null);
  const modelViewerRef = useRef<HTMLElement>(null);

  const isDesktop = !/Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  useEffect(() => {
    if (!showQrModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowQrModal(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showQrModal]);

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

  useEffect(() => {
    if (!meta?.studioBackgroundUrl) return;
    const mv = modelViewerRef.current as HTMLElement | null;
    if (!mv) return;
    const applyTransparency = () => {
      mv.style.setProperty("--mv-background-color", "rgba(0,0,0,0)");
      mv.style.backgroundColor = "transparent";
    };
    applyTransparency();
    mv.addEventListener("load", applyTransparency);
    return () => mv.removeEventListener("load", applyTransparency);
  }, [pendingSrc, meta?.studioBackgroundUrl]);

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

  const hasBgPhoto = false; // TODO: restore to !!(meta?.studioBackgroundUrl) once mobile rendering is confirmed (Task #43)
  const bgScale = meta?.studioBackgroundScale ?? 100;
  const envStyle = hasBgPhoto
    ? { backgroundColor: "#1a1410" }
    : meta ? (ENV_STYLES[meta.environment] ?? ENV_STYLES["walls-plants"]) : ENV_STYLES["walls-plants"];

  const hasModelPlacement = meta && meta.studioModelX != null && meta.studioModelY != null && meta.studioModelSize != null;
  const studioModelViewerStyle: React.CSSProperties = hasModelPlacement
    ? {
        position: "absolute",
        left: `${meta!.studioModelX}%`,
        top: `${meta!.studioModelY}%`,
        width: `${meta!.studioModelSize}%`,
        height: `${meta!.studioModelSize}%`,
        transform: "translate(-50%, -50%)",
        display: "block",
        opacity: 1,
        transition: "opacity 0.3s ease",
      }
    : {
        width: "100%",
        height: "100%",
        display: "block",
        opacity: 1,
        transition: "opacity 0.3s ease",
      };
  const isThreeTheme = !!meta && (meta.environment === "warm-minimal" || meta.environment === "studio-grey" || meta.environment === "natural-arch" || meta.environment === "duplex-room" || meta.environment === "room-map-1" || meta.environment === "custom-room");
  const textClass = meta ? (ENV_TEXT[meta.environment] ?? "text-white") : "text-white";
  const isLightBg = !hasBgPhoto && !!meta && (meta.environment === "white" || meta.environment === "walls-plants" || meta.environment === "warm-minimal" || meta.environment === "duplex-room");
  const accentColor = meta?.studioAccentColor ?? "#C9A84C";

  const showSidebar = !!(
    meta &&
    (isFullLoading || !fullProject ||
      (fullProject.variants?.length ?? 0) > 0 ||
      (fullProject.materials?.length ?? 0) > 0)
  );

  return (
    <>
      {overlayVisible && (
        <LuxuryLoadingScreen projectName={meta?.name} opacity={overlayOpacity} accentColor={accentColor} />
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
        <div className="flex-1 relative min-h-0" style={{ overflow: "hidden" }}>
          {/* Background photo as <img> — immune to iOS Safari flex+min-h-0 CSS background-image bug.
              overflow:hidden on parent clips the zoomed image cleanly. */}
          {hasBgPhoto && (
            <img
              src={meta!.studioBackgroundUrl!}
              alt=""
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: `${meta!.studioFocalX ?? 50}% ${meta!.studioFocalY ?? 50}%`,
                transform: bgScale > 100 ? `scale(${bgScale / 100})` : undefined,
                transformOrigin: bgScale > 100 ? `${meta!.studioFocalX ?? 50}% ${meta!.studioFocalY ?? 50}%` : undefined,
                zIndex: 0,
                pointerEvents: "none",
              }}
            />
          )}

          <div
            style={{
              position: "absolute", top: 0, left: 0, zIndex: 10,
              height: 4,
              width: `${loadProgress}%`,
              background: accentColor,
              borderRadius: "0 2px 2px 0",
              transition: "width 0.2s ease, opacity 0.5s ease",
              opacity: loadProgress >= 100 ? 0 : 1,
              pointerEvents: "none",
            }}
          />

          {pendingSrc ? (
            isThreeTheme ? (
              <>
                <Suspense fallback={null}>
                  <ThreeStudioViewer
                    modelUrl={pendingSrc}
                    theme={meta!.environment as "warm-minimal" | "studio-grey" | "natural-arch" | "duplex-room" | "room-map-1" | "custom-room"}
                    pedestalColor={meta!.pedestalColor}
                    pedestalHeight={meta!.pedestalHeight}
                    modelRotationY={meta!.modelRotationY}
                    roomGlbUrl={meta!.roomGlbUrl}
                    threeIntroEnabled={meta!.threeIntroEnabled}
                    onLoad={() => {
                      setLoadProgress(100);
                    }}
                  />
                </Suspense>
                {/* Hidden model-viewer purely for AR session launch */}
                <model-viewer
                  ref={modelViewerRef}
                  src={pendingSrc}
                  alt={meta?.name ?? ""}
                  ar
                  ar-modes="scene-viewer quick-look"
                  ar-scale={meta?.isScalable ? "auto" : "fixed"}
                  style={{
                    position: "absolute",
                    width: "1px",
                    height: "1px",
                    opacity: 0,
                    pointerEvents: "none",
                    top: 0,
                    left: 0,
                    zIndex: 0,
                  }}
                >
                  <button
                    ref={arButtonRef}
                    slot="ar-button"
                    data-testid="button-view-in-ar"
                    aria-hidden="true"
                    style={{ display: "none" }}
                  />
                </model-viewer>
              </>
            ) : (
            <model-viewer
              ref={modelViewerRef}
              src={pendingSrc}
              alt={meta?.name ?? ""}
              camera-controls
              {...(!hasModelPlacement ? { "auto-rotate": "" } : {})}
              ar
              ar-modes="scene-viewer quick-look"
              ar-scale={meta?.isScalable ? "auto" : "fixed"}
              disable-tap={meta?.isScalable ? undefined : ""}
              shadow-intensity="1"
              camera-target={meta ? `${meta.hotspotX}m ${meta.hotspotY}m ${meta.hotspotZ}m` : undefined}
              style={{
                ...studioModelViewerStyle,
                opacity: displaySrc === pendingSrc ? 1 : 0.6,
                zIndex: 1,
                ["--mv-background-color" as string]: "rgba(0,0,0,0)",
                backgroundColor: "transparent",
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
            )
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
              accentColor={accentColor}
              onSelectVariant={handleSelectVariant}
              onSelectMaterial={handleSelectMaterial}
            />
          )}

          {projectSlug && (
            <MeasurementsOverlay slug={projectSlug} isLightBg={isLightBg} metaReady={!!meta} accentColor={accentColor} />
          )}

          {/* Floating pill action bar */}
          <div
            className="absolute left-0 right-0 flex items-center justify-center px-4"
            style={{
              zIndex: 22,
              pointerEvents: "none",
              bottom: "max(1rem, calc(env(safe-area-inset-bottom, 0px) + 0.5rem))",
            }}
          >
            <div
              className="flex items-center w-full max-w-md px-4 py-2.5 rounded-2xl shadow-2xl"
              style={{
                background: isLightBg
                  ? "rgba(255,255,255,0.82)"
                  : "rgba(15,8,3,0.72)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: isLightBg
                  ? "1px solid rgba(0,0,0,0.07)"
                  : "1px solid rgba(255,255,255,0.07)",
                pointerEvents: "auto",
              }}
            >
              {/* Left zone: brand/product name */}
              <div className="flex flex-col min-w-0 flex-1">
                {meta?.name && (
                  <p
                    className="text-xs font-semibold tracking-wide truncate leading-tight"
                    style={{ color: isLightBg ? "#1a1410" : "#f0ebe4" }}
                  >
                    {meta.name}
                  </p>
                )}
                {meta?.companyName && (
                  <p
                    className="text-[10px] font-light tracking-widest uppercase truncate"
                    style={{ color: accentColor, opacity: 0.8 }}
                  >
                    {meta.companyName}
                  </p>
                )}
              </div>

              {/* Center zone: camera capture — hidden for Three.js themes (no modelViewerRef to capture from) */}
              {pendingSrc && !isThreeTheme && (
                <div className="flex items-center justify-center mx-3 shrink-0">
                  <button
                    data-testid="footer-photo-capture"
                    onClick={handlePhotoCapture}
                    title="Save photo"
                    className="relative flex items-center justify-center w-10 h-10 rounded-full transition-all active:scale-90"
                    style={{
                      background: isLightBg ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.1)",
                      border: isLightBg ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.12)",
                      color: isLightBg ? "#1a1410" : "rgba(255,255,255,0.8)",
                    }}
                  >
                    <Camera className="w-4 h-4" />
                    <span
                      className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap pointer-events-none"
                      style={{
                        background: accentColor,
                        color: "#000",
                        opacity: savedFeedback ? 1 : 0,
                        transition: "opacity 0.25s ease",
                      }}
                    >
                      Saved!
                    </span>
                  </button>
                </div>
              )}

              {/* Right zone: AR pill button — visible for all environments */}
              {pendingSrc && (
                <button
                  data-testid="footer-view-in-ar"
                  onClick={() => {
                    if (isDesktop) {
                      setShowQrModal(true);
                    } else {
                      arButtonRef.current?.click();
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-full text-sm font-semibold transition-all active:scale-95 shrink-0"
                  style={{
                    background: "#1a1410",
                    color: "#f5f0ea",
                    padding: "0.55rem 1.1rem",
                    letterSpacing: "0.02em",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.35)",
                  }}
                >
                  Place in Your Space
                  <span style={{ fontSize: "0.7rem", opacity: 0.85 }}>✦</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showQrModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
          style={{ background: "rgba(0,0,0,0.85)" }}
          onClick={() => setShowQrModal(false)}
          data-testid="qr-modal-backdrop"
        >
          <div
            className="relative flex flex-col items-center gap-5 rounded-2xl p-8"
            style={{
              background: "#0f0f0f",
              border: "1px solid rgba(201,168,76,0.25)",
              minWidth: 280,
            }}
            onClick={(e) => e.stopPropagation()}
            data-testid="qr-modal-card"
          >
            <button
              data-testid="qr-modal-close"
              onClick={() => setShowQrModal(false)}
              className="absolute top-3 right-4 text-white/40 hover:text-white/80 transition-colors text-xl leading-none"
              aria-label="Close"
            >
              ×
            </button>

            <div className="p-3 bg-white rounded-xl">
              <QRCodeSVG
                value={window.location.href}
                size={180}
                fgColor={accentColor}
                bgColor="#ffffff"
                level="M"
              />
            </div>

            <div className="text-center">
              <p className="text-white font-semibold tracking-wide text-base mb-1">
                Scan to view in AR
              </p>
              <p className="text-white/40 text-xs font-light leading-relaxed max-w-[200px]">
                Open your camera app and point it at the code to continue on your phone
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
