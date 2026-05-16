import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const holidays = await prisma.holiday.findMany({
    orderBy: { date: 'asc' }
  })
  return NextResponse.json(holidays)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const sessionUser = session?.user as any
  if (sessionUser?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, date } = await req.json()
  const holiday = await prisma.holiday.create({
    data: { name, date: new Date(date) }
  })
  return NextResponse.json(holiday)
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const sessionUser = session?.user as any
  if (sessionUser?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, name, date } = await req.json()
  const holiday = await prisma.holiday.update({
    where: { id },
    data: { name, date: new Date(date) }
  })
  return NextResponse.json(holiday)
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const sessionUser = session?.user as any
  if (sessionUser?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 })

  await prisma.holiday.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
