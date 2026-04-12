import { useState, useRef, useCallback, useEffect } from "react";
import { useParams } from "wouter";
import {
  useGetProject,
  useUpdateProject,
  usePublishProject,
  useUnpublishProject,
  useRequestUploadUrl,
  getGetProjectQueryKey,
  getGetDashboardStatsQueryKey,
  getListProjectsQueryKey,
  type UpdateProjectBody,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  MapPin,
  Eye,
  EyeOff,
  ChevronLeft,
  Settings,
  Check,
  Globe,
  Box,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ENVIRONMENTS = [
  { value: "black", label: "Simple Black", bg: "#0a0a0a", desc: "Pure black backdrop" },
  { value: "white", label: "Simple White", bg: "#fafafa", desc: "Pure white backdrop" },
  { value: "luxury-home", label: "Luxury Home", bg: "radial-gradient(ellipse at 30% 70%, #2d1b0e 0%, #0f0804 100%)", desc: "Warm walnut tones" },
  { value: "classic-luxury", label: "Classic Luxury", bg: "linear-gradient(135deg, #0d1b2a 0%, #1a2332 50%, #2d1b0e 100%)", desc: "Deep navy to charcoal" },
  { value: "walls-plants", label: "Walls & Plants", bg: "radial-gradient(ellipse at 70% 30%, #e8e0d4 0%, #c4b8a8 100%)", desc: "Soft cream with botanics" },
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ar", label: "Arabic" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "es", label: "Spanish" },
  { value: "zh", label: "Chinese" },
  { value: "ja", label: "Japanese" },
];

export default function Editor() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id ?? "", 10);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: project, isLoading } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) },
  });

  const updateProject = useUpdateProject();
  const publishProject = usePublishProject();
  const unpublishProject = useUnpublishProject();
  const requestUploadUrl = useRequestUploadUrl();

  const [hotspotMode, setHotspotMode] = useState(false);
  const [hotspotPos, setHotspotPos] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const hotspotOverlayRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (project) {
      const px = (project.hotspotX + 0.5) * 100;
      const pz = (project.hotspotZ + 0.5) * 100;
      setHotspotPos({ x: Math.max(0, Math.min(100, px)), y: Math.max(0, Math.min(100, pz)) });
    }
  }, [project]);

  const handleSaveHotspot = async () => {
    if (!project) return;
    const hx = hotspotPos.x / 100 - 0.5;
    const hz = hotspotPos.y / 100 - 0.5;
    await updateProject.mutateAsync({ id: projectId, data: { hotspotX: hx, hotspotY: 0, hotspotZ: hz } });
    queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
    setHotspotMode(false);
    toast({ title: "Hotspot saved" });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !hotspotOverlayRef.current) return;
    const rect = hotspotOverlayRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setHotspotPos({ x, y });
  }, [isDragging]);

  const handleEnvChange = async (env: string) => {
    if (!project) return;
    const validEnvs = ["black", "white", "luxury-home", "classic-luxury", "walls-plants"] as const;
    if (!validEnvs.includes(env as (typeof validEnvs)[number])) return;
    setIsSaving(true);
    const data: UpdateProjectBody = { environment: env as UpdateProjectBody["environment"] };
    await updateProject.mutateAsync({ id: projectId, data });
    queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
    setIsSaving(false);
  };

  const handleToggleScalable = async (checked: boolean) => {
    await updateProject.mutateAsync({ id: projectId, data: { isScalable: checked } });
    queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
  };

  const handleLanguageChange = async (lang: string) => {
    await updateProject.mutateAsync({ id: projectId, data: { language: lang } });
    queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
  };

  const handleTypeChange = async (type: string) => {
    const validTypes = ["furniture", "object"] as const;
    if (!validTypes.includes(type as (typeof validTypes)[number])) return;
    const data: UpdateProjectBody = { type: type as UpdateProjectBody["type"] };
    await updateProject.mutateAsync({ id: projectId, data });
    queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
  };

  const handlePublishToggle = async () => {
    if (!project) return;
    if (project.isLive) {
      await unpublishProject.mutateAsync({ id: projectId });
      toast({ title: "AR deactivated" });
    } else {
      await publishProject.mutateAsync({ id: projectId });
      toast({ title: "AR is now live", description: `Share: /studio/${project.id}` });
    }
    queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
    queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadProgress(0);
    try {
      const { uploadURL, objectPath } = await requestUploadUrl.mutateAsync({
        data: { name: file.name, size: file.size, contentType: file.type || "model/gltf-binary" },
      });
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
      };
      await new Promise<void>((resolve, reject) => {
        xhr.open("PUT", uploadURL);
        xhr.setRequestHeader("Content-Type", file.type || "model/gltf-binary");
        xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
        xhr.onerror = reject;
        xhr.send(file);
      });
      await updateProject.mutateAsync({ id: projectId, data: { modelUrl: objectPath } });
      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
      toast({ title: "Model uploaded successfully" });
    } catch (err) {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const getEnvStyle = (env: string): React.CSSProperties => {
    const found = ENVIRONMENTS.find((e) => e.value === env);
    if (!found) return { background: "#0a0a0a" };
    if (found.bg.includes("gradient")) return { backgroundImage: found.bg };
    return { backgroundColor: found.bg };
  };

  if (isLoading || !project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground font-light tracking-widest uppercase text-xs animate-pulse">
          Loading Studio...
        </div>
      </div>
    );
  }

  const currentEnv = ENVIRONMENTS.find((e) => e.value === project.environment) ?? ENVIRONMENTS[0];
  const studioUrl = `${import.meta.env.BASE_URL}studio/${project.id}`;

  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid="editor-page">
      {/* Top Bar */}
      <header className="h-14 border-b border-border flex items-center px-6 gap-4 bg-card shrink-0">
        <button
          onClick={() => window.close()}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-close-editor"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm">Close</span>
        </button>
        <div className="flex items-center gap-2 ml-2">
          <Box className="w-4 h-4 text-primary" />
          <span className="font-serif font-semibold text-sm">{project.name}</span>
          <span className="text-muted-foreground text-xs">· {project.companyName}</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {project.isLive && (
            <a
              href={studioUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-primary hover:underline"
              data-testid="link-view-studio"
            >
              <Globe className="w-3 h-3" />
              View Studio
            </a>
          )}
          <button
            onClick={handlePublishToggle}
            className={`flex items-center gap-2 px-4 py-2 rounded-sm text-xs font-medium transition-all ${
              project.isLive
                ? "bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20"
                : "bg-primary text-primary-foreground hover:opacity-90"
            }`}
            data-testid="button-toggle-publish"
          >
            {project.isLive ? (
              <><EyeOff className="w-3 h-3" /> Deactivate</>
            ) : (
              <><Eye className="w-3 h-3" /> Publish AR</>
            )}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <aside className="w-72 border-r border-border bg-card flex flex-col overflow-y-auto shrink-0">
          {/* File Section */}
          <div className="p-5 border-b border-border">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">3D Model</h3>
            <input
              ref={fileInputRef}
              type="file"
              accept=".glb,.gltf"
              className="hidden"
              onChange={handleFileUpload}
              data-testid="input-model-file"
            />
            <Button
              variant="outline"
              className="w-full border-border text-sm gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadProgress !== null}
              data-testid="button-add-file"
            >
              <Upload className="w-4 h-4" />
              {uploadProgress !== null ? `Uploading ${uploadProgress}%...` : "Add File (.GLB, .GLTF)"}
            </Button>
            {project.modelUrl && (
              <p className="mt-2 text-xs text-muted-foreground truncate">
                Model: {project.modelUrl.split("/").pop()}
              </p>
            )}
          </div>

          {/* Environment Section */}
          <div className="p-5 border-b border-border">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">Environment</h3>
            <div className="grid grid-cols-1 gap-2">
              {ENVIRONMENTS.map((env) => (
                <button
                  key={env.value}
                  onClick={() => handleEnvChange(env.value)}
                  className={`flex items-center gap-3 p-3 rounded-sm border transition-all ${
                    project.environment === env.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/50"
                  }`}
                  data-testid={`button-env-${env.value}`}
                >
                  <div
                    className="w-8 h-8 rounded-sm shrink-0"
                    style={env.bg.includes("gradient")
                      ? { backgroundImage: env.bg }
                      : { backgroundColor: env.bg, border: env.bg === "#fafafa" ? "1px solid #ddd" : undefined }
                    }
                  />
                  <div className="text-left">
                    <div className="text-xs font-medium">{env.label}</div>
                    <div className="text-xs text-muted-foreground">{env.desc}</div>
                  </div>
                  {project.environment === env.value && (
                    <Check className="w-3 h-3 text-primary ml-auto shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Hotspot Section */}
          <div className="p-5 border-b border-border">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">Placement</h3>
            <Button
              variant={hotspotMode ? "default" : "outline"}
              className="w-full border-border text-sm gap-2"
              onClick={() => setHotspotMode(!hotspotMode)}
              data-testid="button-hotspot"
            >
              <MapPin className="w-4 h-4" />
              {hotspotMode ? "Exit Hotspot Mode" : "Set Hotspot"}
            </Button>
            {hotspotMode && (
              <div className="mt-3 p-3 bg-primary/5 rounded-sm border border-primary/20">
                <p className="text-xs text-muted-foreground mb-2">
                  Drag the dot to set product placement. Click Save when done.
                </p>
                <Button size="sm" className="w-full text-xs" onClick={handleSaveHotspot} data-testid="button-save-hotspot">
                  <Check className="w-3 h-3 mr-1" /> Save Position
                </Button>
              </div>
            )}
          </div>

          {/* Settings Section */}
          <div className="p-5">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">
              <Settings className="w-3 h-3 inline mr-2" />
              Settings
            </h3>
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">AR Scalable</Label>
                <Switch
                  checked={project.isScalable}
                  onCheckedChange={handleToggleScalable}
                  data-testid="switch-scalable"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select value={project.type} onValueChange={handleTypeChange}>
                  <SelectTrigger className="h-8 text-xs border-border" data-testid="select-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="furniture">Furniture</SelectItem>
                    <SelectItem value="object">Object</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Language</Label>
                <Select value={project.language} onValueChange={handleLanguageChange}>
                  <SelectTrigger className="h-8 text-xs border-border" data-testid="select-language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </aside>

        {/* Center — Model Viewer */}
        <main className="flex-1 relative overflow-hidden" style={getEnvStyle(project.environment)}>
          {!hotspotMode ? (
            project.modelUrl ? (
              <model-viewer
                src={project.modelUrl}
                alt={project.name}
                camera-controls
                auto-rotate
                ar
                ar-modes="webxr scene-viewer quick-look"
                shadow-intensity="1"
                disable-zoom={!project.isScalable || undefined}
                style={{ width: "100%", height: "100%" }}
                interaction-prompt="none"
                data-testid="model-viewer"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className="w-24 h-24 rounded-full border-2 border-dashed border-primary/30 flex items-center justify-center">
                  <Box className="w-10 h-10 text-primary/40" />
                </div>
                <p className="text-sm text-muted-foreground font-light">
                  Upload a .GLB or .GLTF file to preview
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-upload-empty"
                >
                  <Upload className="w-4 h-4 mr-2" /> Add 3D Model
                </Button>
              </div>
            )
          ) : (
            /* Hotspot Mode Overlay */
            <div
              ref={hotspotOverlayRef}
              className="absolute inset-0 cursor-crosshair select-none"
              onMouseMove={handleMouseMove}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
              data-testid="hotspot-overlay"
            >
              {/* Grid */}
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: "linear-gradient(rgba(201,168,76,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.3) 1px, transparent 1px)",
                  backgroundSize: "10% 10%",
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-primary/60 text-sm font-light tracking-widest uppercase">
                  Drag to set placement
                </p>
              </div>
              {/* Hotspot dot */}
              <div
                className="absolute w-6 h-6 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{ left: `${hotspotPos.x}%`, top: `${hotspotPos.y}%` }}
              >
                <div className="w-full h-full rounded-full bg-primary border-2 border-primary-foreground shadow-lg shadow-primary/40" />
                <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
              </div>
            </div>
          )}

          {/* Bottom status bar */}
          <div className="absolute bottom-0 left-0 right-0 h-10 flex items-center px-4 gap-3"
            style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.7))" }}>
            <span className="text-xs text-white/60 font-light">
              {currentEnv.label}
            </span>
            {project.isLive && (
              <span className="ml-auto flex items-center gap-1.5 text-xs text-primary font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Live AR
              </span>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
