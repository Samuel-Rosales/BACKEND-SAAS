-- Backfill SubscriptionPlan catalog + link legacy planType -> planId

-- 1) Ensure baseline plans exist
INSERT INTO "SubscriptionPlan" ("code", "name", "description", "isActive", "entitlements", "priceMonthly", "createdAt", "updatedAt")
SELECT v.code, v.code, NULL, TRUE, NULL, 0, NOW(), NOW()
FROM (VALUES ('TRIAL'), ('BASIC'), ('PREMIUM'), ('ENTERPRISE')) AS v(code)
ON CONFLICT ("code") DO NOTHING;

-- 2) Ensure baseline duration prices exist (no discount by default)
INSERT INTO "SubscriptionPlanPrice" ("planId", "months", "price", "isActive")
SELECT p.id, m.months, 0, TRUE
FROM "SubscriptionPlan" p
CROSS JOIN (VALUES (1), (3), (6), (12)) AS m(months)
ON CONFLICT ("planId", "months") DO NOTHING;

-- 3) Backfill Subscription.planId from legacy Subscription.planType
UPDATE "Subscription" s
SET "planId" = p.id
FROM "SubscriptionPlan" p
WHERE s."planId" IS NULL
  AND p."code" = s."planType"::text;

-- 4) Backfill SubscriptionPayment.planId from legacy SubscriptionPayment.planType
UPDATE "SubscriptionPayment" sp
SET "planId" = p.id
FROM "SubscriptionPlan" p
WHERE sp."planId" IS NULL
  AND p."code" = sp."planType"::text;
