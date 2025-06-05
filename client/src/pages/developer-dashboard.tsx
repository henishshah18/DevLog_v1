import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ProductivityHeatmap } from "@/components/productivity-heatmap";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertDailyLogSchema, type InsertDailyLog, type DailyLog, type Team } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { TrendingUp, Calendar, Bell, Copy, Check, Users, FileText } from "lucide-react";

export default function DeveloperDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBlockers, setSelectedBlockers] = useState<string[]>([]);
  const [customBlocker, setCustomBlocker] = useState("");
  const [showTeamJoin, setShowTeamJoin] = useState(false);
  const [teamCode, setTeamCode] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);

  const predefinedBlockers = [
    "Dependencies", "Testing", "Code Review", "Deployment", "Environment", "Design"
  ];

  const { data: logs = [] } = useQuery<DailyLog[]>({
    queryKey: ["/api/daily-logs"],
  });

  const { data: teamInfo } = useQuery<Team>({
    queryKey: ["/api/user-team"],
    enabled: !!user?.teamId,
  });

  const form = useForm<InsertDailyLog>({
    resolver: zodResolver(insertDailyLogSchema),
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      tasks: "",
      hours: 8,
      minutes: 0,
      mood: 3,
      blockers: "",
    },
  });

  const submitLogMutation = useMutation({
    mutationFn: async (data: InsertDailyLog) => {
      console.log('Submitting log data:', data);
      const logData = {
        ...data,
        blockers: [...selectedBlockers, ...(customBlocker ? [customBlocker] : [])].join(", ")
      };
      console.log('Processed log data:', logData);
      try {
        const res = await apiRequest("POST", "/api/daily-logs", logData);
        const result = await res.json();
        console.log('Submission response:', result);
        return result;
      } catch (error) {
        console.error('Error submitting log:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Daily log submitted successfully!",
        description: "Your productivity log has been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-logs"] });
      form.reset();
      setSelectedBlockers([]);
      setCustomBlocker("");
    },
    onError: (error: Error) => {
      console.error('Mutation error:', error);
      toast({
        title: "Failed to submit log",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const joinTeamMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/team/join", { code });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Team joined successfully!",
        description: "You have been added to the team.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setShowTeamJoin(false);
      setTeamCode("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to join team",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertDailyLog) => {
    console.log('Form submitted with data:', data);
    submitLogMutation.mutate(data);
  };

  const handleBlockerToggle = (blocker: string) => {
    setSelectedBlockers(prev => 
      prev.includes(blocker) 
        ? prev.filter(b => b !== blocker)
        : [...prev, blocker]
    );
  };

  const addCustomBlocker = () => {
    if (customBlocker.trim() && !selectedBlockers.includes(customBlocker.trim())) {
      setSelectedBlockers(prev => [...prev, customBlocker.trim()]);
      setCustomBlocker("");
    }
  };

  const handleCopyTeamCode = async () => {
    if (teamInfo?.code) {
      await navigator.clipboard.writeText(teamInfo.code);
      setCopiedCode(true);
      toast({
        title: "Team code copied!",
        description: "Share this code with your team members.",
      });
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleJoinTeam = () => {
    if (teamCode.trim()) {
      joinTeamMutation.mutate(teamCode.trim());
    }
  };

  function calculateStreak(logs: DailyLog[]): number {
    if (logs.length === 0) return 0;
    
    const sortedLogs = logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < sortedLogs.length; i++) {
      const logDate = new Date(sortedLogs[i].date);
      logDate.setHours(0, 0, 0, 0);
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);
      
      if (logDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }

  const todayLog = logs.find(log => log.date === format(new Date(), "yyyy-MM-dd"));
  const streak = calculateStreak(logs);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with Team Info */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Developer Dashboard</h1>
          <p className="text-muted-foreground">Track your daily productivity and progress</p>
        </div>
        
        {/* Team Status */}
        <div className="text-right">
          {user?.teamId && teamInfo ? (
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium">{teamInfo.name}</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {teamInfo.code}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCopyTeamCode}
                      className="h-6 w-6 p-0"
                    >
                      {copiedCode ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">No team assigned</p>
              {!showTeamJoin ? (
                <Button variant="outline" size="sm" onClick={() => setShowTeamJoin(true)}>
                  Join Team
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter team code"
                    value={teamCode}
                    onChange={(e) => setTeamCode(e.target.value)}
                    className="w-32"
                  />
                  <Button 
                    size="sm" 
                    onClick={handleJoinTeam}
                    disabled={joinTeamMutation.isPending}
                  >
                    Join
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setShowTeamJoin(false)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{streak}</p>
                <p className="text-sm text-muted-foreground">Day Streak</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{logs.length}</p>
                <p className="text-sm text-muted-foreground">Total Logs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">
                  {logs.length > 0 ? Math.round(logs.reduce((sum, log) => sum + (log.hours || 0), 0) / logs.length) : 0}h
                </p>
                <p className="text-sm text-muted-foreground">Avg Hours</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <Badge variant={todayLog ? "default" : "secondary"} className="w-full justify-center">
              {todayLog ? "Logged Today" : "Not Logged"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Log Form */}
        <Card>
          <CardHeader>
            <CardTitle>Submit Daily Log</CardTitle>
            <CardDescription>
              Record your daily tasks, time spent, and productivity metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tasks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tasks Completed</FormLabel>
                      <FormControl>
                        <RichTextEditor
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder="Describe the tasks you completed today..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="hours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time Spent</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              min="0"
                              max="24"
                              {...field}
                              onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                              className="pr-8"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                              hrs
                            </span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="minutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>&nbsp;</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              min="0"
                              max="59"
                              {...field}
                              onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                              className="pr-8"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                              min
                            </span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="mood"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Overall Mood</FormLabel>
                      <FormControl>
                        <Select onValueChange={value => field.onChange(parseInt(value))} value={field.value?.toString()}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your mood" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">😞 Very Sad</SelectItem>
                            <SelectItem value="2">😔 Sad</SelectItem>
                            <SelectItem value="3">😐 Neutral</SelectItem>
                            <SelectItem value="4">😊 Happy</SelectItem>
                            <SelectItem value="5">😄 Very Happy</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Blockers Section */}
                <div>
                  <Label>Blockers & Challenges</Label>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {predefinedBlockers.map(blocker => (
                        <Badge
                          key={blocker}
                          variant={selectedBlockers.includes(blocker) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => handleBlockerToggle(blocker)}
                        >
                          {blocker}
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add custom blocker..."
                        value={customBlocker}
                        onChange={(e) => setCustomBlocker(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addCustomBlocker()}
                      />
                      <Button type="button" variant="outline" onClick={addCustomBlocker}>
                        Add
                      </Button>
                    </div>

                    {selectedBlockers.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <span className="text-sm text-muted-foreground">Selected:</span>
                        {selectedBlockers.map(blocker => (
                          <Badge key={blocker} variant="secondary">
                            {blocker}
                            <button
                              type="button"
                              onClick={() => handleBlockerToggle(blocker)}
                              className="ml-1 hover:text-destructive"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={submitLogMutation.isPending}
                >
                  {submitLogMutation.isPending ? "Submitting..." : "Submit Daily Log"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Quick Actions & Productivity */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="/my-logs">
                  <FileText className="h-4 w-4 mr-2" />
                  View Past Logs
                </a>
              </Button>
              
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="h-4 w-4 mr-2" />
                Productivity Report
              </Button>
              
              {user?.role === "manager" && (
                <>
                  <Button variant="outline" className="w-full justify-start">
                    <Bell className="h-4 w-4 mr-2" />
                    Send Team Reminder
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    View Team Calendar
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <ProductivityHeatmap userId={user?.id} />
        </div>
      </div>

      {/* Recent Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Logs</CardTitle>
          <CardDescription>Your last 5 submitted logs</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No logs submitted yet. Start by submitting your first daily log!
            </p>
          ) : (
            <div className="space-y-4">
              {logs.slice(0, 5).map((log) => (
                <div key={log.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{format(new Date(log.date), "EEEE, MMMM d, yyyy")}</h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {log.hours}h {log.minutes}m
                      </Badge>
                      <Badge variant={log.reviewStatus === "reviewed" ? "default" : "secondary"}>
                        {log.reviewStatus}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {log.tasks || "No tasks specified"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}