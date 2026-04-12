import React from "react";
import { Link, useLocation } from "wouter";
import { Box, LayoutDashboard, FolderOpen, LogOut } from "lucide-react";
import { useClerk } from "@clerk/react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { signOut } = useClerk();

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <Box className="w-6 h-6 text-primary" />
          <span className="font-serif text-xl font-bold tracking-wide">AR Studio</span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          <Link href="/dashboard" className={`flex items-center gap-3 px-4 py-3 rounded-sm transition-colors ${location === '/dashboard' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-medium">Dashboard</span>
          </Link>
          <Link href="/explore" className={`flex items-center gap-3 px-4 py-3 rounded-sm transition-colors ${location.startsWith('/explore') ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
            <FolderOpen className="w-5 h-5" />
            <span className="font-medium">Explore</span>
          </Link>
        </nav>
        
        <div className="p-4 border-t border-border">
          <button 
            onClick={() => signOut()} 
            className="flex items-center gap-3 px-4 py-3 w-full text-left text-muted-foreground hover:bg-secondary hover:text-foreground rounded-sm transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>
      
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
