import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, jsonError } from "@/lib/api";
import {
  createWordWithConnections,
  findOrCreateWord,
  WordValidationError,
} from "@/lib/word-service";
import { notifyTrendingUpdate } from "@/lib/trending-events";

const createSchema = z.object({
  text: z.string(),
  connections: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  return withAuth(async (user) => {
    try {
      const body = createSchema.parse(await request.json());

      if (body.connections && body.connections.length > 0) {
        const word = await createWordWithConnections(body.text, body.connections, user.id);
        notifyTrendingUpdate("word_create");
        return NextResponse.json({ word: { id: word.id, text: word.text } }, { status: 201 });
      }

      const word = await findOrCreateWord(body.text, user.id);
      notifyTrendingUpdate("word_create");
      return NextResponse.json({ word: { id: word.id, text: word.text } }, { status: 201 });
    } catch (error) {
      if (error instanceof WordValidationError) {
        return jsonError(error.message);
      }
      throw error;
    }
  });
}
