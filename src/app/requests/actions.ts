"use server"

import { PrismaClient } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { sendEmail } from "@/lib/email"
import { calculateRequestedDays } from "@/lib/leaveCalculator"

const prisma = new PrismaClient()

export async function approveRequest(id: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("Unauthorized")

  const user = session.user as any
  const status = user.role === "ADMIN" ? "HR_APPROVED" : "L1_APPROVED"

  const request = await prisma.leaveRequest.update({
    where: { id },
    data: { status },
    include: { user: true }
  })

  // If HR approved, we need to deduct from balance
  if (status === "HR_APPROVED") {
    const { days } = await calculateRequestedDays(
      prisma, 
      request.startDate, 
      request.endDate, 
      request.type, 
      request.halfDay !== "NONE"
    )
    
    const leaveType = request.type.toLowerCase() // pl, cl, sl, comp
    
    const balance = await prisma.leaveBalance.findUnique({
      where: { userId: request.userId }
    })

    if (balance) {
      const currentVal = (balance as any)[leaveType] || 0
      const currentUsed = (balance as any)[`${leaveType}Used`] || 0

      await prisma.leaveBalance.update({
        where: { userId: request.userId },
        data: {
          [leaveType]: currentVal - days,
          [`${leaveType}Used`]: currentUsed + days
        }
      })
    }
  }

  // Send Email Notification
  const targetEmail = request.user.communicationEmail || request.user.email
  if (targetEmail) {
    await sendEmail({
      to: targetEmail,
      subject: `Leave Request ${status === 'HR_APPROVED' ? 'Approved' : 'Provisionally Approved'}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <h2 style="color: #4f46e5;">Leave Request Update</h2>
          <p>Hello <strong>${request.user.name}</strong>,</p>
          <p>Your leave request from <strong>${request.startDate.toLocaleDateString()}</strong> to <strong>${request.endDate.toLocaleDateString()}</strong> has been <strong>${status === 'HR_APPROVED' ? 'Fully Approved' : 'Approved by Manager (Pending HR)'}</strong>.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #666;">This is an automated system notification.</p>
        </div>
      `
    })
  }

  revalidatePath("/requests")
  revalidatePath("/ledger")
  return { success: true }
}

export async function rejectRequest(id: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("Unauthorized")

  const request = await prisma.leaveRequest.update({
    where: { id },
    data: { status: "REJECTED" },
    include: { user: true }
  })

  // Send Email Notification
  const targetEmail = request.user.communicationEmail || request.user.email
  if (targetEmail) {
    await sendEmail({
      to: targetEmail,
      subject: `Leave Request Rejected`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <h2 style="color: #ef4444;">Leave Request Rejected</h2>
          <p>Hello <strong>${request.user.name}</strong>,</p>
          <p>Your leave request from <strong>${request.startDate.toLocaleDateString()}</strong> to <strong>${request.endDate.toLocaleDateString()}</strong> has been <strong>Rejected</strong>.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #666;">This is an automated system notification.</p>
        </div>
      `
    })
  }

  revalidatePath("/requests")
  return { success: true }
}

export async function approveCompOff(id: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("Unauthorized")

  return await prisma.$transaction(async (tx) => {
    const entry = await tx.compOffWorkEntry.update({
      where: { id },
      data: { 
        status: "APPROVED",
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Rule 41: 30 days expiry
      },
      include: { user: true }
    })

    // Update the user's comp balance
    await tx.leaveBalance.update({
      where: { userId: entry.userId },
      data: {
        comp: { increment: entry.daysCredited }
      }
    })

    // Send Email Notification
    const targetEmail = entry.user.communicationEmail || entry.user.email
    if (targetEmail) {
      await sendEmail({
        to: targetEmail,
        subject: `Comp-Off Work Approved`,
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2 style="color: #10b981;">Comp-Off Approved</h2>
            <p>Hello <strong>${entry.user.name}</strong>,</p>
            <p>Your work on <strong>${entry.dateWorked.toLocaleDateString()}</strong> has been approved. <strong>${entry.daysCredited} days</strong> have been added to your Comp-Off balance.</p>
            <p>Note: This credit expires on ${entry.expiryDate?.toLocaleDateString()}.</p>
          </div>
        `
      })
    }

    revalidatePath("/requests")
    revalidatePath("/portal")
    return { success: true }
  })
}

export async function rejectCompOff(id: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("Unauthorized")

  const entry = await prisma.compOffWorkEntry.update({
    where: { id },
    data: { status: "REJECTED" },
    include: { user: true }
  })

  // Send Email Notification
  const targetEmail = entry.user.communicationEmail || entry.user.email
  if (targetEmail) {
    await sendEmail({
      to: targetEmail,
      subject: `Comp-Off Work Rejected`,
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2 style="color: #ef4444;">Comp-Off Rejected</h2>
          <p>Hello <strong>${entry.user.name}</strong>,</p>
          <p>Your comp-off request for <strong>${entry.dateWorked.toLocaleDateString()}</strong> has been rejected.</p>
        </div>
      `
    })
  }

  revalidatePath("/requests")
  return { success: true }
}
