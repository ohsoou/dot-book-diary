ALTER TABLE books
  ADD COLUMN status text NOT NULL DEFAULT 'reading' CHECK (status IN ('want', 'reading', 'finished')),
  ADD COLUMN rating smallint CHECK (rating BETWEEN 1 AND 5),
  ADD COLUMN finished_at date,
  ADD COLUMN memo text CHECK (memo IS NULL OR char_length(memo) <= 500);

CREATE INDEX IF NOT EXISTS books_user_id_status_idx ON books (user_id, status);
