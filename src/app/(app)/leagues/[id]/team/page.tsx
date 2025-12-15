'use client';

import React, { use, useState, useMemo } from 'react';
import {
  Users,
  Trophy,
  TrendingUp,
  TrendingDown,
  Medal,
  Zap,
  Target,
  Crown,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Shield,
  Activity,
  Calendar,
  Flame,
  MoreVertical,
} from 'lucide-react';

import { useLeague } from '@/contexts/league-context';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ============================================================================
// Team Page
// ============================================================================

export default function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { activeLeague } = useLeague();
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  // Mock team data for demo
  const teamData = {
    name: activeLeague?.team_name || 'Fitness Fanatics',
    rank: 3,
    totalPoints: 2450,
    avgPoints: 490,
    submissions: 118,
    streak: 7,
    members: [
      { id: '1', name: 'John Smith', role: 'captain', points: 580, submissions: 28, streak: 12, lastActive: '2 hours ago', change: 15.2 },
      { id: '2', name: 'Sarah Johnson', role: 'player', points: 520, submissions: 25, streak: 8, lastActive: '1 hour ago', change: 8.5 },
      { id: '3', name: 'Mike Wilson', role: 'player', points: 480, submissions: 23, streak: 5, lastActive: '3 hours ago', change: -2.1 },
      { id: '4', name: 'Emily Brown', role: 'player', points: 450, submissions: 22, streak: 6, lastActive: '30 min ago', change: 4.7 },
      { id: '5', name: 'David Lee', role: 'player', points: 420, submissions: 20, streak: 3, lastActive: 'Yesterday', change: -1.8 },
    ],
  };

  // Filter members based on search
  const filteredMembers = useMemo(() => {
    return teamData.members.filter(member =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  // Pagination
  const paginatedMembers = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    return filteredMembers.slice(start, start + pagination.pageSize);
  }, [filteredMembers, pagination]);

  const pageCount = Math.ceil(filteredMembers.length / pagination.pageSize);

  // Section cards stats
  const stats = [
    {
      title: 'Team Rank',
      value: `#${teamData.rank}`,
      change: 2,
      changeLabel: 'Moved up 2 spots',
      description: 'League standing',
      icon: Trophy,
    },
    {
      title: 'Total Points',
      value: teamData.totalPoints.toLocaleString(),
      change: 12.5,
      changeLabel: 'Trending up',
      description: 'Cumulative team score',
      icon: Zap,
    },
    {
      title: 'Submissions',
      value: teamData.submissions.toString(),
      change: 8.2,
      changeLabel: 'Strong activity',
      description: 'Total activities logged',
      icon: Target,
    },
    {
      title: 'Team Streak',
      value: `${teamData.streak} days`,
      change: 0,
      changeLabel: 'Keep it up!',
      description: 'Consecutive active days',
      icon: Flame,
    },
  ];

  const maxPoints = Math.max(...teamData.members.map(m => m.points));

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 lg:gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 px-4 lg:px-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="size-14 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0 shadow-lg">
            <Users className="size-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{teamData.name}</h1>
            <p className="text-muted-foreground">
              View your team members and performance
            </p>
          </div>
        </div>
        <Badge variant="outline" className="w-fit">
          <Crown className="size-3 mr-1" />
          Rank #{teamData.rank} in League
        </Badge>
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
                  <Badge variant="outline" className={stat.change === 0 ? 'text-amber-600' : isPositive ? 'text-green-600' : 'text-red-600'}>
                    {stat.change !== 0 && <TrendIcon className="size-3" />}
                    {stat.change === 0 ? <Flame className="size-3" /> : null}
                    {stat.change !== 0 ? (isPositive ? '+' : '') + stat.change + '%' : 'Active'}
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

      {/* Team Performance Summary */}
      <div className="px-4 lg:px-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Team Performance</h2>
          <p className="text-sm text-muted-foreground">Individual contributions to team score</p>
        </div>

        <div className="rounded-lg border p-4">
          <div className="grid gap-4 md:grid-cols-5">
            {teamData.members.slice(0, 5).map((member, index) => {
              const percentage = Math.round((member.points / teamData.totalPoints) * 100);
              return (
                <div key={member.id} className="flex flex-col items-center text-center">
                  <div className="relative">
                    <Avatar className="size-16 mb-2 ring-2 ring-offset-2 ring-primary/20">
                      <AvatarFallback className="text-lg">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    {member.role === 'captain' && (
                      <div className="absolute -top-1 -right-1 size-6 rounded-full bg-amber-500 flex items-center justify-center">
                        <Crown className="size-3 text-white" />
                      </div>
                    )}
                  </div>
                  <p className="font-medium text-sm truncate max-w-full">{member.name.split(' ')[0]}</p>
                  <p className="text-xs text-muted-foreground">{percentage}% of team</p>
                  <Progress value={percentage * 2} className="h-1.5 w-full mt-2" />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Data Table Section */}
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Team Members</h2>
            <p className="text-sm text-muted-foreground">{teamData.members.length} members in this team</p>
          </div>

          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Members Table */}
        <div className="rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-center">Submissions</TableHead>
                <TableHead className="text-center">Streak</TableHead>
                <TableHead className="text-right">Points</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedMembers.length > 0 ? (
                paginatedMembers.map((member, index) => {
                  const isPositive = member.change >= 0;
                  const percentage = Math.round((member.points / maxPoints) * 100);
                  return (
                    <TableRow key={member.id}>
                      <TableCell className="text-muted-foreground">
                        {pagination.pageIndex * pagination.pageSize + index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="size-10">
                              <AvatarFallback>
                                {member.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            {member.role === 'captain' && (
                              <div className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full bg-amber-500 flex items-center justify-center ring-2 ring-background">
                                <Crown className="size-2.5 text-white" />
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="font-medium">{member.name}</span>
                            <p className="text-xs text-muted-foreground">{member.lastActive}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {member.role === 'captain' ? (
                          <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">
                            <Shield className="size-3 mr-1" />
                            Captain
                          </Badge>
                        ) : (
                          <Badge variant="outline">Player</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{member.submissions}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Flame className="size-4 text-orange-500" />
                          <span className="font-medium">{member.streak}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="space-y-1">
                          <span className="font-bold tabular-nums">{member.points}</span>
                          <Progress value={percentage} className="h-1.5 w-16 ml-auto" />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={isPositive ? 'text-green-600' : 'text-red-600'}>
                          {isPositive ? <TrendingUp className="size-3 mr-1" /> : <TrendingDown className="size-3 mr-1" />}
                          {isPositive ? '+' : ''}{member.change}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>View Profile</DropdownMenuItem>
                            <DropdownMenuItem>View Submissions</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>Send Message</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    No members found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            {filteredMembers.length} member(s) total
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="members-rows" className="text-sm">Rows per page</Label>
              <Select
                value={pagination.pageSize.toString()}
                onValueChange={(v) => setPagination({ ...pagination, pageSize: Number(v), pageIndex: 0 })}
              >
                <SelectTrigger className="w-16" id="members-rows">
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
              Page {pagination.pageIndex + 1} of {pageCount || 1}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setPagination({ ...pagination, pageIndex: 0 })}
                disabled={pagination.pageIndex === 0}
              >
                <ChevronsLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setPagination({ ...pagination, pageIndex: pagination.pageIndex - 1 })}
                disabled={pagination.pageIndex === 0}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setPagination({ ...pagination, pageIndex: pagination.pageIndex + 1 })}
                disabled={pagination.pageIndex >= pageCount - 1}
              >
                <ChevronRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setPagination({ ...pagination, pageIndex: pageCount - 1 })}
                disabled={pagination.pageIndex >= pageCount - 1}
              >
                <ChevronsRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
