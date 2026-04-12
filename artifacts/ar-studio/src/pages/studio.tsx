import { useRef } from "react";
import { useParams } from "wouter";
import { useGetStudioProject, getGetStudioProjectQueryKey } from "@workspace/api-client-react";
import { Smartphone, Box, ZoomIn } from "lucide-react";

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

interface ModelViewerElement extends HTMLElement {
  activateAR(): void;
}

export default function Studio() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id ?? "", 10);
  const modelViewerRef = useRef<ModelViewerElement>(null);

  const { data: project, isLoading, isError } = useGetStudioProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetStudioProjectQueryKey(projectId) },
  });

  const handleViewInAR = () => {
    if (modelViewerRef.current) {
      modelViewerRef.current.activateAR();
    }
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
      {/* Viewer */}
      <div className="flex-1 relative" style={{ minHeight: "calc(100vh - 120px)" }}>
        {project.modelUrl ? (
          <model-viewer
            ref={modelViewerRef as React.RefObject<HTMLElement>}
            src={project.modelUrl}
            alt={project.name}
            camera-controls
            auto-rotate
            ar
            ar-modes="webxr scene-viewer quick-look"
            shadow-intensity="1"
            disable-zoom={!project.isScalable || undefined}
            camera-target={`${project.hotspotX}m ${project.hotspotY}m ${project.hotspotZ}m`}
            style={{ width: "100%", height: "100%", minHeight: "calc(100vh - 120px)" }}
            interaction-prompt="none"
            data-testid="studio-model-viewer"
          />
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

        {/* AR Info Badge */}
        {project.isScalable && (
          <div
            className={`absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm border ${isLightBg ? "bg-white/70 border-gray-200 text-gray-700" : "bg-black/40 border-white/10 text-white/80"}`}
          >
            <ZoomIn className="w-3 h-3" />
            AR Scalable
          </div>
        )}
      </div>

      {/* Bottom Info Bar */}
      <footer
        className={`px-6 py-5 flex items-center gap-4 backdrop-blur-sm border-t ${
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
          <p
            className={`text-sm font-light truncate ${isLightBg ? "text-gray-500" : "text-white/60"}`}
          >
            {project.companyName}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${isLightBg ? "bg-gray-100 text-gray-600" : "bg-white/10 text-white/70"}`}
          >
            <Smartphone className="w-3 h-3" />
            <span>Point & Place</span>
          </div>

          {project.modelUrl && (
            <button
              type="button"
              onClick={handleViewInAR}
              className={`flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-full transition-all ${
                isLightBg
                  ? "bg-gray-900 text-white hover:bg-gray-700"
                  : "bg-[hsl(44,54%,54%)] text-black hover:opacity-90"
              }`}
              data-testid="button-view-in-ar"
            >
              <Smartphone className="w-3 h-3" />
              <span>View in AR</span>
            </button>
          )}
        </div>
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
