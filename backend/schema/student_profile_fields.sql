-- Student profile enrichment: year, gender, image_cid
-- year and gender are stored in PostgreSQL (off-chain)
-- image_cid holds the IPFS CID for the student's photo (off-chain)

ALTER TABLE students ADD COLUMN IF NOT EXISTS year      TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS gender    TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS image_cid TEXT;
