import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { ChatMessage, ServerWsMessage } from "@ai-companion/shared"
import {
  applyTokenMessage,
  createTransientNudgeId,
  isTransientNudge,
} from "./chatMessages"

type TokenMessage = Extract<ServerWsMessage, { type: "token" }>

function token(
  delta: string,
  extra: Partial<TokenMessage> = {},
): TokenMessage {
  return { type: "token", topic_id: "default", delta, ...extra }
}

function agent(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: "agent-1",
    role: "agent",
    content: "Hello",
    created_at: 1,
    ...overrides,
  }
}

const clock = { id: () => "generated-id", now: () => 2 }

describe("applyTokenMessage", () => {
  it("appends a delta to the message with the matching message_id", () => {
    const result = applyTokenMessage(
      [agent({ id: "other" }), agent({ id: "target", content: "Hi" })],
      token(" there", { message_id: "target" }),
      clock,
    )

    assert.equal(result.find((m) => m.id === "target")?.content, "Hi there")
  })

  it("appends a delta to the newest agent message when there is no message_id", () => {
    const result = applyTokenMessage(
      [agent({ id: "newest", content: "Hey" }), agent({ id: "older" })],
      token("!"),
      clock,
    )

    assert.equal(result[0].content, "Hey!")
    assert.equal(result[1].content, "Hello")
  })

  it("creates a fresh agent message when the token has an unknown message_id", () => {
    const result = applyTokenMessage(
      [agent({ id: "known" })],
      token("first", { message_id: "unknown" }),
      clock,
    )

    assert.equal(result[0].content, "first")
    assert.equal(result[1].content, "Hello")
  })

  it("does not mutate the previous message array", () => {
    const newest = agent({ id: "", content: "Hi" })
    const current = [newest]

    const result = applyTokenMessage(current, token("!"), clock)

    assert.equal(result[0].content, "Hi!")
    assert.equal(newest.content, "Hi")
  })
})

describe("transient nudge helpers", () => {
  it("detects messages created as transient nudges", () => {
    const id = createTransientNudgeId("abc")
    assert.equal(isTransientNudge({ id } as ChatMessage), true)
    assert.equal(isTransientNudge(agent()), false)
  })
})
