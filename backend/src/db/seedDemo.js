/**
 * Demo seeder — AdmitGuard / Aloo University
 *
 * Inserts 2 users + 1 candidate + 25 audit_records
 *   (8 clean / 10 soft-rule / 7 flagged).
 * Idempotent: ON CONFLICT safety everywhere.
 * Password for ALL accounts: Admin@123 (bcrypt, 10 rounds).
 *
 * Run from backend/:
 *   node src/db/seedDemo.js
 */

import bcrypt    from 'bcrypt';
import { getClient } from './pool.js';

// ─── Static data pools ────────────────────────────────────────────────────────

const NAMES = [
  'Arjun Sharma',    'Priya Patel',     'Rohan Gupta',    'Sneha Reddy',
  'Vikram Singh',    'Ananya Joshi',    'Karan Mehta',    'Divya Nair',
  'Rahul Verma',     'Pooja Iyer',      'Aditya Kumar',   'Neha Yadav',
  'Suresh Pandey',   'Kavya Menon',     'Deepak Tiwari',  'Riya Chaudhary',
  'Manish Dubey',    'Shreya Agarwal',  'Nikhil Bose',    'Tanvi Shah',
  'Ashish Sinha',    'Pallavi Mishra',  'Saurabh Saxena', 'Ishaan Bhatt',
  'Nandini Rao',
];

// Valid qualification values matching rules.json
const QUALS      = ['b.tech', 'b.e.', 'b.sc', 'bca', 'm.tech', 'm.sc', 'mca', 'mba'];
const DOMAINS    = ['gmail.com', 'yahoo.in', 'outlook.com', 'hotmail.com'];
const GRAD_YEARS = [2019, 2020, 2021, 2022, 2023, 2024];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const rand     = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick     = (arr)      => arr[rand(0, arr.length - 1)];

const phone    = ()     => String(pick([6, 7, 8, 9])) + String(rand(100_000_000, 999_999_999));
const aadhaar  = ()     => String(rand(2, 9)) + String(rand(10_000_000_000, 99_999_999_999));
const dob      = ()     => {
  const y = rand(1995, 2002), m = rand(1, 12), d = rand(1, 28);
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

/** Returns a random ISO timestamp within the last 30 days */
const createdAt = (index = 0) => {
  // Spread records across the last 30 days, older records first
  const daysAgo = 30 - Math.floor((index / 25) * 30);
  const jitter  = rand(0, 86_400_000);
  return new Date(Date.now() - daysAgo * 86_400_000 - jitter).toISOString();
};

const toEmail = (name) =>
  `${name.toLowerCase().replace(/\s+/g, '.')}@${pick(DOMAINS)}`;

// ─── Tier-specific data ───────────────────────────────────────────────────────

function tierData(tier, name) {
  const email = toEmail(name);

  if (tier === 0) {
    // Clean — no exceptions
    const score = rand(75, 95);
    const cgpa  = (score / 10).toFixed(1);
    return {
      candidateData: {
        fullName:          name,
        email,
        phone:             phone(),
        dateOfBirth:       dob(),
        aadhaar:           aadhaar(),
        qualification:     pick(QUALS),
        graduationYear:    pick(GRAD_YEARS),
        percentageOrCgpa:  `${cgpa} CGPA`,
        score,
        interviewStatus:   'cleared',
        offerLetterSent:   true,
      },
      exceptionCount:  0,
      exceptionFields: [],
      rationaleMap:    {},
      flagged:         false,
      strictValid:     true,
      softValid:       true,
    };
  }

  if (tier === 1) {
    // Soft-rule — 1–2 exceptions, still passes
    const score = rand(60, 74);
    const cgpa  = (score / 10).toFixed(1);
    const count = rand(1, 2);
    const fields = ['score', 'percentageOrCgpa'].slice(0, count);
    const rationale = {};
    if (fields.includes('score'))
      rationale.score = `Score ${score} is below soft threshold of 75`;
    if (fields.includes('percentageOrCgpa'))
      rationale.percentageOrCgpa = `CGPA ${cgpa} below expected 7.5`;
    return {
      candidateData: {
        fullName:          name,
        email,
        phone:             phone(),
        dateOfBirth:       dob(),
        aadhaar:           aadhaar(),
        qualification:     pick(QUALS),
        graduationYear:    pick(GRAD_YEARS),
        percentageOrCgpa:  `${cgpa} CGPA`,
        score,
        interviewStatus:   pick(['cleared', 'scheduled', 'pending']),
        offerLetterSent:   false,
      },
      exceptionCount:  count,
      exceptionFields: fields,
      rationaleMap:    rationale,
      flagged:         false,
      strictValid:     true,
      softValid:       true,
    };
  }

  // Flagged — 3–5 exceptions
  const score   = rand(35, 59);
  const pct     = rand(35, 59);
  const count   = rand(3, 5);
  const allFlds = ['score', 'percentageOrCgpa', 'interviewStatus', 'graduationYear', 'aadhaar'];
  const fields  = allFlds.slice(0, count);
  const rationaleLookup = {
    score:             `Score ${score} critically below minimum threshold of 60`,
    percentageOrCgpa:  `Percentage ${pct}% below minimum 60%`,
    interviewStatus:   'Candidate did not appear for scheduled interview',
    graduationYear:    'Graduation year exceeds allowed recency gap of 3 years',
    aadhaar:           'Aadhaar number failed Verhoeff checksum validation',
  };
  return {
    candidateData: {
      fullName:          name,
      email,
      phone:             phone(),
      dateOfBirth:       dob(),
      aadhaar:           aadhaar(),
      qualification:     pick(QUALS),
      graduationYear:    pick([2015, 2016, 2017, 2018]),   // stale year for realism
      percentageOrCgpa:  `${pct}%`,
      score,
      interviewStatus:   'not_appeared',
      offerLetterSent:   false,
    },
    exceptionCount:  count,
    exceptionFields: fields,
    rationaleMap:    Object.fromEntries(fields.map(f => [f, rationaleLookup[f]])),
    flagged:         true,
    strictValid:     true,
    softValid:       false,
  };
}

// ─── Tier plan: 8 clean, 10 soft, 7 flagged = 25 total ───────────────────────
//   indices 0-7   → clean (tier 0)
//   indices 8-17  → soft  (tier 1)
//   indices 18-24 → flagged (tier 2)

function tierForIndex(i) {
  if (i < 8)  return 0;
  if (i < 18) return 1;
  return 2;
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // ── 1. Users ────────────────────────────────────────────────────────────
    const hash  = await bcrypt.hash('Admin@123', 10);
    const USERS = [
      { email: 'admin@aloo.edu',     role: 'admin' },
      { email: 'counselor@aloo.edu', role: 'user'  },
    ];

    const userIds = [];
    for (const u of USERS) {
      const { rows } = await client.query(
        `INSERT INTO users (email, password_hash, role)
         VALUES ($1, $2, $3)
         ON CONFLICT (email) DO UPDATE
           SET password_hash = EXCLUDED.password_hash,
               role          = EXCLUDED.role
         RETURNING id`,
        [u.email, hash, u.role],
      );
      userIds.push(rows[0].id);
    }
    const [adminId, counselorId] = userIds;

    // ── 2. Demo candidate ───────────────────────────────────────────────────
    const candidateHash = await bcrypt.hash('Admin@123', 10);
    const { rows: candidateRows } = await client.query(
      `INSERT INTO candidates (full_name, email, phone, password_hash)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE
         SET full_name     = EXCLUDED.full_name,
             phone         = EXCLUDED.phone,
             password_hash = EXCLUDED.password_hash
       RETURNING id`,
      ['Demo Candidate', 'candidate@aloo.edu', '9000000001', candidateHash],
    );
    const demoCandidateId = candidateRows[0].id;

    // ── 3. Audit records (25 total) ─────────────────────────────────────────
    for (let i = 0; i < 25; i++) {
      const tier        = tierForIndex(i);
      const name        = NAMES[i];
      const td          = tierData(tier, name);
      const submittedBy = i % 2 === 0 ? adminId : counselorId;

      // Records 20-24 (last 5) are linked to the demo candidate
      const candidateId = i >= 20 ? demoCandidateId : null;

      await client.query(
        `INSERT INTO audit_records
           (candidate_data, exception_count, exception_fields,
            rationale_map, flagged, strict_valid, soft_valid,
            submitted_by, candidate_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::timestamptz)`,
        [
          JSON.stringify(td.candidateData),
          td.exceptionCount,
          JSON.stringify(td.exceptionFields),
          JSON.stringify(td.rationaleMap),
          td.flagged,
          td.strictValid,
          td.softValid,
          submittedBy,
          candidateId,
          createdAt(i),
        ],
      );
    }

    await client.query('COMMIT');

    console.log('Seeded: 2 users, 1 candidate, 25 audit records (8 clean / 10 soft / 7 flagged)');

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
