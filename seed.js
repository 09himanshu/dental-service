import { config } from 'dotenv'
import { Pool } from 'pg';

config();

const poolA = new Pool({ connectionString: process.env.PRACTICE_A_DB });
const poolB = new Pool({ connectionString: process.env.PRACTICE_B_DB });

const randomPhone = () => `9${Math.floor(Math.random() * 900000000) + 100000000}`;

const randomDate = () => {
  const start = new Date(2026, 0, 1);
  const end = new Date(2026, 11, 31);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const statuses = ['scheduled', 'completed', 'cancelled', 'no-show'];

const firstNames = [
  'Rahul', 'Priya', 'Amit', 'Sneha', 'Vikram', 'Pooja', 'Arjun', 'Neha',
  'Rohit', 'Kavya', 'Suresh', 'Anita', 'Deepak', 'Meena', 'Rajesh', 'Sunita',
  'Anil', 'Geeta', 'Manoj', 'Rekha', 'Sanjay', 'Usha', 'Vijay', 'Lata',
  'Prakash', 'Nisha', 'Ramesh', 'Seema', 'Ashok', 'Ritu'
];

const lastNames = [
  'Sharma', 'Verma', 'Singh', 'Gupta', 'Kumar', 'Patel', 'Joshi', 'Mehta',
  'Yadav', 'Mishra', 'Tiwari', 'Pandey', 'Chauhan', 'Shah', 'Nair'
];

const randomName = () => {
  const f = firstNames[Math.floor(Math.random() * firstNames.length)];
  const l = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${f} ${l}`;
};

const patientsA = Array.from({ length: 50 }, (_, i) => {
  const name = randomName();
  return {
    name,
    phone: randomPhone(),
    email: `${name.toLowerCase().replace(' ', '.')}${i + 1}@gmail.com`,
  };
});

const patientsB = Array.from({ length: 50 }, (_, i) => {
  const name = randomName();
  return {
    name,
    phone: randomPhone(),
    email: `${name.toLowerCase().replace(' ', '.')}${i + 1}@gmail.com`,
  };
});

const seed = async (pool, patients, practiceLabel) => {
  console.log(`Seeding ${practiceLabel}...`);

  // Insert patients
  const patientIds = [];
  for (const p of patients) {
    const result = await pool.query(
      `INSERT INTO patients (name, phone, email) VALUES ($1, $2, $3) RETURNING patient_id`,
      [p.name, p.phone, p.email]
    );
    patientIds.push(result.rows[0].patient_id);
  }
  console.log(`${practiceLabel} — 50 patients inserted`);

  // Insert 200 appointments
  for (let i = 0; i < 200; i++) {
    const patientId = patientIds[Math.floor(Math.random() * patientIds.length)];
    await pool.query(
      `INSERT INTO appointments (patient_id, scheduled_at, status, notes)
       VALUES ($1, $2, $3, $4)`,
      [
        patientId,
        randomDate(),
        statuses[Math.floor(Math.random() * statuses.length)],
        `Note for ${practiceLabel} appointment ${i + 1}`,
      ]
    );
  }
  console.log(`${practiceLabel} — 200 appointments inserted`);
};

const run = async () => {
  try {
    await seed(poolA, patientsA, 'Practice A');
    await seed(poolB, patientsB, 'Practice B');
    console.log('Seeding complete!');
  } catch (err) {
    console.error('Seed failed:', err.message);
  } finally {
    await poolA.end();
    await poolB.end();
  }
};

run()