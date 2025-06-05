import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, startOfWeek, endOfWeek } from "date-fns";
import { DailyLog } from "@shared/schema";

interface ProductivityHeatmapProps {
  userId?: number;
}

export function ProductivityHeatmap({ userId }: ProductivityHeatmapProps) {
  const currentDate = new Date();
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const { data: logs = [] } = useQuery<DailyLog[]>({
    queryKey: ["/api/productivity", {
      startDate: format(monthStart, "yyyy-MM-dd"),
      endDate: format(monthEnd, "yyyy-MM-dd"),
    }],
    enabled: !!userId,
  });

  // Create a map of date to total hours
  const productivityMap = logs.reduce((acc, log) => {
    const totalHours = log.hours + (log.minutes / 60);
    acc[log.date] = totalHours;
    return acc;
  }, {} as Record<string, number>);

  // Get intensity level based on hours logged
  const getIntensity = (hours: number) => {
    if (hours === 0) return 0;
    if (hours <= 2) return 1;
    if (hours <= 4) return 2;
    if (hours <= 6) return 3;
    if (hours <= 8) return 4;
    return 5;
  };

  const getColorClass = (intensity: number) => {
    switch (intensity) {
      case 0: return "bg-gray-200";
      case 1: return "bg-blue-200";
      case 2: return "bg-blue-300";
      case 3: return "bg-blue-400";
      case 4: return "bg-blue-600";
      case 5: return "bg-blue-800";
      default: return "bg-gray-200";
    }
  };

  // Generate calendar days for the month
  const firstWeekStart = startOfWeek(monthStart);
  const lastWeekEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: firstWeekStart, end: lastWeekEnd });

  const weeks = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Less</span>
        <div className="flex space-x-1">
          <div className="w-3 h-3 bg-gray-200 rounded-sm"></div>
          <div className="w-3 h-3 bg-blue-200 rounded-sm"></div>
          <div className="w-3 h-3 bg-blue-300 rounded-sm"></div>
          <div className="w-3 h-3 bg-blue-400 rounded-sm"></div>
          <div className="w-3 h-3 bg-blue-600 rounded-sm"></div>
          <div className="w-3 h-3 bg-blue-800 rounded-sm"></div>
        </div>
        <span>More</span>
      </div>

      <div className="space-y-1">
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-1 text-xs text-gray-500 text-center">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Calendar grid */}
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-1">
            {week.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const hours = productivityMap[dateStr] || 0;
              const intensity = getIntensity(hours);
              const isCurrentMonth = day >= monthStart && day <= monthEnd;

              return (
                <div
                  key={dateStr}
                  className={`w-4 h-4 rounded-sm transition-colors cursor-pointer ${
                    isCurrentMonth ? getColorClass(intensity) : "bg-gray-100"
                  }`}
                  title={
                    isCurrentMonth
                      ? `${format(day, "MMM dd, yyyy")}: ${hours.toFixed(1)} hours logged`
                      : format(day, "MMM dd, yyyy")
                  }
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
