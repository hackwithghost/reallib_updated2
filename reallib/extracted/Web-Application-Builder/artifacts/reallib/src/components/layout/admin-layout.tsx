import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  Armchair, 
  CalendarDays, 
  ClipboardCheck, 
  FileBarChart, 
  Settings, 
  LogOut,
  Menu
} from "lucide-react";
import { clearToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    clearToken();
    setLocation("/login");
  };

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Students", href: "/students", icon: Users },
    { name: "Seats", href: "/seats", icon: Armchair },
    { name: "Allocations", href: "/allocations", icon: CalendarDays },
    { name: "Attendance", href: "/attendance", icon: ClipboardCheck },
    { name: "Reports", href: "/reports", icon: FileBarChart },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-screen sticky top-0">
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-2xl font-serif font-bold text-primary dark:text-primary-foreground tracking-tight">RealLib</h1>
          <p className="text-xs text-sidebar-foreground/70 uppercase tracking-wider mt-1">Admin Portal</p>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.startsWith(item.href);
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-sidebar-border">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" 
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 mr-3" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-background border-b border-border sticky top-0 z-10">
          <h1 className="text-xl font-serif font-bold text-primary">RealLib</h1>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu className="h-6 w-6" />
          </Button>
        </header>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
            <aside className="w-64 flex-col bg-sidebar text-sidebar-foreground h-full shadow-xl">
              <div className="p-6 border-b border-sidebar-border flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-serif font-bold text-primary">RealLib</h1>
                  <p className="text-xs text-sidebar-foreground/70 uppercase mt-1">Admin Portal</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="text-sidebar-foreground">
                  <Menu className="h-6 w-6" />
                </Button>
              </div>
              
              <nav className="py-4 px-3 space-y-1">
                {navItems.map((item) => {
                  const isActive = location.startsWith(item.href);
                  const Icon = item.icon;
                  
                  return (
                    <Link 
                      key={item.href} 
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium ${
                        isActive 
                          ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
              
              <div className="p-4 border-t border-sidebar-border absolute bottom-0 w-full">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-sidebar-foreground" 
                  onClick={handleLogout}
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  Sign Out
                </Button>
              </div>
            </aside>
          </div>
        )}

        {/* Page Content */}
        <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
