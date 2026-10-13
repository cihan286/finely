import { describe, expect, test } from "vitest";
import { parseContactMessage } from "./contact";

const valid = {
  name: " Maya Carter ",
  email: " maya@northpeak.com ",
  company: "",
  message: " We'd like a demo. ",
};

describe("parseContactMessage", () => {
  test("tidies a complete message", () => {
    expect(parseContactMessage(valid)).toEqual({
      message: {
        name: "Maya Carter",
        email: "maya@northpeak.com",
        company: "",
        message: "We'd like a demo.",
      },
    });
  });

  test("needs a name, an email address to reply to and a message", () => {
    expect(parseContactMessage({ ...valid, name: "  " })).toEqual({
      error: "Please tell us your name.",
    });
    expect(parseContactMessage({ ...valid, email: "maya@northpeak" })).toEqual({
      error: "Please enter a valid email address, so we can reply.",
    });
    expect(parseContactMessage({ ...valid, message: "" })).toEqual({
      error: "Please write a message.",
    });
  });

  test("refuses text that's too long", () => {
    expect(parseContactMessage({ ...valid, message: "x".repeat(4001) })).toEqual({
      error: "Your message can be at most 4000 characters.",
    });
    expect(parseContactMessage({ ...valid, company: "x".repeat(101) })).toEqual({
      error: "The company name can be at most 100 characters.",
    });
  });
});
