import { Link } from "wouter";
import { ArrowRight, Box, Cuboid, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      <nav className="fixed top-0 w-full z-50 px-6 py-4 flex justify-between items-center bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-2">
          <Box className="w-6 h-6 text-primary" />
          <span className="font-serif text-xl font-bold tracking-wide text-foreground">AR Studio</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/sign-in">
            <Button variant="ghost" className="text-foreground hover:text-primary">Sign In</Button>
          </Link>
          <Link href="/sign-up">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-none px-6">
              Get Started
            </Button>
          </Link>
        </div>
      </nav>

      <main className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto mt-20 mb-32">
          <h1 className="font-serif text-5xl md:text-7xl font-bold leading-tight mb-6 tracking-tight text-foreground">
            Bring your <span className="text-primary italic pr-2">vision</span> to life in augmented reality.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl font-light">
            The premium platform for luxury brands to showcase furniture and objects in breathtaking, cinematic 3D. 
            Confident, minimal, and flawlessly executed.
          </p>
          <Link href="/sign-up">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-none px-8 py-6 text-lg group transition-all duration-300">
              Enter the Studio
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-20 border-t border-border/30 pt-20">
          <div className="flex flex-col items-center text-center p-6 group">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
              <Layers className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-serif text-2xl font-semibold mb-3">Cinematic Detail</h3>
            <p className="text-muted-foreground font-light leading-relaxed">
              Every texture, every reflection rendered with uncompromising realism. Your products have never looked this good digitally.
            </p>
          </div>
          <div className="flex flex-col items-center text-center p-6 group">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
              <Cuboid className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-serif text-2xl font-semibold mb-3">Spatial Context</h3>
            <p className="text-muted-foreground font-light leading-relaxed">
              Allow your customers to place products perfectly within their own space, perfectly scaled and masterfully lit.
            </p>
          </div>
          <div className="flex flex-col items-center text-center p-6 group">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
              <Box className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-serif text-2xl font-semibold mb-3">Refined Workflow</h3>
            <p className="text-muted-foreground font-light leading-relaxed">
              A studio designed for creatives. Manage your digital assets with tools built for speed, elegance, and control.
            </p>
          </div>
        </div>
      </main>
      
      <footer className="border-t border-border/30 py-12 text-center text-muted-foreground font-light">
        <p>&copy; {new Date().getFullYear()} AR Studio. All rights reserved.</p>
      </footer>
    </div>
  );
}
