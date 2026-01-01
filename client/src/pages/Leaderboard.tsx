import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Medal, Star, Crown, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type Period = "daily" | "weekly" | "monthly" | "all_time";

interface LeaderboardEntry {
  userId: string;
  totalPoints: number;
  level: number;
  userName: string;
  badgeCount: number;
}

interface LeaderboardResponse {
  period: Period;
  leaderboard: LeaderboardEntry[];
}

interface UserPerformance {
  userId: string;
  totalPoints: number;
  level: number;
  xpInCurrentLevel: number;
  badges: Array<{
    id: string;
    name: string;
    icon: string;
    earnedAt: string;
  }>;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Crown className="h-5 w-5 text-yellow-500" />;
    case 2:
      return <Medal className="h-5 w-5 text-gray-400" />;
    case 3:
      return <Medal className="h-5 w-5 text-amber-600" />;
    default:
      return <span className="text-muted-foreground font-medium">{rank}</span>;
  }
}

function getRankStyle(rank: number): string {
  switch (rank) {
    case 1:
      return "bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-300 dark:border-yellow-700";
    case 2:
      return "bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/30 dark:to-gray-700/30 border-gray-300 dark:border-gray-600";
    case 3:
      return "bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-300 dark:border-amber-700";
    default:
      return "";
  }
}

export default function Leaderboard() {
  const { t } = useTranslation(["common"]);
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("weekly");

  const { data: leaderboardData, isLoading: isLeaderboardLoading } = useQuery<LeaderboardResponse>({
    queryKey: ["/api/performance/leaderboard", period],
  });

  const { data: userPerformance, isLoading: isUserLoading } = useQuery<UserPerformance>({
    queryKey: ["/api/performance/me"],
  });

  const xpPerLevel = 100;
  const xpProgress = userPerformance ? (userPerformance.xpInCurrentLevel / xpPerLevel) * 100 : 0;

  return (
    <div className="container mx-auto py-6 space-y-6" data-testid="leaderboard-page">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2" data-testid="leaderboard-title">
          <Trophy className="h-8 w-8 text-yellow-500" />
          Employee Leaderboard
        </h1>
        <p className="text-muted-foreground" data-testid="leaderboard-description">
          Track employee performance and compete for the top spot
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2" data-testid="leaderboard-card">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Rankings
              </CardTitle>
              <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
                <TabsList data-testid="period-tabs">
                  <TabsTrigger value="daily" data-testid="tab-daily">
                    Daily
                  </TabsTrigger>
                  <TabsTrigger value="weekly" data-testid="tab-weekly">
                    Weekly
                  </TabsTrigger>
                  <TabsTrigger value="monthly" data-testid="tab-monthly">
                    Monthly
                  </TabsTrigger>
                  <TabsTrigger value="all_time" data-testid="tab-all-time">
                    All Time
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {isLeaderboardLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : leaderboardData?.leaderboard && leaderboardData.leaderboard.length > 0 ? (
              <Table data-testid="leaderboard-table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                    <TableHead className="text-center">Level</TableHead>
                    <TableHead className="text-center">Badges</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboardData.leaderboard.map((entry, index) => {
                    const rank = index + 1;
                    const isCurrentUser = user?.id === entry.userId;
                    return (
                      <TableRow
                        key={entry.userId}
                        className={`${getRankStyle(rank)} ${isCurrentUser ? "ring-2 ring-primary ring-inset" : ""}`}
                        data-testid={`leaderboard-row-${index}`}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center justify-center w-8 h-8">
                            {getRankIcon(rank)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback
                                className={
                                  rank === 1
                                    ? "bg-yellow-200 text-yellow-800"
                                    : rank === 2
                                    ? "bg-gray-200 text-gray-800"
                                    : rank === 3
                                    ? "bg-amber-200 text-amber-800"
                                    : "bg-primary/10 text-primary"
                                }
                              >
                                {getInitials(entry.userName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <span className="font-medium" data-testid={`user-name-${index}`}>
                                {entry.userName}
                              </span>
                              {isCurrentUser && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  You
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold" data-testid={`user-points-${index}`}>
                          {entry.totalPoints.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" data-testid={`user-level-${index}`}>
                            Lv. {entry.level}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Shield className="h-4 w-4 text-purple-500" />
                            <span data-testid={`user-badges-${index}`}>{entry.badgeCount}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground" data-testid="no-data">
                No leaderboard data available
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card data-testid="user-stats-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Your Stats
              </CardTitle>
              <CardDescription>Your performance summary</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isUserLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : userPerformance ? (
                <>
                  <div className="text-center space-y-2">
                    <div className="text-4xl font-bold text-primary" data-testid="user-total-points">
                      {userPerformance.totalPoints.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Points</div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Level {userPerformance.level}</span>
                      <span className="text-sm text-muted-foreground">
                        {userPerformance.xpInCurrentLevel} / {xpPerLevel} XP
                      </span>
                    </div>
                    <Progress value={xpProgress} className="h-2" data-testid="xp-progress" />
                    <p className="text-xs text-muted-foreground text-center">
                      {xpPerLevel - userPerformance.xpInCurrentLevel} XP to next level
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Recent Badges</h4>
                    {userPerformance.badges && userPerformance.badges.length > 0 ? (
                      <div className="flex flex-wrap gap-2" data-testid="recent-badges">
                        {userPerformance.badges.slice(0, 5).map((badge) => (
                          <Badge
                            key={badge.id}
                            variant="outline"
                            className="flex items-center gap-1"
                            data-testid={`badge-${badge.id}`}
                          >
                            <span>{badge.icon}</span>
                            <span>{badge.name}</span>
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground" data-testid="no-badges">
                        No badges earned yet
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-4 text-muted-foreground" data-testid="no-user-stats">
                  No performance data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
