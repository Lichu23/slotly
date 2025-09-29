-- Script para configurar la base de datos de disponibilidad
-- Ejecutar este script en tu base de datos Supabase

-- 1. Crear tabla de slots de disponibilidad
CREATE TABLE IF NOT EXISTS availability_slots (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  time_slot TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  max_bookings INTEGER DEFAULT 1,
  current_bookings INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Crear tabla de bookings (opcional, para tracking)
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  slot_id INTEGER REFERENCES availability_slots(id),
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),
  visa_type VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, cancelled
  payment_id VARCHAR(255), -- ID de la sesión de Stripe
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_availability_slots_date_time ON availability_slots(date, time_slot);
CREATE INDEX IF NOT EXISTS idx_availability_slots_available ON availability_slots(is_available);
CREATE INDEX IF NOT EXISTS idx_bookings_slot_id ON bookings(slot_id);

-- 4. Insertar datos de prueba para los próximos 30 días
-- Solo insertar si la tabla está vacía
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM availability_slots LIMIT 1) THEN
    -- Insertar horarios para los próximos 30 días
    INSERT INTO availability_slots (date, time_slot, is_available, max_bookings)
    SELECT 
      CURRENT_DATE + INTERVAL '1 day' * generate_series(0, 29),
      time_slot,
      true,
      1
    FROM (
      VALUES 
        ('09:00:00'::time),
        ('10:30:00'::time),
        ('12:00:00'::time),
        ('15:00:00'::time),
        ('17:30:00'::time)
    ) AS slots(time_slot);
    
    RAISE NOTICE 'Datos de prueba insertados para 30 días';
  ELSE
    RAISE NOTICE 'La tabla ya contiene datos, saltando inserción';
  END IF;
END $$;

-- 5. Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_availability_slots_updated_at ON availability_slots;
CREATE TRIGGER update_availability_slots_updated_at
    BEFORE UPDATE ON availability_slots
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Actualizar tabla bookings existente (si ya existe)
DO $$
BEGIN
  -- Agregar columna visa_type si no existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'bookings' AND column_name = 'visa_type') THEN
    ALTER TABLE bookings ADD COLUMN visa_type VARCHAR(50);
  END IF;
  
  -- Agregar columna payment_id si no existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'bookings' AND column_name = 'payment_id') THEN
    ALTER TABLE bookings ADD COLUMN payment_id VARCHAR(255);
  END IF;
  
  -- Agregar columna updated_at si no existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'bookings' AND column_name = 'updated_at') THEN
    ALTER TABLE bookings ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
  END IF;
  
  RAISE NOTICE 'Tabla bookings actualizada con nuevas columnas';
END $$;

-- 7. Verificar datos insertados
SELECT 
  date,
  COUNT(*) as total_slots,
  COUNT(CASE WHEN is_available = true THEN 1 END) as available_slots
FROM availability_slots 
WHERE date >= CURRENT_DATE 
  AND date <= CURRENT_DATE + INTERVAL '7 days'
GROUP BY date 
ORDER BY date;
