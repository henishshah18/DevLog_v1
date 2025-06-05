import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Home, FileText, TrendingUp, LogOut, Menu } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";

export function Sidebar() {
  const { signOut } = useAuth();
  const [location] = useLocation();
  const [isMinimized, setIsMinimized] = useState(false);

  const navItems = [
    { href: "/", icon: Home, label: "Dashboard" },
    { href: "/my-logs", icon: FileText, label: "My Logs" },
    { href: "/productivity", icon: TrendingUp, label: "Productivity Report" },
  ];

  return (
    <div className={cn(
      "border-r bg-background transition-all duration-300 flex flex-col",
      isMinimized ? "w-16" : "w-64"
    )}>
      <div className="p-4 flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsMinimized(!isMinimized)}
          className="h-8 w-8"
        >
          <Menu className="h-4 w-4" />
        </Button>
        {!isMinimized && (
          <div className="ml-2">
            <h2 className="text-2xl font-bold text-primary">DevLog</h2>
            <p className="text-sm text-muted-foreground">Developer Productivity Platform</p>
          </div>
        )}
      </div>

      <div className="space-y-1 flex-1 px-3">
        {navItems.map(({ href, icon: Icon, label }) => (
          <Button
            key={href}
            variant="ghost"
            className={cn(
              "w-full justify-start",
              location === href && "bg-muted",
              isMinimized && "px-2"
            )}
            asChild
          >
            <Link href={href}>
              <Icon className={cn("h-4 w-4", isMinimized ? "mr-0" : "mr-2")} />
              {!isMinimized && <span>{label}</span>}
            </Link>
          </Button>
        ))}
      </div>

      <div className="border-t p-3">
        <Button 
          variant="ghost" 
          className={cn(
            "w-full justify-start text-red-500",
            isMinimized && "px-2"
          )} 
          onClick={signOut}
        >
          <LogOut className={cn("h-4 w-4", isMinimized ? "mr-0" : "mr-2")} />
          {!isMinimized && <span>Sign Out</span>}
        </Button>
      </div>
    </div>
  );
}