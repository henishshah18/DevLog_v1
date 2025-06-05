import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { LogReviewModal } from "@/components/log-review-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DailyLog, User } from "@shared/schema";
import { format } from "date-fns";
import { Users, CheckCircle, Clock, AlertTriangle, Bell, Copy } from "lucide-react";

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [selectedLog, setSelectedLog] = useState<(DailyLog & { user: User }) | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const { data: teamLogs = [] } = useQuery<(DailyLog & { user: User })[]>({
    queryKey: ["/api/team-logs"],
    enabled: user?.role === "manager",
  });

  const { data: teamMembers = [] } = useQuery<User[]>({
    queryKey: ["/api/team"],
    enabled: user?.role === "manager",
  });

  const { data: teamCode } = useQuery<{ code: string }>({
    queryKey: ["/api/team/code"],
    enabled: user?.role === "manager",
  });

  // Calculate stats
  const today = format(new Date(), "yyyy-MM-dd");
  const logsToday = teamLogs.filter(log => log.date === today);
  const pendingReviews = teamLogs.filter(log => log.reviewStatus === "pending");
  const membersWithLogsToday = new Set(logsToday.map(log => log.userId));
  const missingLogsToday = teamMembers.filter(member => 
    member.role === "developer" && !membersWithLogsToday.has(member.id)
  );

  const handleReviewLog = (log: DailyLog & { user: User }) => {
    setSelectedLog(log);
    setIsReviewModalOpen(true);
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

  const copyTeamCode = () => {
    if (teamCode?.code) {
      navigator.clipboard.writeText(teamCode.code);
    }
  };

  if (!user || user.role !== "manager") {
    return <div>Access denied. Manager role required.</div>;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Team Dashboard</h1>
              <p className="text-gray-600">Monitor your team's productivity and progress</p>
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
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Team Members</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {teamMembers.filter(m => m.role === "developer").length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Logs Today</p>
                      <p className="text-2xl font-semibold text-gray-900">{logsToday.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <Clock className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Pending Reviews</p>
                      <p className="text-2xl font-semibold text-gray-900">{pendingReviews.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Missing Today</p>
                      <p className="text-2xl font-semibold text-gray-900">{missingLogsToday.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Recent Team Activity */}
              <div className="xl:col-span-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Recent Team Activity</CardTitle>
                        <CardDescription>Latest log submissions requiring attention</CardDescription>
                      </div>
                      <Button variant="outline" size="sm">View all</Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 font-medium text-gray-500">Developer</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-500">Time</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-500">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {teamLogs.slice(0, 10).map((log) => (
                            <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-4 px-4">
                                <div className="flex items-center">
                                  <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                                    <span className="text-xs font-medium text-gray-600">
                                      {log.user.fullName.split(" ").map(n => n[0]).join("").toUpperCase()}
                                    </span>
                                  </div>
                                  <span className="font-medium text-gray-900">{log.user.fullName}</span>
                                </div>
                              </td>
                              <td className="py-4 px-4 text-gray-900">
                                {format(new Date(log.date), "MMM dd, yyyy")}
                              </td>
                              <td className="py-4 px-4 text-gray-900">
                                {log.hours}h {log.minutes}m
                              </td>
                              <td className="py-4 px-4">
                                {getStatusBadge(log.reviewStatus)}
                              </td>
                              <td className="py-4 px-4">
                                {log.reviewStatus === "pending" ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleReviewLog(log)}
                                  >
                                    Review
                                  </Button>
                                ) : (
                                  <span className="text-gray-400 text-sm">Reviewed</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {teamLogs.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <p>No team logs available yet.</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Team Code */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Team Code</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-300">
                      <div className="text-center">
                        <p className="text-sm text-gray-600 mb-2">Share this code with developers:</p>
                        <p className="text-2xl font-mono font-bold text-blue-600">
                          {teamCode?.code || "Loading..."}
                        </p>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="mt-2"
                          onClick={copyTeamCode}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy Code
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Missing Logs Alert */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Missing Logs Today</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {missingLogsToday.length > 0 ? (
                      <div className="space-y-3">
                        {missingLogsToday.map((developer) => (
                          <div key={developer.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                            <div className="flex items-center">
                              <div className="h-8 w-8 bg-red-200 rounded-full flex items-center justify-center mr-3">
                                <span className="text-xs font-medium text-red-700">
                                  {developer.fullName.split(" ").map(n => n[0]).join("").toUpperCase()}
                                </span>
                              </div>
                              <span className="font-medium text-red-900">{developer.fullName}</span>
                            </div>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-800">
                              Remind
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                        <p>All team members have submitted their logs today!</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
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
