require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const insertQuery = `
      WITH targets AS (
        SELECT
          b.id AS business_id,
          s.id AS subscription_id,
          COALESCE(
            (SELECT bm."userId" FROM "BusinessMember" bm WHERE bm."businessId" = b.id AND bm."isActive" = true LIMIT 1),
            (SELECT u.id FROM "User" u ORDER BY u.id LIMIT 1)
          ) AS created_by_id,
          COALESCE(
            (SELECT u.id FROM "User" u WHERE u."isSuperAdmin" = true ORDER BY u.id LIMIT 1),
            (SELECT bm."userId" FROM "BusinessMember" bm WHERE bm."businessId" = b.id ORDER BY bm.id LIMIT 1),
            (SELECT u.id FROM "User" u ORDER BY u.id LIMIT 1)
          ) AS reviewer_id
        FROM "Business" b
        INNER JOIN "Subscription" s ON s."businessId" = b.id
        ORDER BY b.id
        LIMIT 3
      ),
      rows AS (
        SELECT t.business_id, t.subscription_id, t.created_by_id, t.reviewer_id,
               'UNDER_REVIEW'::"SubscriptionPaymentStatus" AS status,
               'BASIC'::"PlanType" AS plan_type,
               1 AS months_purchased,
               19.99::numeric AS amount,
               'USD'::"Currency" AS currency,
               NULL::timestamp AS reviewed_at,
               NULL::int AS reviewed_by_id,
               'Pago en cola de revision'::text AS review_note,
               1 AS seq
        FROM targets t

        UNION ALL

        SELECT t.business_id, t.subscription_id, t.created_by_id, t.reviewer_id,
               'APPROVED'::"SubscriptionPaymentStatus" AS status,
               'PREMIUM'::"PlanType" AS plan_type,
               2 AS months_purchased,
               49.99::numeric AS amount,
               'USD'::"Currency" AS currency,
               NOW() - INTERVAL '1 day' AS reviewed_at,
               t.reviewer_id AS reviewed_by_id,
               'Pago validado por administracion'::text AS review_note,
               2 AS seq
        FROM targets t

        UNION ALL

        SELECT t.business_id, t.subscription_id, t.created_by_id, t.reviewer_id,
               'REJECTED'::"SubscriptionPaymentStatus" AS status,
               'BASIC'::"PlanType" AS plan_type,
               1 AS months_purchased,
               15.00::numeric AS amount,
               'USD'::"Currency" AS currency,
               NOW() - INTERVAL '2 hours' AS reviewed_at,
               t.reviewer_id AS reviewed_by_id,
               'Comprobante ilegible'::text AS review_note,
               3 AS seq
        FROM targets t
      )
      INSERT INTO "SubscriptionPayment" (
        "businessId",
        "subscriptionId",
        "createdById",
        "reviewedById",
        "reviewedAt",
        "reviewNote",
        "planType",
        "monthsPurchased",
        "amount",
        "currency",
        "reference",
        "proofUrl",
        "status"
      )
      SELECT
        r.business_id,
        r.subscription_id,
        r.created_by_id,
        r.reviewed_by_id,
        r.reviewed_at,
        r.review_note,
        r.plan_type,
        r.months_purchased,
        r.amount,
        r.currency,
        CONCAT('TEST-', r.business_id, '-', r.seq, '-', FLOOR(EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::bigint),
        'https://example.com/proof/test-payment.png',
        r.status
      FROM rows r
      WHERE r.created_by_id IS NOT NULL
      RETURNING id, "businessId", status, reference;
    `;

    const inserted = await client.query(insertQuery);

    const summary = await client.query(`
      SELECT status, COUNT(*)::int AS total
      FROM "SubscriptionPayment"
      GROUP BY status
      ORDER BY status;
    `);

    console.log('Inserted rows:', inserted.rowCount);
    console.log('Inserted sample:', inserted.rows.slice(0, 6));
    console.log('Totals by status:', summary.rows);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
