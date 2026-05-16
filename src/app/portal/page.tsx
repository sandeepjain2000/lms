import { PrismaClient } from '@prisma/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { LeaveRequestForm } from "./LeaveRequestForm"
import { CompOffRequest } from "./CompOffRequest"

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

const prisma = new PrismaClient()

export default async function PortalPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    return <div>Not authenticated</div>;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { balances: true, requests: { orderBy: { createdAt: 'desc' } } }
  });

  if (!user || !user.balances) return <div>User balances not found</div>;

  const totalAllowed = 14 + 14 + 5; // PL + CL/SL + COMP roughly
  const totalUsed = (30 - user.balances.pl) + (14 - (user.balances.cl + user.balances.sl));
  const wellnessScore = Math.max(0, 100 - (totalUsed / totalAllowed) * 100);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Portal</h1>
        <p className="text-slate-500">Manage your time off and view your balances.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle>Leave Balances</CardTitle>
            <CardDescription>Your current available time off</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between mb-2 text-sm font-medium">
                <span>Privilege Leave (PL)</span>
                <span>{user.balances.pl} / 30 Days</span>
              </div>
              <Progress value={(user.balances.pl / 30) * 100} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between mb-2 text-sm font-medium">
                <span>Casual/Sick Leave (CL/SL)</span>
                <span>{user.balances.cl + user.balances.sl} / 14 Days</span>
              </div>
              <Progress value={((user.balances.cl + user.balances.sl) / 14) * 100} className="h-2 [&>div]:bg-amber-500" />
            </div>
            <div>
              <div className="flex justify-between mb-2 text-sm font-medium">
                <span>Compensatory Off (COMP)</span>
                <span>{user.balances.comp} Days</span>
              </div>
              <Progress value={user.balances.comp > 0 ? 100 : 0} className="h-2 [&>div]:bg-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-indigo-50">Wellness Score</CardTitle>
            <CardDescription className="text-indigo-100">Your work-life balance metric</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <div className="text-6xl font-bold mb-2">{Math.round(wellnessScore)}</div>
            <p className="text-indigo-100 text-center text-sm">
              Great job maintaining a healthy balance! Remember to take time off when you need it.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Request Time Off</CardTitle>
              <CardDescription>Submit a new leave request</CardDescription>
            </CardHeader>
            <CardContent>
              <LeaveRequestForm userId={user.id} balances={user.balances} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Log Comp-Off Work</CardTitle>
              <CardDescription>Log weekend or holiday hours for Comp-Off credit</CardDescription>
            </CardHeader>
            <CardContent>
              <CompOffRequest userId={user.id} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Requests</CardTitle>
            <CardDescription>Your leave history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {user.requests.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{req.type}</Badge>
                      <span className="text-sm font-medium">
                        {req.startDate.toLocaleDateString()} - {req.endDate.toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">{req.reason}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={
                      req.status === 'HR_APPROVED' ? 'default' : 
                      req.status === 'REJECTED' ? 'destructive' : 'secondary'
                    }>
                      {req.status}
                    </Badge>
                    {req.status === 'PENDING' && (
                      <Button variant="ghost" size="sm" className="h-6 text-red-600 hover:text-red-700 hover:bg-red-50">Cancel</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
