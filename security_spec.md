# DayPilot Security Specification

## 1. Data Invariants
1. **User Scoping & Isolation**: Every resource belongs strictly to `/users/{userId}/...` and can only be read or written by the authenticated user whose `request.auth.uid == userId`.
2. **Identity Integrity**: All written entities must carry `userId == request.auth.uid` (or matching profile uid). Cross-user writes or identity spoofing are strictly forbidden.
3. **Task Constraints**:
   - Title is required, non-empty, and limited to 200 characters.
   - Status must belong to allowed enum: `pending`, `in_progress`, `completed`, `cancelled`.
   - Priority must belong to allowed enum: `low`, `medium`, `high`.
   - Reminder level must belong to: `normal`, `important`, `persistent`.
4. **Category Constraints**:
   - Name is required, non-empty, and limited to 60 characters.
   - Color is required and limited to 30 characters.
5. **Habit & HabitLog Constraints**:
   - Habit title is required, frequency must be valid enum.
   - Habit log must reference a valid habitId and valid date string (YYYY-MM-DD format).
6. **No Blanket Unauthenticated Access**: All collections require `request.auth != null`. Unauthenticated reads and writes are denied across all collections.

## 2. The "Dirty Dozen" Payloads (Must be REJECTED)
1. **Spoofed User ID Write**: Attacker `user_B` attempts to write to `/users/user_A/tasks/task1` with `userId: "user_B"`.
2. **Identity Tampering in Sub-collection**: Attacker writes to `/users/user_A/tasks/task1` with `userId: "user_C"`.
3. **Unauthenticated Read**: Anonymous/unauthenticated user tries to read `/users/user_A/profile/main`.
4. **Unauthenticated List Query**: Anonymous user attempts collection query on `/users/user_A/tasks`.
5. **Cross-User Profile Leak**: Authenticated user `user_B` attempts to read `/users/user_A/profile/main`.
6. **Task Without Title**: User attempts to create task with `{ "userId": "user_A", "priority": "high", "status": "pending", "reminderLevel": "normal" }` (missing `title`).
7. **Task Invalid Status Enum**: User creates task with `status: "in_limbo"`.
8. **Task Giant Title (Denial of Wallet)**: User creates task with a 50,000 character string in `title`.
9. **Category Missing Color**: User creates category without required `color` field.
10. **HabitLog Missing Date**: User writes habit log without `date` string.
11. **Malicious Document ID (ID Injection)**: Attempt to write document at ID path containing path traversal or 10KB string.
12. **System Root Write**: Attempt to write directly to top-level `/users` or arbitrary collection `/system_config`.

## 3. Test Payloads Reference
All payloads listed above are tested against Firestore rules and confirmed to be rejected by the security boundaries.
