import { useGetDashboardStats } from "@workspace/api-client-react";
import { useUser } from "@clerk/react";
import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Box, Layers, Zap } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { user } = useUser();
  const { data: stats, isLoading } = useGetDashboardStats();

  const greeting = user?.firstName ? `Welcome back, ${user.firstName}.` : "Welcome to the Studio.";

  return (
    <Layout>
      <div className="p-10 overflow-y-auto w-full h-full">
        <header className="mb-12">
          <h1 className="font-serif text-4xl font-bold text-foreground mb-2 tracking-tight">{greeting}</h1>
          <p className="text-muted-foreground font-light text-lg">Here's an overview of your augmented reality projects.</p>
        </header>

        {isLoading || !stats ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-secondary rounded-sm"></div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <Card className="bg-card rounded-sm border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Projects</CardTitle>
                  <Layers className="w-4 h-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-serif font-bold">{stats.totalProjects}</div>
                </CardContent>
              </Card>
              
              <Card className="bg-card rounded-sm border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Live AR Experiences</CardTitle>
                  <Box className="w-4 h-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-serif font-bold">{stats.liveARs}</div>
                </CardContent>
              </Card>

              <Card className="bg-card rounded-sm border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Avg Load Speed</CardTitle>
                  <Zap className="w-4 h-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-serif font-bold">{stats.avgLoadSpeedMs}<span className="text-lg font-sans text-muted-foreground ml-1">ms</span></div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <h2 className="font-serif text-2xl font-bold mb-6">Recent Projects</h2>
                <div className="bg-card rounded-sm border border-border overflow-hidden">
                  {stats.recentProjects.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">No projects yet.</div>
                  ) : (
                    <table className="w-full text-sm text-left">
                      <thead className="bg-secondary/50 text-muted-foreground uppercase text-xs tracking-wider">
                        <tr>
                          <th className="px-6 py-4 font-medium">Project</th>
                          <th className="px-6 py-4 font-medium">Company</th>
                          <th className="px-6 py-4 font-medium">Status</th>
                          <th className="px-6 py-4 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {stats.recentProjects.map(project => (
                          <tr key={project.id} className="hover:bg-secondary/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-foreground flex items-center gap-3">
                              {project.thumbnail ? (
                                <img src={project.thumbnail} alt={project.name} className="w-10 h-10 object-cover rounded-sm bg-secondary" />
                              ) : (
                                <div className="w-10 h-10 rounded-sm bg-secondary flex items-center justify-center">
                                  <Box className="w-5 h-5 text-muted-foreground" />
                                </div>
                              )}
                              {project.name}
                            </td>
                            <td className="px-6 py-4 text-muted-foreground">{project.companyName}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${project.isLive ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                                {project.isLive ? 'Live' : 'Draft'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => window.open(`/editor/${project.id}`, '_blank')}
                                className="text-primary hover:text-primary/80 font-medium"
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
              
              <div>
                <h2 className="font-serif text-2xl font-bold mb-6">Environments</h2>
                <div className="bg-card rounded-sm border border-border p-6">
                  {stats.projectsByEnvironment.length === 0 ? (
                    <div className="text-center text-muted-foreground py-4">No data available.</div>
                  ) : (
                    <div className="space-y-4">
                      {stats.projectsByEnvironment.map((env) => (
                        <div key={env.environment} className="flex items-center justify-between">
                          <span className="capitalize text-muted-foreground">{env.environment.replace('-', ' ')}</span>
                          <div className="flex items-center gap-3">
                            <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary" 
                                style={{ width: `${(env.count / Math.max(1, stats.totalProjects)) * 100}%` }}
                              />
                            </div>
                            <span className="font-medium text-foreground w-6 text-right">{env.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
