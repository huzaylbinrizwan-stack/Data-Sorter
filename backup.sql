--
-- PostgreSQL database dump
--

\restrict jqofD9rXpBzuhHnOgOY3SbyfSGvXhtdxbfmgmeSP4q4pZpJtnaOJzAIzS7fcaE0

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: folders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.folders (
    id integer NOT NULL,
    name text NOT NULL,
    parent_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.folders OWNER TO postgres;

--
-- Name: folders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.folders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.folders_id_seq OWNER TO postgres;

--
-- Name: folders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.folders_id_seq OWNED BY public.folders.id;


--
-- Name: project_materials; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_materials (
    id integer NOT NULL,
    project_id integer NOT NULL,
    name text NOT NULL,
    thumbnail_url text,
    model_url text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    variant_id integer
);


ALTER TABLE public.project_materials OWNER TO postgres;

--
-- Name: project_materials_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.project_materials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_materials_id_seq OWNER TO postgres;

--
-- Name: project_materials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.project_materials_id_seq OWNED BY public.project_materials.id;


--
-- Name: project_measurements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_measurements (
    id integer NOT NULL,
    project_id integer NOT NULL,
    label text NOT NULL,
    value text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.project_measurements OWNER TO postgres;

--
-- Name: project_measurements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.project_measurements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_measurements_id_seq OWNER TO postgres;

--
-- Name: project_measurements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.project_measurements_id_seq OWNED BY public.project_measurements.id;


--
-- Name: project_variants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_variants (
    id integer NOT NULL,
    project_id integer NOT NULL,
    name text NOT NULL,
    thumbnail_url text,
    model_url text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.project_variants OWNER TO postgres;

--
-- Name: project_variants_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.project_variants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_variants_id_seq OWNER TO postgres;

--
-- Name: project_variants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.project_variants_id_seq OWNED BY public.project_variants.id;


--
-- Name: projects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.projects (
    id integer NOT NULL,
    name text NOT NULL,
    company_name text NOT NULL,
    thumbnail text,
    model_url text,
    is_live boolean DEFAULT false NOT NULL,
    environment text DEFAULT 'black'::text NOT NULL,
    hotspot_x real DEFAULT 0 NOT NULL,
    hotspot_y real DEFAULT 0 NOT NULL,
    hotspot_z real DEFAULT 0 NOT NULL,
    language text DEFAULT 'en'::text NOT NULL,
    type text DEFAULT 'furniture'::text NOT NULL,
    is_scalable boolean DEFAULT false NOT NULL,
    folder_id integer,
    public_slug text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    enable_materials boolean DEFAULT true NOT NULL,
    enable_variants boolean DEFAULT false NOT NULL,
    default_model_name text DEFAULT 'Original'::text NOT NULL,
    default_color_name text DEFAULT 'Original Color'::text NOT NULL,
    studio_sidebar_color text DEFAULT '#000000'::text NOT NULL,
    studio_sidebar_opacity real DEFAULT 0.65 NOT NULL,
    studio_accent_color text DEFAULT '#C9A84C'::text NOT NULL,
    studio_sidebar_text_color text,
    studio_background_url text,
    studio_focal_x real,
    studio_focal_y real,
    studio_model_x real,
    studio_model_y real,
    studio_model_size real,
    studio_background_scale real,
    pedestal_color text,
    pedestal_height real,
    model_rotation_y real,
    room_glb_url text,
    three_intro_enabled boolean DEFAULT true NOT NULL
);


ALTER TABLE public.projects OWNER TO postgres;

--
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.projects_id_seq OWNER TO postgres;

--
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;


--
-- Name: folders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folders ALTER COLUMN id SET DEFAULT nextval('public.folders_id_seq'::regclass);


--
-- Name: project_materials id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_materials ALTER COLUMN id SET DEFAULT nextval('public.project_materials_id_seq'::regclass);


--
-- Name: project_measurements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_measurements ALTER COLUMN id SET DEFAULT nextval('public.project_measurements_id_seq'::regclass);


--
-- Name: project_variants id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_variants ALTER COLUMN id SET DEFAULT nextval('public.project_variants_id_seq'::regclass);


--
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


--
-- Data for Name: folders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.folders (id, name, parent_id, created_at, updated_at) FROM stdin;
1	Luxury Brands	\N	2026-04-12 14:09:02.570016+00	2026-04-12 14:09:02.570016+00
2	Furniture	\N	2026-04-12 14:09:02.570016+00	2026-04-12 14:09:02.570016+00
3	Electronics	\N	2026-04-12 14:09:02.570016+00	2026-04-12 14:09:02.570016+00
\.


--
-- Data for Name: project_materials; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.project_materials (id, project_id, name, thumbnail_url, model_url, sort_order, created_at, variant_id) FROM stdin;
1	6	Charcoal Garda	/api/storage/objects/uploads/d056f5bb-08cc-4fab-a445-c3d0d005929b	/api/storage/objects/uploads/27a2752d-32a8-4892-bff8-aca3d8d79786	0	2026-04-12 15:57:24.305409+00	\N
2	6	Latour Blue	/api/storage/objects/uploads/cead4253-b4e1-4697-bb88-c11e0f672245	/api/storage/objects/uploads/b1edd494-2aba-435f-9f7b-a8ef3bfc0eea	1	2026-04-12 15:58:29.682738+00	\N
\.


--
-- Data for Name: project_measurements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.project_measurements (id, project_id, label, value, sort_order, created_at) FROM stdin;
\.


--
-- Data for Name: project_variants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.project_variants (id, project_id, name, thumbnail_url, model_url, sort_order, created_at) FROM stdin;
1	6	marlo lina	\N	/api/storage/objects/uploads/afa06c4e-9dcd-496c-a73b-8f69827ccf7d	0	2026-04-12 16:02:29.608751+00
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.projects (id, name, company_name, thumbnail, model_url, is_live, environment, hotspot_x, hotspot_y, hotspot_z, language, type, is_scalable, folder_id, public_slug, created_at, updated_at, enable_materials, enable_variants, default_model_name, default_color_name, studio_sidebar_color, studio_sidebar_opacity, studio_accent_color, studio_sidebar_text_color, studio_background_url, studio_focal_x, studio_focal_y, studio_model_x, studio_model_y, studio_model_size, studio_background_scale, pedestal_color, pedestal_height, model_rotation_y, room_glb_url, three_intro_enabled) FROM stdin;
7	Sidebar Test Project	Test Co	\N	\N	f	black	0	0	0	en	furniture	f	\N	cxV4nzPpGIcr	2026-04-18 09:19:31.826423+00	2026-04-18 09:19:31.826423+00	t	f	Original	Original Color	#000000	0.65	#C9A84C	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t
9	ggg	bb	\N	\N	f	black	0	0	0	en	furniture	f	\N	W18AE-dwYS93	2026-05-16 11:52:17.543753+00	2026-05-16 11:52:17.543753+00	t	f	Original	Original Color	#000000	0.65	#C9A84C	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t
6	marlo sofa	demo	\N	/api/storage/objects/uploads/c900d676-6a13-4148-a079-ce1b4f16c204	t	warm-minimal	0	0.4	0	en	furniture	f	\N	GLJwkcsD8Bpa	2026-04-12 14:54:35.488543+00	2026-05-16 16:08:04.59+00	t	t	marlo sofa	hash brown	#000000	0.48	#d9a83f	#e9e7e7	/api/storage/objects/uploads/2359afee-939e-4ff4-9c7e-626399dbde3d	50	50	50.547443	80.50179	86	100	\N	\N	\N	\N	t
8	hh	jj	\N	/api/storage/objects/uploads/d6fa2378-7624-4419-80b1-9d36a8e52b02	t	custom-room	0	0.4	0	en	furniture	f	\N	mDOI84MlneU5	2026-04-30 15:17:47.757233+00	2026-05-21 18:26:56.774+00	t	f	Original	Original Color	#000000	0.65	#C9A84C	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	359	/api/storage/objects/uploads/96204a92-a1c2-49f5-9e82-c728b36a4d70	t
1	Eames Lounge Chair	Herman Miller	\N	\N	t	luxury-home	0	0	0	en	furniture	f	2	eames-lounge-abc1	2026-04-12 14:09:02.570016+00	2026-04-12 14:09:02.570016+00	t	f	Original	Original Color	#000000	0.65	#C9A84C	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t
2	Barcelona Chair	Knoll	\N	\N	t	classic-luxury	0	0	0	en	furniture	f	1	barcelona-chair-xyz2	2026-04-12 14:09:02.570016+00	2026-04-12 14:09:02.570016+00	t	f	Original	Original Color	#000000	0.65	#C9A84C	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t
3	Arc Floor Lamp	Flos	\N	\N	f	walls-plants	0	0.5	0	en	object	f	1	arc-floor-lamp-lmn3	2026-04-12 14:09:02.570016+00	2026-04-12 14:09:02.570016+00	t	f	Original	Original Color	#000000	0.65	#C9A84C	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t
5	Velvet Sofa	Cassina	\N	\N	t	luxury-home	0	0	0	en	furniture	f	2	velvet-sofa-tuv5	2026-04-12 14:09:02.570016+00	2026-04-12 14:09:02.570016+00	t	f	Original	Original Color	#000000	0.65	#C9A84C	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t
4	Marble Coffee Table	B&B Italia	\N	\N	f	black	0	0	0	en	furniture	f	\N	marble-table-qrs4	2026-04-12 14:09:02.570016+00	2026-04-12 14:37:13.236+00	t	f	Original	Original Color	#000000	0.65	#C9A84C	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t
\.


--
-- Name: folders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.folders_id_seq', 3, true);


--
-- Name: project_materials_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.project_materials_id_seq', 3, true);


--
-- Name: project_measurements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.project_measurements_id_seq', 1, false);


--
-- Name: project_variants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.project_variants_id_seq', 1, true);


--
-- Name: projects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.projects_id_seq', 9, true);


--
-- Name: folders folders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folders
    ADD CONSTRAINT folders_pkey PRIMARY KEY (id);


--
-- Name: project_materials project_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_materials
    ADD CONSTRAINT project_materials_pkey PRIMARY KEY (id);


--
-- Name: project_measurements project_measurements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_measurements
    ADD CONSTRAINT project_measurements_pkey PRIMARY KEY (id);


--
-- Name: project_variants project_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_variants
    ADD CONSTRAINT project_variants_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: projects projects_public_slug_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_public_slug_unique UNIQUE (public_slug);


--
-- Name: project_materials project_materials_variant_id_project_variants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_materials
    ADD CONSTRAINT project_materials_variant_id_project_variants_id_fk FOREIGN KEY (variant_id) REFERENCES public.project_variants(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict jqofD9rXpBzuhHnOgOY3SbyfSGvXhtdxbfmgmeSP4q4pZpJtnaOJzAIzS7fcaE0

