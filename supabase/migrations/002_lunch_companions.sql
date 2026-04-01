-- 점심 동행자 및 통계 기능 추가

-- lunch_picks에 companions 컬럼 추가
ALTER TABLE lunch_picks
  ADD COLUMN companions uuid[] NOT NULL DEFAULT '{}';

-- 인덱스
CREATE INDEX idx_lunch_picks_companions ON lunch_picks USING GIN (companions);
CREATE INDEX idx_lunch_picks_date ON lunch_picks (date DESC);
CREATE INDEX idx_lunch_picks_place_date ON lunch_picks (place_id, date DESC);

-- 하루에 한 명이 한 번만 픽할 수 있도록 unique constraint
ALTER TABLE lunch_picks
  ADD CONSTRAINT lunch_picks_date_user_unique UNIQUE (date, recommended_by);

-- UPDATE 권한 추가 (UPSERT 용)
CREATE POLICY "점심 기록 본인 수정" ON lunch_picks
  FOR UPDATE USING (auth.uid() = recommended_by);

-- 팀 TOP5 집계용 RPC 함수
CREATE OR REPLACE FUNCTION lunch_top5(start_date date)
RETURNS TABLE(place_id uuid, name text, cnt bigint)
LANGUAGE sql STABLE AS $$
  SELECT lp.place_id, lpl.name, COUNT(*) as cnt
  FROM lunch_picks lp
  JOIN lunch_places lpl ON lpl.id = lp.place_id
  WHERE lp.date >= start_date
  GROUP BY lp.place_id, lpl.name
  ORDER BY cnt DESC
  LIMIT 5;
$$;
