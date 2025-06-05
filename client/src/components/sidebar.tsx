import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Code, BarChart3, BookOpen, Users, Settings, LogOut, Home } from "lucide-react";

export function Sidebar() {
  const { user, logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();

  if (!user) return null;

  const isDeveloper = user.role === "developer";
  const isManager = user.role === "manager";

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const navigation = isDeveloper
    ? [
        { name: "Dashboard", href: "/", icon: Home },
        { name: "My Logs", href: "/my-logs", icon: BookOpen },
        { name: "Reports", href: "/reports", icon: BarChart3 },
      ]
    : [
        { name: "Team Dashboard", href: "/manager", icon: Home },
        { name: "Team Logs", href: "/team-logs", icon: BookOpen },
        { name: "Team Management", href: "/team-management", icon: Users },
        { name: "Reports", href: "/reports", icon: BarChart3 },
      ];

  return (
    <div className="hidden md:flex md:w-80 md:flex-col">
      <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto bg-white border-r border-gray-200">
        <div className="flex items-center flex-shrink-0 px-6 mb-8">
          <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
            <Code className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">DevLog</h1>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Button
                key={item.name}
                variant={isActive ? "secondary" : "ghost"}
                className={`w-full justify-start ${
                  isActive
                    ? "bg-blue-50 border-r-2 border-blue-600 text-blue-600"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
                onClick={() => setLocation(item.href)}
              >
                <item.icon className="mr-3 h-4 w-4" />
                {item.name}
              </Button>
            );
          })}
        </nav>

        <div className="flex-shrink-0 p-4 border-t border-gray-200">
          <div className="flex items-center">
            <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-600">
                {user.fullName.split(" ").map(n => n[0]).join("").toUpperCase()}
              </span>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900">{user.fullName}</p>
              <p className="text-xs text-gray-500 capitalize">{user.role}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="text-gray-400 hover:text-gray-600"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
