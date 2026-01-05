import { describe, expect, it } from "vitest"

import {
  formatExportMessage,
  formatImportMessage,
  formatMemberMessage,
  formatMissingNameMessage,
  formatModuleMessage,
  makeSimilarityScore
} from "../../src/core/index.js"

describe("message formatting", () => {
  it("formats export message in expected style", () => {
    const message = formatExportMessage(
      "useStae",
      "react",
      undefined,
      [{ name: "useState", score: makeSimilarityScore(0.9) }]
    )

    expect(message).toContain("Export 'useStae' does not exist in module 'react'.")
    expect(message).toContain("- useState")
  })

  it("formats import message in expected style", () => {
    const message = formatImportMessage(
      "saveRe1f",
      "./hooks",
      "typeof import(\"./hooks\")",
      [{ name: "saveRef", score: makeSimilarityScore(0.9) }]
    )

    expect(message).toContain("Export 'saveRe1f' does not exist on type 'typeof import(\"./hooks\")'.")
    expect(message).toContain("- saveRef")
  })

  it("formats overloaded signatures on separate lines", () => {
    const signature = "{ <A>(a: A): A; <A, B = never>(a: A, ab: (a: A) => B): B; }"
    const message = formatImportMessage(
      "p1ipe",
      "effect",
      "typeof import(\"effect\")",
      [
        {
          name: "pipe",
          score: makeSimilarityScore(0.9),
          signature
        }
      ]
    )

    expect(message).toContain("- pipe<A>")
    expect(message).toContain("- pipe<A, B = never>")
  })

  it("formats member message with signatures", () => {
    const message = formatMemberMessage("get1Item", "Storage", [
      {
        name: "getItem",
        score: makeSimilarityScore(0.9),
        signature: "(key: string) => string | null"
      }
    ])

    expect(message).toContain("Property 'get1Item' does not exist on type 'Storage'.")
    expect(message).toContain("Did you mean")
    expect(message).toContain("- getItem(key: string): string | null")
  })

  it("formats module path message", () => {
    const message = formatModuleMessage("./HamsterKo1mbatPage.css", [
      { name: "./HamsterKombatPage.css", score: makeSimilarityScore(0.9) }
    ])

    expect(message).toContain(
      "Cannot find module \"./HamsterKo1mbatPage.css\". Did you mean"
    )
    expect(message).toContain("- ./HamsterKombatPage.css")
  })

  it("formats module message with type declarations suffix", () => {
    const message = formatModuleMessage(
      "eff1ect",
      [{ name: "effect", score: makeSimilarityScore(0.9) }],
      true
    )

    expect(message).toContain(
      "Cannot find module 'eff1ect' or its corresponding type declarations."
    )
    expect(message).toContain("- effect")
  })

  it("formats missing name message", () => {
    const message = formatMissingNameMessage("formatGree1ting", [
      { name: "formatGreeting", score: makeSimilarityScore(0.9) }
    ])

    expect(message).toContain("Cannot find name 'formatGree1ting'.")
    expect(message).toContain("Did you mean:")
    expect(message).toContain("- formatGreeting")
  })
})
