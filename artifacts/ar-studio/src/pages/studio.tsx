import { useState, useRef } from "react";
import { useParams } from "wouter";
import { useGetStudioProject, getGetStudioProjectQueryKey } from "@workspace/api-client-react";
import type { StudioProject, ProjectMaterial, ProjectVariant } from "@workspace/api-client-react";
import { Box, ZoomIn, ChevronDown, ChevronUp } from "lucide-react";

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

type ActiveTab = "materials" | "variants";

function VariationSidebar({
  project,
  isLightBg,
  activeModel,
  onSelectModel,
}: {
  project: StudioProject;
  isLightBg: boolean;
  activeModel: string | null;
  onSelectModel: (url: string | null) => void;
}) {
  const hasMaterials = project.enableMaterials && project.materials && project.materials.length > 0;
  const hasVariants = project.enableVariants && project.variants && project.variants.length > 0;
  const showBoth = hasMaterials && hasVariants;

  const [activeTab, setActiveTab] = useState<ActiveTab>("materials");
  const [isOpen, setIsOpen] = useState(true);

  if (!hasMaterials && !hasVariants) return null;

  const currentTab = showBoth ? activeTab : hasMaterials ? "materials" : "variants";
  const items: (ProjectMaterial | ProjectVariant)[] = currentTab === "materials"
    ? (project.materials ?? [])
    : (project.variants ?? []);

  const glassBg = isLightBg
    ? "bg-white/80 border-gray-200/70"
    : "bg-black/50 border-white/10";
  const labelColor = isLightBg ? "text-gray-700" : "text-white/80";
  const subColor = isLightBg ? "text-gray-400" : "text-white/40";
  const tabActive = isLightBg
    ? "bg-gray-900 text-white"
    : "bg-[hsl(44,54%,54%)] text-black";
  const tabInactive = isLightBg
    ? "text-gray-500 hover:text-gray-700"
    : "text-white/40 hover:text-white/70";

  return (
    <div
      className="fixed right-0 top-1/2 -translate-y-1/2 flex items-center"
      style={{ zIndex: 20 }}
    >
      {/* Expanded panel */}
      {isOpen && (
        <div
          className={`w-56 rounded-l-xl border border-r-0 backdrop-blur-md shadow-2xl overflow-hidden ${glassBg}`}
        >
          {/* Header */}
          <div
            className={`flex items-center justify-between px-4 py-3 border-b ${isLightBg ? "border-gray-200/60" : "border-white/10"}`}
          >
            {showBoth ? (
              <div className="flex gap-1">
                {(["materials", "variants"] as ActiveTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all capitalize ${currentTab === tab ? tabActive : tabInactive}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            ) : (
              <span className={`text-xs font-medium uppercase tracking-widest ${labelColor}`}>
                {currentTab === "materials" ? "Materials" : "Variants"}
              </span>
            )}
          </div>

          {/* Items */}
          <div className="p-3 flex flex-col gap-2 max-h-96 overflow-y-auto">
            {/* Default / original option */}
            <button
              onClick={() => onSelectModel(null)}
              className={`flex items-center gap-3 p-2 rounded-lg border transition-all text-left ${
                activeModel === null
                  ? isLightBg
                    ? "border-gray-900 bg-gray-100"
                    : "border-[hsl(44,54%,54%)] bg-[hsl(44,54%,54%)]/10"
                  : isLightBg
                  ? "border-gray-200 hover:border-gray-300"
                  : "border-white/10 hover:border-white/20"
              }`}
            >
              <div
                className={`w-9 h-9 rounded-md shrink-0 flex items-center justify-center ${
                  isLightBg ? "bg-gray-100 border border-gray-200" : "bg-white/5 border border-white/10"
                }`}
              >
                <Box className={`w-4 h-4 ${isLightBg ? "text-gray-400" : "text-white/30"}`} />
              </div>
              <span className={`text-xs font-medium ${labelColor}`}>Original</span>
            </button>

            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelectModel(item.modelUrl ?? null)}
                className={`flex items-center gap-3 p-2 rounded-lg border transition-all text-left ${
                  activeModel === item.modelUrl
                    ? isLightBg
                      ? "border-gray-900 bg-gray-100"
                      : "border-[hsl(44,54%,54%)] bg-[hsl(44,54%,54%)]/10"
                    : isLightBg
                    ? "border-gray-200 hover:border-gray-300"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt={item.name}
                    className="w-9 h-9 rounded-md object-cover shrink-0 border border-white/10"
                  />
                ) : (
                  <div
                    className={`w-9 h-9 rounded-md shrink-0 flex items-center justify-center ${
                      isLightBg ? "bg-gray-100 border border-gray-200" : "bg-white/5 border border-white/10"
                    }`}
                  >
                    <Box className={`w-4 h-4 ${isLightBg ? "text-gray-400" : "text-white/30"}`} />
                  </div>
                )}
                <span className={`text-xs font-medium truncate ${labelColor}`}>{item.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Arrow tab — always visible, flush to the right edge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Collapse variations" : "Expand variations"}
        className={`flex items-center justify-center w-6 h-14 rounded-l-lg border backdrop-blur-md shadow-lg transition-colors ${glassBg} ${isLightBg ? "border-gray-200/70" : "border-white/10"}`}
        style={{ borderRight: "none" }}
      >
        {isOpen
          ? <ChevronDown className={`w-3.5 h-3.5 rotate-90 ${subColor}`} />
          : <ChevronUp className={`w-3.5 h-3.5 rotate-90 ${subColor}`} />}
      </button>
    </div>
  );
}

export default function Studio() {
  const { slug } = useParams<{ slug: string }>();
  const projectSlug = slug ?? "";
  const [activeVariantModel, setActiveVariantModel] = useState<string | null>(null);
  const arButtonRef = useRef<HTMLButtonElement>(null);

  const { data: project, isLoading, isError } = useGetStudioProject(projectSlug, {
    query: {
      enabled: !!projectSlug,
      queryKey: getGetStudioProjectQueryKey(projectSlug),
      retry: false,
    },
  });

  // Sync base model src when project loads
  const baseModelUrl = project?.modelUrl ?? null;
  const activeSrc = activeVariantModel !== null ? activeVariantModel : baseModelUrl;

  const handleSelectModel = (url: string | null) => {
    setActiveVariantModel(url);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border border-primary/20 animate-spin border-t-primary" />
          <span className="text-muted-foreground text-xs tracking-widest uppercase font-light">
            Loading Experience...
          </span>
        </div>
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
        <div className="w-20 h-20 rounded-full border border-primary/20 flex items-center justify-center">
          <Box className="w-8 h-8 text-primary/40" />
        </div>
        <div className="text-center">
          <h1 className="font-serif text-2xl font-bold mb-2">Experience Not Found</h1>
          <p className="text-muted-foreground font-light text-sm max-w-xs">
            This AR experience is not available or has been deactivated.
          </p>
        </div>
        <a
          href="/"
          className="text-primary text-sm hover:underline font-medium"
        >
          Return to Studio
        </a>
      </div>
    );
  }

  const envStyle = ENV_STYLES[project.environment] ?? ENV_STYLES.black;
  const textClass = ENV_TEXT[project.environment] ?? "text-white";
  const isLightBg = project.environment === "white" || project.environment === "walls-plants";

  return (
    <div className="min-h-screen flex flex-col" style={envStyle} data-testid="studio-page">
      {/* Viewer — full height minus footer */}
      <div className="flex-1 relative" style={{ minHeight: "calc(100vh - 90px)" }}>
        {activeSrc ? (
          <model-viewer
            src={activeSrc}
            alt={project.name}
            camera-controls
            auto-rotate
            ar
            ar-modes="webxr scene-viewer quick-look"
            shadow-intensity="1"
            disable-zoom={!project.isScalable || undefined}
            camera-target={`${project.hotspotX}m ${project.hotspotY}m ${project.hotspotZ}m`}
            style={{ width: "100%", height: "100%", minHeight: "calc(100vh - 90px)" }}
            interaction-prompt="none"
            data-testid="studio-model-viewer"
          >
            {/*
              Native model-viewer AR button — required inside <model-viewer> to enable
              WebXR / Scene Viewer / Quick Look. Hidden visually; the footer button
              delegates clicks to this element so there is only one visible "View in AR" action.
            */}
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
            <div className={`w-24 h-24 rounded-full border-2 border-dashed flex items-center justify-center ${isLightBg ? "border-gray-300" : "border-white/20"}`}>
              <Box className={`w-10 h-10 ${isLightBg ? "text-gray-400" : "text-white/30"}`} />
            </div>
            <p className={`text-sm font-light ${isLightBg ? "text-gray-500" : "text-white/50"}`}>
              3D model loading...
            </p>
          </div>
        )}

        {/* AR Scalable badge */}
        {project.isScalable && (
          <div
            className={`absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm border ${isLightBg ? "bg-white/70 border-gray-200 text-gray-700" : "bg-black/40 border-white/10 text-white/80"}`}
          >
            <ZoomIn className="w-3 h-3" />
            AR Scalable
          </div>
        )}

        {/* Material/Variant sidebar */}
        <VariationSidebar
          project={project}
          isLightBg={isLightBg}
          activeModel={activeVariantModel}
          onSelectModel={handleSelectModel}
        />
      </div>

      {/* Bottom Info Bar */}
      <footer
        className={`px-6 py-4 flex items-center gap-4 backdrop-blur-sm border-t ${
          isLightBg
            ? "bg-white/80 border-gray-200/50"
            : "bg-black/60 border-white/10"
        }`}
      >
        <div className="flex-1 min-w-0">
          <h1
            className={`font-serif text-xl font-semibold leading-tight truncate ${textClass}`}
          >
            {project.name}
          </h1>
        </div>
        {/* Single visible "View in AR" footer action — delegates to the native slot button */}
        <button
          data-testid="footer-view-in-ar"
          onClick={() => arButtonRef.current?.click()}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all shrink-0 ${
            isLightBg
              ? "bg-gray-900 text-white hover:bg-gray-700"
              : "bg-[hsl(44,54%,54%)] text-black hover:opacity-90"
          }`}
        >
          View in AR
        </button>
      </footer>

      {/* AR Studio Watermark */}
      <div
        className={`fixed bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 text-xs font-light tracking-wider pointer-events-none ${isLightBg ? "text-gray-400" : "text-white/30"}`}
      >
        <Box className="w-3 h-3" />
        <span>AR Studio</span>
      </div>
    </div>
  );
}
