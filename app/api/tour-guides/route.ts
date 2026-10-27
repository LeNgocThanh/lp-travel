import { z } from "zod";
import { apiUser } from "@/lib/route-auth";
import { hasResourceAction } from "@/lib/lead-access";
import { prisma } from "@/lib/prisma";

const optional = (max: number) => z.string().trim().max(max).transform((value) => value || null);
const schema = z.object({ fullName: z.string().trim().min(2).max(150), gender: z.enum(["MALE", "FEMALE", "OTHER"]), dateOfBirth: z.string().trim().regex(/^$|^\d{4}-\d{2}-\d{2}$/), identityNumber: z.string().trim().min(5).max(30), permanentAddress: optional(1000), taxCode: optional(30), phone: z.string().trim().min(3).max(30), accountName: optional(150), bankAccountNumber: optional(50), bankName: optional(150) });

export async function POST(request: Request) {
  const { user, response } = await apiUser(); if (!user) return response!;
  if (!(await hasResourceAction(user, "LEADS", "UPDATE"))) return Response.json({ message: "Bạn không có quyền tạo hướng dẫn viên từ lịch trình." }, { status: 403 });
  try {
    const input = schema.parse(await request.json());
    if (await prisma.tourGuide.findUnique({ where: { identityNumber: input.identityNumber } })) return Response.json({ message: "CMND/CCCD này đã tồn tại." }, { status: 409 });
    const guide = await prisma.tourGuide.create({ data: { ...input, dateOfBirth: input.dateOfBirth ? new Date(`${input.dateOfBirth}T00:00:00.000Z`) : null }, select: { id: true, fullName: true, identityNumber: true } });
    return Response.json({ guide }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ message: "Vui lòng kiểm tra thông tin hướng dẫn viên." }, { status: 400 });
    return Response.json({ message: error instanceof Error ? error.message : "Không thể tạo hướng dẫn viên." }, { status: 500 });
  }
}
