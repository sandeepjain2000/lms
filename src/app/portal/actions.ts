"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { calculateRequestedDays } from "@/lib/leaveCalculator"
import { sendEmail } from "@/lib/email"

export async function submitLeaveRequest(data: {
  userId: string
  type: string
  startDate: string
  endDate: string
  reason: string
  isNegative: boolean
  negativeAmount: number
}) {
  const { userId, type, startDate, endDate, reason, isNegative, negativeAmount } = data

  const [user, holidays, sandwichConfig] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, communicationEmail: true, joinDate: true }
    }),
    prisma.holiday.findMany({
      where: { date: { gte: new Date(new Date(startDate).getFullYear(), 0, 1), lte: new Date(new Date(startDate).getFullYear(), 11, 31) } }
    }),
    prisma.systemConfig.findUnique({ where: { key: "weekend_sandwich_rule" } })
  ]);

  // Rule 50: Probation Check
  if (type === 'PL') {
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    if (user && user.joinDate > sixMonthsAgo) {
      throw new Error("Privilege Leave (PL) cannot be applied during the 6-month probation period (Rule 50).")
    }
  }

  const holidayDates = new Set(holidays.map(h => h.date.toISOString().split('T')[0]))
  const isSandwichEnabled = sandwichConfig?.value === "true"

  const { days } = calculateRequestedDays(
    new Date(startDate), 
    new Date(endDate), 
    holidayDates, 
    isSandwichEnabled, 
    type, 
    false
  )

  const request = await prisma.leaveRequest.create({
    data: {
      userId,
      type,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
      status: "PENDING",
      isNegative,
      negativeAmount,
      year: new Date().getFullYear(),
    },
  })

  // Email logic... (omitted for brevity in this scratch, but preserved in file)
  const targetEmail = user?.communicationEmail || user?.email || "sandeepjain200019@gmail.com"
  await sendEmail({
    to: targetEmail,
    subject: `Leave Application Received: ${type} (${days} days)`,
    html: `<p>Hello ${user?.name}, your request for ${days} days is Pending Approval.</p>`
  })

  revalidatePath("/portal")
  revalidatePath("/")
  return { success: true, request }
}

export async function submitCompOffWork(data: {
  userId: string
  dateWorked: string
  hoursWorked: number
  reason: string
}) {
  const { userId, dateWorked, hoursWorked, reason } = data
  let daysCredited = hoursWorked >= 8 ? 1.0 : (hoursWorked >= 4 ? 0.5 : 0)

  const entry = await prisma.compOffWorkEntry.create({
    data: {
      userId,
      dateWorked: new Date(dateWorked),
      hoursWorked,
      reason,
      daysCredited,
      status: "PENDING"
    }
  })

  revalidatePath("/portal")
  return { success: true, entry }
}
