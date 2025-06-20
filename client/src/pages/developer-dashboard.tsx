import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ProductivityHeatmap } from "@/components/productivity-heatmap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertDailyLogSchema, type InsertDailyLog, type DailyLog, type Team } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Copy, Check, Users, Plus, Minus } from "lucide-react";
import { Sidebar } from "@/components/sidebar";

interface TaskEntry {
  description: string;
  hours: number;
  minutes: number;
}

export default function DeveloperDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBlockers, setSelectedBlockers] = useState<string[]>([]);
  const [customBlocker, setCustomBlocker] = useState("");
  const [showTeamJoin, setShowTeamJoin] = useState(false);
  const [teamCode, setTeamCode] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);

  const { data: availableTeams = [] } = useQuery<{ id: number; name: string; code: string }[]>({
    queryKey: ["/api/available-teams"],
    enabled: showTeamJoin,
  });

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

  const form = useForm<{
    date: string;
    tasks: TaskEntry[];
    mood: number;
    blockers: string;
  }>({
    resolver: zodResolver(insertDailyLogSchema.pick({ date: true, mood: true })),
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      tasks: [{ description: "", hours: 0, minutes: 0 }],
      mood: 3,
      blockers: "",
    },
    mode: "onTouched"
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "tasks",
  });

  const submitLogMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('Submitting log data:', data);
      try {
        const res = await apiRequest("POST", "/api/daily-logs", data);
        if (!res.ok) {
          const error = await res.json();
          console.error('Server error:', error);
          throw new Error(error.message || 'Failed to submit log');
        }
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
      form.reset({
        date: format(new Date(), "yyyy-MM-dd"),
        tasks: [{ description: "", hours: 0, minutes: 0 }],
        mood: 3,
        blockers: "",
      });
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
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to join team");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Team joined successfully!",
        description: "You have been added to the team.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-team"] });
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

  const onSubmit = async (formData: any) => {
    console.log('Form submission attempted', { formData, formState: form.formState });

    // Basic form validation
    if (!formData.date) {
      toast({
        title: "Validation Error",
        description: "Please select a date",
        variant: "destructive",
      });
      return;
    }

    if (!formData.tasks || formData.tasks.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one task",
        variant: "destructive",
      });
      return;
    }

    // Validate tasks
    const validTasks = formData.tasks.filter((task: TaskEntry) => task.description.trim());
    if (validTasks.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one task with a description",
        variant: "destructive",
      });
      return;
    }

    // Validate time entries
    const invalidTasks = validTasks.filter(
      (task: TaskEntry) => 
        !task.hours && !task.minutes
    );

    if (invalidTasks.length > 0) {
      toast({
        title: "Validation Error",
        description: "Please specify time spent for all tasks",
        variant: "destructive",
      });
      return;
    }

    if (!formData.mood) {
      toast({
        title: "Validation Error",
        description: "Please select your mood",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Processing form data...');
      // Calculate total hours and minutes
      let totalMinutes = 0;
      validTasks.forEach((task: TaskEntry) => {
        totalMinutes += (task.hours || 0) * 60 + (task.minutes || 0);
      });

      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      // Format tasks as a string
      const tasksString = validTasks
        .map((task: TaskEntry) => 
          `${task.description.trim()} (${task.hours || 0}h ${task.minutes || 0}m)`
        )
        .join("\n");

      // Prepare the log data according to the schema
      const logData = {
        date: formData.date,
        tasks: tasksString,
        hours,
        minutes,
        mood: formData.mood,
        blockers: selectedBlockers.length > 0 ? selectedBlockers.join(", ") : undefined
      };

      console.log('Submitting log data:', logData);
      await submitLogMutation.mutateAsync(logData);
    } catch (error) {
      console.error('Error in onSubmit:', error);
      toast({
        title: "Submission Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
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
    if (teamCode) {
      joinTeamMutation.mutate(teamCode);
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
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="container p-6 space-y-6">
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
                      <Select
                        value={teamCode}
                        onValueChange={setTeamCode}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Select a team" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTeams.map((team) => (
                            <SelectItem key={team.id} value={team.code}>
                              {team.name} ({team.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        size="sm" 
                        onClick={handleJoinTeam}
                        disabled={joinTeamMutation.isPending || !teamCode}
                      >
                        Join
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => {
                          setShowTeamJoin(false);
                          setTeamCode("");
                        }}
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
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      console.log('Form submit event triggered');
                      const formData = form.getValues();
                      console.log('Form values:', formData);
                      onSubmit(formData);
                    }} 
                    className="space-y-4"
                  >
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

                    {/* Tasks List */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Tasks & Time Spent</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => append({ description: "", hours: 0, minutes: 0 })}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Task
                        </Button>
                      </div>

                      {fields.map((field, index) => (
                        <div key={field.id} className="flex items-start gap-2">
                          <div className="flex-1">
                            <Input
                              placeholder="Task description"
                              {...form.register(`tasks.${index}.description`)}
                            />
                          </div>
                          <div className="flex gap-2 items-center">
                            <Input
                              type="number"
                              min="0"
                              max="24"
                              className="w-16"
                              placeholder="hrs"
                              {...form.register(`tasks.${index}.hours`, { valueAsNumber: true })}
                            />
                            <span>h</span>
                            <Input
                              type="number"
                              min="0"
                              max="59"
                              className="w-16"
                              placeholder="min"
                              {...form.register(`tasks.${index}.minutes`, { valueAsNumber: true })}
                            />
                            <span>m</span>
                            {fields.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => remove(index)}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
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
                      onClick={() => console.log('Submit button clicked, form state:', form.formState)}
                    >
                      {submitLogMutation.isPending ? "Submitting..." : "Submit Daily Log"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Productivity Heatmap */}
            <ProductivityHeatmap userId={user?.id} />
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
      </div>
    </div>
  );
}