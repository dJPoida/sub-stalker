import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getTestEmailRateLimitState, sendTestEmail } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  const rateLimitState = await getTestEmailRateLimitState(user.id);

  if (!rateLimitState.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: `Rate limit exceeded. You can send up to 3 test emails per hour. Retry in ${rateLimitState.retryAfterSeconds ?? 3600}s.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimitState.retryAfterSeconds ?? 3600),
        },
      },
    );
  }

  const result = await sendTestEmail({
    to: user.email,
    userId: user.id,
  });

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error ?? "Unable to send test email.",
      },
      {
        status: 502,
      },
    );
  }

  return NextResponse.json({
    success: true,
    messageId: result.messageId,
  });
}
