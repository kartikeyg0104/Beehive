import { useEffect, useState } from "react";
import {
  CalendarIcon,
  ChartBarIcon,
  ChartPieIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@heroicons/react/24/outline";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Mock data - replace with actual data from backend
// const mockAnalytics = {
//   uploadStats: {
//     total: 675,
//     breakdown: { images: 450, documents: 0, others: 0 },
//     voiceNotes: 225,
//     increase: 12.5,
//     timeframe: "This month",
//     sentimentAnalysis: { positive: 45, neutral: 35, negative: 20 },
//   },
//   userStats: { users: { total: 320, increase: 15.0 }, activeUsers: { total: 120, increase: 8.3 }, timeframe: "This month" },
//   recentUploadTrends: [
//     { date: "2024-01", uploads: { total: 150, increase: 12.0 } },
//     { date: "2024-02", uploads: { total: 180, increase: 12.0 } },
//     { date: "2024-03", uploads: { total: 210, increase: 12.0 } },
//   ],
//   recentUserTrends: [
//     { date: "2024-01", users: { total: 50, increase: 10.0 }, activeUsers: { total: 55, increase: 12.0 } },
//   ],
// };

const COLORS = ["#10B981", "#6B7280", "#EF4444", "#FBBF24", "#6366F1"]; // green, gray, red, yellow, indigo

interface AnalyticsData {
  uploadStats: {
    total: number;
    breakdown: { images: number; documents: number; others: number };
    voiceNotes: number;
    increase: number;
    timeframe: string;
    sentimentAnalysis: { positive: number; neutral: number; negative: number; custom: number };
  };
  userStats: {
    users: { total: number; increase: number };
    activeUsers: { total: number; increase: number };
    timeframe: string;
  };
  recentUploadTrends: { date: string; uploads: { total: number; increase: number } }[];
  recentUserTrends: { date: string; users: { total: number; increase: number }; activeUsers: { total: number; increase: number } }[];
}

const StatCard = ({
  title,
  value,
  change,
  timeframe,
  icon: Icon,
}: {
  title: string;
  value: number;
  change: number;
  timeframe: string;
  icon: React.ElementType;
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors duration-200">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {title}
        </p>
        <p className="text-3xl font-semibold mt-2">{value}</p>
      </div>
      <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
        <Icon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
      </div>
    </div>
    <div className="mt-4 flex items-center">
      {change >= 0 ? (
        <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
      ) : (
        <ArrowDownIcon className="h-4 w-4 text-red-500 mr-1" />
      )}
      <span className={`text-sm font-medium ${change >= 0 ? "text-green-500" : "text-red-500"}`}>
        {Math.abs(change)}%
      </span>
      <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">{timeframe}</span>
    </div>
  </div>
);

const Analytics = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await window.Clerk.session?.getToken();

      const response = await fetch("http://127.0.0.1:5000/api/admin/analytics", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) return <p className="text-center mt-10">Loading...</p>;
  if (error) return <p className="text-center mt-10 text-red-500">{error}</p>;
  if (!analytics) return null;

  // Pie chart data
  const fileDistributionData = [
    { name: "Images", value: analytics.uploadStats.breakdown.images },
    { name: "Others", value: analytics.uploadStats.breakdown.others },
    { name: "Documents", value: analytics.uploadStats.breakdown.documents },
  ];

  const voiceNoteDistributionData = [
    { name: "Voice Notes", value: analytics.uploadStats.voiceNotes },
    { name: "No Voice Notes", value: analytics.uploadStats.total - analytics.uploadStats.voiceNotes },
  ];

  const sentimentData = [
    { name: "Positive", value: analytics.uploadStats.sentimentAnalysis.positive },
    { name: "Neutral", value: analytics.uploadStats.sentimentAnalysis.neutral },
    { name: "Negative", value: analytics.uploadStats.sentimentAnalysis.negative },
    { name: "Others", value: analytics.uploadStats.sentimentAnalysis.custom },
  ];

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold mb-8">Analytics Dashboard</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Total Users"
            value={analytics.userStats.users.total}
            change={analytics.userStats.users.increase}
            timeframe={analytics.userStats.timeframe}
            icon={ChartPieIcon}
          />
          <StatCard
            title="Total Uploads"
            value={analytics.uploadStats.total}
            change={analytics.uploadStats.increase}
            timeframe={analytics.uploadStats.timeframe}
            icon={ChartBarIcon}
          />
          <StatCard
            title="Monthly Active Users"
            value={analytics.userStats.activeUsers.total}
            change={analytics.userStats.activeUsers.increase}
            timeframe={analytics.userStats.timeframe}
            icon={CalendarIcon}
          />
        </div>

        {/* Content Distribution and Sentiment Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Content Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors duration-200">
            <h2 className="text-xl font-semibold mb-4">Content Distribution</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={fileDistributionData} dataKey="value" nameKey="name" outerRadius={80} label>
                      {fileDistributionData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={voiceNoteDistributionData} dataKey="value" nameKey="name" outerRadius={80} label>
                      {voiceNoteDistributionData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Sentiment Analysis */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors duration-200">
            <h2 className="text-xl font-semibold mb-4">Sentiment Analysis</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sentimentData} dataKey="value" nameKey="name" outerRadius={100} label>
                    {sentimentData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Trends */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors duration-200">
          <h2 className="text-xl font-semibold mb-4">Recent Trends (Last one Week)</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Period</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Users</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Active Users</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Uploads</th>
                </tr>
              </thead>
              <tbody>
                {analytics.recentUserTrends
                  .slice() // create a shallow copy
                  .reverse() // reverse order
                  .map((userTrend, index) => {
                    const uploadTrend = analytics.recentUploadTrends
                      .slice()
                      .reverse()[index] || {}; // also reverse uploads to match

                    const growthIcon = (value: number) =>
                      value >= 0 ? (
                        <ArrowUpIcon className="h-4 w-4 text-green-500 inline mr-1" />
                      ) : (
                        <ArrowDownIcon className="h-4 w-4 text-red-500 inline mr-1" />
                      );

                    const renderCell = (total: number, increase: number) => (
                      <div className="flex items-center">
                        <span>{total}</span>
                        <span
                          className={`ml-2 flex items-center text-sm font-medium ${increase >= 0 ? 'text-green-500' : 'text-red-500'
                            }`}
                        >
                          {growthIcon(increase)}
                          {Math.abs(increase)}%
                        </span>
                      </div>
                    );

                    return (
                      <tr
                        key={userTrend.date}
                        className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                      >
                        <td className="py-3 px-4">{userTrend.date}</td>
                        <td className="py-3 px-4">{renderCell(userTrend.users.total, userTrend.users.increase)}</td>
                        <td className="py-3 px-4">{renderCell(userTrend.activeUsers.total, userTrend.activeUsers.increase)}</td>
                        <td className="py-3 px-4">
                          {uploadTrend.uploads
                            ? renderCell(uploadTrend.uploads.total, uploadTrend.uploads.increase)
                            : '-'}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>

            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Analytics;
