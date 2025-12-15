'use client';

import React, { use, useState, useMemo } from 'react';
import {
  Trophy,
  Users,
  Medal,
  TrendingUp,
  TrendingDown,
  Zap,
  Target,
  Crown,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  Flame,
} from 'lucide-react';

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ============================================================================
// Leaderboard Page
// ============================================================================

export default function LeaderboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [view, setView] = useState<'teams' | 'individuals'>('teams');
  const [searchQuery, setSearchQuery] = useState('');
  const [teamsPagination, setTeamsPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [individualsPagination, setIndividualsPagination] = useState({ pageIndex: 0, pageSize: 10 });

  // Mock leaderboard data
  const teamsData = [
    { id: '1', name: 'Fitness Fanatics', points: 3250, members: 5, rank: 1, change: 12.5, submissions: 145 },
    { id: '2', name: 'Iron Warriors', points: 2980, members: 5, rank: 2, change: 8.2, submissions: 132 },
    { id: '3', name: 'Power Lifters', points: 2450, members: 5, rank: 3, change: -2.1, submissions: 118 },
    { id: '4', name: 'Cardio Kings', points: 2100, members: 5, rank: 4, change: 5.4, submissions: 105 },
    { id: '5', name: 'Strength Squad', points: 1890, members: 5, rank: 5, change: -4.2, submissions: 98 },
    { id: '6', name: 'Flex Force', points: 1750, members: 5, rank: 6, change: 3.1, submissions: 92 },
    { id: '7', name: 'Endurance Elite', points: 1620, members: 5, rank: 7, change: -1.5, submissions: 85 },
    { id: '8', name: 'Core Crushers', points: 1480, members: 5, rank: 8, change: 6.8, submissions: 78 },
  ];

  const individualsData = [
    { id: '1', name: 'Alex Thompson', team: 'Fitness Fanatics', points: 720, rank: 1, change: 15.2, submissions: 32 },
    { id: '2', name: 'Jordan Lee', team: 'Iron Warriors', points: 695, rank: 2, change: 8.5, submissions: 30 },
    { id: '3', name: 'Sam Wilson', team: 'Fitness Fanatics', points: 680, rank: 3, change: -3.2, submissions: 29 },
    { id: '4', name: 'Taylor Brown', team: 'Power Lifters', points: 645, rank: 4, change: 4.7, submissions: 28 },
    { id: '5', name: 'Casey Martinez', team: 'Iron Warriors', points: 620, rank: 5, change: 11.3, submissions: 27 },
    { id: '6', name: 'Morgan Davis', team: 'Cardio Kings', points: 590, rank: 6, change: -1.8, submissions: 26 },
    { id: '7', name: 'Riley Johnson', team: 'Power Lifters', points: 575, rank: 7, change: 2.4, submissions: 25 },
    { id: '8', name: 'Drew Smith', team: 'Strength Squad', points: 560, rank: 8, change: 7.9, submissions: 24 },
    { id: '9', name: 'Jamie Garcia', team: 'Cardio Kings', points: 545, rank: 9, change: -5.1, submissions: 23 },
    { id: '10', name: 'Quinn Anderson', team: 'Flex Force', points: 530, rank: 10, change: 3.6, submissions: 22 },
    { id: '11', name: 'Blake Wilson', team: 'Strength Squad', points: 515, rank: 11, change: 1.2, submissions: 21 },
    { id: '12', name: 'Avery Thomas', team: 'Endurance Elite', points: 500, rank: 12, change: -2.8, submissions: 20 },
  ];

  // Filter data based on search
  const filteredTeams = useMemo(() => {
    return teamsData.filter(team =>
      team.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const filteredIndividuals = useMemo(() => {
    return individualsData.filter(person =>
      person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.team.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  // Pagination helpers
  const paginatedTeams = useMemo(() => {
    const start = teamsPagination.pageIndex * teamsPagination.pageSize;
    return filteredTeams.slice(start, start + teamsPagination.pageSize);
  }, [filteredTeams, teamsPagination]);

  const paginatedIndividuals = useMemo(() => {
    const start = individualsPagination.pageIndex * individualsPagination.pageSize;
    return filteredIndividuals.slice(start, start + individualsPagination.pageSize);
  }, [filteredIndividuals, individualsPagination]);

  const teamsPageCount = Math.ceil(filteredTeams.length / teamsPagination.pageSize);
  const individualsPageCount = Math.ceil(filteredIndividuals.length / individualsPagination.pageSize);

  // Stats calculations
  const totalPoints = teamsData.reduce((acc, team) => acc + team.points, 0);
  const totalSubmissions = teamsData.reduce((acc, team) => acc + team.submissions, 0);
  const topScore = Math.max(...individualsData.map(p => p.points));

  // Section cards stats
  const stats = [
    {
      title: 'Total Teams',
      value: teamsData.length.toString(),
      change: 0,
      changeLabel: 'Competing teams',
      description: 'Active in this league',
      icon: Users,
    },
    {
      title: 'Total Points',
      value: totalPoints.toLocaleString(),
      change: 12.5,
      changeLabel: 'Trending up',
      description: 'Cumulative league points',
      icon: Zap,
    },
    {
      title: 'Submissions',
      value: totalSubmissions.toString(),
      change: 8.2,
      changeLabel: 'Strong activity',
      description: 'Total activities logged',
      icon: Target,
    },
    {
      title: 'Top Score',
      value: topScore.toString(),
      change: 15.2,
      changeLabel: 'New high!',
      description: 'Highest individual points',
      icon: Crown,
    },
  ];

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Badge className="bg-amber-500 text-white border-0">1st</Badge>;
    if (rank === 2) return <Badge className="bg-gray-400 text-white border-0">2nd</Badge>;
    if (rank === 3) return <Badge className="bg-amber-700 text-white border-0">3rd</Badge>;
    return <Badge variant="outline">#{rank}</Badge>;
  };

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 lg:gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 px-4 lg:px-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
          <p className="text-muted-foreground">
            See how teams and individuals are performing
          </p>
        </div>
      </div>

      {/* Section Cards - Admin Dashboard Style */}
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {stats.map((stat, index) => {
          const StatIcon = stat.icon;
          const isPositive = stat.change >= 0;
          const TrendIcon = isPositive ? TrendingUp : TrendingDown;
          return (
            <Card key={index} className="@container/card">
              <CardHeader>
                <CardDescription className="flex items-center gap-2">
                  <StatIcon className="size-4" />
                  {stat.title}
                </CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                  {stat.value}
                </CardTitle>
                <CardAction>
                  <Badge variant="outline" className={stat.change === 0 ? '' : isPositive ? 'text-green-600' : 'text-red-600'}>
                    {stat.change !== 0 && <TrendIcon className="size-3" />}
                    {stat.change !== 0 ? (isPositive ? '+' : '') + stat.change + '%' : 'Stable'}
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardFooter className="flex-col items-start gap-1.5 text-sm">
                <div className="line-clamp-1 flex gap-2 font-medium">
                  {stat.changeLabel} {stat.change !== 0 && <TrendIcon className="size-4" />}
                </div>
                <div className="text-muted-foreground">{stat.description}</div>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Top 3 Podium */}
      <div className="px-4 lg:px-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Top Performers</h2>
          <p className="text-sm text-muted-foreground">Leading teams in the competition</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {/* 2nd Place */}
          <Card className="text-center pt-6 bg-gradient-to-t from-gray-500/5 to-transparent">
            <CardContent className="p-4">
              <div className="size-14 mx-auto rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-3">
                <Trophy className="size-7 text-gray-500" />
              </div>
              <Badge className="bg-gray-400 text-white border-0 mb-2">2nd Place</Badge>
              <p className="font-semibold truncate">{teamsData[1].name}</p>
              <p className="text-2xl font-bold text-muted-foreground tabular-nums">
                {teamsData[1].points.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">points</p>
            </CardContent>
          </Card>

          {/* 1st Place */}
          <Card className="text-center bg-gradient-to-t from-amber-500/10 to-transparent border-amber-200 dark:border-amber-800">
            <CardContent className="p-4">
              <div className="size-16 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center mb-3 -mt-2 ring-4 ring-amber-200 dark:ring-amber-800">
                <Trophy className="size-9 text-amber-500" />
              </div>
              <Badge className="bg-amber-500 text-white border-0 mb-2">1st Place</Badge>
              <p className="font-bold text-lg truncate">{teamsData[0].name}</p>
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                {teamsData[0].points.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">points</p>
            </CardContent>
          </Card>

          {/* 3rd Place */}
          <Card className="text-center pt-6 bg-gradient-to-t from-amber-700/5 to-transparent">
            <CardContent className="p-4">
              <div className="size-14 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-3">
                <Trophy className="size-7 text-amber-700" />
              </div>
              <Badge className="bg-amber-700 text-white border-0 mb-2">3rd Place</Badge>
              <p className="font-semibold truncate">{teamsData[2].name}</p>
              <p className="text-2xl font-bold text-muted-foreground tabular-nums">
                {teamsData[2].points.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">points</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Data Table Section */}
      <div className="px-4 lg:px-6">
        <Tabs value={view} onValueChange={(v) => setView(v as 'teams' | 'individuals')}>
          {/* Table Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
            <TabsList>
              <TabsTrigger value="teams" className="gap-2">
                <Users className="size-4" />
                Teams
              </TabsTrigger>
              <TabsTrigger value="individuals" className="gap-2">
                <Medal className="size-4" />
                Individuals
              </TabsTrigger>
            </TabsList>

            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Teams Table */}
          <TabsContent value="teams" className="mt-0">
            <div className="rounded-lg border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead className="text-center">Members</TableHead>
                    <TableHead className="text-center">Submissions</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTeams.length > 0 ? (
                    paginatedTeams.map((team) => {
                      const isPositive = team.change >= 0;
                      return (
                        <TableRow key={team.id}>
                          <TableCell>{getRankBadge(team.rank)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Trophy className="size-5 text-primary" />
                              </div>
                              <span className="font-medium">{team.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{team.members}</Badge>
                          </TableCell>
                          <TableCell className="text-center">{team.submissions}</TableCell>
                          <TableCell className="text-right font-bold tabular-nums">
                            {team.points.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className={isPositive ? 'text-green-600' : 'text-red-600'}>
                              {isPositive ? <TrendingUp className="size-3 mr-1" /> : <TrendingDown className="size-3 mr-1" />}
                              {isPositive ? '+' : ''}{team.change}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No teams found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                {filteredTeams.length} team(s) total
              </div>
              <div className="flex items-center gap-6">
                <div className="hidden items-center gap-2 lg:flex">
                  <Label htmlFor="teams-rows" className="text-sm">Rows per page</Label>
                  <Select
                    value={teamsPagination.pageSize.toString()}
                    onValueChange={(v) => setTeamsPagination({ ...teamsPagination, pageSize: Number(v), pageIndex: 0 })}
                  >
                    <SelectTrigger className="w-16" id="teams-rows">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 10, 20].map((size) => (
                        <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-sm">
                  Page {teamsPagination.pageIndex + 1} of {teamsPageCount || 1}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => setTeamsPagination({ ...teamsPagination, pageIndex: 0 })}
                    disabled={teamsPagination.pageIndex === 0}
                  >
                    <ChevronsLeft className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => setTeamsPagination({ ...teamsPagination, pageIndex: teamsPagination.pageIndex - 1 })}
                    disabled={teamsPagination.pageIndex === 0}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => setTeamsPagination({ ...teamsPagination, pageIndex: teamsPagination.pageIndex + 1 })}
                    disabled={teamsPagination.pageIndex >= teamsPageCount - 1}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => setTeamsPagination({ ...teamsPagination, pageIndex: teamsPageCount - 1 })}
                    disabled={teamsPagination.pageIndex >= teamsPageCount - 1}
                  >
                    <ChevronsRight className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Individuals Table */}
          <TabsContent value="individuals" className="mt-0">
            <div className="rounded-lg border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead className="text-center">Submissions</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedIndividuals.length > 0 ? (
                    paginatedIndividuals.map((person) => {
                      const isPositive = person.change >= 0;
                      return (
                        <TableRow key={person.id}>
                          <TableCell>{getRankBadge(person.rank)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="size-10">
                                <AvatarFallback>
                                  {person.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{person.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{person.team}</Badge>
                          </TableCell>
                          <TableCell className="text-center">{person.submissions}</TableCell>
                          <TableCell className="text-right font-bold tabular-nums">
                            {person.points}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className={isPositive ? 'text-green-600' : 'text-red-600'}>
                              {isPositive ? <TrendingUp className="size-3 mr-1" /> : <TrendingDown className="size-3 mr-1" />}
                              {isPositive ? '+' : ''}{person.change}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No players found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                {filteredIndividuals.length} player(s) total
              </div>
              <div className="flex items-center gap-6">
                <div className="hidden items-center gap-2 lg:flex">
                  <Label htmlFor="individuals-rows" className="text-sm">Rows per page</Label>
                  <Select
                    value={individualsPagination.pageSize.toString()}
                    onValueChange={(v) => setIndividualsPagination({ ...individualsPagination, pageSize: Number(v), pageIndex: 0 })}
                  >
                    <SelectTrigger className="w-16" id="individuals-rows">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 10, 20].map((size) => (
                        <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-sm">
                  Page {individualsPagination.pageIndex + 1} of {individualsPageCount || 1}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => setIndividualsPagination({ ...individualsPagination, pageIndex: 0 })}
                    disabled={individualsPagination.pageIndex === 0}
                  >
                    <ChevronsLeft className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => setIndividualsPagination({ ...individualsPagination, pageIndex: individualsPagination.pageIndex - 1 })}
                    disabled={individualsPagination.pageIndex === 0}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => setIndividualsPagination({ ...individualsPagination, pageIndex: individualsPagination.pageIndex + 1 })}
                    disabled={individualsPagination.pageIndex >= individualsPageCount - 1}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => setIndividualsPagination({ ...individualsPagination, pageIndex: individualsPageCount - 1 })}
                    disabled={individualsPagination.pageIndex >= individualsPageCount - 1}
                  >
                    <ChevronsRight className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
