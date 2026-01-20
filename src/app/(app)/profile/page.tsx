'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import {
  User,
  Mail,
  Phone,
  Save,
  Loader2,
  Camera,
  Shield,
  Trophy,
  Activity,
  Target,
  Crown,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Settings,
  Dumbbell,
  Flame,
  Award,
} from 'lucide-react';
import { toast } from 'sonner';

import { useLeague } from '@/contexts/league-context';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

// ============================================================================
// Types
// ============================================================================

interface StatCard {
  title: string;
  value: string | number;
  change: number;
  changeLabel: string;
  description: string;
  icon: React.ElementType;
}

// ============================================================================
// Profile Page
// ============================================================================

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const { userLeagues, isLoading: leaguesLoading } = useLeague();
  const [saving, setSaving] = React.useState(false);

  const user = session?.user;
  const platformRole = (user as any)?.platform_role || 'user';

  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    phone: '',
  });

  // Update form when session loads
  React.useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: '',
      });
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setSaving(false);
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Calculate stats from leagues
  const leagueStats = React.useMemo(() => {
    const activeLeagues = userLeagues.filter((l) => l.status === 'active').length;
    const hostingCount = userLeagues.filter((l) => l.is_host).length;
    const governorCount = userLeagues.filter((l) => l.roles.includes('governor')).length;
    const captainCount = userLeagues.filter((l) => l.roles.includes('captain')).length;

    return {
      totalLeagues: userLeagues.length,
      activeLeagues,
      hostingCount,
      leadershipRoles: governorCount + captainCount,
    };
  }, [userLeagues]);

  // Activities logged: one activity per day across all approved submissions in all leagues
  const [activitiesLogged, setActivitiesLogged] = React.useState<number>(0);
  const [activitiesLoading, setActivitiesLoading] = React.useState<boolean>(false);

  React.useEffect(() => {
    let mounted = true;

    async function fetchActivities() {
      if (!userLeagues || userLeagues.length === 0) {
        if (mounted) setActivitiesLogged(0);
        return;
      }

      setActivitiesLoading(true);

      try {
        const promises = userLeagues.map((l) =>
          fetch(`/api/leagues/${l.league_id}/my-submissions?status=approved`).then((r) => r.json())
            .catch((e) => ({ success: false, data: { submissions: [] } }))
        );

        const results = await Promise.all(promises);

        const dateSet = new Set<string>();
        for (const res of results) {
          if (res && res.success && Array.isArray(res.data?.submissions)) {
            for (const s of res.data.submissions) {
              if (s && s.date) {
                dateSet.add(s.date);
              }
            }
          }
        }

        if (mounted) setActivitiesLogged(dateSet.size);
      } catch (err) {
        console.error('Error fetching activities for profile:', err);
        if (mounted) setActivitiesLogged(0);
      } finally {
        if (mounted) setActivitiesLoading(false);
      }
    }

    fetchActivities();

    return () => {
      mounted = false;
    };
  }, [userLeagues]);

  // Challenge points (approved special challenge submissions)
  const [challengePoints, setChallengePoints] = React.useState<number>(0);
  const [challengeLoading, setChallengeLoading] = React.useState<boolean>(false);

  React.useEffect(() => {
    let mounted = true;

    async function fetchChallengePoints() {
      if (!userLeagues || userLeagues.length === 0) {
        if (mounted) setChallengePoints(0);
        return;
      }

      setChallengeLoading(true);

      try {
        let totalChallenge = 0;

        const promises = userLeagues.map((l) =>
          fetch(`/api/leagues/${l.league_id}/challenges`).then((r) => r.json()).catch(() => ({ success: false }))
        );

        const results = await Promise.all(promises);

        for (const res of results) {
          if (!res || !res.success || !Array.isArray(res.data?.active)) continue;
          for (const ch of res.data.active) {
            const mySub = ch.my_submission;
            if (mySub && (mySub.status === 'approved' || mySub.status === 'accepted')) {
              const pts =
                mySub.awarded_points !== null && mySub.awarded_points !== undefined
                  ? Number(mySub.awarded_points)
                  : Number(ch.total_points || 0);
              if (!Number.isNaN(pts) && pts > 0) totalChallenge += pts;
            }
          }
        }

        if (mounted) setChallengePoints(totalChallenge);
      } catch (err) {
        console.error('Error fetching challenge points for profile:', err);
        if (mounted) setChallengePoints(0);
      } finally {
        if (mounted) setChallengeLoading(false);
      }
    }

    fetchChallengePoints();

    return () => {
      mounted = false;
    };
  }, [userLeagues]);

  const totalPoints = activitiesLogged + challengePoints;

  // Streaks: per-league longest consecutive active days and current ongoing streaks
  const [currentStreak, setCurrentStreak] = React.useState<number>(0);
  const [bestStreak, setBestStreak] = React.useState<number>(0);
  const [streaksLoading, setStreaksLoading] = React.useState<boolean>(false);

  // Helper: add days to YYYY-MM-DD
  function addDaysYYYYMMDD(dateString: string, days: number) {
    const [y, m, d] = dateString.split('-').map((p) => Number(p));
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + days);
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  }

  function todayYYYYMMDDLocal() {
    const dt = new Date();
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  }

  React.useEffect(() => {
    let mounted = true;

    async function computeStreaks() {
      if (!userLeagues || userLeagues.length === 0) {
        if (mounted) {
          setCurrentStreak(0);
          setBestStreak(0);
        }
        return;
      }

      setStreaksLoading(true);

      try {
        const promises = userLeagues.map((l) =>
          fetch(`/api/leagues/${l.league_id}/my-submissions?status=approved`).then((r) => r.json()).catch(() => ({ success: false, data: { submissions: [] } }))
        );

        const results = await Promise.all(promises);

        let overallBest = 0;
        let overallCurrent = 0;

        for (const res of results) {
          if (!res || !res.success || !Array.isArray(res.data?.submissions)) continue;
          const subs = res.data.submissions as any[];
          const dates = Array.from(new Set(subs.map((s) => s.date).filter(Boolean))).sort();
          if (dates.length === 0) continue;

          const dateSet = new Set(dates);

          // Longest consecutive run for this league
          let longest = 0;
          for (const d of dates) {
            const prev = addDaysYYYYMMDD(d, -1);
            if (!dateSet.has(prev)) {
              // start of sequence
              let len = 1;
              let next = addDaysYYYYMMDD(d, 1);
              while (dateSet.has(next)) {
                len++;
                next = addDaysYYYYMMDD(next, 1);
              }
              if (len > longest) longest = len;
            }
          }

          // Current ongoing streak: only count if the sequence reaches today
          const today = todayYYYYMMDDLocal();
          let curLen = 0;
          if (dateSet.has(today)) {
            let cursor = today;
            while (dateSet.has(cursor)) {
              curLen++;
              cursor = addDaysYYYYMMDD(cursor, -1);
            }
          } else {
            curLen = 0;
          }

          if (longest > overallBest) overallBest = longest;
          if (curLen > overallCurrent) overallCurrent = curLen;
        }

        if (mounted) {
          setBestStreak(overallBest);
          setCurrentStreak(overallCurrent);
        }
      } catch (err) {
        console.error('Error computing streaks for profile:', err);
        if (mounted) {
          setBestStreak(0);
          setCurrentStreak(0);
        }
      } finally {
        if (mounted) setStreaksLoading(false);
      }
    }

    computeStreaks();

    return () => {
      mounted = false;
    };
  }, [userLeagues]);

  // Activity stats (mock data - will be real once activity tracking is implemented)
  const activityStats: StatCard[] = [
    {
      title: 'Activities Logged',
      value: activitiesLoading ? '...' : activitiesLogged,
      change: 0,
      changeLabel: 'Start logging!',
      description: 'Total workouts submitted',
      icon: Dumbbell,
    },
    {
      title: 'Total Points',
      value: activitiesLoading || challengeLoading ? '...' : totalPoints,
      change: 0,
      changeLabel: 'Earn points',
      description: 'Points earned across leagues',
      icon: Award,
    },
    {
      title: 'Current Streak',
      value: streaksLoading ? '...' : `${currentStreak} days`,
      change: 0,
      changeLabel: 'Build your streak',
      description: 'Consecutive active days',
      icon: Flame,
    },
    {
      title: 'Best Streak',
      value: streaksLoading ? '...' : `${bestStreak} days`,
      change: 0,
      changeLabel: 'Set a record',
      description: 'Your longest streak ever',
      icon: Trophy,
    },
  ];

  // League involvement stats
  const leagueStatCards: StatCard[] = [
    {
      title: 'Total Leagues',
      value: leagueStats.totalLeagues,
      change: leagueStats.totalLeagues > 0 ? 12.5 : 0,
      changeLabel: leagueStats.totalLeagues > 0 ? 'Growing strong' : 'Join a league',
      description: 'Leagues you are part of',
      icon: Trophy,
    },
    {
      title: 'Active Leagues',
      value: leagueStats.activeLeagues,
      change: leagueStats.activeLeagues > 0 ? 8.2 : 0,
      changeLabel: leagueStats.activeLeagues > 0 ? 'In progress' : 'No active leagues',
      description: 'Currently running leagues',
      icon: Target,
    },
    {
      title: 'Hosting',
      value: leagueStats.hostingCount,
      change: leagueStats.hostingCount > 0 ? 5.0 : -2.5,
      changeLabel: leagueStats.hostingCount > 0 ? 'League creator' : 'Create your first',
      description: 'Leagues you created',
      icon: Crown,
    },
    {
      title: 'Leadership Roles',
      value: leagueStats.leadershipRoles,
      change: leagueStats.leadershipRoles > 0 ? 15.3 : 0,
      changeLabel: 'Governor & Captain',
      description: 'Management positions',
      icon: Shield,
    },
  ];

  // Loading state
  if (status === 'loading') {
    return <ProfileSkeleton />;
  }

  return (
    <div className="flex flex-col gap-6 py-4 md:py-6">
      {/* Header */}
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Settings className="size-6 text-primary" />
            Profile Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your account settings and view your stats
          </p>
        </div>
      </div>

      {/* Profile Form */}
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="size-5 text-primary" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Update your personal details and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-start gap-6 p-4 rounded-lg bg-muted/30 border">
              <Avatar className="size-24 border-4 border-background shadow-lg">
                <AvatarImage src={user?.image || undefined} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-semibold truncate">
                  {user?.name || 'User'}
                </h3>
                <p className="text-sm text-muted-foreground truncate">
                  {user?.email}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <Badge
                    variant={platformRole === 'admin' ? 'default' : 'secondary'}
                    className="gap-1"
                  >
                    <Shield className="size-3" />
                    {platformRole === 'admin' ? 'Administrator' : 'Member'}
                  </Badge>
                  {leagueStats.hostingCount > 0 && (
                    <Badge variant="outline" className="gap-1">
                      <Crown className="size-3" />
                      Host
                    </Badge>
                  )}
                </div>
                <Button variant="outline" size="sm" className="mt-4" disabled>
                  <Camera className="mr-2 size-4" />
                  Change Photo
                </Button>
              </div>
            </div>

            <Separator />

            {/* Form */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="size-4 text-muted-foreground" />
                  Full Name
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="size-4 text-muted-foreground" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 99999 99999"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="size-4 text-muted-foreground" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-muted/50"
                />
                <p className="text-xs text-muted-foreground">
                  Email is linked to your account and cannot be changed.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-6">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 size-4" />
                  Save Changes
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Activity Stats - SectionCards Style */}
      <div className="px-4 lg:px-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="size-5 text-primary" />
          Activity Overview
        </h2>
      </div>
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 sm:grid-cols-2 lg:grid-cols-4">
        {activityStats.map((stat, index) => {
          const isPositive = stat.change >= 0;
          const TrendIcon = isPositive ? TrendingUp : TrendingDown;
          const StatIcon = stat.icon;

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
                  <Badge variant="outline">
                    <TrendIcon className="size-3" />
                    {isPositive ? '+' : ''}
                    {stat.change}%
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardFooter className="flex-col items-start gap-1.5 text-sm">
                <div className="line-clamp-1 flex gap-2 font-medium">
                  {stat.changeLabel} <TrendIcon className="size-4" />
                </div>
                <div className="text-muted-foreground">{stat.description}</div>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* League Stats - SectionCards Style */}
      <div className="px-4 lg:px-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Trophy className="size-5 text-primary" />
          League Involvement
        </h2>
      </div>
      {leaguesLoading ? (
        <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16 mt-2" />
              </CardHeader>
              <CardFooter className="flex-col items-start gap-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-40" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 sm:grid-cols-2 lg:grid-cols-4">
          {leagueStatCards.map((stat, index) => {
            const isPositive = stat.change >= 0;
            const TrendIcon = isPositive ? TrendingUp : TrendingDown;
            const StatIcon = stat.icon;

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
                    <Badge variant="outline">
                      <TrendIcon className="size-3" />
                      {isPositive ? '+' : ''}
                      {stat.change}%
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                  <div className="line-clamp-1 flex gap-2 font-medium">
                    {stat.changeLabel} <TrendIcon className="size-4" />
                  </div>
                  <div className="text-muted-foreground">{stat.description}</div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Account Info */}
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account Information</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-muted-foreground flex items-center gap-2">
                  <Calendar className="size-4" />
                  Member Since
                </p>
                <p className="font-medium mt-1">
                  {new Date().toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-muted-foreground flex items-center gap-2">
                  <Clock className="size-4" />
                  Last Active
                </p>
                <p className="font-medium mt-1">Today</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-muted-foreground flex items-center gap-2">
                  <Shield className="size-4" />
                  Account Status
                </p>
                <Badge variant="outline" className="mt-1 bg-green-500/10 text-green-600">
                  Active
                </Badge>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-muted-foreground flex items-center gap-2">
                  <Trophy className="size-4" />
                  Leagues Joined
                </p>
                <p className="font-medium mt-1">{leagueStats.totalLeagues}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// Skeleton Component
// ============================================================================

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6 py-4 md:py-6">
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16 mt-2" />
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-40" />
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-60" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-6 p-4 rounded-lg bg-muted/30">
              <Skeleton className="size-24 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-6 w-24 mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
