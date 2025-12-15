'use client';

import { useSearchParams } from 'next/navigation';
import { LeagueLayout } from '@/components/layout/league-layout';
import { Sidebar } from '@/components/layout/sidebar';
import { usePermissions } from '@/hooks/use-permissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Shield, 
  Users, 
  TrendingUp, 
  Settings, 
  CheckCircle,
  AlertCircle 
} from 'lucide-react';

function LeagueContentWithRBAC() {
  const {
    role,
    canEditLeagueSettings,
    canValidateAnySubmission,
    canValidateTeamSubmissions,
    canAccessAllData,
    canManageTeamMembers,
    canOverrideCaptainApprovals,
  } = usePermissions();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              League Dashboard
            </h1>
            <p className="text-gray-600">
              Currently viewing as: <span className="font-semibold capitalize">{role}</span>
            </p>
          </div>

          {/* Permission-based content grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* League Settings - Host Only */}
            {canEditLeagueSettings && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    League Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Configure league rules, teams, and challenges
                  </p>
                  <Button className="w-full">
                    Edit Settings
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Validation Queue - Host/Governor/Captain */}
            {canValidateTeamSubmissions && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    {canValidateAnySubmission ? 'All Submissions' : 'Team Submissions'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    {canValidateAnySubmission 
                      ? 'Validate submissions from all teams' 
                      : 'Validate submissions from your team'}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">12</span>
                    <span className="text-sm text-gray-500">Pending</span>
                  </div>
                  <Button className="w-full mt-4">
                    Review Queue
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Team Management - Host/Governor/Captain */}
            {canManageTeamMembers && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Team Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Manage team members and assignments
                  </p>
                  <Button className="w-full">
                    Manage Teams
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Analytics - Host/Governor */}
            {canAccessAllData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    League Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    View comprehensive league statistics and insights
                  </p>
                  <Button className="w-full">
                    View Analytics
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Override Controls - Host/Governor */}
            {canOverrideCaptainApprovals && (
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-900">
                    <Shield className="w-5 h-5" />
                    Override Controls
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-amber-800 mb-4">
                    Override captain decisions and approvals
                  </p>
                  <Button variant="outline" className="w-full border-amber-300 hover:bg-amber-100">
                    View Overrides
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* My Stats - All Roles */}
            <Card>
              <CardHeader>
                <CardTitle>My Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Workouts</span>
                    <span className="font-semibold">24</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Points</span>
                    <span className="font-semibold">1,450</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Streak</span>
                    <span className="font-semibold">7 days</span>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Info about current role */}
          <Card className="mt-8 border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">
                    Role-Based Access
                  </h3>
                  <p className="text-sm text-blue-800">
                    You're viewing this page as a <span className="font-semibold capitalize">{role}</span>. 
                    {' '}The content and actions available are customized based on your role. 
                    Use the role switcher in the sidebar to change your view if you have multiple roles.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default function RBACExamplePage() {
  const searchParams = useSearchParams();
  const leagueId = searchParams.get('leagueId') || 'demo-league-id';

  return (
    <LeagueLayout leagueId={leagueId}>
      <LeagueContentWithRBAC />
    </LeagueLayout>
  );
}
