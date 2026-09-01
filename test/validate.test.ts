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
});

test("a landline is rejected here, not at the gateway where it costs a message", () => {
  assert.equal(normalisePhone("02 9876 5432"), null);
  assert.match(phoneError("02 9876 5432") ?? "", /landline/i);
});

test("the country decides how the digits are read", () => {
  // Real ranges only. 555 in the US and Ofcom's 07700 900xxx block are the
  // numbers reserved for film and drama, and libphonenumber rejects them —
  // which is correct, and cost me a failing test to remember.
  assert.equal(normalisePhone("021 123 4567", "NZ"), "+64211234567");
  assert.equal(normalisePhone("07911 123456", "GB"), "+447911123456");
  assert.equal(normalisePhone("(415) 236-7890", "US"), "+14152367890");
  // and an Australian mobile is not a valid UK one
  assert.equal(normalisePhone("0412 884 019", "GB"), null);
});

test("already-international numbers ignore the picker", () => {
  // someone who types +61... while the picker says United Kingdom still gets
  // the number they meant
  assert.equal(normalisePhone("+61412884019", "GB"), "+61412884019");
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

// The development OTP bypass. It exists because Firebase will not send codes
// on the Spark plan, and the risk it carries is shipping by accident — so what
// is worth pinning is the guard, not the happy path.
test("the stub is impossible in a release build", async () => {
  // __DEV__ is what gates it. Under node it is undefined, which is the same
  // falsy path a production bundle takes, so the constant must be null here.
  const { STUB_CODE, usingStub } = await import("../lib/devstub.ts");
  assert.equal(STUB_CODE, null, "a release build must have no stub code");
  assert.equal(usingStub(), false);
});
