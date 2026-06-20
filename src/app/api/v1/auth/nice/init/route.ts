import { NextResponse } from "next/server";
import { createNiceAuthRequest, isNiceEnabled } from "@/lib/nice-auth";
import { jsonError } from "@/lib/api";

export async function GET() {
  if (!isNiceEnabled()) {
    return NextResponse.json({
      mode: "mock" as const,
      message: "NICE API 키가 없어 mock 본인인증을 사용합니다.",
    });
  }

  try {
    const nice = await createNiceAuthRequest();
    return NextResponse.json({
      mode: "nice" as const,
      actionUrl: "https://nice.checkplus.co.kr/CheckPlusSafeModel/service.cb",
      form: {
        m: "service",
        token_version_id: nice.tokenVersionId,
        enc_data: nice.encData,
        integrity_value: nice.integrityValue,
      },
      reqNo: nice.reqNo,
    });
  } catch {
    return jsonError("NICE 본인인증 초기화에 실패했습니다.", 502);
  }
}
