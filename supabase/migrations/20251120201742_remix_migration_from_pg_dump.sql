--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'user'
);


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  -- Assign 'user' role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: ai_knowledge; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_knowledge (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    category text NOT NULL,
    key text NOT NULL,
    value jsonb NOT NULL,
    confidence numeric(3,2) DEFAULT 0.5,
    source text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: api_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_connections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    connection_name text NOT NULL,
    api_type text NOT NULL,
    endpoint_url text,
    is_active boolean DEFAULT true,
    last_sync timestamp with time zone,
    config jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: autonomous_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.autonomous_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    task_id uuid,
    action_type text NOT NULL,
    action_data jsonb,
    success boolean NOT NULL,
    result jsonb,
    executed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: autonomous_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.autonomous_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    task_type text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    config jsonb,
    schedule_cron text,
    trigger_conditions jsonb,
    last_run_at timestamp with time zone,
    next_run_at timestamp with time zone,
    result jsonb,
    error_log text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    conversation_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb,
    CONSTRAINT chat_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])))
);


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text DEFAULT 'Neue Konversation'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: governance_proposals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.governance_proposals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    votes_yes integer DEFAULT 0,
    votes_no integer DEFAULT 0,
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT governance_proposals_status_check CHECK ((status = ANY (ARRAY['active'::text, 'passed'::text, 'rejected'::text])))
);


--
-- Name: iot_nodes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.iot_nodes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    location text NOT NULL,
    status text DEFAULT 'online'::text,
    cpu_usage integer DEFAULT 0,
    memory_usage integer DEFAULT 0,
    temperature integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT iot_nodes_status_check CHECK ((status = ANY (ARRAY['online'::text, 'offline'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text,
    full_name text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: system_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    severity text NOT NULL,
    message text NOT NULL,
    layer_id text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT system_events_severity_check CHECK ((severity = ANY (ARRAY['info'::text, 'warning'::text, 'error'::text, 'critical'::text])))
);


--
-- Name: system_layers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_layers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    layer_id text NOT NULL,
    name text NOT NULL,
    icon text NOT NULL,
    status text NOT NULL,
    metric text NOT NULL,
    description text NOT NULL,
    details jsonb,
    order_index integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT system_layers_status_check CHECK ((status = ANY (ARRAY['operational'::text, 'warning'::text, 'critical'::text])))
);


--
-- Name: system_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metric_type text NOT NULL,
    metric_value text NOT NULL,
    numeric_value numeric,
    unit text,
    "timestamp" timestamp with time zone DEFAULT now(),
    metadata jsonb
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: ai_knowledge ai_knowledge_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_knowledge
    ADD CONSTRAINT ai_knowledge_pkey PRIMARY KEY (id);


--
-- Name: api_connections api_connections_connection_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_connections
    ADD CONSTRAINT api_connections_connection_name_key UNIQUE (connection_name);


--
-- Name: api_connections api_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_connections
    ADD CONSTRAINT api_connections_pkey PRIMARY KEY (id);


--
-- Name: autonomous_actions autonomous_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.autonomous_actions
    ADD CONSTRAINT autonomous_actions_pkey PRIMARY KEY (id);


--
-- Name: autonomous_tasks autonomous_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.autonomous_tasks
    ADD CONSTRAINT autonomous_tasks_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: governance_proposals governance_proposals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.governance_proposals
    ADD CONSTRAINT governance_proposals_pkey PRIMARY KEY (id);


--
-- Name: iot_nodes iot_nodes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.iot_nodes
    ADD CONSTRAINT iot_nodes_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: system_events system_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_events
    ADD CONSTRAINT system_events_pkey PRIMARY KEY (id);


--
-- Name: system_layers system_layers_layer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_layers
    ADD CONSTRAINT system_layers_layer_id_key UNIQUE (layer_id);


--
-- Name: system_layers system_layers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_layers
    ADD CONSTRAINT system_layers_pkey PRIMARY KEY (id);


--
-- Name: system_metrics system_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_metrics
    ADD CONSTRAINT system_metrics_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_chat_messages_user_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_user_conversation ON public.chat_messages USING btree (user_id, conversation_id, created_at);


--
-- Name: ai_knowledge update_ai_knowledge_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ai_knowledge_updated_at BEFORE UPDATE ON public.ai_knowledge FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: autonomous_tasks update_autonomous_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_autonomous_tasks_updated_at BEFORE UPDATE ON public.autonomous_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: conversations update_conversations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: system_layers update_system_layers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_system_layers_updated_at BEFORE UPDATE ON public.system_layers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: autonomous_actions autonomous_actions_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.autonomous_actions
    ADD CONSTRAINT autonomous_actions_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.autonomous_tasks(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: system_events system_events_layer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_events
    ADD CONSTRAINT system_events_layer_id_fkey FOREIGN KEY (layer_id) REFERENCES public.system_layers(layer_id);


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: api_connections Admins can delete api_connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete api_connections" ON public.api_connections FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: system_events Admins can delete system_events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete system_events" ON public.system_events FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: system_layers Admins can delete system_layers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete system_layers" ON public.system_layers FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: system_metrics Admins can delete system_metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete system_metrics" ON public.system_metrics FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: api_connections Admins can insert api_connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert api_connections" ON public.api_connections FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: system_events Admins can insert system_events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert system_events" ON public.system_events FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: system_layers Admins can insert system_layers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert system_layers" ON public.system_layers FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: system_metrics Admins can insert system_metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert system_metrics" ON public.system_metrics FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: governance_proposals Admins can manage governance proposals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage governance proposals" ON public.governance_proposals USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: iot_nodes Admins can manage iot nodes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage iot nodes" ON public.iot_nodes USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: api_connections Admins can update api_connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update api_connections" ON public.api_connections FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: system_events Admins can update system_events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update system_events" ON public.system_events FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: system_layers Admins can update system_layers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update system_layers" ON public.system_layers FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: system_metrics Admins can update system_metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update system_metrics" ON public.system_metrics FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: governance_proposals Public can view governance proposals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view governance proposals" ON public.governance_proposals FOR SELECT USING (true);


--
-- Name: iot_nodes Public can view iot nodes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view iot nodes" ON public.iot_nodes FOR SELECT USING (true);


--
-- Name: api_connections Public read access for api_connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read access for api_connections" ON public.api_connections FOR SELECT USING (true);


--
-- Name: system_events Public read access for system_events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read access for system_events" ON public.system_events FOR SELECT USING (true);


--
-- Name: system_layers Public read access for system_layers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read access for system_layers" ON public.system_layers FOR SELECT USING (true);


--
-- Name: system_metrics Public read access for system_metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read access for system_metrics" ON public.system_metrics FOR SELECT USING (true);


--
-- Name: ai_knowledge System can create AI knowledge; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can create AI knowledge" ON public.ai_knowledge FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: autonomous_actions System can log autonomous actions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can log autonomous actions" ON public.autonomous_actions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: ai_knowledge System can update AI knowledge; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can update AI knowledge" ON public.ai_knowledge FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: autonomous_tasks Users can create their own autonomous tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own autonomous tasks" ON public.autonomous_tasks FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: conversations Users can delete own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own conversations" ON public.conversations FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: chat_messages Users can delete own messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own messages" ON public.chat_messages FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: autonomous_tasks Users can delete their own autonomous tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own autonomous tasks" ON public.autonomous_tasks FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: conversations Users can insert own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own conversations" ON public.conversations FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: chat_messages Users can insert own messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own messages" ON public.chat_messages FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: conversations Users can update own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own conversations" ON public.conversations FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: autonomous_tasks Users can update their own autonomous tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own autonomous tasks" ON public.autonomous_tasks FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: conversations Users can view own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own conversations" ON public.conversations FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: chat_messages Users can view own messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own messages" ON public.chat_messages FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: user_roles Users can view own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: ai_knowledge Users can view their own AI knowledge; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own AI knowledge" ON public.ai_knowledge FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: autonomous_actions Users can view their own autonomous actions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own autonomous actions" ON public.autonomous_actions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: autonomous_tasks Users can view their own autonomous tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own autonomous tasks" ON public.autonomous_tasks FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: ai_knowledge; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_knowledge ENABLE ROW LEVEL SECURITY;

--
-- Name: api_connections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.api_connections ENABLE ROW LEVEL SECURITY;

--
-- Name: autonomous_actions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.autonomous_actions ENABLE ROW LEVEL SECURITY;

--
-- Name: autonomous_tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.autonomous_tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: conversations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: governance_proposals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.governance_proposals ENABLE ROW LEVEL SECURITY;

--
-- Name: iot_nodes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.iot_nodes ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: system_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;

--
-- Name: system_layers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_layers ENABLE ROW LEVEL SECURITY;

--
-- Name: system_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


