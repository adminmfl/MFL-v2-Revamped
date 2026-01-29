'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  Trophy,
  Users,
  ArrowRight,
  Loader2,
  Ticket,
  Globe,
  Sparkles,
  Info,
} from 'lucide-react';

import { useLeague } from '@/contexts/league-context';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

// ============================================================================
// Join League Page
// ============================================================================

export default function JoinLeaguePage() {
  const router = useRouter();
  const { refetch } = useLeague();
  const [inviteCode, setInviteCode] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [joinedLeagueName, setJoinedLeagueName] = React.useState('');
  const [joinedLeagueId, setJoinedLeagueId] = React.useState('');

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      setError('Please enter an invite code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/leagues/join-by-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inviteCode.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to join league');
      }

      // Success
      setJoinedLeagueName(data.leagueName || 'the league');
      setJoinedLeagueId(data.leagueId);
      setSuccess(true);
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join league');
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (success) {
    return (
      <div className="flex flex-col gap-6 py-4 md:py-6">
        <div className="px-4 lg:px-6">
          <Card className="max-w-lg mx-auto overflow-hidden">
            {/* Gradient Header */}
            <div className="p-8 text-center dark:text-white text-black relative overflow-hidden">
              {/* Decorative circles */}
              <div className="absolute -top-10 -left-10 size-40 rounded-full bg-white/10 blur-xl" />
              <div className="absolute -bottom-10 -right-10 size-40 rounded-full bg-white/10 blur-xl" />

              <div className="relative">
                <div className="size-20 mx-auto rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 ring-4 ring-white/30 animate-bounce">
                  <Trophy className="size-10 dark:text-white text-black" />
                </div>
                <h2 className="text-2xl font-bold mb-1">Welcome Aboard!</h2>
                <p className="dark:text-white text-black">You've successfully joined the league</p>
              </div>
            </div>

            <CardContent className="p-6 text-center">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {joinedLeagueName}
                </h3>
                <p className="text-muted-foreground">
                  Your fitness journey starts now. Get ready to compete, stay active, and earn rewards!
                </p>
              </div>

              {/* Quick info cards */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border">
                  <Users className="size-5 mx-auto mb-1 text-primary" />
                  <p className="text-xs text-muted-foreground">Join a Team</p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 border">
                  <Sparkles className="size-5 mx-auto mb-1 text-green-600" />
                  <p className="text-xs text-muted-foreground">Log Activities</p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border">
                  <Trophy className="size-5 mx-auto mb-1 text-amber-600" />
                  <p className="text-xs text-muted-foreground">Win Rewards</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" asChild className="flex-1">
                  <Link href="/dashboard">
                    Go to Dashboard
                  </Link>
                </Button>
                {joinedLeagueId && (
                  <Button asChild className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
                    <Link href={`/leagues/${joinedLeagueId}`}>
                      Enter League
                      <ArrowRight className="ml-2 size-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-4 md:py-6">
      {/* Header */}
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Search className="size-6 text-primary" />
              Join a League
            </h1>
            <p className="text-muted-foreground">
              Enter an invite code or browse public leagues to join
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 lg:px-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Join Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Join by Code Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Ticket className="size-5 text-primary" />
                  Join with Invite Code
                </CardTitle>
                <CardDescription>
                  Enter the invite code shared by the league host
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleJoinByCode} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="inviteCode">Invite Code</Label>
                    <div className="flex gap-2">
                      <Input
                        id="inviteCode"
                        placeholder="Enter your invite code..."
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                        className="flex-1 font-mono text-lg tracking-widest"
                      />
                      <Button type="submit" disabled={loading}>
                        {loading ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <>
                            Join
                            <ArrowRight className="ml-2 size-4" />
                          </>
                        )}
                      </Button>
                    </div>
                    {error && (
                      <p className="text-sm text-destructive">{error}</p>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Browse Public Leagues Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="size-5 text-primary" />
                  Browse Public Leagues
                </CardTitle>
                <CardDescription>
                  Find and join public leagues that are open for new members
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Empty className="border-0 p-4">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Search />
                    </EmptyMedia>
                    <EmptyTitle>Coming Soon</EmptyTitle>
                    <EmptyDescription>
                      Public league discovery is coming soon! For now, use an
                      invite code to join a league.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button variant="outline" disabled>
                      <Search className="mr-2 size-4" />
                      Browse Leagues
                    </Button>
                  </EmptyContent>
                </Empty>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Info Sidebar */}
          <div className="space-y-6">
            {/* Create Your Own Card */}
            <Card className="bg-gradient-to-t from-primary/5 to-card border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="size-5 text-primary" />
                  Create Your Own
                </CardTitle>
                <CardDescription>
                  Start your own fitness league and invite friends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <div className="size-12 rounded-lg bg-primary flex items-center justify-center">
                    <Trophy className="size-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Host a League</h3>
                    <p className="text-sm text-muted-foreground">
                      Create and manage your own fitness competition
                    </p>
                  </div>
                </div>
                <Button asChild className="w-full">
                  <Link href="/leagues/create">
                    Create League
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* How It Works Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="size-5 text-primary" />
                  How It Works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-primary">1</span>
                  </div>
                  <div>
                    <p className="font-medium">Get an Invite Code</p>
                    <p className="text-sm text-muted-foreground">
                      Ask the league host for their invite code
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-primary">2</span>
                  </div>
                  <div>
                    <p className="font-medium">Enter the Code</p>
                    <p className="text-sm text-muted-foreground">
                      Type the code above and click Join
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-primary">3</span>
                  </div>
                  <div>
                    <p className="font-medium">Start Competing</p>
                    <p className="text-sm text-muted-foreground">
                      Join a team and start logging activities
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Users className="size-5" />
                    <span className="text-sm">Join the community</span>
                  </div>
                  <p className="text-2xl font-bold">1,000+</p>
                  <p className="text-sm text-muted-foreground">
                    Active members across leagues
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
