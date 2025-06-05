import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { LogReviewModal } from "@/components/log-review-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DailyLog, User } from "@shared/schema";
import { format } from "date-fns";
import { Search, Filter, Download, Clock, Calendar } from "lucide-react";

export default function TeamLogs() {
  const { user } = useAuth();
  const [selectedLog, setSelectedLog] = useState<(DailyLog & { user: User }) | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [developerFilter, setDeveloperFilter] = useState<string>("all");

  const { data: teamLogs = [] } = useQuery<(DailyLog & { user: User })[]>({
    queryKey: ["/api/team-logs"],
    enabled: user?.role === "manager",
  });

  const { data: teamMembers = [] } = useQuery<User[]>({
    queryKey: ["/api/team"],
    enabled: user?.role === "manager",
  });

  // Get unique developers for filter
  const developers = teamMembers.filter(member => member.role === "developer");

  // Filter logs based on search and filter criteria
  const filteredLogs = teamLogs.filter(log => {
    const matchesSearch = 
      log.tasks.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.date.includes(searchQuery) ||
      (log.blockers && log.blockers.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "all" || log.reviewStatus === statusFilter;
    const matchesDeveloper = developerFilter === "all" || log.userId.toString() === developerFilter;

    return matchesSearch && matchesStatus && matchesDeveloper;
  });

  const handleReviewLog = (log: DailyLog & { user: User }) => {
    setSelectedLog(log);
    setIsReviewModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "reviewed":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Reviewed</Badge>;
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

  const getMoodText = (mood: number) => {
    switch (mood) {
      case 1: return "Terrible";
      case 2: return "Poor";
      case 3: return "Neutral";
      case 4: return "Good";
      case 5: return "Excellent";
      default: return "Neutral";
    }
  };

  if (!user || user.role !== "manager") {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="pt-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
                <p className="text-gray-600">Manager role required to view team logs.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Team Logs</h1>
              <p className="text-gray-600">Review and manage your team's daily submissions</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search by developer, task, date, or blockers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <Select value={developerFilter} onValueChange={setDeveloperFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Developers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Developers</SelectItem>
                        {developers.map((developer) => (
                          <SelectItem key={developer.id} value={developer.id.toString()}>
                            {developer.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending Review</SelectItem>
                        <SelectItem value="reviewed">Reviewed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{filteredLogs.length}</p>
                    <p className="text-sm text-gray-600">Total Logs</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-600">
                      {filteredLogs.filter(log => log.reviewStatus === "pending").length}
                    </p>
                    <p className="text-sm text-gray-600">Pending Review</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {filteredLogs.filter(log => log.reviewStatus === "reviewed").length}
                    </p>
                    <p className="text-sm text-gray-600">Reviewed</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Team Logs */}
            <Card>
              <CardHeader>
                <CardTitle>Team Daily Logs ({filteredLogs.length})</CardTitle>
                <CardDescription>Review and provide feedback on your team's submissions</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredLogs.length > 0 ? (
                  <div className="space-y-6">
                    {filteredLogs.map((log) => (
                      <div key={log.id} className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-4">
                            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-medium">
                                {log.user.fullName.split(" ").map(n => n[0]).join("").toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{log.user.fullName}</h3>
                              <div className="flex items-center space-x-4 mt-1">
                                <div className="flex items-center text-sm text-gray-600">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  {format(new Date(log.date), "EEEE, MMMM dd, yyyy")}
                                </div>
                                <div className="flex items-center text-sm text-gray-600">
                                  <Clock className="h-4 w-4 mr-1" />
                                  {log.hours}h {log.minutes}m
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-lg">{getMoodEmoji(log.mood)}</span>
                                  <span className="text-sm text-gray-600">{getMoodText(log.mood)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            {getStatusBadge(log.reviewStatus)}
                            {log.reviewStatus === "pending" ? (
                              <Button
                                size="sm"
                                onClick={() => handleReviewLog(log)}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                Review
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReviewLog(log)}
                              >
                                View Review
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Tasks Completed</h4>
                            <div className="bg-gray-50 rounded-lg p-4 border">
                              <div className="whitespace-pre-wrap font-mono text-sm text-gray-900 line-clamp-4">
                                {log.tasks}
                              </div>
                            </div>
                          </div>

                          {log.blockers && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">Blockers</h4>
                              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                <p className="text-sm text-gray-700">{log.blockers}</p>
                              </div>
                            </div>
                          )}

                          {log.managerFeedback && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">Manager Feedback</h4>
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-sm text-gray-700">{log.managerFeedback}</p>
                                {log.reviewedAt && (
                                  <p className="text-xs text-gray-500 mt-2">
                                    Reviewed on {format(new Date(log.reviewedAt), "MMM dd, yyyy 'at' h:mm a")}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg mb-2">No team logs found</p>
                    <p>
                      {searchQuery || statusFilter !== "all" || developerFilter !== "all"
                        ? "Try adjusting your search or filter criteria"
                        : "Your team members haven't submitted any logs yet"
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Review Modal */}
      <LogReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        log={selectedLog}
      />
    </div>
  );
}
