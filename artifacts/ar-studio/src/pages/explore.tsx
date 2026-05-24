import { useState, useMemo, useCallback } from "react";
import Layout from "@/components/layout";
import { 
  useListFolders, 
  useListProjects, 
  useCreateFolder, 
  useUpdateFolder, 
  useDeleteFolder, 
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  getGetDashboardStatsQueryKey
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Folder as FolderIcon, 
  Plus, 
  Box, 
  MoreVertical, 
  Pencil, 
  Trash2, 
  ChevronRight,
  Search,
  FileBox,
  Zap,
  Copy,
  Check
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import { getListFoldersQueryKey, getListProjectsQueryKey } from "@workspace/api-client-react";

export default function Explore() {
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: folders = [] } = useListFolders();
  const projectsParams = currentFolderId !== null ? { folderId: currentFolderId } : undefined;
  const { data: projects = [] } = useListProjects(projectsParams, { 
    query: { queryKey: getListProjectsQueryKey(projectsParams) } 
  });

  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectCompany, setNewProjectCompany] = useState("");

  const [isRenameProjectDialogOpen, setIsRenameProjectDialogOpen] = useState(false);
  const [renamingProject, setRenamingProject] = useState<{ id: number; name: string } | null>(null);
  const [renameProjectName, setRenameProjectName] = useState("");

  const [isSnippetOpen, setIsSnippetOpen] = useState(false);
  const [snippetCopied, setSnippetCopied] = useState(false);

  const handleCopySnippet = useCallback((text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setSnippetCopied(true);
    setTimeout(() => setSnippetCopied(false), 2000);
  }, []);

  const currentFolder = useMemo(() => folders.find(f => f.id === currentFolderId), [folders, currentFolderId]);
  const visibleFolders = useMemo(() => folders.filter(f => f.parentId === currentFolderId && f.name.toLowerCase().includes(search.toLowerCase())), [folders, currentFolderId, search]);
  const visibleProjects = useMemo(() => projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase())), [projects, search]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolder.mutateAsync({ data: { name: newFolderName, parentId: currentFolderId } });
    setIsFolderDialogOpen(false);
    setNewFolderName("");
    queryClient.invalidateQueries({ queryKey: getListFoldersQueryKey() });
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !newProjectCompany.trim()) return;
    await createProject.mutateAsync({ 
      data: { 
        name: newProjectName, 
        companyName: newProjectCompany, 
        folderId: currentFolderId 
      } 
    });
    setIsProjectDialogOpen(false);
    setNewProjectName("");
    setNewProjectCompany("");
    queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey(projectsParams) });
    queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
  };

  const handleDeleteFolder = async (id: number) => {
    if (confirm("Are you sure you want to delete this folder?")) {
      await deleteFolder.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListFoldersQueryKey() });
    }
  };

  const handleDeleteProject = async (id: number) => {
    if (confirm("Are you sure you want to delete this project?")) {
      await deleteProject.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey(projectsParams) });
      queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
    }
  };

  const handleOpenRenameProject = (project: { id: number; name: string }) => {
    setRenamingProject(project);
    setRenameProjectName(project.name);
    setIsRenameProjectDialogOpen(true);
  };

  const handleRenameProject = async () => {
    if (!renamingProject || !renameProjectName.trim()) return;
    await updateProject.mutateAsync({ id: renamingProject.id, data: { name: renameProjectName.trim() } });
    setIsRenameProjectDialogOpen(false);
    setRenamingProject(null);
    setRenameProjectName("");
    queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey(projectsParams) });
  };

  // Build breadcrumbs
  const breadcrumbs = [];
  let curr = currentFolder;
  while (curr) {
    breadcrumbs.unshift(curr);
    curr = folders.find(f => f.id === curr?.parentId);
  }

  return (
    <Layout>
      <div className="flex flex-col h-full">
        {/* Toolbar */}
        <div className="px-8 py-5 border-b border-border flex items-center justify-between bg-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <button 
              onClick={() => setCurrentFolderId(null)}
              className="hover:text-foreground transition-colors font-medium"
            >
              Workspace
            </button>
            {breadcrumbs.map(bc => (
              <div key={bc.id} className="flex items-center gap-2">
                <ChevronRight className="w-4 h-4" />
                <button 
                  onClick={() => setCurrentFolderId(bc.id)}
                  className="hover:text-foreground transition-colors font-medium"
                >
                  {bc.name}
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 w-64 bg-background border-border rounded-sm h-9"
              />
            </div>
            
            {currentFolderId !== null && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-sm border-border h-9"
                onClick={() => setIsSnippetOpen(true)}
              >
                <Zap className="w-4 h-4 mr-2" /> Preloader Snippet
              </Button>
            )}

            <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-sm border-border h-9">
                  <FolderIcon className="w-4 h-4 mr-2" /> New Folder
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-sm border border-border bg-card">
                <DialogHeader>
                  <DialogTitle className="font-serif">Create Folder</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <Input 
                    placeholder="Folder name" 
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    className="rounded-sm"
                  />
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsFolderDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateFolder} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm">Create</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="rounded-sm bg-primary text-primary-foreground hover:bg-primary/90 h-9">
                  <Plus className="w-4 h-4 mr-2" /> New Project
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-sm border border-border bg-card">
                <DialogHeader>
                  <DialogTitle className="font-serif">Create AR Project</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Project Name</label>
                    <Input 
                      placeholder="e.g. Lounge Chair" 
                      value={newProjectName}
                      onChange={e => setNewProjectName(e.target.value)}
                      className="rounded-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Company Name</label>
                    <Input 
                      placeholder="e.g. Herman Miller" 
                      value={newProjectCompany}
                      onChange={e => setNewProjectCompany(e.target.value)}
                      className="rounded-sm"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsProjectDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateProject} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm">Create Project</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 overflow-y-auto bg-background">
          {visibleFolders.length === 0 && visibleProjects.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <FileBox className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-serif">This folder is empty.</p>
              <p className="text-sm">Create a new folder or project to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {/* Folders */}
              {visibleFolders.map(folder => (
                <div 
                  key={folder.id}
                  className="group relative bg-card border border-border rounded-sm p-4 hover:border-primary/50 transition-colors cursor-pointer"
                  onDoubleClick={() => setCurrentFolderId(folder.id)}
                >
                  <div className="flex items-start justify-between">
                    <FolderIcon className="w-10 h-10 text-primary mb-3" />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-sm border-border">
                        <DropdownMenuItem onClick={() => {
                          const name = prompt("New folder name:", folder.name);
                          if (name) {
                            updateFolder.mutate({ id: folder.id, data: { name } }, {
                              onSuccess: () => queryClient.invalidateQueries({ queryKey: getListFoldersQueryKey() })
                            });
                          }
                        }}>
                          <Pencil className="w-4 h-4 mr-2" /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteFolder(folder.id)} className="text-destructive focus:text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <h3 className="font-medium text-foreground truncate">{folder.name}</h3>
                </div>
              ))}

              {/* Projects */}
              {visibleProjects.map(project => (
                <div 
                  key={project.id}
                  className="group relative bg-card border border-border rounded-sm overflow-hidden hover:border-primary/50 transition-colors cursor-pointer flex flex-col"
                  onDoubleClick={() => window.open(`/editor/${project.id}`, '_blank')}
                >
                  <div className="aspect-video bg-secondary relative">
                    {project.thumbnail ? (
                      <img src={project.thumbnail} alt={project.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Box className="w-8 h-8 opacity-50" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <span className={`px-2 py-1 rounded-sm text-[10px] uppercase tracking-wider font-bold shadow-sm ${project.isLive ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground'}`}>
                        {project.isLive ? 'Live' : 'Offline'}
                      </span>
                    </div>
                    <div className="absolute top-2 right-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 bg-background/80 backdrop-blur-sm rounded-sm text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-sm border-border">
                          <DropdownMenuItem onClick={() => window.open(`/editor/${project.id}`, '_blank')}>
                            <Pencil className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenRenameProject({ id: project.id, name: project.name })}>
                            <Pencil className="w-4 h-4 mr-2" /> Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteProject(project.id)} className="text-destructive focus:text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-center">
                    <h3 className="font-medium text-foreground truncate mb-1">{project.name}</h3>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide truncate">{project.companyName}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preloader Snippet Dialog */}
      {currentFolderId !== null && (
        <Dialog open={isSnippetOpen} onOpenChange={setIsSnippetOpen}>
          <DialogContent className="bg-card border-border rounded-sm max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-serif flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Preloader Snippet
              </DialogTitle>
            </DialogHeader>
            <div className="py-2 space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Add this one line to the <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">&lt;head&gt;</code> of{" "}
                <strong>{currentFolder?.name ?? "this client's"}</strong> website.
                It silently preloads all AR assets in the background — so when a visitor opens the AR experience, everything is already cached and loads instantly.
              </p>

              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Paste in client's &lt;head&gt;</p>
                <div className="relative">
                  <pre className="text-[10px] font-mono bg-muted rounded border border-border p-3 overflow-x-auto whitespace-pre-wrap break-all text-muted-foreground leading-relaxed">
{`<script src="${window.location.origin}/api/preload.js?client=${currentFolderId}" async></script>`}
                  </pre>
                  <button
                    onClick={() => handleCopySnippet(`<script src="${window.location.origin}/api/preload.js?client=${currentFolderId}" async></script>`)}
                    className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground transition-colors"
                    title="Copy"
                  >
                    {snippetCopied
                      ? <Check className="w-4 h-4 text-primary" />
                      : <Copy className="w-4 h-4" />
                    }
                  </button>
                </div>
              </div>

              <div className="rounded border border-border bg-background p-3 space-y-2">
                <p className="text-xs font-medium text-foreground">How it works</p>
                <ol className="space-y-1.5 text-xs text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="text-primary font-medium shrink-0">1.</span>
                    Visitor lands on the client's homepage — the script runs invisibly in the background.
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-medium shrink-0">2.</span>
                    All 3D models and room files for this folder are downloaded into the browser cache.
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-medium shrink-0">3.</span>
                    When the visitor opens the AR experience, everything is already cached — loads in under 1 second.
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-medium shrink-0">4.</span>
                    Zero impact on the client's website speed (runs in the background after page load).
                  </li>
                </ol>
              </div>

              <div className="rounded border border-primary/20 bg-primary/5 p-3">
                <p className="text-xs text-primary/80 leading-relaxed">
                  <span className="font-medium">Client steps:</span> Open their website CMS or code editor → find the <code className="font-mono">&lt;head&gt;</code> section → paste the script tag → save and publish.
                  Works on any website: Shopify, Wix, Webflow, WordPress, or custom HTML.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsSnippetOpen(false)}>Close</Button>
              <Button
                onClick={() => handleCopySnippet(`<script src="${window.location.origin}/api/preload.js?client=${currentFolderId}" async></script>`)}
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm"
              >
                {snippetCopied ? <><Check className="w-4 h-4 mr-2" /> Copied!</> : <><Copy className="w-4 h-4 mr-2" /> Copy Snippet</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Rename Project Dialog */}
      <Dialog open={isRenameProjectDialogOpen} onOpenChange={setIsRenameProjectDialogOpen}>
        <DialogContent className="bg-card border-border rounded-sm">
          <DialogHeader>
            <DialogTitle className="font-serif">Rename Project</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="Project name"
              value={renameProjectName}
              onChange={e => setRenameProjectName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleRenameProject()}
              className="rounded-sm"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsRenameProjectDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRenameProject} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm">
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
