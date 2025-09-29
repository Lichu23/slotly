-- Script para agregar campo price a la tabla bookings
-- Ejecutar este script en tu base de datos Supabase

-- 1. Agregar campo price a la tabla bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS price DECIMAL(10,2);

-- 2. Agregar comentario para documentar el campo
COMMENT ON COLUMN bookings.price IS 'Precio del booking en euros (ej: 25.00 para 30min, 50.00 para 60min)';

-- 3. (Opcional) Actualizar bookings existentes con precios basados en duración
-- Esto es solo si quieres actualizar datos históricos
-- UPDATE bookings 
-- SET price = CASE 
--   WHEN EXISTS (
--     SELECT 1 FROM availability_slots 
--     WHERE availability_slots.id = bookings.slot_id 
--     AND availability_slots.duration_minutes >= 60
--   ) THEN 50.00
--   ELSE 25.00
-- END
-- WHERE price IS NULL;

-- 4. Verificar que el campo se agregó correctamente
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'bookings' AND column_name = 'price';
