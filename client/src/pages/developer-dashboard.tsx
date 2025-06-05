import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { ProductivityHeatmap } from "@/components/productivity-heatmap";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertDailyLogSchema, type InsertDailyLog, type DailyLog, type User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Clock, TrendingUp, Calendar, Bell } from "lucide-react";

export default function DeveloperDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: logs = [] } = useQuery<DailyLog[]>({
    queryKey: ["/api/daily-logs"],
  });

  const [selectedBlockers, setSelectedBlockers] = useState<string[]>([]);
  const [customBlocker, setCustomBlocker] = useState("");

  const predefinedBlockers = [
    "Dependencies", "Testing", "Code Review", "Deployment", "Environment", "Design"
  ];

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
      const res = await apiRequest("POST", "/api/daily-logs", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Log submitted!",
        description: "Your daily log has been submitted successfully.",
      });
      form.reset({
        date: format(new Date(), "yyyy-MM-dd"),
        tasks: "",
        hours: 8,
        minutes: 0,
        mood: 3,
        blockers: "",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/productivity"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertDailyLog) => {
    submitLogMutation.mutate(data);
  };

  // Get today's log status
  const today = format(new Date(), "yyyy-MM-dd");
  const todayLog = logs.find(log => log.date === today);
  const currentStreak = calculateStreak(logs);

  function calculateStreak(logs: DailyLog[]): number {
    if (logs.length === 0) return 0;
    
    const sortedLogs = logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let streak = 0;
    let currentDate = new Date();
    
    for (const log of sortedLogs) {
      const logDate = new Date(log.date);
      const daysDiff = Math.floor((currentDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === streak) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }

  const getMoodEmoji = (mood: number) => {
    switch (mood) {
      case 1: return "😞";
      case 2: return "😔";
      case 3: return "😐";
      case 4: return "😊";
      case 5: return "😄";
      default: return "😐";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "reviewed":
        return <Badge className="bg-green-100 text-green-800">Reviewed</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending Review</Badge>;
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
  };

  if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Welcome back, {user.fullName.split(" ")[0]}!
              </h1>
              <p className="text-gray-600">Track your daily productivity and stay organized</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-8">
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Daily Log Submission */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Submit Daily Log</CardTitle>
                    <CardDescription>Record your daily tasks and progress</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                            name="mood"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Mood</FormLabel>
                                <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select your mood" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="5">😄 Excellent</SelectItem>
                                    <SelectItem value="4">😊 Good</SelectItem>
                                    <SelectItem value="3">😐 Neutral</SelectItem>
                                    <SelectItem value="2">😔 Poor</SelectItem>
                                    <SelectItem value="1">😞 Terrible</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="tasks"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tasks Completed</FormLabel>
                              <FormControl>
                                <RichTextEditor
                                  value={field.value}
                                  onChange={field.onChange}
                                  placeholder={`Describe the tasks you completed today...

Example:
- **Implemented user authentication** (3 hours)
  - Set up JWT token handling
  - Created login/logout endpoints
  - Added password hashing with bcrypt

- **Fixed critical bug in payment processing** (2 hours)
  - Identified race condition in transaction handling
  - Updated database constraints
  - Added comprehensive error handling`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <Label>Total Time Spent</Label>
                            <div className="flex space-x-2 mt-2">
                              <FormField
                                control={form.control}
                                name="hours"
                                render={({ field }) => (
                                  <FormItem className="flex-1">
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        min="0" 
                                        max="24" 
                                        placeholder="Hours"
                                        {...field}
                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="minutes"
                                render={({ field }) => (
                                  <FormItem className="flex-1">
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        min="0" 
                                        max="59" 
                                        placeholder="Minutes"
                                        {...field}
                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        </div>

                        <FormField
                          control={form.control}
                          name="blockers"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Blockers <span className="text-muted-foreground">(Optional)</span>
                              </FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Any blockers or challenges you faced today..."
                                  rows={3}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end space-x-3">
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => form.reset()}
                          >
                            Clear
                          </Button>
                          <Button 
                            type="submit"
                            disabled={submitLogMutation.isPending}
                          >
                            {submitLogMutation.isPending ? "Submitting..." : "Submit Log"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar Stats */}
              <div className="space-y-6">
                {/* Today's Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Today's Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Status</span>
                      {todayLog ? (
                        getStatusBadge(todayLog.reviewStatus)
                      ) : (
                        <Badge variant="destructive">Not Submitted</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Time Logged</span>
                      <span className="font-medium">
                        {todayLog ? `${todayLog.hours}h ${todayLog.minutes}m` : "0h 0m"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Current Streak</span>
                      <span className="font-medium">{currentStreak} days</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="ghost" className="w-full justify-start">
                      <Calendar className="mr-3 h-4 w-4" />
                      View Past Logs
                    </Button>
                    <Button variant="ghost" className="w-full justify-start">
                      <TrendingUp className="mr-3 h-4 w-4" />
                      Productivity Report
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Productivity Heatmap */}
            <Card>
              <CardHeader>
                <CardTitle>Productivity Heatmap</CardTitle>
                <CardDescription>Your activity over the past month</CardDescription>
              </CardHeader>
              <CardContent>
                <ProductivityHeatmap userId={user.id} />
              </CardContent>
            </Card>

            {/* Recent Logs */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Logs</CardTitle>
                    <CardDescription>Your latest submissions</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">View all</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {logs.slice(0, 5).map((log) => (
                    <div key={log.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{format(new Date(log.date), "MMM dd, yyyy")}</span>
                        {getStatusBadge(log.reviewStatus)}
                      </div>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {log.tasks.length > 100 ? `${log.tasks.substring(0, 100)}...` : log.tasks}
                      </p>
                      <div className="flex items-center text-xs text-gray-500 space-x-4">
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>{log.hours}h {log.minutes}m</span>
                        </div>
                        <span>{getMoodEmoji(log.mood)}</span>
                      </div>
                    </div>
                  ))}
                  
                  {logs.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No logs submitted yet. Submit your first daily log above!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
