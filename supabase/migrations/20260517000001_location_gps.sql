-- Add GPS coordinates to locations table
ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

-- Add location enforcement setting
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS location_enforcement_enabled BOOLEAN DEFAULT false;

UPDATE settings SET location_enforcement_enabled = false WHERE id = 1;

-- Test QR location with GPS coordinates (Bangkok area — update to actual site coords)
INSERT INTO locations (code, name, address, contact, phone, lat, lng)
VALUES ('QR013', 'จุดทดสอบ GPS (Test)', 'ทดสอบระบบตรวจสอบพิกัด GPS', 'Admin', '000-000-0000', 13.7563, 100.5018)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng;
