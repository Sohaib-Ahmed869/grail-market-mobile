// The signup rules. These are the messages a person actually reads when they
// are blocked, so they are worth pinning.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emailError, nameError, phoneError, passwordError, confirmError, normalisePhone,
} from "../lib/validate.ts";

test("a name has to look like something on a licence", () => {
  assert.equal(nameError("Alex Barakat"), null);
  assert.match(nameError("Alex") ?? "", /full name/);      // the common failure
  assert.match(nameError("") ?? "", /Enter your full name/);
  assert.match(nameError("Alex 2000") ?? "", /numbers/);
});

test("email is checked loosely, on purpose", () => {
  for (const ok of ["a@b.co", "alex@example.com.au", "o'brien+tag@mail.example.io"]) {
    assert.equal(emailError(ok), null, ok);
  }
  for (const bad of ["", "alex", "alex@", "alex@com", "a b@c.com"]) {
    assert.ok(emailError(bad), bad);
  }
});

test("Australian mobiles, in any of the shapes people type them", () => {
  for (const v of ["0412 884 019", "0412884019", "+61412884019", "+61 412 884 019", "412884019"]) {
    assert.equal(normalisePhone(v), "+61412884019", v);
  }
  // landlines cannot receive the code, so they fail here rather than at the
  // gateway where it costs a message
  assert.equal(normalisePhone("0298765432"), null);
  assert.equal(normalisePhone("+15551234567"), null);
  assert.match(phoneError("02 9876 5432") ?? "", /Australian mobile/);
});

test("length is the password rule that matters", () => {
  assert.equal(passwordError("correct horse battery"), null);
  assert.match(passwordError("Short1!") ?? "", /at least 10/i);
  assert.match(passwordError("1234567890123") ?? "", /Digits alone/);
  assert.match(passwordError("password123") ?? "", /most common/);
});

test("confirm has to match, and empty is its own message", () => {
  assert.equal(confirmError("a-good-password", "a-good-password"), null);
  assert.match(confirmError("a-good-password", "") ?? "", /again/);
  assert.match(confirmError("a-good-password", "a-good-passwrod") ?? "", /do not match/);
});
