-- Patients table
CREATE TABLE IF NOT EXISTS patients (
  patient_id  SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  phone       VARCHAR(20)  NOT NULL,
  email       VARCHAR(255) NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
  appointment_id  SERIAL PRIMARY KEY,
  patient_id      INTEGER NOT NULL REFERENCES patients(patient_id),
  scheduled_at    TIMESTAMP WITH TIME ZONE NOT NULL,
  status          VARCHAR(50) NOT NULL DEFAULT 'scheduled',
  notes           TEXT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for search performance
CREATE INDEX IF NOT EXISTS idx_patients_name  ON patients(name);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at ON appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);