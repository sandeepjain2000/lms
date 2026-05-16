import prisma from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, FileText, CheckCircle2, AlertCircle } from "lucide-react"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role === "EMPLOYEE") {
    redirect("/portal")
  }

  // 1. Parallel Database Queries
  const [activeUsersCount, resignedUsersCount, pendingRequests, balances] = await Promise.all([
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count({ where: { status: 'RESIGNED' } }),
    prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
    prisma.leaveBalance.findMany({ include: { user: true } })
  ]);
  
  // 2. Calculations
  const positivePL = balances.reduce((acc, curr) => acc + (curr.pl > 0 ? curr.pl : 0), 0);
  const negativePL = balances.reduce((acc, curr) => acc + (curr.pl < 0 ? Math.abs(curr.pl) : 0), 0);
  
  const plLiability = positivePL * 2000; // Accrued liability
  const plRecoverable = negativePL * 2000; // Recoverable asset (Rule 45)
  const netLiability = plLiability - plRecoverable;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-slate-500">Overview of company leave metrics and pending tasks.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
            <Users className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsersCount}</div>
            <p className="text-xs text-slate-500 mt-1">{resignedUsersCount} Resigned</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <FileText className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests}</div>
            <p className="text-xs text-slate-500 mt-1">Requires approval</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-green-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Net Liability (PL)</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">₹{netLiability.toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-1">Accrued - Recoverable</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-blue-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Recoverable Assets</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">₹{plRecoverable.toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-1">From negative balances</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
