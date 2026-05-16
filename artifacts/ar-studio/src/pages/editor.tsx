import { useState, useRef, useCallback, useEffect } from "react";
import { useParams } from "wouter";
import {
  useGetProject,
  useUpdateProject,
  usePublishProject,
  useUnpublishProject,
  useRequestUploadUrl,
  useListMaterials,
  useCreateMaterial,
  useUpdateMaterial,
  useDeleteMaterial,
  useListVariants,
  useCreateVariant,
  useUpdateVariant,
  useDeleteVariant,
  useListMeasurements,
  useCreateMeasurement,
  useDeleteMeasurement,
  getGetProjectQueryKey,
  getGetDashboardStatsQueryKey,
  getListProjectsQueryKey,
  getListMaterialsQueryKey,
  getListVariantsQueryKey,
  getListMeasurementsQueryKey,
  type UpdateProjectBody,
  type ProjectMaterial,
  type ProjectVariant,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  Plus,
  Trash2,
  Layers,
  ChevronUp,
  ChevronDown,
  Palette,
  ChevronRight,
  Ruler,
  ImageIcon,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ENVIRONMENTS = [
  { value: "black", label: "Simple Black", bg: "#0a0a0a", desc: "Pure black backdrop", hotspotX: 0, hotspotY: 0, hotspotZ: 0 },
  { value: "white", label: "Simple White", bg: "#fafafa", desc: "Pure white backdrop", hotspotX: 0, hotspotY: 0, hotspotZ: 0 },
  { value: "luxury-home", label: "Luxury Home", bg: "radial-gradient(ellipse at 30% 70%, #2d1b0e 0%, #0f0804 100%)", desc: "Warm walnut tones", hotspotX: -0.05, hotspotY: 0.1, hotspotZ: 0.05 },
  { value: "classic-luxury", label: "Classic Luxury", bg: "linear-gradient(135deg, #0d1b2a 0%, #1a2332 50%, #2d1b0e 100%)", desc: "Deep navy to charcoal", hotspotX: 0, hotspotY: 0.05, hotspotZ: -0.05 },
  { value: "walls-plants", label: "Walls & Plants", bg: "radial-gradient(ellipse at 70% 30%, #e8e0d4 0%, #c4b8a8 100%)", desc: "Soft cream with botanics", hotspotX: 0.05, hotspotY: 0, hotspotZ: 0.1 },
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

type UploadTarget =
  | { kind: "model" }
  | { kind: "materialModel"; materialId: number }
  | { kind: "materialThumb"; materialId: number }
  | { kind: "variantModel"; variantId: number }
  | { kind: "variantThumb"; variantId: number };

interface VariationItemProps {
  item: ProjectMaterial | ProjectVariant;
  kind: "material" | "variant";
  isFirst: boolean;
  isLast: boolean;
  onUpload: (target: UploadTarget) => void;
  onDelete: () => void;
  onRename: (name: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function VariationItem({ item, kind, isFirst, isLast, onUpload, onDelete, onRename, onMoveUp, onMoveDown }: VariationItemProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(item.name);

  const handleNameBlur = () => {
    setEditingName(false);
    if (nameVal.trim() && nameVal !== item.name) {
      onRename(nameVal.trim());
    }
  };

  return (
    <div className="flex flex-col gap-2 p-3 rounded-sm border border-border bg-background/40">
      <div className="flex items-center gap-2">
        {/* Reorder controls */}
        <div className="flex flex-col gap-0.5 shrink-0">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
            aria-label="Move up"
          >
            <ChevronUp className="w-3 h-3" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
            aria-label="Move down"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        {editingName ? (
          <Input
            value={nameVal}
            onChange={(e) => setNameVal(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={(e) => { if (e.key === "Enter") handleNameBlur(); if (e.key === "Escape") { setEditingName(false); setNameVal(item.name); } }}
            className="h-6 text-xs flex-1 bg-transparent border-primary/40"
            autoFocus
          />
        ) : (
          <span
            className="text-xs font-medium flex-1 cursor-pointer hover:text-primary transition-colors truncate"
            onClick={() => setEditingName(true)}
            title="Click to rename"
          >
            {item.name}
          </span>
        )}
        <button
          onClick={onDelete}
          className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
          aria-label="Delete"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Thumbnail */}
        <button
          onClick={() => onUpload(kind === "material"
            ? { kind: "materialThumb", materialId: item.id }
            : { kind: "variantThumb", variantId: item.id }
          )}
          className="flex flex-col items-center justify-center gap-1 h-14 rounded-sm border border-dashed border-border hover:border-primary/40 transition-colors"
        >
          {item.thumbnailUrl ? (
            <img src={item.thumbnailUrl} alt="thumb" className="w-full h-full object-cover rounded-sm" />
          ) : (
            <>
              <Upload className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Thumbnail</span>
            </>
          )}
        </button>

        {/* Model */}
        <button
          onClick={() => onUpload(kind === "material"
            ? { kind: "materialModel", materialId: item.id }
            : { kind: "variantModel", variantId: item.id }
          )}
          className="flex flex-col items-center justify-center gap-1 h-14 rounded-sm border border-dashed border-border hover:border-primary/40 transition-colors"
        >
          {item.modelUrl ? (
            <div className="flex flex-col items-center gap-0.5">
              <Box className="w-4 h-4 text-primary/60" />
              <span className="text-xs text-primary/60">GLB ✓</span>
            </div>
          ) : (
            <>
              <Box className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">.GLB</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

interface VariantWithMaterialsProps {
  variant: ProjectVariant;
  variantIndex: number;
  variantCount: number;
  projectId: number;
  onUpload: (target: UploadTarget) => void;
  onDelete: () => void;
  onRename: (name: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRequestUpload: (file: File, accept: "image" | "model") => Promise<string>;
}

function VariantWithMaterials({
  variant,
  variantIndex,
  variantCount,
  projectId,
  onUpload,
  onDelete,
  onRename,
  onMoveUp,
  onMoveDown,
  onRequestUpload,
}: VariantWithMaterialsProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showMaterials, setShowMaterials] = useState(false);
  const [matUploadProgress, setMatUploadProgress] = useState<number | null>(null);
  const matFileInputRef = useRef<HTMLInputElement>(null);
  const [matUploadTarget, setMatUploadTarget] = useState<{ materialId: number; kind: "model" | "thumb" } | null>(null);

  const matQueryKey = getListMaterialsQueryKey(projectId);

  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterial();
  const deleteMaterial = useDeleteMaterial();

  const { data: allMaterials = [] } = useListMaterials(projectId, undefined, {
    query: { enabled: true, queryKey: matQueryKey },
  });

  const variantMaterials = allMaterials.filter((m) => m.variantId === variant.id);

  const handleAddMaterial = async () => {
    const maxOrder = variantMaterials.length > 0 ? Math.max(...variantMaterials.map(m => m.sortOrder)) : -1;
    await createMaterial.mutateAsync({
      projectId,
      data: { name: `Color ${variantMaterials.length + 1}`, variantId: variant.id, sortOrder: maxOrder + 1 },
    });
    queryClient.invalidateQueries({ queryKey: matQueryKey });
    setShowMaterials(true);
  };

  const handleDeleteMaterial = async (id: number) => {
    await deleteMaterial.mutateAsync({ projectId, id });
    queryClient.invalidateQueries({ queryKey: matQueryKey });
  };

  const handleRenameMaterial = async (id: number, name: string) => {
    await updateMaterial.mutateAsync({ projectId, id, data: { name } });
    queryClient.invalidateQueries({ queryKey: matQueryKey });
  };

  const handleReorderMaterial = async (index: number, direction: "up" | "down") => {
    const items = [...variantMaterials];
    const swapIdx = direction === "up" ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;
    const [a, b] = [items[index], items[swapIdx]];
    await Promise.all([
      updateMaterial.mutateAsync({ projectId, id: a.id, data: { sortOrder: b.sortOrder } }),
      updateMaterial.mutateAsync({ projectId, id: b.id, data: { sortOrder: a.sortOrder } }),
    ]);
    queryClient.invalidateQueries({ queryKey: matQueryKey });
  };

  const triggerMatUpload = (materialId: number, kind: "model" | "thumb") => {
    setMatUploadTarget({ materialId, kind });
    if (matFileInputRef.current) {
      matFileInputRef.current.accept = kind === "thumb" ? "image/png,image/jpeg,image/webp" : ".glb,.gltf";
      matFileInputRef.current.click();
    }
  };

  const handleMatFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !matUploadTarget) return;
    setMatUploadProgress(0);
    try {
      if (matUploadTarget.kind === "model") {
        const objectPath = await onRequestUpload(file, "model");
        await updateMaterial.mutateAsync({ projectId, id: matUploadTarget.materialId, data: { modelUrl: objectPath } });
        queryClient.invalidateQueries({ queryKey: matQueryKey });
        toast({ title: "Material model uploaded" });
      } else {
        const objectPath = await onRequestUpload(file, "image");
        await updateMaterial.mutateAsync({ projectId, id: matUploadTarget.materialId, data: { thumbnailUrl: objectPath } });
        queryClient.invalidateQueries({ queryKey: matQueryKey });
        toast({ title: "Material thumbnail uploaded" });
      }
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setMatUploadProgress(null);
      if (matFileInputRef.current) matFileInputRef.current.value = "";
    }
  };

  const matOnUpload = (target: UploadTarget) => {
    if (target.kind === "materialModel") triggerMatUpload(target.materialId, "model");
    else if (target.kind === "materialThumb") triggerMatUpload(target.materialId, "thumb");
    else onUpload(target);
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={matFileInputRef}
        type="file"
        className="hidden"
        onChange={handleMatFileChange}
      />
      <VariationItem
        item={variant}
        kind="variant"
        isFirst={variantIndex === 0}
        isLast={variantIndex === variantCount - 1}
        onUpload={onUpload}
        onDelete={onDelete}
        onRename={onRename}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
      />

      {/* Materials sub-section for this variant */}
      <div className="ml-3 pl-3 border-l border-border/50">
        <button
          onClick={() => setShowMaterials(!showMaterials)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full py-1"
          data-testid={`button-toggle-variant-materials-${variant.id}`}
        >
          <Palette className="w-3 h-3" />
          <span className="flex-1 text-left">Colors / Materials</span>
          {variantMaterials.length > 0 && (
            <span className="text-xs text-primary/60">{variantMaterials.length}</span>
          )}
          {showMaterials ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>

        {showMaterials && (
          <div className="flex flex-col gap-2 mt-1">
            {matUploadProgress !== null && (
              <p className="text-xs text-muted-foreground">Uploading {matUploadProgress}%...</p>
            )}
            {variantMaterials.map((mat, idx) => (
              <VariationItem
                key={mat.id}
                item={mat}
                kind="material"
                isFirst={idx === 0}
                isLast={idx === variantMaterials.length - 1}
                onUpload={matOnUpload}
                onDelete={() => handleDeleteMaterial(mat.id)}
                onRename={(name) => handleRenameMaterial(mat.id, name)}
                onMoveUp={() => handleReorderMaterial(idx, "up")}
                onMoveDown={() => handleReorderMaterial(idx, "down")}
              />
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 border-dashed text-xs mt-1"
              onClick={handleAddMaterial}
              data-testid={`button-add-material-variant-${variant.id}`}
            >
              <Plus className="w-3 h-3" />
              Add Color
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function BaseMaterialsPanel({
  projectId,
  onRequestUpload,
}: {
  projectId: number;
  onRequestUpload: (file: File, accept: "image" | "model") => Promise<string>;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [matUploadProgress, setMatUploadProgress] = useState<number | null>(null);
  const matFileInputRef = useRef<HTMLInputElement>(null);
  const [matUploadTarget, setMatUploadTarget] = useState<{ materialId: number; kind: "model" | "thumb" } | null>(null);

  const matQueryKey = getListMaterialsQueryKey(projectId);
  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterial();
  const deleteMaterial = useDeleteMaterial();

  const { data: allMaterials = [] } = useListMaterials(projectId, undefined, {
    query: { enabled: !!projectId, queryKey: matQueryKey },
  });

  const baseMaterials = allMaterials.filter((m) => m.variantId === null || m.variantId === undefined);

  const handleAddMaterial = async () => {
    const maxOrder = baseMaterials.length > 0 ? Math.max(...baseMaterials.map(m => m.sortOrder)) : -1;
    await createMaterial.mutateAsync({
      projectId,
      data: { name: `Color ${baseMaterials.length + 1}`, variantId: null, sortOrder: maxOrder + 1 },
    });
    queryClient.invalidateQueries({ queryKey: matQueryKey });
  };

  const handleDeleteMaterial = async (id: number) => {
    await deleteMaterial.mutateAsync({ projectId, id });
    queryClient.invalidateQueries({ queryKey: matQueryKey });
  };

  const handleRenameMaterial = async (id: number, name: string) => {
    await updateMaterial.mutateAsync({ projectId, id, data: { name } });
    queryClient.invalidateQueries({ queryKey: matQueryKey });
  };

  const handleReorderMaterial = async (index: number, direction: "up" | "down") => {
    const items = [...baseMaterials];
    const swapIdx = direction === "up" ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;
    const [a, b] = [items[index], items[swapIdx]];
    await Promise.all([
      updateMaterial.mutateAsync({ projectId, id: a.id, data: { sortOrder: b.sortOrder } }),
      updateMaterial.mutateAsync({ projectId, id: b.id, data: { sortOrder: a.sortOrder } }),
    ]);
    queryClient.invalidateQueries({ queryKey: matQueryKey });
  };

  const triggerMatUpload = (materialId: number, kind: "model" | "thumb") => {
    setMatUploadTarget({ materialId, kind });
    if (matFileInputRef.current) {
      matFileInputRef.current.accept = kind === "thumb" ? "image/png,image/jpeg,image/webp" : ".glb,.gltf";
      matFileInputRef.current.click();
    }
  };

  const handleMatFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !matUploadTarget) return;
    setMatUploadProgress(0);
    try {
      if (matUploadTarget.kind === "model") {
        const objectPath = await onRequestUpload(file, "model");
        await updateMaterial.mutateAsync({ projectId, id: matUploadTarget.materialId, data: { modelUrl: objectPath } });
        queryClient.invalidateQueries({ queryKey: matQueryKey });
        toast({ title: "Material model uploaded" });
      } else {
        const objectPath = await onRequestUpload(file, "image");
        await updateMaterial.mutateAsync({ projectId, id: matUploadTarget.materialId, data: { thumbnailUrl: objectPath } });
        queryClient.invalidateQueries({ queryKey: matQueryKey });
        toast({ title: "Material thumbnail uploaded" });
      }
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setMatUploadProgress(null);
      if (matFileInputRef.current) matFileInputRef.current.value = "";
    }
  };

  const matOnUpload = (target: UploadTarget) => {
    if (target.kind === "materialModel") triggerMatUpload(target.materialId, "model");
    else if (target.kind === "materialThumb") triggerMatUpload(target.materialId, "thumb");
  };

  return (
    <div className="p-5 border-b border-border">
      <input
        ref={matFileInputRef}
        type="file"
        className="hidden"
        onChange={handleMatFileChange}
      />
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">
        Base Model Colors
      </h3>
      {matUploadProgress !== null && (
        <p className="text-xs text-muted-foreground mb-2">Uploading {matUploadProgress}%...</p>
      )}
      <div className="flex flex-col gap-2">
        {baseMaterials.map((mat, idx) => (
          <VariationItem
            key={mat.id}
            item={mat}
            kind="material"
            isFirst={idx === 0}
            isLast={idx === baseMaterials.length - 1}
            onUpload={matOnUpload}
            onDelete={() => handleDeleteMaterial(mat.id)}
            onRename={(name) => handleRenameMaterial(mat.id, name)}
            onMoveUp={() => handleReorderMaterial(idx, "up")}
            onMoveDown={() => handleReorderMaterial(idx, "down")}
          />
        ))}
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5 border-dashed text-xs mt-1"
          onClick={handleAddMaterial}
          data-testid="button-add-base-material"
        >
          <Plus className="w-3 h-3" />
          Add Color
        </Button>
      </div>
    </div>
  );
}

function DimensionsPanel({
  measurements,
  newMeasurementLabel,
  newMeasurementValue,
  onLabelChange,
  onValueChange,
  onAdd,
  onDelete,
}: {
  measurements: { id: number; label: string; value: string; sortOrder: number }[];
  newMeasurementLabel: string;
  newMeasurementValue: string;
  onLabelChange: (v: string) => void;
  onValueChange: (v: string) => void;
  onAdd: () => void;
  onDelete: (id: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-t border-border">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-accent/50 transition-colors"
        data-testid="button-toggle-dimensions"
      >
        <div className="flex items-center gap-2">
          <Ruler className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Dimensions</span>
          {measurements.length > 0 && (
            <span className="text-[10px] text-muted-foreground/60">({measurements.length})</span>
          )}
        </div>
        {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>

      {isOpen && (
        <div className="px-5 pb-5 space-y-3">
          {measurements.map((m) => (
            <div key={m.id} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{m.label}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{m.value}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => onDelete(m.id)}
                data-testid={`button-delete-measurement-${m.id}`}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}

          <div className="flex gap-1.5 pt-1">
            <Input
              value={newMeasurementLabel}
              onChange={(e) => onLabelChange(e.target.value)}
              placeholder="Label (e.g. Width)"
              className="h-7 text-xs border-border flex-1"
              data-testid="input-measurement-label"
            />
            <Input
              value={newMeasurementValue}
              onChange={(e) => onValueChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onAdd(); }}
              placeholder="Value (e.g. 120cm)"
              className="h-7 text-xs border-border flex-1"
              data-testid="input-measurement-value"
            />
            <Button
              size="sm"
              className="h-7 px-2 text-xs shrink-0"
              onClick={onAdd}
              disabled={!newMeasurementLabel.trim() || !newMeasurementValue.trim()}
              data-testid="button-add-measurement"
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Editor() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id ?? "", 10);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: project, isLoading } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) },
  });

  const { data: variants = [] } = useListVariants(projectId, {
    query: { enabled: !!projectId && !!project?.enableVariants, queryKey: getListVariantsQueryKey(projectId) },
  });

  const updateProject = useUpdateProject();
  const publishProject = usePublishProject();
  const unpublishProject = useUnpublishProject();
  const requestUploadUrl = useRequestUploadUrl();

  const createVariant = useCreateVariant();
  const updateVariant = useUpdateVariant();
  const deleteVariant = useDeleteVariant();

  const [placementMode, setPlacementMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const placementOverlayRef = useRef<HTMLDivElement>(null);
  const modelViewerRef = useRef<HTMLElement>(null);
  const [localModelX, setLocalModelX] = useState<number | null>(null);
  const [localModelY, setLocalModelY] = useState<number | null>(null);
  const [localModelSize, setLocalModelSize] = useState<number>(100);
  const [localBgScale, setLocalBgScale] = useState<number>(100);
  const bgScaleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<UploadTarget>({ kind: "model" });
  const [showVariations, setShowVariations] = useState(false);
  const [defaultModelNameVal, setDefaultModelNameVal] = useState("");
  const [defaultColorNameVal, setDefaultColorNameVal] = useState("");
  const [sidebarColorVal, setSidebarColorVal] = useState("#000000");
  const [sidebarOpacityVal, setSidebarOpacityVal] = useState(0.65);
  const sidebarDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [accentColorVal, setAccentColorVal] = useState("#C9A84C");
  const accentDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sidebarTextColorVal, setSidebarTextColorVal] = useState("#ffffff");
  const [sidebarTextColorAuto, setSidebarTextColorAuto] = useState(true);
  const textColorDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bgPhotoFileInputRef = useRef<HTMLInputElement>(null);
  const [bgUploadProgress, setBgUploadProgress] = useState<number | null>(null);
  const [bgFocalX, setBgFocalX] = useState<number>(50);
  const [bgFocalY, setBgFocalY] = useState<number>(50);
  const [newMeasurementLabel, setNewMeasurementLabel] = useState("");
  const [newMeasurementValue, setNewMeasurementValue] = useState("");

  const { data: measurements = [] } = useListMeasurements(projectId, {
    query: { enabled: !!projectId, queryKey: getListMeasurementsQueryKey(projectId) },
  });

  const createMeasurement = useCreateMeasurement();
  const deleteMeasurement = useDeleteMeasurement();

  useEffect(() => {
    if (project) {
      setDefaultModelNameVal(project.defaultModelName);
      setDefaultColorNameVal(project.defaultColorName);
      setSidebarColorVal(project.studioSidebarColor ?? "#000000");
      setSidebarOpacityVal(project.studioSidebarOpacity ?? 0.65);
      setAccentColorVal(project.studioAccentColor ?? "#C9A84C");
      const savedTextColor = project.studioSidebarTextColor ?? null;
      setSidebarTextColorAuto(!savedTextColor);
      setSidebarTextColorVal(savedTextColor ?? "#ffffff");
      setBgFocalX(project.studioFocalX ?? 50);
      setBgFocalY(project.studioFocalY ?? 50);
      setLocalModelX(project.studioModelX ?? null);
      setLocalModelY(project.studioModelY ?? null);
      setLocalModelSize(project.studioModelSize ?? 100);
      setLocalBgScale(project.studioBackgroundScale ?? 100);
    }
  }, [project?.id]);

  const handleSavePlacement = async () => {
    if (!project) return;
    await updateProject.mutateAsync({
      id: projectId,
      data: {
        studioModelX: localModelX,
        studioModelY: localModelY,
        studioModelSize: localModelSize,
        studioBackgroundScale: localBgScale,
      },
    });
    queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
    setPlacementMode(false);
    toast({ title: "Placement saved" });
  };

  const handlePlacementClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!placementOverlayRef.current) return;
    const rect = placementOverlayRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setLocalModelX(x);
    setLocalModelY(y);
  }, []);

  const handlePlacementMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !placementOverlayRef.current) return;
    const rect = placementOverlayRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setLocalModelX(x);
    setLocalModelY(y);
  }, [isDragging]);

  const handleBgScaleChange = (scale: number) => {
    setLocalBgScale(scale);
    if (bgScaleDebounceRef.current) clearTimeout(bgScaleDebounceRef.current);
    bgScaleDebounceRef.current = setTimeout(async () => {
      await updateProject.mutateAsync({ id: projectId, data: { studioBackgroundScale: scale } });
      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
    }, 400);
  };

  const handleEnvChange = async (env: string) => {
    if (!project) return;
    const validEnvs = ["black", "white", "luxury-home", "classic-luxury", "walls-plants"] as const;
    if (!validEnvs.includes(env as (typeof validEnvs)[number])) return;
    setIsSaving(true);
    const preset = ENVIRONMENTS.find(e => e.value === env);
    const data: UpdateProjectBody = {
      environment: env as UpdateProjectBody["environment"],
      hotspotX: preset?.hotspotX ?? 0,
      hotspotY: preset?.hotspotY ?? 0,
      hotspotZ: preset?.hotspotZ ?? 0,
    };
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
      toast({ title: "AR is now live", description: `Share: /studio/${project.publicSlug}` });
    }
    queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
    queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
  };

  const uploadFile = async (file: File, accept: "image" | "model"): Promise<string> => {
    const { uploadURL, objectPath } = await requestUploadUrl.mutateAsync({
      data: { name: file.name, size: file.size, contentType: file.type || (accept === "model" ? "model/gltf-binary" : "image/png") },
    });
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
    };
    await new Promise<void>((resolve, reject) => {
      xhr.open("PUT", uploadURL);
      xhr.setRequestHeader("Content-Type", file.type || (accept === "model" ? "model/gltf-binary" : "image/png"));
      xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
      xhr.onerror = reject;
      xhr.send(file);
    });
    return objectPath;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadProgress(0);
    try {
      const target = uploadTarget;

      if (target.kind === "model") {
        const objectPath = await uploadFile(file, "model");
        await updateProject.mutateAsync({ id: projectId, data: { modelUrl: objectPath } });
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
        toast({ title: "Model uploaded successfully" });
      } else if (target.kind === "variantModel") {
        const objectPath = await uploadFile(file, "model");
        await updateVariant.mutateAsync({ projectId, id: target.variantId, data: { modelUrl: objectPath } });
        queryClient.invalidateQueries({ queryKey: getListVariantsQueryKey(projectId) });
        toast({ title: "Variant model uploaded" });
      } else if (target.kind === "variantThumb") {
        const objectPath = await uploadFile(file, "image");
        await updateVariant.mutateAsync({ projectId, id: target.variantId, data: { thumbnailUrl: objectPath } });
        queryClient.invalidateQueries({ queryKey: getListVariantsQueryKey(projectId) });
        toast({ title: "Variant thumbnail uploaded" });
      }
    } catch (err) {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const triggerUpload = (target: UploadTarget) => {
    setUploadTarget(target);
    if (fileInputRef.current) {
      const isImage = target.kind === "materialThumb" || target.kind === "variantThumb";
      fileInputRef.current.accept = isImage ? "image/png,image/jpeg,image/webp" : ".glb,.gltf";
      fileInputRef.current.click();
    }
  };

  const handleAddVariant = async () => {
    const maxOrder = variants.length > 0 ? Math.max(...variants.map(v => v.sortOrder)) : -1;
    await createVariant.mutateAsync({ projectId, data: { name: `Variant ${variants.length + 1}`, sortOrder: maxOrder + 1 } });
    queryClient.invalidateQueries({ queryKey: getListVariantsQueryKey(projectId) });
  };

  const handleDeleteVariant = async (id: number) => {
    await deleteVariant.mutateAsync({ projectId, id });
    queryClient.invalidateQueries({ queryKey: getListVariantsQueryKey(projectId) });
  };

  const handleRenameVariant = async (id: number, name: string) => {
    await updateVariant.mutateAsync({ projectId, id, data: { name } });
    queryClient.invalidateQueries({ queryKey: getListVariantsQueryKey(projectId) });
  };

  const handleReorderVariant = async (index: number, direction: "up" | "down") => {
    const items = [...variants];
    const swapIdx = direction === "up" ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;
    const [a, b] = [items[index], items[swapIdx]];
    await Promise.all([
      updateVariant.mutateAsync({ projectId, id: a.id, data: { sortOrder: b.sortOrder } }),
      updateVariant.mutateAsync({ projectId, id: b.id, data: { sortOrder: a.sortOrder } }),
    ]);
    queryClient.invalidateQueries({ queryKey: getListVariantsQueryKey(projectId) });
  };

  const handleSaveDefaultModelName = async () => {
    if (!defaultModelNameVal.trim()) return;
    await updateProject.mutateAsync({ id: projectId, data: { defaultModelName: defaultModelNameVal.trim() } });
    queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
    toast({ title: "Default model name saved" });
  };

  const handleSaveDefaultColorName = async () => {
    if (!defaultColorNameVal.trim()) return;
    await updateProject.mutateAsync({ id: projectId, data: { defaultColorName: defaultColorNameVal.trim() } });
    queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
    toast({ title: "Default color name saved" });
  };

  const handleSidebarColorChange = (color: string) => {
    setSidebarColorVal(color);
    if (sidebarDebounceRef.current) clearTimeout(sidebarDebounceRef.current);
    sidebarDebounceRef.current = setTimeout(async () => {
      await updateProject.mutateAsync({ id: projectId, data: { studioSidebarColor: color } });
      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
    }, 300);
  };

  const handleSidebarOpacityChange = (opacity: number) => {
    setSidebarOpacityVal(opacity);
    if (sidebarDebounceRef.current) clearTimeout(sidebarDebounceRef.current);
    sidebarDebounceRef.current = setTimeout(async () => {
      await updateProject.mutateAsync({ id: projectId, data: { studioSidebarOpacity: opacity } });
      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
    }, 300);
  };

  const handleAccentColorChange = (color: string) => {
    setAccentColorVal(color);
    if (accentDebounceRef.current) clearTimeout(accentDebounceRef.current);
    accentDebounceRef.current = setTimeout(async () => {
      await updateProject.mutateAsync({ id: projectId, data: { studioAccentColor: color } });
      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
    }, 300);
  };

  const handleSidebarTextColorChange = (color: string, auto: boolean) => {
    setSidebarTextColorVal(color);
    setSidebarTextColorAuto(auto);
    if (textColorDebounceRef.current) clearTimeout(textColorDebounceRef.current);
    textColorDebounceRef.current = setTimeout(async () => {
      await updateProject.mutateAsync({ id: projectId, data: { studioSidebarTextColor: auto ? null : color } });
      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
    }, 300);
  };

  const handleBgPhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBgUploadProgress(0);
    try {
      const { uploadURL, objectPath } = await requestUploadUrl.mutateAsync({
        data: { name: file.name, size: file.size, contentType: file.type || "image/png" },
      });
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) setBgUploadProgress(Math.round((ev.loaded / ev.total) * 100));
      };
      await new Promise<void>((resolve, reject) => {
        xhr.open("PUT", uploadURL);
        xhr.setRequestHeader("Content-Type", file.type || "image/png");
        xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
        xhr.onerror = reject;
        xhr.send(file);
      });
      await updateProject.mutateAsync({ id: projectId, data: { studioBackgroundUrl: objectPath, studioFocalX: 50, studioFocalY: 50 } });
      setBgFocalX(50);
      setBgFocalY(50);
      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
      toast({ title: "Background photo uploaded" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setBgUploadProgress(null);
      if (bgPhotoFileInputRef.current) bgPhotoFileInputRef.current.value = "";
    }
  };

  const handleClearBgPhoto = async () => {
    await updateProject.mutateAsync({ id: projectId, data: { studioBackgroundUrl: null, studioFocalX: null, studioFocalY: null } });
    setBgFocalX(50);
    setBgFocalY(50);
    queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
    toast({ title: "Background photo removed" });
  };

  const handleFocalPointClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setBgFocalX(x);
    setBgFocalY(y);
    await updateProject.mutateAsync({ id: projectId, data: { studioFocalX: x, studioFocalY: y } });
    queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
  };

  const handleAddMeasurement = async () => {
    if (!newMeasurementLabel.trim() || !newMeasurementValue.trim()) return;
    await createMeasurement.mutateAsync({
      id: projectId,
      data: { label: newMeasurementLabel.trim(), value: newMeasurementValue.trim() },
    });
    queryClient.invalidateQueries({ queryKey: getListMeasurementsQueryKey(projectId) });
    setNewMeasurementLabel("");
    setNewMeasurementValue("");
  };

  const handleDeleteMeasurementItem = async (measurementId: number) => {
    await deleteMeasurement.mutateAsync({ id: projectId, measurementId });
    queryClient.invalidateQueries({ queryKey: getListMeasurementsQueryKey(projectId) });
  };

  const getEnvStyle = (env: string): React.CSSProperties => {
    if (project?.studioBackgroundUrl) {
      return {
        backgroundColor: "#1a1410",
        backgroundImage: `url(${project.studioBackgroundUrl})`,
        backgroundSize: localBgScale <= 100 ? "cover" : `${localBgScale}%`,
        backgroundPosition: `${project.studioFocalX ?? 50}% ${project.studioFocalY ?? 50}%`,
        backgroundRepeat: "no-repeat",
      };
    }
    const found = ENVIRONMENTS.find((e) => e.value === env);
    if (!found) return { background: "#0a0a0a" };
    if (found.bg.includes("gradient")) return { backgroundImage: found.bg };
    return { backgroundColor: found.bg };
  };

  const hasPlacement = localModelX !== null && localModelY !== null;
  const modelViewerStyle: React.CSSProperties = hasPlacement
    ? {
        position: "absolute",
        left: `${localModelX}%`,
        top: `${localModelY}%`,
        width: `${localModelSize}%`,
        height: `${localModelSize}%`,
        transform: "translate(-50%, -50%)",
      }
    : { width: "100%", height: "100%" };

  if (isLoading || !project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-sm text-muted-foreground animate-pulse">
          Loading Studio...
        </div>
      </div>
    );
  }

  const currentEnv = ENVIRONMENTS.find((e) => e.value === project.environment) ?? ENVIRONMENTS[0];
  const studioUrl = `${import.meta.env.BASE_URL}studio/${project.publicSlug}`;

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
              onChange={handleFileChange}
              data-testid="input-model-file"
            />
            <Button
              variant="outline"
              className="w-full border-border text-sm gap-2"
              onClick={() => triggerUpload({ kind: "model" })}
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

          {/* Background Photo Section — hidden until mobile rendering is fixed */}
          {false && (
          <div className="p-5 border-b border-border">
            <input
              ref={bgPhotoFileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleBgPhotoFileChange}
              data-testid="input-bg-photo-file"
            />
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">
              <ImageIcon className="w-3 h-3 inline mr-2" />
              Background Photo
            </h3>
            {!project.studioBackgroundUrl ? (
              <Button
                variant="outline"
                className="w-full border-border text-sm gap-2"
                onClick={() => bgPhotoFileInputRef.current?.click()}
                disabled={bgUploadProgress !== null}
                data-testid="button-upload-bg-photo"
              >
                <Upload className="w-4 h-4" />
                {bgUploadProgress !== null ? `Uploading ${bgUploadProgress}%...` : "Upload Room Photo"}
              </Button>
            ) : (
              <div className="flex flex-col gap-3">
                {/* Image preview with focal point picker */}
                <div
                  className="relative w-full rounded-sm overflow-hidden cursor-crosshair border border-border"
                  style={{ aspectRatio: "16/9" }}
                  onClick={handleFocalPointClick}
                  title="Click to set focal point"
                  data-testid="bg-photo-focal-picker"
                >
                  <img
                    src={project.studioBackgroundUrl}
                    alt="Background"
                    className="w-full h-full object-cover pointer-events-none"
                  />
                  {/* Crosshair overlay */}
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      left: `${bgFocalX}%`,
                      top: `${bgFocalY}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="drop-shadow-md">
                      <circle cx="12" cy="12" r="4" fill="white" fillOpacity="0.9" />
                      <circle cx="12" cy="12" r="4" stroke="#C9A84C" strokeWidth="1.5" />
                      <line x1="12" y1="2" x2="12" y2="8" stroke="white" strokeWidth="1.5" strokeOpacity="0.9" />
                      <line x1="12" y1="16" x2="12" y2="22" stroke="white" strokeWidth="1.5" strokeOpacity="0.9" />
                      <line x1="2" y1="12" x2="8" y2="12" stroke="white" strokeWidth="1.5" strokeOpacity="0.9" />
                      <line x1="16" y1="12" x2="22" y2="12" stroke="white" strokeWidth="1.5" strokeOpacity="0.9" />
                    </svg>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 py-1 text-center">
                    <span className="text-[10px] text-white/80 bg-black/40 px-2 py-0.5 rounded-full">
                      Click to set focal point
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground/70">
                  Focal point: {bgFocalX}% / {bgFocalY}% — the crop centers here on mobile
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Zoom</Label>
                    <span className="text-xs text-muted-foreground">{Math.round(localBgScale)}%</span>
                  </div>
                  <input
                    type="range"
                    min={100}
                    max={200}
                    step={5}
                    value={localBgScale}
                    onChange={(e) => handleBgScaleChange(Number(e.target.value))}
                    className="w-full accent-primary"
                    data-testid="slider-bg-zoom"
                  />
                  <p className="text-[10px] text-muted-foreground/60">Controls how zoomed-in the background photo appears</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs gap-1.5 border-dashed"
                    onClick={() => bgPhotoFileInputRef.current?.click()}
                    disabled={bgUploadProgress !== null}
                    data-testid="button-replace-bg-photo"
                  >
                    <Upload className="w-3 h-3" />
                    {bgUploadProgress !== null ? `Uploading…` : "Replace"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive"
                    onClick={handleClearBgPhoto}
                    data-testid="button-clear-bg-photo"
                  >
                    <X className="w-3 h-3" />
                    Remove
                  </Button>
                </div>
              </div>
            )}
          </div>
          )}

          {/* Placement Section */}
          <div className="p-5 border-b border-border">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">Placement</h3>
            <Button
              variant={placementMode ? "default" : "outline"}
              className="w-full border-border text-sm gap-2"
              onClick={() => setPlacementMode(!placementMode)}
              data-testid="button-hotspot"
            >
              <MapPin className="w-4 h-4" />
              {placementMode ? "Exit Placement Mode" : "Set Placement"}
            </Button>
            <div className="mt-3 space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Model Size</Label>
                  <span className="text-xs text-muted-foreground">{Math.round(localModelSize)}%</span>
                </div>
                <input
                  type="range"
                  min={30}
                  max={100}
                  step={1}
                  value={localModelSize}
                  onChange={(e) => setLocalModelSize(Number(e.target.value))}
                  className="w-full accent-primary"
                  data-testid="slider-model-size"
                />
              </div>
              {placementMode && (
                <div className="p-3 bg-primary/5 rounded-sm border border-primary/20">
                  <p className="text-xs text-muted-foreground mb-2">
                    Click or drag the viewport to position the model. Adjust size with the slider above.
                  </p>
                  <Button size="sm" className="w-full text-xs" onClick={handleSavePlacement} data-testid="button-save-hotspot">
                    <Check className="w-3 h-3 mr-1" /> Save Position
                  </Button>
                </div>
              )}
              {!placementMode && hasPlacement && (
                <p className="text-[10px] text-muted-foreground/60">
                  Position: {Math.round(localModelX!)}% / {Math.round(localModelY!)}% · Size: {Math.round(localModelSize)}%
                </p>
              )}
            </div>
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

              {/* Default Names */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Default Model Name</Label>
                <div className="flex gap-2">
                  <Input
                    value={defaultModelNameVal}
                    onChange={(e) => setDefaultModelNameVal(e.target.value)}
                    onBlur={handleSaveDefaultModelName}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSaveDefaultModelName(); }}
                    className="h-8 text-xs border-border flex-1"
                    placeholder="e.g. Original"
                    data-testid="input-default-model-name"
                  />
                </div>
                <p className="text-xs text-muted-foreground/60">Shown in studio as the base model label</p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Default Color Name</Label>
                <div className="flex gap-2">
                  <Input
                    value={defaultColorNameVal}
                    onChange={(e) => setDefaultColorNameVal(e.target.value)}
                    onBlur={handleSaveDefaultColorName}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSaveDefaultColorName(); }}
                    className="h-8 text-xs border-border flex-1"
                    placeholder="e.g. Original Color"
                    data-testid="input-default-color-name"
                  />
                </div>
                <p className="text-xs text-muted-foreground/60">Shown in studio as the base color label</p>
              </div>

              {/* Sidebar Appearance */}
              <div className="space-y-3 pt-2 border-t border-border">
                <Label className="text-xs text-muted-foreground">Sidebar Background Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={sidebarColorVal}
                    onChange={(e) => handleSidebarColorChange(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border border-border bg-transparent p-0.5"
                    data-testid="input-sidebar-color"
                  />
                  <span className="text-xs text-muted-foreground font-mono">{sidebarColorVal}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Background Opacity</Label>
                    <span className="text-xs text-muted-foreground font-mono">
                      {Math.round(sidebarOpacityVal * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={sidebarOpacityVal}
                    onChange={(e) => handleSidebarOpacityChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 accent-primary cursor-pointer"
                    data-testid="input-sidebar-opacity"
                  />
                </div>

                <div className="space-y-1.5 pt-1 border-t border-border/60">
                  <Label className="text-xs text-muted-foreground">Brand Accent Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={accentColorVal}
                      onChange={(e) => handleAccentColorChange(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border border-border bg-transparent p-0.5"
                      data-testid="input-accent-color"
                    />
                    <span className="text-xs text-muted-foreground font-mono">{accentColorVal}</span>
                  </div>
                  <p className="text-xs text-muted-foreground/60">Applied to progress bar, company name, measurement values, and the AR button</p>
                </div>

                <div className="space-y-1.5 pt-1 border-t border-border/60">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Text &amp; Arrow Color</Label>
                    <button
                      onClick={() => handleSidebarTextColorChange(sidebarTextColorVal, !sidebarTextColorAuto)}
                      className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                        sidebarTextColorAuto
                          ? "border-primary text-primary bg-primary/10"
                          : "border-border text-muted-foreground hover:border-primary/60 hover:text-primary"
                      }`}
                    >
                      Auto
                    </button>
                  </div>
                  {!sidebarTextColorAuto && (
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={sidebarTextColorVal}
                        onChange={(e) => handleSidebarTextColorChange(e.target.value, false)}
                        className="w-8 h-8 rounded cursor-pointer border border-border bg-transparent p-0.5"
                        data-testid="input-sidebar-text-color"
                      />
                      <span className="text-xs text-muted-foreground font-mono">{sidebarTextColorVal}</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground/60">
                    {sidebarTextColorAuto
                      ? "Adapts automatically to the sidebar brightness"
                      : "Applied to variant names, material labels, and navigation arrows"}
                  </p>
                </div>
              </div>
            </div>
          </div>

        </aside>

        {/* Center — Model Viewer */}
        <main className="flex-1 relative overflow-hidden" style={getEnvStyle(project.environment)}>
          {project.modelUrl ? (
            <model-viewer
              ref={modelViewerRef}
              src={project.modelUrl}
              alt={project.name}
              camera-controls
              {...(!hasPlacement ? { "auto-rotate": "" } : {})}
              ar
              ar-modes="webxr scene-viewer quick-look"
              shadow-intensity="1"
              disable-zoom={!project.isScalable || undefined}
              camera-target={`${project.hotspotX}m ${project.hotspotY}m ${project.hotspotZ}m`}
              style={{
                ...modelViewerStyle,
                ["--mv-background-color" as string]: "rgba(0,0,0,0)",
                backgroundColor: "transparent",
              }}
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
                onClick={() => triggerUpload({ kind: "model" })}
                data-testid="button-upload-empty"
              >
                <Upload className="w-4 h-4 mr-2" /> Add 3D Model
              </Button>
            </div>
          )}

          {/* Placement Mode Overlay — sits on top of model-viewer */}
          {placementMode && (
            <div
              ref={placementOverlayRef}
              className="absolute inset-0 cursor-crosshair select-none"
              onClick={handlePlacementClick}
              onMouseMove={handlePlacementMouseMove}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
              data-testid="hotspot-overlay"
            >
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: "linear-gradient(rgba(201,168,76,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.3) 1px, transparent 1px)",
                  backgroundSize: "10% 10%",
                }}
              />
              <div className="absolute inset-0 flex items-end justify-center pb-8">
                <p className="text-primary/70 text-sm font-light tracking-widest uppercase bg-black/30 px-3 py-1 rounded-full">
                  Click or drag to position model
                </p>
              </div>
              {localModelX !== null && localModelY !== null && (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: `${localModelX}%`,
                    top: `${localModelY}%`,
                    width: `${localModelSize}%`,
                    height: `${localModelSize}%`,
                    transform: "translate(-50%, -50%)",
                    border: "2px dashed rgba(201,168,76,0.7)",
                    borderRadius: "4px",
                  }}
                >
                  <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary border-2 border-primary-foreground shadow-lg"
                  />
                </div>
              )}
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

        {/* Right Panel — Variations */}
        <aside className={`border-l border-border bg-card flex flex-col overflow-y-auto shrink-0 transition-all duration-200 ${showVariations ? "w-72" : "w-10"}`}>
          {/* Header */}
          <div className="p-5 border-b border-border flex items-center gap-2">
            {showVariations && (
              <>
                <Layers className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-widest flex-1">
                  Variations
                </h3>
              </>
            )}
            <button
              onClick={() => setShowVariations(!showVariations)}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-auto"
              aria-label={showVariations ? "Collapse variations" : "Expand variations"}
              data-testid="button-toggle-variations"
            >
              {showVariations ? <ChevronDown className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
            </button>
          </div>

          {showVariations && (
            <>
              {/* Base Model Colors section */}
              <BaseMaterialsPanel
                projectId={projectId}
                onRequestUpload={uploadFile}
              />

              {/* Variants Toggle */}
              <div className="p-5 border-t border-border">
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-xs font-medium">Different Models</Label>
                  <Switch
                    checked={project.enableVariants}
                    onCheckedChange={async (checked) => {
                      await updateProject.mutateAsync({ id: projectId, data: { enableVariants: checked } });
                      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
                    }}
                    data-testid="switch-enable-variants"
                  />
                </div>

                {project.enableVariants && (
                  <div className="flex flex-col gap-4">
                    {variants.map((variant, idx) => (
                      <VariantWithMaterials
                        key={variant.id}
                        variant={variant}
                        variantIndex={idx}
                        variantCount={variants.length}
                        projectId={projectId}
                        onUpload={triggerUpload}
                        onDelete={() => handleDeleteVariant(variant.id)}
                        onRename={(name) => handleRenameVariant(variant.id, name)}
                        onMoveUp={() => handleReorderVariant(idx, "up")}
                        onMoveDown={() => handleReorderVariant(idx, "down")}
                        onRequestUpload={uploadFile}
                      />
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-1.5 border-dashed text-xs mt-1"
                      onClick={handleAddVariant}
                      data-testid="button-add-variant"
                    >
                      <Plus className="w-3 h-3" />
                      Add Variant
                    </Button>
                  </div>
                )}
              </div>

              {/* Dimensions Section — collapsible */}
              <DimensionsPanel
                measurements={measurements}
                newMeasurementLabel={newMeasurementLabel}
                newMeasurementValue={newMeasurementValue}
                onLabelChange={setNewMeasurementLabel}
                onValueChange={setNewMeasurementValue}
                onAdd={handleAddMeasurement}
                onDelete={handleDeleteMeasurementItem}
              />
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
