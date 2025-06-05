import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertDailyLogSchema, type InsertDailyLog, type DailyLog } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Clock, Edit, Trash2, Search, Filter } from "lucide-react";

export default function MyLogs() {
  const [selectedLog, setSelectedLog] = useState<DailyLog | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: logs = [] } = useQuery<DailyLog[]>({
    queryKey: ["/api/daily-logs"],
  });

  const form = useForm<InsertDailyLog>({
    resolver: zodResolver(insertDailyLogSchema),
    defaultValues: {
      date: "",
      tasks: "",
      hours: 8,
      minutes: 0,
      mood: 3,
      blockers: "",
    },
  });

  const updateLogMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InsertDailyLog }) => {
      const res = await apiRequest("PUT", `/api/daily-logs/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Log updated!",
        description: "Your daily log has been updated successfully.",
      });
      setIsEditModalOpen(false);
      setSelectedLog(null);
      queryClient.invalidateQueries({ queryKey: ["/api/daily-logs"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteLogMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/daily-logs/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Log deleted!",
        description: "Your daily log has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-logs"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditLog = (log: DailyLog) => {
    setSelectedLog(log);
    form.reset({
      date: log.date,
      tasks: log.tasks,
      hours: log.hours,
      minutes: log.minutes,
      mood: log.mood,
      blockers: log.blockers || "",
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteLog = (id: number) => {
    if (window.confirm("Are you sure you want to delete this log?")) {
      deleteLogMutation.mutate(id);
    }
  };

  const onSubmit = (data: InsertDailyLog) => {
    if (selectedLog) {
      updateLogMutation.mutate({ id: selectedLog.id, data });
    }
  };

  const filteredLogs = logs.filter(log =>
    log.tasks.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.date.includes(searchQuery) ||
    (log.blockers && log.blockers.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">My Logs</h1>
              <p className="text-gray-600">View and manage your daily log submissions</p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search logs by task, date, or blockers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Button variant="outline">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Logs List */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Logs ({filteredLogs.length})</CardTitle>
                <CardDescription>Your complete log history</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredLogs.length > 0 ? (
                  <div className="space-y-4">
                    {filteredLogs.map((log) => (
                      <div key={log.id} className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-4">
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {format(new Date(log.date), "EEEE, MMMM dd, yyyy")}
                              </h3>
                              <div className="flex items-center space-x-4 mt-1">
                                <div className="flex items-center text-sm text-gray-600">
                                  <Clock className="h-4 w-4 mr-1" />
                                  {log.hours}h {log.minutes}m
                                </div>
                                <span className="text-2xl">{getMoodEmoji(log.mood)}</span>
                                {getStatusBadge(log.reviewStatus)}
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditLog(log)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteLog(log.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Tasks Completed</h4>
                            <div className="bg-gray-50 rounded-lg p-3 font-mono text-sm whitespace-pre-wrap">
                              {log.tasks}
                            </div>
                          </div>

                          {log.blockers && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">Blockers</h4>
                              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                                {log.blockers}
                              </div>
                            </div>
                          )}

                          {log.managerFeedback && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">Manager Feedback</h4>
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                                {log.managerFeedback}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-lg mb-2">No logs found</p>
                    <p>
                      {searchQuery 
                        ? "Try adjusting your search terms" 
                        : "Start by submitting your first daily log!"
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Edit Log Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Daily Log</DialogTitle>
          </DialogHeader>

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
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
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
                        placeholder="Describe the tasks you completed..."
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
                      <FormLabel>Hours</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          max="24"
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
                    <FormItem>
                      <FormLabel>Minutes</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          max="59"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                        {...field}
                        placeholder="Any blockers or challenges?"
                        rows={4}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-3">
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updateLogMutation.isPending}
                >
                  {updateLogMutation.isPending ? "Updating..." : "Update Log"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
