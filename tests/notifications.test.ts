import { test } from "node:test";
import assert from "node:assert/strict";
import {
  chooseReminderTime,
  REMINDER_MESSAGES,
} from "../src/lib/native/notifications";
test("daily reminders use installation time for three days, then learn from local open times", () => {
  const install = new Date(2026, 0, 1, 10, 17).getTime();
  const opens = [1, 2, 3, 4].map((day) =>
    new Date(2026, 0, day, 20, 35).getTime(),
  );
  assert.deepEqual(
    chooseReminderTime(install, opens, new Date(2026, 0, 3, 9).getTime()),
    { hour: 10, minute: 17 },
  );
  assert.deepEqual(
    chooseReminderTime(install, opens, new Date(2026, 0, 5, 9).getTime()),
    { hour: 20, minute: 35 },
  );
  assert.deepEqual(
    chooseReminderTime(
      install,
      opens.slice(0, 2),
      new Date(2026, 0, 5, 9).getTime(),
    ),
    { hour: 10, minute: 17 },
  );
  assert.equal(REMINDER_MESSAGES.length, 14);
  assert.equal(new Set(REMINDER_MESSAGES).size, 14);
});
