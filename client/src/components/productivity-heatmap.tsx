import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DailyLog } from "@shared/schema";

interface ProductivityHeatmapProps {
  userId?: number;
}

export function ProductivityHeatmap({ userId }: ProductivityHeatmapProps) {
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth() - 2, 1).toISOString().split('T')[0];
  const endDate = today.toISOString().split('T')[0];

  const { data: logs = [], isLoading } = useQuery<DailyLog[]>({
    queryKey: ['/api/productivity', userId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate,
        endDate,
        ...(userId && { userId: userId.toString() })
      });
      const response = await fetch(`/api/productivity?${params}`);
      if (!response.ok) throw new Error('Failed to fetch productivity data');
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Productivity Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Create a map of dates to productivity scores (using mood as proxy for productivity)
  const logsByDate = new Map();
  logs.forEach(log => {
    const date = new Date(log.createdAt).toISOString().split('T')[0];
    logsByDate.set(date, log.mood || 0);
  });

  // Generate grid for the last 3 months
  const generateCalendarGrid = () => {
    const grid = [];
    const startCalendar = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    const endCalendar = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    for (let d = new Date(startCalendar); d <= endCalendar; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const score = logsByDate.get(dateStr) || 0;
      grid.push({
        date: dateStr,
        score,
        day: d.getDate(),
        month: d.getMonth(),
      });
    }
    return grid;
  };

  const getIntensityClass = (score: number) => {
    if (score === 0) return 'bg-gray-100 dark:bg-gray-800';
    if (score <= 2) return 'bg-red-200 dark:bg-red-900';
    if (score <= 4) return 'bg-yellow-200 dark:bg-yellow-900';
    if (score <= 6) return 'bg-blue-200 dark:bg-blue-900';
    if (score <= 8) return 'bg-green-200 dark:bg-green-900';
    return 'bg-green-400 dark:bg-green-600';
  };

  const calendarGrid = generateCalendarGrid();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Productivity Heatmap</CardTitle>
        <p className="text-sm text-muted-foreground">
          Track your daily productivity over the last 3 months
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Legend */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Less productive</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 bg-gray-100 dark:bg-gray-800 rounded-sm"></div>
              <div className="w-3 h-3 bg-red-200 dark:bg-red-900 rounded-sm"></div>
              <div className="w-3 h-3 bg-yellow-200 dark:bg-yellow-900 rounded-sm"></div>
              <div className="w-3 h-3 bg-blue-200 dark:bg-blue-900 rounded-sm"></div>
              <div className="w-3 h-3 bg-green-200 dark:bg-green-900 rounded-sm"></div>
              <div className="w-3 h-3 bg-green-400 dark:bg-green-600 rounded-sm"></div>
            </div>
            <span>More productive</span>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-xs font-medium text-center p-1 text-muted-foreground">
                {day}
              </div>
            ))}
            
            {calendarGrid.map((cell, index) => (
              <div
                key={index}
                className={`w-4 h-4 rounded-sm ${getIntensityClass(cell.score)} border border-border`}
                title={`${cell.date}: ${cell.score}/10 productivity`}
              />
            ))}
          </div>

          {/* Stats */}
          <div className="flex gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {logs.length}
              </div>
              <div className="text-xs text-muted-foreground">Days logged</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {logs.length > 0 ? Math.round(logs.reduce((sum, log) => sum + (log.productivityScore || 0), 0) / logs.length) : 0}
              </div>
              <div className="text-xs text-muted-foreground">Avg productivity</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {logs.filter(log => (log.productivityScore || 0) >= 7).length}
              </div>
              <div className="text-xs text-muted-foreground">High days</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}