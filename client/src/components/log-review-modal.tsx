import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { DailyLog, User } from "@shared/schema";
import { Calendar, Clock, User as UserIcon, Star } from "lucide-react";

interface LogReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: (DailyLog & { user: User }) | null;
}

export function LogReviewModal({ isOpen, onClose, log }: LogReviewModalProps) {
  const [feedback, setFeedback] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const reviewMutation = useMutation({
    mutationFn: async (data: { feedback: string; isReviewed: boolean }) => {
      if (!log) throw new Error("No log selected");
      const response = await apiRequest("POST", `/api/daily-logs/${log.id}/review`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-logs"] });
      toast({
        title: "Review submitted",
        description: "Your feedback has been saved successfully.",
      });
      setFeedback("");
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Review failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmitReview = () => {
    if (!feedback.trim()) {
      toast({
        title: "Feedback required",
        description: "Please provide feedback before submitting.",
        variant: "destructive",
      });
      return;
    }
    
    reviewMutation.mutate({
      feedback: feedback.trim(),
      isReviewed: true,
    });
  };

  if (!log) return null;

  const formatDate = (date: Date | string): string => {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    return date.toLocaleDateString();
  };

  const getMoodEmoji = (mood: number | string): string => {
    const moodNumber = typeof mood === 'string' ? parseInt(mood) : mood;
    switch (moodNumber) {
      case 1: return '😢';
      case 2: return '😕';
      case 3: return '😐';
      case 4: return '🙂';
      case 5: return '😄';
      default: return '😐';
    }
  };

  const getProductivityColor = (score: number) => {
    if (score >= 8) return 'bg-green-500';
    if (score >= 6) return 'bg-blue-500';
    if (score >= 4) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            Review Daily Log - {log.user.fullName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Log Header */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Date</p>
                    <p className="text-xs text-muted-foreground">
                      {log.createdAt && formatDate(log.createdAt)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Hours Worked</p>
                    <p className="text-xs text-muted-foreground">
                      {log.hoursWorked || 0}h
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Productivity</p>
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${getProductivityColor(log.productivityScore || 0)}`}></div>
                      <span className="text-xs text-muted-foreground">
                        {log.productivityScore || 0}/10
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getMoodEmoji(log.mood)}</span>
                  <div>
                    <p className="text-sm font-medium">Mood</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {log.mood ? `Level ${log.mood}` : 'Not specified'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tasks Completed */}
          <div>
            <h3 className="font-semibold mb-3">Tasks Completed</h3>
            <Card>
              <CardContent className="pt-4">
                <div className="whitespace-pre-wrap text-sm">
                  {log.tasksCompleted || "No tasks specified"}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Challenges */}
          {log.challenges && (
            <div>
              <h3 className="font-semibold mb-3">Challenges & Blockers</h3>
              <Card>
                <CardContent className="pt-4">
                  <div className="whitespace-pre-wrap text-sm">
                    {log.challenges}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Learning & Notes */}
          {log.learnings && (
            <div>
              <h3 className="font-semibold mb-3">Learning & Notes</h3>
              <Card>
                <CardContent className="pt-4">
                  <div className="whitespace-pre-wrap text-sm">
                    {log.learnings}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Previous Feedback */}
          {log.reviewStatus === 'reviewed' && log.managerFeedback && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Manager Feedback</h4>
              <p className="text-sm text-muted-foreground">{log.managerFeedback}</p>
            </div>
          )}

          {/* Feedback Section */}
          <div>
            <h3 className="font-semibold mb-3">
              {log.reviewStatus === 'reviewed' ? "Update Feedback" : "Provide Feedback"}
            </h3>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Provide constructive feedback, suggestions, or acknowledgment of good work..."
              className="min-h-[120px]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitReview}
              disabled={reviewMutation.isPending}
              className="w-full"
            >
              {reviewMutation.isPending ? "Submitting..." : "Submit Review"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}