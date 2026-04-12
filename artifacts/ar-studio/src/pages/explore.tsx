import { useState, useMemo } from "react";
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
  FileBox
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
