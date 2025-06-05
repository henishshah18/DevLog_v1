import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DailyLog, User } from "@shared/schema";
import { Clock, Calendar, Smile } from "lucide-react";

interface LogReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: (DailyLog & { user: User }) | null;
}

export function LogReviewModal({ isOpen, onClose, log }: LogReviewModalProps) {
  const [feedback, setFeedback] = useState("");
  const [isReviewed, setIsReviewed] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const reviewMutation = useMutation({
    mutationFn: async (data: { feedback: string; isReviewed: boolean }) => {
      if (!log) throw new Error("No log selected");
      await apiRequest("POST", `/api/daily-logs/${log.id}/review`, data);
    },
    onSuccess: () => {
      toast({
        title: "Review submitted",
        description: "The log review has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/team-logs"] });
      onClose();
      setFeedback("");
      setIsReviewed(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Review failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    reviewMutation.mutate({ feedback, isReviewed });
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

  if (!log) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Daily Log - {log.user.fullName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Developer Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-medium">
                  {log.user.fullName.split(" ").map(n => n[0]).join("").toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{log.user.fullName}</h3>
                <p className="text-gray-600">{log.date}</p>
              </div>
              <div className="ml-auto flex space-x-6">
                <div className="text-center">
                  <div className="flex items-center text-gray-600 mb-1">
                    <Clock className="h-4 w-4 mr-1" />
                    <span className="text-sm">Time Logged</span>
                  </div>
                  <div className="font-semibold text-gray-900">
                    {log.hours}h {log.minutes}m
                  </div>
                </div>
                <div className="text-center">
                  <div className="flex items-center text-gray-600 mb-1">
                    <Smile className="h-4 w-4 mr-1" />
                    <span className="text-sm">Mood</span>
                  </div>
                  <div className="text-2xl">
                    {getMoodEmoji(log.mood)} <span className="text-sm font-medium text-gray-700">{getMoodText(log.mood)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tasks Completed */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Tasks Completed</h4>
            <div className="bg-gray-50 rounded-lg p-4 border">
              <div className="whitespace-pre-wrap font-mono text-sm text-gray-900">
                {log.tasks}
              </div>
            </div>
          </div>

          {/* Blockers */}
          {log.blockers && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Blockers</h4>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-gray-700">{log.blockers}</p>
              </div>
            </div>
          )}

          {/* Existing Manager Feedback */}
          {log.managerFeedback && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Previous Feedback</h4>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-gray-700">{log.managerFeedback}</p>
              </div>
            </div>
          )}

          {/* Manager Feedback Section */}
          <div className="border-t pt-6">
            <Label htmlFor="manager-feedback" className="text-base font-semibold text-gray-900 mb-3 block">
              Manager Feedback
            </Label>
            <Textarea
              id="manager-feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              placeholder="Add your feedback for this log..."
              className="mb-4"
            />

            <div className="flex items-center space-x-2">
              <Checkbox
                id="mark-reviewed"
                checked={isReviewed}
                onCheckedChange={(checked) => setIsReviewed(checked as boolean)}
              />
              <Label htmlFor="mark-reviewed">Mark as reviewed</Label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={reviewMutation.isPending || !feedback.trim()}
            >
              {reviewMutation.isPending ? "Submitting..." : "Submit Review"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
