-- Script para arreglar la tabla bookings existente
-- Ejecutar este script en tu base de datos Supabase

-- 1. Agregar columna payment_id si no existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'bookings' AND column_name = 'payment_id') THEN
    ALTER TABLE bookings ADD COLUMN payment_id VARCHAR(255);
    RAISE NOTICE 'Columna payment_id agregada a la tabla bookings';
  ELSE
    RAISE NOTICE 'La columna payment_id ya existe en la tabla bookings';
  END IF;
END $$;

-- 2. Agregar columna updated_at si no existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'bookings' AND column_name = 'updated_at') THEN
    ALTER TABLE bookings ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    RAISE NOTICE 'Columna updated_at agregada a la tabla bookings';
  ELSE
    RAISE NOTICE 'La columna updated_at ya existe en la tabla bookings';
  END IF;
END $$;

-- 3. Verificar la estructura de la tabla
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'bookings' 
ORDER BY ordinal_position;
