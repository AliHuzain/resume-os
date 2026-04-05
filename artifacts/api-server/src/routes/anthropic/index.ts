import { Router } from "express";
import { db } from "@workspace/db";
import { conversations as conversationsTable, messages as messagesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import {
  CreateAnthropicConversationBody,
  GetAnthropicConversationParams,
  DeleteAnthropicConversationParams,
  ListAnthropicMessagesParams,
  SendAnthropicMessageParams,
  SendAnthropicMessageBody,
} from "@workspace/api-zod";

const router = Router();

router.get("/conversations", async (req, res) => {
  try {
    const conversations = await db.select().from(conversationsTable).orderBy(conversationsTable.createdAt);
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: "Failed to list conversations" });
  }
});

router.post("/conversations", async (req, res) => {
  const parsed = CreateAnthropicConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [conversation] = await db.insert(conversationsTable).values({ title: parsed.data.title }).returning();
    res.status(201).json(conversation);
  } catch (err) {
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

router.get("/conversations/:id", async (req, res) => {
  const params = GetAnthropicConversationParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  try {
    const [conversation] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, params.data.id));
    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    const messages = await db.select().from(messagesTable).where(eq(messagesTable.conversationId, params.data.id)).orderBy(messagesTable.createdAt);
    res.json({ ...conversation, messages });
  } catch (err) {
    res.status(500).json({ error: "Failed to get conversation" });
  }
});

router.delete("/conversations/:id", async (req, res) => {
  const params = DeleteAnthropicConversationParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  try {
    await db.delete(messagesTable).where(eq(messagesTable.conversationId, params.data.id));
    await db.delete(conversationsTable).where(eq(conversationsTable.id, params.data.id));
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

router.get("/conversations/:id/messages", async (req, res) => {
  const params = ListAnthropicMessagesParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  try {
    const messages = await db.select().from(messagesTable).where(eq(messagesTable.conversationId, params.data.id)).orderBy(messagesTable.createdAt);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Failed to list messages" });
  }
});

router.post("/conversations/:id/messages", async (req, res) => {
  const params = SendAnthropicMessageParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const body = SendAnthropicMessageBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    const [userMessage] = await db.insert(messagesTable).values({
      conversationId: params.data.id,
      role: "user",
      content: body.data.content,
    }).returning();

    const allMessages = await db.select().from(messagesTable).where(eq(messagesTable.conversationId, params.data.id)).orderBy(messagesTable.createdAt);

    const chatMessages = allMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    let fullResponse = "";
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      messages: chatMessages,
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        fullResponse += event.delta.text;
        res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
      }
    }

    await db.insert(messagesTable).values({
      conversationId: params.data.id,
      role: "assistant",
      content: fullResponse,
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message || "AI error" })}\n\n`);
    res.end();
  }
});

export default router;
