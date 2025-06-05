import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, parseISO, isSameMonth } from "date-fns";

interface DailyLog {
  id: number;
  date: string;
  hours: number;
  minutes: number;
  mood: number;
}

interface Props {
  userId?: number;
}

export function ProductivityHeatmap({ userId }: Props) {
  const [view, setView] = useState<"week" | "month">("week");
  const today = new Date();
  const dateRange = view === "week" 
    ? {
        start: startOfWeek(today, { weekStartsOn: 0 }), // Start week on Sunday
        end: endOfWeek(today, { weekStartsOn: 0 })
      }
    : {
        start: startOfMonth(today),
        end: endOfMonth(today)
      };

  const { data: logs = [] } = useQuery<DailyLog[]>({
    queryKey: ["/api/productivity", format(dateRange.start, "yyyy-MM-dd"), format(dateRange.end, "yyyy-MM-dd")],
    queryFn: async () => {
      const res = await fetch(`/api/productivity?startDate=${format(dateRange.start, "yyyy-MM-dd")}&endDate=${format(dateRange.end, "yyyy-MM-dd")}`);
      if (!res.ok) throw new Error("Failed to fetch productivity data");
      return res.json();
    }
  });

  const days = eachDayOfInterval(dateRange);

  const getLogForDay = (date: Date) => {
    return logs.find(log => {
      const logDate = parseISO(log.date);
      return format(logDate, "yyyy-MM-dd") === format(date, "yyyy-MM-dd");
    });
  };

  const getMoodColor = (mood?: number) => {
    if (!mood) return "bg-muted";
    const colors = {
      1: "bg-red-200 dark:bg-red-900",
      2: "bg-orange-200 dark:bg-orange-900",
      3: "bg-yellow-200 dark:bg-yellow-900",
      4: "bg-green-200 dark:bg-green-900",
      5: "bg-emerald-200 dark:bg-emerald-900",
    };
    return colors[mood as keyof typeof colors] || "bg-muted";
  };

  const getHoursLabel = (hours: number, minutes: number) => {
    if (hours === 0 && minutes === 0) return "No time logged";
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Productivity Heatmap</CardTitle>
        <div className="flex gap-2">
          <Button
            variant={view === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("week")}
          >
            Week
          </Button>
          <Button
            variant={view === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("month")}
          >
            Month
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {/* Day labels */}
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-center text-sm text-muted-foreground">
              {day}
            </div>
          ))}
          
          {/* Calendar cells */}
          {days.map((date) => {
            const log = getLogForDay(date);
            const isCurrentMonth = isSameMonth(date, today);
            
            return (
              <div
                key={date.toISOString()}
                className="aspect-square relative group"
              >
                <div
                  className={`w-full h-full rounded-md ${getMoodColor(log?.mood)} 
                    transition-colors duration-200 cursor-pointer
                    ${!isCurrentMonth ? 'opacity-50' : ''}`}
                >
                  <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md whitespace-nowrap z-50">
                    <div className="font-medium">{format(date, "MMM d, yyyy")}</div>
                    <div>{log ? getHoursLabel(log.hours, log.minutes) : "No log"}</div>
                    {log?.mood && (
                      <div>Mood: {"😞😔😐😊😄"[log.mood - 1]}</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}