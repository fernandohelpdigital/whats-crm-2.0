
-- Flows (workflows)
CREATE TABLE public.flows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  -- triggers: array of { type: 'broadcast_reply'|'keyword', config: {...} }
  triggers JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- nodes: [{ id, type, position:{x,y}, data:{...} }]
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- edges: [{ id, source, target, sourceHandle? }]
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  start_node_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own flows" ON public.flows FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own flows" ON public.flows FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own flows" ON public.flows FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own flows" ON public.flows FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_flows_updated BEFORE UPDATE ON public.flows
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Flow runs (one per contact execution)
CREATE TABLE public.flow_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_id UUID NOT NULL,
  user_id UUID NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_name TEXT,
  current_node_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | waiting_input | scheduled | completed | failed | cancelled
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  scheduled_at TIMESTAMPTZ, -- next time to process (for delays)
  last_message_text TEXT,
  last_event_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.flow_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own flow_runs" ON public.flow_runs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own flow_runs" ON public.flow_runs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own flow_runs" ON public.flow_runs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own flow_runs" ON public.flow_runs FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_flow_runs_updated BEFORE UPDATE ON public.flow_runs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_flow_runs_scheduled ON public.flow_runs(status, scheduled_at);
CREATE INDEX idx_flow_runs_phone ON public.flow_runs(user_id, contact_phone, status);
