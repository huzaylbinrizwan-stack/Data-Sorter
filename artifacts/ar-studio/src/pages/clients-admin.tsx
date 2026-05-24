import { useState, useEffect } from "react";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Trash2, Plus, FolderOpen, UserPlus, Users, Shield, ChevronDown, ChevronRight } from "lucide-react";

interface ClientRow {
  id: number;
  email: string;
  name: string;
  company: string;
  createdAt: string;
  folderIds: number[];
}

interface AdminRow {
  id: number;
  email: string;
  name: string;
  addedAt: string;
}

interface FolderRow {
  id: number;
  name: string;
  parentId: number | null;
}

export default function ClientsAdmin() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [superAdmins, setSuperAdmins] = useState<string[]>([]);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [expandedClient, setExpandedClient] = useState<number | null>(null);

  const [addClientOpen, setAddClientOpen] = useState(false);
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [newClientCompany, setNewClientCompany] = useState("");
  const [clientError, setClientError] = useState("");

  const [addAdminOpen, setAddAdminOpen] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [adminError, setAdminError] = useState("");

  const refresh = () => {
    fetch("/api/admin/clients", { credentials: "include" }).then(r => r.json()).then(setClients).catch(() => {});
    fetch("/api/admin/admins", { credentials: "include" }).then(r => r.json()).then((d: any) => {
      setSuperAdmins(d.superAdmins ?? []);
      setAdmins(d.additionalAdmins ?? []);
    }).catch(() => {});
    fetch("/api/folders", { credentials: "include" }).then(r => r.json()).then(setFolders).catch(() => {});
  };

  useEffect(() => { refresh(); }, []);

  const handleAddClient = async () => {
    setClientError("");
    if (!newClientEmail.trim()) { setClientError("Email is required"); return; }
    const r = await fetch("/api/admin/clients", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newClientEmail.trim(), name: newClientName.trim(), company: newClientCompany.trim() }),
    });
    if (!r.ok) { const d = await r.json(); setClientError(d.error ?? "Failed"); return; }
    setAddClientOpen(false);
    setNewClientEmail(""); setNewClientName(""); setNewClientCompany("");
    refresh();
  };

  const handleDeleteClient = async (id: number) => {
    if (!confirm("Remove this client? They will lose access immediately.")) return;
    await fetch(`/api/admin/clients/${id}`, { method: "DELETE", credentials: "include" });
    refresh();
  };

  const handleAssignFolder = async (clientId: number, folderId: number) => {
    await fetch(`/api/admin/clients/${clientId}/folders`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId }),
    });
    refresh();
  };

  const handleRemoveFolder = async (clientId: number, folderId: number) => {
    await fetch(`/api/admin/clients/${clientId}/folders/${folderId}`, { method: "DELETE", credentials: "include" });
    refresh();
  };

  const handleAddAdmin = async () => {
    setAdminError("");
    if (!newAdminEmail.trim()) { setAdminError("Email is required"); return; }
    const r = await fetch("/api/admin/admins", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newAdminEmail.trim(), name: newAdminName.trim() }),
    });
    if (!r.ok) { const d = await r.json(); setAdminError(d.error ?? "Failed"); return; }
    setAddAdminOpen(false);
    setNewAdminEmail(""); setNewAdminName("");
    refresh();
  };

  const handleDeleteAdmin = async (id: number) => {
    if (!confirm("Remove this admin?")) return;
    await fetch(`/api/admin/admins/${id}`, { method: "DELETE", credentials: "include" });
    refresh();
  };

  const topFolders = folders.filter(f => f.parentId === null);

  return (
    <Layout>
      <div className="p-10 overflow-y-auto w-full h-full space-y-10">
        <header>
          <h1 className="font-serif text-4xl font-bold text-foreground mb-2 tracking-tight">Access Management</h1>
          <p className="text-muted-foreground font-light text-lg">Manage client accounts and admin permissions.</p>
        </header>

        {/* Clients Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              Clients
            </h2>
            <Button size="sm" className="rounded-sm" onClick={() => setAddClientOpen(true)}>
              <UserPlus className="w-4 h-4 mr-2" /> Add Client
            </Button>
          </div>

          {clients.length === 0 ? (
            <div className="bg-card border border-border rounded-sm p-8 text-center text-muted-foreground">
              No clients yet. Add one to give them access to their AR portal.
            </div>
          ) : (
            <div className="bg-card border border-border rounded-sm overflow-hidden">
              {clients.map((client, i) => (
                <div key={client.id} className={i > 0 ? "border-t border-border" : ""}>
                  <div
                    className="flex items-center gap-4 px-5 py-4 hover:bg-secondary/30 transition-colors cursor-pointer"
                    onClick={() => setExpandedClient(expandedClient === client.id ? null : client.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground">{client.name || client.email}</div>
                      <div className="text-xs text-muted-foreground">{client.email}{client.company ? ` · ${client.company}` : ""}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
                        {client.folderIds.length} folder{client.folderIds.length !== 1 ? "s" : ""}
                      </span>
                      {expandedClient === client.id
                        ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        : <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      }
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteClient(client.id); }}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {expandedClient === client.id && (
                    <div className="px-5 pb-5 bg-secondary/20 border-t border-border">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-4 mb-3">Assigned Folders</p>
                      <div className="space-y-2">
                        {topFolders.map(folder => {
                          const isAssigned = client.folderIds.includes(folder.id);
                          return (
                            <div key={folder.id} className="flex items-center justify-between bg-card border border-border rounded-sm px-3 py-2">
                              <div className="flex items-center gap-2">
                                <FolderOpen className={`w-4 h-4 ${isAssigned ? "text-primary" : "text-muted-foreground"}`} />
                                <span className={`text-sm ${isAssigned ? "text-foreground font-medium" : "text-muted-foreground"}`}>{folder.name}</span>
                              </div>
                              <button
                                onClick={() => isAssigned ? handleRemoveFolder(client.id, folder.id) : handleAssignFolder(client.id, folder.id)}
                                className={`text-xs px-3 py-1 rounded transition-colors ${isAssigned ? "bg-destructive/10 text-destructive hover:bg-destructive/20" : "bg-primary/10 text-primary hover:bg-primary/20"}`}
                              >
                                {isAssigned ? "Remove" : "Assign"}
                              </button>
                            </div>
                          );
                        })}
                        {topFolders.length === 0 && (
                          <p className="text-xs text-muted-foreground">No folders created yet. Create folders in Explore first.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Admins Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl font-bold flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              Admins
            </h2>
            <Button size="sm" variant="outline" className="rounded-sm" onClick={() => setAddAdminOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Admin
            </Button>
          </div>

          <div className="bg-card border border-border rounded-sm overflow-hidden">
            <div className="px-5 py-3 bg-secondary/30 border-b border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Super Admins (built-in)</p>
            </div>
            {superAdmins.map((email, i) => (
              <div key={email} className={`flex items-center gap-3 px-5 py-3 ${i > 0 ? "border-t border-border" : ""}`}>
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-sm text-foreground">{email}</span>
                <span className="ml-auto text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">Super Admin</span>
              </div>
            ))}

            {admins.length > 0 && (
              <>
                <div className="px-5 py-3 bg-secondary/30 border-y border-border">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Additional Admins</p>
                </div>
                {admins.map((admin, i) => (
                  <div key={admin.id} className={`flex items-center gap-3 px-5 py-3 ${i > 0 ? "border-t border-border" : ""}`}>
                    <Shield className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-foreground">{admin.name || admin.email}</div>
                      <div className="text-xs text-muted-foreground">{admin.email}</div>
                    </div>
                    <button
                      onClick={() => handleDeleteAdmin(admin.id)}
                      className="ml-auto p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        </section>
      </div>

      {/* Add Client Dialog */}
      <Dialog open={addClientOpen} onOpenChange={setAddClientOpen}>
        <DialogContent className="bg-card border-border rounded-sm">
          <DialogHeader><DialogTitle className="font-serif">Add Client</DialogTitle></DialogHeader>
          <div className="py-4 space-y-3">
            <Input placeholder="Email address *" value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)} className="rounded-sm" />
            <Input placeholder="Client name" value={newClientName} onChange={e => setNewClientName(e.target.value)} className="rounded-sm" />
            <Input placeholder="Company name" value={newClientCompany} onChange={e => setNewClientCompany(e.target.value)} className="rounded-sm" />
            {clientError && <p className="text-xs text-destructive">{clientError}</p>}
            <div className="text-xs text-muted-foreground bg-muted rounded p-3 leading-relaxed">
              The client will sign in at <code className="font-mono">{window.location.origin}/sign-in</code> using this email. They'll see their own portal with only their assigned projects.
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddClientOpen(false)}>Cancel</Button>
            <Button onClick={handleAddClient} className="bg-primary text-primary-foreground rounded-sm">Add Client</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Admin Dialog */}
      <Dialog open={addAdminOpen} onOpenChange={setAddAdminOpen}>
        <DialogContent className="bg-card border-border rounded-sm">
          <DialogHeader><DialogTitle className="font-serif">Add Admin</DialogTitle></DialogHeader>
          <div className="py-4 space-y-3">
            <Input placeholder="Email address *" value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} className="rounded-sm" />
            <Input placeholder="Name (optional)" value={newAdminName} onChange={e => setNewAdminName(e.target.value)} className="rounded-sm" />
            {adminError && <p className="text-xs text-destructive">{adminError}</p>}
            <p className="text-xs text-muted-foreground">Admins have full access to the dashboard, all projects, and client management.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddAdminOpen(false)}>Cancel</Button>
            <Button onClick={handleAddAdmin} className="bg-primary text-primary-foreground rounded-sm">Add Admin</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
