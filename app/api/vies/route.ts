import { NextResponse } from "next/server";
import { z } from "zod";
import { checkViesLive } from "@/lib/vies";

export const runtime = "nodejs";

const requestSchema = z.object({
  countryCode: z.string().length(2),
  vatNumber: z.string().min(1),
});

export async function POST(request: Request) {
  const input = requestSchema.safeParse(await request.json());
  if (!input.success) {
    return NextResponse.json(
      { error: "Invalid VIES request", issues: input.error.issues },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(
      await checkViesLive(input.data.countryCode, input.data.vatNumber),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Invalid VIES input",
      },
      { status: 400 },
    );
  }
}
