/**
 * Demo seeder — AdmitGuard
 * Inserts staff users + 40 audit_records.
 * Idempotent: safe to re-run.
 * Run: node src/db/seedDemo.js
 */

import bcrypt      from 'bcrypt';
import { getClient } from './pool.js';

const NAMES = [
  'Arjun Sharma','Priya Patel','Rohan Gupta','Sneha Reddy','Vikram Singh',
  'Ananya Joshi','Karan Mehta','Divya Nair','Rahul Verma','Pooja Iyer',
  'Aditya Kumar','Neha Yadav','Suresh Pandey','Kavya Menon','Deepak Tiwari',
  'Riya Chaudhary','Manish Dubey','Shreya Agarwal','Nikhil Bose','Tanvi Shah',
  'Ashish Sinha','Pallavi Mishra','Saurabh Saxena','Ishaan Bhatt','Nandini Rao',
  'Varun Jain','Kritika Pillai','Harish Desai','Swati Patil','Mohit Kapoor',
  'Arun Tiwari','Sonia Gupta','Rajesh Kumar','Meena Shah','Dinesh Verma',
  'Lata Iyer','Gopal Mishra','Sunita Reddy','Abhishek Joshi','Preeti Singh',
];

const QUALS    = ['b.tech','b.e.','b.sc','bca','m.tech','m.sc','mca','mba'];
const DOMAINS  = ['gmail.com','yahoo.in','outlook.com','hotmail.com'];

const rnd  = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = (arr)  => arr[rnd(0, arr.length - 1)];

const toEmail = (name) =>
  `${name.toLowerCase().replace(/\s+/g, '.')}@${pick(DOMAINS)}`;

const phone = () =>
  String(pick([6,7,8,9])) + String(rnd(100_000_000, 999_999_999));

const aadhaar = () =>
  String(rnd(2,9)) + String(rnd(10_000_000_000, 99_999_999_999));

const dob = () => {
  const y = rnd(1988, 2002), m = rnd(1,12), d = rnd(1,28);
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
};

// Spread timestamps evenly over the last 30 days (oldest first)
const submittedAt = (i, total) => {
  const msBack = (1 - i / total) * 30 * 86_400_000;
  return new Date(Date.now() - msBack - rnd(0, 3_600_000)).toISOString();
};

function tierData(tier) {
  if (tier === 0) {
    const pct = rnd(75, 95);
    return {
      score: pct,
      percentageOrCgpa:  `${(pct / 10).toFixed(1)} CGPA`,
      interviewStatus:   'cleared',
      exceptionCount:    0,
      exceptionFields:   [],
      rationaleMap:      {},
      flagged:           false,
      strictValid:       true,
      softValid:         true,
    };
  }
  if (tier === 1) {
    const pct   = rnd(60, 74);
    const count = rnd(1, 2);
    const fields = ['score','percentageOrCgpa'].slice(0, count);
    return {
      score:             pct,
      percentageOrCgpa:  `${(pct / 10).toFixed(1)} CGPA`,
      interviewStatus:   pick(['cleared','waitlisted']),
      exceptionCount:    count,
      exceptionFields:   fields,
      rationaleMap:      Object.fromEntries(fields.map(f => [f, `${f} below soft threshold`])),
      flagged:           false,
      strictValid:       true,
      softValid:         true,
    };
  }
  // tier 2 — flagged
  const pct   = rnd(30, 55);
  const count = rnd(3, 5);
  const all   = ['score','percentageOrCgpa','graduationYear','aadhaar','interviewStatus'];
  const fields = all.slice(0, count);
  return {
    score:             pct,
    percentageOrCgpa:  `${pct}%`,
    interviewStatus:   'rejected',
    exceptionCount:    count,
    exceptionFields:   fields,
    rationaleMap:      Object.fromEntries(fields.map(f => [f, `${f} critically out of range`])),
    flagged:           true,
    strictValid:       true,
    softValid:         false,
  };
}

// Distribution: 12 clean (0..11), 16 soft (12..27), 12 flagged (28..39)
function tierForIndex(i) {
  if (i < 12) return 0;
  if (i < 28) return 1;
  return 2;
}

async function seed() {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Users
    const hash  = await bcrypt.hash('Admin@123', 10);
    const USERS = [
      { email: 'admin@aloo.edu',     role: 'admin' },
      { email: 'counselor@aloo.edu', role: 'user'  },
    ];

    const userIds = {};
    for (const u of USERS) {
      const { rows } = await client.query(
        `INSERT INTO users (email, password_hash, role)
         VALUES ($1, $2, $3)
         ON CONFLICT (email) DO UPDATE
           SET password_hash = EXCLUDED.password_hash,
               role          = EXCLUDED.role
         RETURNING id, email`,
        [u.email, hash, u.role]
      );
      userIds[u.email] = rows[0].id;
    }

    const submitters = [userIds['admin@aloo.edu'], userIds['counselor@aloo.edu']];

    // Audit records
    for (let i = 0; i < 40; i++) {
      const tier = tierForIndex(i);
      const td   = tierData(tier);
      const name = NAMES[i];

      const candidateData = {
        fullName:         name,
        email:            toEmail(name),
        phone:            phone(),
        dateOfBirth:      dob(),
        aadhaar:          aadhaar(),
        qualification:    pick(QUALS),
        graduationYear:   rnd(2015, 2025),
        percentageOrCgpa: td.percentageOrCgpa,
        score:            td.score,
        interviewStatus:  td.interviewStatus,
        offerLetterSent:  tier === 0,
      };

      const dataJson = {
        ...candidateData,
        exceptionFields: td.exceptionFields,
        rationaleMap:    td.rationaleMap,
      };

      await client.query(
        `INSERT INTO audit_records
           (candidate_name, email, phone, data,
            exception_count, flagged, strict_valid, soft_valid,
            submitted_by, submitted_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::timestamptz)`,
        [
          name,
          candidateData.email,
          candidateData.phone,
          JSON.stringify(dataJson),
          td.exceptionCount,
          td.flagged,
          td.strictValid,
          td.softValid,
          submitters[i % 2],
          submittedAt(i, 40),
        ]
      );
    }

    await client.query('COMMIT');
    console.log('✓ Seeded: 2 users, 40 audit records (12 clean / 16 soft / 12 flagged)');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('✗ Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

seed();
