import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { 
  Home, 
  FileText, 
  Users, 
  Settings, 
  LogOut, 
  BarChart3,
  UserCheck
} from "lucide-react";

export function Sidebar() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const isActive = (path: string) => {
    return location === path;
  };

  const navigationItems = [
    {
      label: "Dashboard",
      path: "/",
      icon: Home,
      roles: ["developer", "manager"]
    },
    {
      label: "My Logs",
      path: "/my-logs",
      icon: FileText,
      roles: ["developer"]
    },
    {
      label: "Manager Dashboard",
      path: "/manager",
      icon: BarChart3,
      roles: ["manager"]
    },
    {
      label: "Team Logs",
      path: "/team-logs",
      icon: UserCheck,
      roles: ["manager"]
    },
    {
      label: "Team Management",
      path: "/team-management",
      icon: Users,
      roles: ["manager"]
    }
  ];

  const visibleItems = navigationItems.filter(item => 
    item.roles.includes(user?.role || "developer")
  );

  return (
    <div className="w-64 bg-card border-r border-border h-screen flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <h2 className="text-xl font-bold text-primary">DevLog</h2>
        <p className="text-sm text-muted-foreground">Developer Productivity Platform</p>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-border">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
                {user?.fullName?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.fullName}</p>
                <div className="flex items-center gap-2">
                  <Badge variant={user?.role === "manager" ? "default" : "secondary"} className="text-xs">
                    {user?.role === "manager" ? "Manager" : "Developer"}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Link key={item.path} href={item.path}>
              <Button
                variant={active ? "default" : "ghost"}
                className={`w-full justify-start gap-3 ${
                  active 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border space-y-2">
        <Button
          variant="ghost"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          {logoutMutation.isPending ? "Signing out..." : "Sign Out"}
        </Button>
        
        <div className="text-xs text-muted-foreground text-center pt-2">
          DevLog v1.0
        </div>
      </div>
    </div>
  );
}