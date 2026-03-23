-- ============================================================
-- Migrasi: Integrasi Bayaraja Payment
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- 1. Tambah kolom untuk Bayaraja link di tabel orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS bayaraja_link_id text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_url text;

-- 2. Drop RPC yang tidak dipakai lagi
DROP FUNCTION IF EXISTS submit_payment_proof(text, text);
DROP FUNCTION IF EXISTS check_order_status(text);

-- 3. Buat ulang check_order_status dengan return type baru (include payment_url)
CREATE FUNCTION check_order_status(p_order_id text)
RETURNS TABLE (
  id text,
  size text,
  qty integer,
  total integer,
  status text,
  notes text,
  payment_url text,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.size,
    o.qty,
    o.total,
    o.status,
    o.notes,
    o.payment_url,
    o.created_at
  FROM orders o
  WHERE o.id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
