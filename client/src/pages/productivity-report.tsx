import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { type DailyLog } from "@shared/schema";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Sidebar } from "@/components/sidebar";

export default function ProductivityReport() {
  const { user } = useAuth();

  const { data: logs = [] } = useQuery<DailyLog[]>({
    queryKey: ["/api/daily-logs"],
  });

  // Calculate monthly statistics
  const currentMonth = new Date();
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const monthlyLogs = logs.filter(log => {
    const logDate = parseISO(log.date);
    return logDate >= monthStart && logDate <= monthEnd;
  });

  const averageHoursPerDay = monthlyLogs.reduce((sum, log) => sum + log.hours + (log.minutes / 60), 0) / monthlyLogs.length || 0;
  const averageMood = monthlyLogs.reduce((sum, log) => sum + log.mood, 0) / monthlyLogs.length || 0;
  const totalDaysLogged = monthlyLogs.length;
  const completionRate = (totalDaysLogged / daysInMonth.length) * 100;

  // Prepare data for charts
  const hoursData = monthlyLogs.map(log => ({
    date: format(parseISO(log.date), "MMM dd"),
    hours: log.hours + (log.minutes / 60),
    mood: log.mood,
  }));

  // Common blockers analysis
  const blockersMap = monthlyLogs.reduce((acc, log) => {
    if (log.blockers) {
      log.blockers.split(", ").forEach(blocker => {
        acc[blocker] = (acc[blocker] || 0) + 1;
      });
    }
    return acc;
  }, {} as Record<string, number>);

  const blockersData = Object.entries(blockersMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="container p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Productivity Report</h1>
            <p className="text-muted-foreground">Monthly overview and analytics</p>
          </div>

          {/* Monthly Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average Hours/Day</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{averageHoursPerDay.toFixed(1)}h</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average Mood</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{averageMood.toFixed(1)}/5</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Days Logged</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalDaysLogged}/{daysInMonth.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completionRate.toFixed(1)}%</div>
              </CardContent>
            </Card>
          </div>

          {/* Hours Worked Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Hours Worked</CardTitle>
              <CardDescription>Daily work hours for the current month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={hoursData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="hours" stroke="#2563eb" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Mood Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Mood Trends</CardTitle>
              <CardDescription>Daily mood ratings for the current month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={hoursData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[1, 5]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="mood" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Common Blockers */}
          <Card>
            <CardHeader>
              <CardTitle>Common Blockers</CardTitle>
              <CardDescription>Frequency of reported blockers and challenges</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={blockersData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 