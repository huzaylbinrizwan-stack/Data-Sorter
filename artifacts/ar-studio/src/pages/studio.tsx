import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "wouter";
import {
  useGetStudioProjectMeta,
  useGetStudioProject,
  getGetStudioProjectMetaQueryKey,
  getGetStudioProjectQueryKey,
} from "@workspace/api-client-react";
import type { StudioProjectMeta, StudioProject, ProjectMaterial, StudioVariant } from "@workspace/api-client-react";
import { Box, Camera, ChevronLeft, ChevronRight, Palette } from "lucide-react";

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

function VariationSidebar({
  project,
  isLightBg,
  activeVariantId,
  activeMaterialId,
  isLoadingData,
  onSelectVariant,
  onSelectMaterial,
}: {
  project: StudioProject | null;
  isLightBg: boolean;
  activeVariantId: number | null;
  activeMaterialId: number | null;
  isLoadingData: boolean;
  onSelectVariant: (variant: StudioVariant | null) => void;
  onSelectMaterial: (material: ProjectMaterial | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedVariantId, setExpandedVariantId] = useState<number | null>(null);

  const glassBg = isLightBg
    ? "bg-white/85 border-gray-200/70"
    : "bg-black/60 border-white/10";
  const labelColor = isLightBg ? "text-gray-700" : "text-white/80";
  const subColor = isLightBg ? "text-gray-400" : "text-white/40";
  const dividerColor = isLightBg ? "border-gray-200/60" : "border-white/10";

  const hasVariants = !!(project?.enableVariants && project.variants && project.variants.length > 0);
  const baseMaterials = project?.materials ?? [];
  const variants = project?.variants ?? [];

  const isVariantActive = (v: StudioVariant) => activeVariantId === v.id;

  return (
    <div
      className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center"
      style={{ zIndex: 20, maxHeight: "calc(100% - 48px)" }}
    >
      {isOpen && (
        <div
          className={`rounded-l-2xl border border-r-0 backdrop-blur-xl shadow-2xl flex flex-col ${glassBg}`}
          style={{ width: "clamp(180px, 48vw, 224px)", maxHeight: "calc(100dvh - 140px)" }}
        >
          <div className={`flex items-center justify-between px-3 py-2.5 border-b shrink-0 ${dividerColor}`}>
            <span className={`text-[10px] font-semibold uppercase tracking-widest ${labelColor}`}>
              {hasVariants ? "Models & Colors" : "Colors"}
            </span>
          </div>

          {/* Scrollable content — shows skeleton until data loaded */}
          <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
            {isLoadingData ? (
              <SidebarSkeleton isLightBg={isLightBg} />
            ) : (
              <div className="p-2.5 flex flex-col gap-1">
                {/* Default / original model option */}
                <button
                  onClick={() => { onSelectVariant(null); onSelectMaterial(null); setExpandedVariantId(null); }}
                  className={`flex items-center gap-2 p-2 rounded-xl border transition-all text-left w-full ${
                    activeVariantId === null
                      ? isLightBg
                        ? "border-gray-800 bg-gray-100"
                        : "border-[hsl(44,54%,54%)] bg-[hsl(44,54%,54%)]/10"
                      : isLightBg
                      ? "border-gray-200 hover:border-gray-300"
                      : "border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${isLightBg ? "bg-gray-100 border border-gray-200" : "bg-white/5 border border-white/10"}`}>
                    <Box className={`w-3.5 h-3.5 ${isLightBg ? "text-gray-400" : "text-white/30"}`} />
                  </div>
                  <span className={`text-xs font-medium flex-1 truncate ${labelColor}`}>
                    {project?.defaultModelName || "Original"}
                  </span>
                  <ChevronRight
                    className={`w-3 h-3 shrink-0 transition-transform duration-200 ${subColor} ${activeVariantId === null ? "rotate-90" : ""}`}
                  />
                </button>

                {/* Base model colors — shown when base model is selected */}
                {activeVariantId === null && (
                  <div className={`ml-2.5 pl-2.5 border-l flex flex-col gap-1 ${dividerColor}`}>
                    <button
                      onClick={() => onSelectMaterial(null)}
                      className={`flex items-center gap-2 p-1.5 rounded-lg border transition-all text-left w-full ${
                        activeMaterialId === null
                          ? isLightBg
                            ? "border-gray-700 bg-gray-50"
                            : "border-[hsl(44,54%,54%)]/60 bg-[hsl(44,54%,54%)]/5"
                          : isLightBg
                          ? "border-gray-200 hover:border-gray-300"
                          : "border-white/10 hover:border-white/20"
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

                {/* Variant list */}
                {variants.map((variant) => {
                  const variantMaterials = variant.materials ?? [];
                  const isExpanded = expandedVariantId === variant.id;

                  return (
                    <div key={variant.id} className="flex flex-col gap-1">
                      <button
                        onClick={() => {
                          onSelectVariant(variant);
                          onSelectMaterial(null);
                          setExpandedVariantId(isExpanded && isVariantActive(variant) ? null : variant.id);
                        }}
                        className={`flex items-center gap-2 p-2 rounded-xl border transition-all text-left w-full ${
                          isVariantActive(variant)
                            ? isLightBg
                              ? "border-gray-800 bg-gray-100"
                              : "border-[hsl(44,54%,54%)] bg-[hsl(44,54%,54%)]/10"
                            : isLightBg
                            ? "border-gray-200 hover:border-gray-300"
                            : "border-white/10 hover:border-white/20"
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
                        <ChevronRight
                          className={`w-3 h-3 shrink-0 transition-transform duration-200 ${subColor} ${isVariantActive(variant) && isExpanded ? "rotate-90" : ""}`}
                        />
                      </button>

                      {isVariantActive(variant) && isExpanded && (
                        <div className={`ml-2.5 pl-2.5 border-l flex flex-col gap-1 ${dividerColor}`}>
                          <button
                            onClick={() => onSelectMaterial(null)}
                            className={`flex items-center gap-2 p-1.5 rounded-lg border transition-all text-left w-full ${
                              activeMaterialId === null
                                ? isLightBg
                                  ? "border-gray-700 bg-gray-50"
                                  : "border-[hsl(44,54%,54%)]/60 bg-[hsl(44,54%,54%)]/5"
                                : isLightBg
                                ? "border-gray-200 hover:border-gray-300"
                                : "border-white/10 hover:border-white/20"
                            }`}
                          >
                            <div className={`w-6 h-6 rounded shrink-0 flex items-center justify-center ${isLightBg ? "bg-gray-100 border border-gray-200" : "bg-white/5 border border-white/10"}`}>
                              <Palette className={`w-3 h-3 ${isLightBg ? "text-gray-400" : "text-white/30"}`} />
                            </div>
                            <span className={`text-xs ${labelColor}`}>{project?.defaultColorName || "Original Color"}</span>
                          </button>
                          {variantMaterials.map((mat) => (
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
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toggle tab — always visible on right edge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Collapse variations" : "Expand variations"}
        className={`flex items-center justify-center w-5 rounded-l-lg border-l border-y backdrop-blur-md shadow-xl transition-all ${glassBg}`}
        style={{ height: "52px" }}
      >
        {isOpen
          ? <ChevronRight className={`w-3 h-3 ${subColor}`} />
          : <ChevronLeft className={`w-3 h-3 ${subColor}`} />}
      </button>
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

  const handleSelectVariant = (variant: StudioVariant | null) => {
    setActiveVariant(variant);
    setActiveMaterial(null);
  };

  const handleSelectMaterial = (material: ProjectMaterial | null) => {
    setActiveMaterial(material);
  };

  useEffect(() => {
    const mv = modelViewerRef.current;
    if (!mv || !activeSrc) return;
    setLoadProgress(0);
    const onProgress = (e: Event) => {
      const p = ((e as CustomEvent).detail?.totalProgress ?? 0) * 100;
      setLoadProgress(p);
    };
    const onLoad = () => setLoadProgress(100);
    mv.addEventListener("progress", onProgress);
    mv.addEventListener("load", onLoad);
    return () => {
      mv.removeEventListener("progress", onProgress);
      mv.removeEventListener("load", onLoad);
    };
  }, [activeSrc]);

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

  return (
    <>
      {/* Luxury loading overlay — stays in DOM until fade completes */}
      {overlayVisible && (
        <LuxuryLoadingScreen projectName={meta?.name} opacity={overlayOpacity} />
      )}

      {/* Main studio layout */}
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
        {/* Viewer — fills all remaining height; renders as soon as phase-1 meta arrives */}
        <div className="flex-1 relative min-h-0">
          {/* Gold progress bar — 4px, top of viewer, driven by model-viewer progress event */}
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

          {activeSrc ? (
            <model-viewer
              ref={modelViewerRef}
              src={activeSrc}
              alt={meta?.name ?? ""}
              camera-controls
              auto-rotate
              ar
              ar-modes="scene-viewer quick-look"
              ar-scale="fixed"
              shadow-intensity="1"
              camera-target={meta ? `${meta.hotspotX}m ${meta.hotspotY}m ${meta.hotspotZ}m` : undefined}
              style={{ width: "100%", height: "100%", display: "block" }}
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

          {/* Floating variation sidebar — shown while loading (skeleton) or when content exists */}
          {(isFullLoading || !fullProject || (fullProject.variants?.length ?? 0) > 0 || (fullProject.materials?.length ?? 0) > 0) && (
            <VariationSidebar
              project={fullProject ?? null}
              isLightBg={isLightBg}
              activeVariantId={activeVariant?.id ?? null}
              activeMaterialId={activeMaterial?.id ?? null}
              isLoadingData={isFullLoading || !fullProject}
              onSelectVariant={handleSelectVariant}
              onSelectMaterial={handleSelectMaterial}
            />
          )}

          {/* AR Studio watermark */}
          <div
            className={`absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 text-[10px] font-light tracking-wider pointer-events-none ${isLightBg ? "text-gray-300" : "text-white/20"}`}
          >
            <Box className="w-2.5 h-2.5" />
            <span>AR Studio</span>
          </div>
        </div>

        {/* Footer — pinned at bottom */}
        <footer
          className={`shrink-0 px-5 py-3.5 flex items-center gap-3 backdrop-blur-sm border-t ${
            isLightBg
              ? "bg-white/80 border-gray-200/50"
              : "bg-black/60 border-white/10"
          }`}
        >
          <div className="flex-1 min-w-0">
            <h1 className={`font-serif text-lg font-semibold leading-tight truncate ${textClass}`}>
              {meta?.name ?? ""}
            </h1>
            {meta?.companyName && (
              <p className={`text-xs font-light truncate mt-0.5 ${isLightBg ? "text-gray-400" : "text-white/40"}`}>
                {meta.companyName}
              </p>
            )}
          </div>
          {activeSrc && (
            <div className="flex items-center gap-2 shrink-0">
              {/* Photo capture button */}
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

              {/* View in AR button */}
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
