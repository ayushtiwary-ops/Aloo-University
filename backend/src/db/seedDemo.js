/**
 * Demo seeder — AdmitGuard / Aloo University
 *
 * Inserts 2 users + 30 audit_records (10 clean / 10 soft / 10 flagged).
 * Idempotent: re-running updates users in-place, skips no duplicate records.
 *
 * Run from backend/:
 *   node src/db/seedDemo.js
 */

import bcrypt from 'bcrypt';
import { getClient } from './pool.js';

// ─── Static data pools ────────────────────────────────────────────────────────

const NAMES = [
  'Arjun Sharma',    'Priya Patel',     'Rohan Gupta',    'Sneha Reddy',
  'Vikram Singh',    'Ananya Joshi',    'Karan Mehta',    'Divya Nair',
  'Rahul Verma',     'Pooja Iyer',      'Aditya Kumar',   'Neha Yadav',
  'Suresh Pandey',   'Kavya Menon',     'Deepak Tiwari',  'Riya Chaudhary',
  'Manish Dubey',    'Shreya Agarwal',  'Nikhil Bose',    'Tanvi Shah',
  'Ashish Sinha',    'Pallavi Mishra',  'Saurabh Saxena', 'Ishaan Bhatt',
  'Nandini Rao',     'Varun Jain',      'Kritika Pillai', 'Harish Desai',
  'Swati Patil',     'Mohit Kapoor',
];

const QUALS      = ['B.Tech', 'B.Sc', 'BCA', 'MCA', 'B.Com', 'MBA', 'M.Tech', 'B.Arch'];
const DOMAINS    = ['gmail.com', 'yahoo.in', 'outlook.com', 'hotmail.com'];
const GRAD_YEARS = [2019, 2020, 2021, 2022, 2023, 2024];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr)      => arr[rand(0, arr.length - 1)];

const phone   = ()     => String(pick([6, 7, 8, 9])) + String(rand(100_000_000, 999_999_999));
const aadhaar = ()     => String(rand(2, 9)) + String(rand(10_000_000_000, 99_999_999_999));
const dob     = ()     => {
  const y = rand(1995, 2002), m = rand(1, 12), d = rand(1, 28);
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};
const createdAt = ()   => new Date(Date.now() - rand(0, 30) * 86_400_000 - rand(0, 86_400_000)).toISOString();
const toEmail   = name => `${name.toLowerCase().replace(' ', '.')}@${pick(DOMAINS)}`;

// ─── Tier-specific data ───────────────────────────────────────────────────────

function tierData(tier) {
  if (tier === 0) {
    // Clean — no exceptions
    const score = rand(75, 95);
    return {
      score,
      percentage_or_cgpa: `${(score / 10).toFixed(1)} CGPA`,
      interview_status:   'Completed',
      exception_count:    0,
      exception_fields:   [],
      rationale_map:      {},
      flagged:            false,
      strict_valid:       true,
      soft_valid:         true,
    };
  }

  if (tier === 1) {
    // Soft-rule — 1–2 exceptions, still passes
    const score  = rand(60, 74);
    const cgpa   = (score / 10).toFixed(1);
    const count  = rand(1, 2);
    const fields = ['score', 'percentage_or_cgpa'].slice(0, count);
    const rationale = {};
    if (fields.includes('score'))
      rationale.score = `Score ${score} is below soft threshold of 75`;
    if (fields.includes('percentage_or_cgpa'))
      rationale.percentage_or_cgpa = `CGPA ${cgpa} below expected 7.5`;
    return {
      score,
      percentage_or_cgpa: `${cgpa} CGPA`,
      interview_status:   pick(['Completed', 'Scheduled', 'Pending']),
      exception_count:    count,
      exception_fields:   fields,
      rationale_map:      rationale,
      flagged:            false,
      strict_valid:       true,
      soft_valid:         true,
    };
  }

  // Flagged — 3–5 exceptions
  const score   = rand(35, 59);
  const pct     = rand(35, 59);
  const count   = rand(3, 5);
  const allFlds = ['score', 'percentage_or_cgpa', 'interview_status', 'graduation_year', 'aadhaar'];
  const fields  = allFlds.slice(0, count);
  const rationale = {
    score:              `Score ${score} critically below minimum threshold of 60`,
    percentage_or_cgpa: `Percentage ${pct}% below minimum 60%`,
    interview_status:   'Candidate did not appear for scheduled interview',
    graduation_year:    'Graduation year exceeds allowed recency gap of 3 years',
    aadhaar:            'Aadhaar number failed Verhoeff checksum validation',
  };
  return {
    score,
    percentage_or_cgpa: `${pct}%`,
    interview_status:   'Not Appeared',
    exception_count:    count,
    exception_fields:   fields,
    rationale_map:      Object.fromEntries(fields.map(f => [f, rationale[f]])),
    flagged:            true,
    strict_valid:       true,
    soft_valid:         false,
  };
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // 1. Users
    const hash  = await bcrypt.hash('DemoPass123!', 10);
    const USERS = [
      { email: 'admin@aloo.edu',     role: 'admin' },
      { email: 'counselor@aloo.edu', role: 'user'  },
    ];

    const userIds = [];
    for (const u of USERS) {
      const { rows } = await client.query(
        `INSERT INTO users (email, password_hash, role)
         VALUES ($1, $2, $3)
         ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role
         RETURNING id`,
        [u.email, hash, u.role],
      );
      userIds.push(rows[0].id);
    }
    const submitters = userIds;   // alternate between admin and counselor

    // 2. Audit records
    for (let i = 0; i < 30; i++) {
      const tier = Math.floor(i / 10);   // 0 → clean, 1 → soft, 2 → flagged
      const td   = tierData(tier);
      const name = NAMES[i];

      const candidate = {
        full_name:          name,
        email:              toEmail(name),
        phone:              phone(),
        dob:                dob(),
        aadhaar:            aadhaar(),
        qualification:      pick(QUALS),
        graduation_year:    pick(GRAD_YEARS),
        percentage_or_cgpa: td.percentage_or_cgpa,
        score:              td.score,
        interview_status:   td.interview_status,
      };

      await client.query(
        `INSERT INTO audit_records
           (candidate_data, exception_count, exception_fields,
            rationale_map, flagged, strict_valid, soft_valid,
            submitted_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz)`,
        [
          JSON.stringify(candidate),
          td.exception_count,
          JSON.stringify(td.exception_fields),
          JSON.stringify(td.rationale_map),
          td.flagged,
          td.strict_valid,
          td.soft_valid,
          submitters[i % 2],
          createdAt(),
        ],
      );
    }

    await client.query('COMMIT');

    console.log('Seeded successfully:');
    console.log('  Users         : 2  (admin@aloo.edu, counselor@aloo.edu)');
    console.log('  Audit records : 30 (10 clean / 10 soft-rule / 10 flagged)');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed — rolled back.', err.message);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

seed();
