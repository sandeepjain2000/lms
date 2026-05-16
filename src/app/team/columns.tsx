"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, ArrowUpDown, Calculator, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

export type TeamRow = {
  id: string
  name: string
  email: string
  role: string
  department: string
  plBalance: number
  clSlBalance: number
  joinDate: string
}

import { Edit } from "lucide-react"
import { useState } from "react"
import { EditEmployeeDialog } from "./EditEmployeeDialog"

const ActionCell = ({ row }: { row: any }) => {
  const user = row.original
  const [editOpen, setEditOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4 text-slate-600" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Edit className="mr-2 h-4 w-4" /> Edit Employee
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => toast.info("Opening proration calculator for " + user.name)}>
            <Calculator className="mr-2 h-4 w-4" /> Prorate Leaves
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => toast.error("Employee deleted")} className="text-red-600">
            <Trash2 className="mr-2 h-4 w-4" /> Delete Employee
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <EditEmployeeDialog 
        user={user} 
        open={editOpen} 
        onOpenChange={setEditOpen} 
      />
    </>
  )
}

export const columns: ColumnDef<TeamRow>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.getValue("name")}</div>
        <div className="text-xs text-slate-500">{row.original.email}</div>
      </div>
    )
  },
  {
    accessorKey: "department",
    header: "Department",
  },
  {
    accessorKey: "role",
    header: "Status",
    cell: ({ row }) => {
      const role = row.getValue("role") as string
      const joinDate = new Date(row.original.joinDate)
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      const isProbation = joinDate > sixMonthsAgo

      return (
        <div className="flex gap-1">
          <Badge variant="secondary">{role}</Badge>
          {isProbation && <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50">Probation</Badge>}
        </div>
      )
    }
  },
  {
    accessorKey: "plBalance",
    header: "PL Balance",
    cell: ({ row }) => {
      const bal = row.getValue("plBalance") as number
      return <span className={bal < 5 ? "text-red-600 font-bold" : ""}>{bal}</span>
    }
  },
  {
    accessorKey: "clSlBalance",
    header: "CL/SL Balance",
  },
  {
    accessorKey: "joinDate",
    header: "Join Date",
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionCell row={row} />,
  },
]
