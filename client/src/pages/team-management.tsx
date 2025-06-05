import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { User } from "@shared/schema";
import { format } from "date-fns";
import { Users, Copy, UserMinus, Mail, Calendar, CheckCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function TeamManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);

  const { data: teamMembers = [] } = useQuery<User[]>({
    queryKey: ["/api/team"],
    enabled: user?.role === "manager",
  });

  const { data: teamCode } = useQuery<{ code: string }>({
    queryKey: ["/api/team/code"],
    enabled: user?.role === "manager",
  });

  const developers = teamMembers.filter(member => member.role === "developer");

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: number) => {
      await apiRequest("DELETE", `/api/team/members/${memberId}`);
    },
    onSuccess: () => {
      toast({
        title: "Member removed",
        description: "Team member has been removed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/team"] });
      setIsRemoveDialogOpen(false);
      setSelectedMember(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const copyTeamCode = async () => {
    if (teamCode?.code) {
      try {
        await navigator.clipboard.writeText(teamCode.code);
        toast({
          title: "Team code copied!",
          description: "The team code has been copied to your clipboard.",
        });
      } catch (err) {
        toast({
          title: "Failed to copy",
          description: "Could not copy team code to clipboard.",
          variant: "destructive",
        });
      }
    }
  };

  const handleRemoveMember = (member: User) => {
    setSelectedMember(member);
    setIsRemoveDialogOpen(true);
  };

  const confirmRemoveMember = () => {
    if (selectedMember) {
      removeMemberMutation.mutate(selectedMember.id);
    }
  };

  const sendReminder = async (memberId: number) => {
    try {
      await apiRequest("POST", `/api/team/members/${memberId}/remind`);
      toast({
        title: "Reminder sent",
        description: "A reminder has been sent to the team member.",
      });
    } catch (error) {
      toast({
        title: "Failed to send reminder",
        description: "Could not send reminder to team member.",
        variant: "destructive",
      });
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
                <p className="text-gray-600">Manager role required to manage team.</p>
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
              <h1 className="text-2xl font-semibold text-gray-900">Team Management</h1>
              <p className="text-gray-600">Manage your team members and settings</p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-8">
            
            {/* Team Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Total Developers</p>
                      <p className="text-2xl font-semibold text-gray-900">{developers.length}</p>
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
                      <p className="text-sm font-medium text-gray-500">Active Members</p>
                      <p className="text-2xl font-semibold text-gray-900">{developers.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Team Created</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {user.createdAt ? format(new Date(user.createdAt), "MMM yyyy") : "Recently"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Team Members List */}
              <div className="xl:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Team Members ({developers.length})</CardTitle>
                    <CardDescription>Manage your development team</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {developers.length > 0 ? (
                      <div className="space-y-4">
                        {developers.map((member) => (
                          <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="flex items-center space-x-4">
                              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 font-medium">
                                  {member.fullName.split(" ").map(n => n[0]).join("").toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <h3 className="font-medium text-gray-900">{member.fullName}</h3>
                                <p className="text-sm text-gray-600">{member.email}</p>
                                <div className="flex items-center space-x-4 mt-1">
                                  <Badge variant="secondary" className="text-xs">
                                    {member.role}
                                  </Badge>
                                  <span className="text-xs text-gray-500">
                                    Joined {format(new Date(member.createdAt), "MMM dd, yyyy")}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => sendReminder(member.id)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <Mail className="h-4 w-4 mr-1" />
                                Remind
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveMember(member)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <UserMinus className="h-4 w-4 mr-1" />
                                Remove
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg mb-2">No team members yet</p>
                        <p>Share your team code below to invite developers to join</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Team Settings Sidebar */}
              <div className="space-y-6">
                {/* Team Code */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Team Invitation Code</CardTitle>
                    <CardDescription>Share this code with developers to join your team</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-blue-50 rounded-lg p-6 border-2 border-dashed border-blue-300">
                      <div className="text-center">
                        <p className="text-3xl font-mono font-bold text-blue-700 mb-4">
                          {teamCode?.code || "Loading..."}
                        </p>
                        <Button 
                          onClick={copyTeamCode}
                          className="w-full"
                          disabled={!teamCode?.code}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Team Code
                        </Button>
                      </div>
                    </div>

                    <Alert className="mt-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Keep this code secure. Anyone with this code can join your team.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>

                {/* Instructions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">How to Invite Developers</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start space-x-3">
                        <div className="bg-blue-100 rounded-full p-1 mt-0.5">
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        </div>
                        <span className="text-gray-700">Share the team code above with developers</span>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="bg-blue-100 rounded-full p-1 mt-0.5">
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        </div>
                        <span className="text-gray-700">They can enter it during registration or in their profile</span>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="bg-blue-100 rounded-full p-1 mt-0.5">
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        </div>
                        <span className="text-gray-700">They'll appear in your team list automatically</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <Mail className="mr-3 h-4 w-4" />
                      Send Team Reminder
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="mr-3 h-4 w-4" />
                      View Team Calendar
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Remove Member Confirmation Dialog */}
      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {selectedMember?.fullName} from your team? 
              This action cannot be undone and they will lose access to team features.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="outline" onClick={() => setIsRemoveDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmRemoveMember}
              disabled={removeMemberMutation.isPending}
            >
              {removeMemberMutation.isPending ? "Removing..." : "Remove Member"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
