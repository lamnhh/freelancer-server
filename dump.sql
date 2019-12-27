--
-- PostgreSQL database dump
--

-- Dumped from database version 11.6 (Ubuntu 11.6-1.pgdg16.04+1)
-- Dumped by pg_dump version 11.6 (Ubuntu 11.6-1.pgdg18.04+1)

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

SET default_with_oids = false;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: omeadgjlprtllh
--

CREATE TABLE public.accounts (
    username character(16) NOT NULL,
    password character(60),
    fullname character(100),
    email character(100),
    phone character(10),
    bio text,
    citizen_id character(10),
    wallet_id integer,
    is_admin boolean DEFAULT false
);


ALTER TABLE public.accounts OWNER TO omeadgjlprtllh;

--
-- Name: create_account(character, character, character, character); Type: FUNCTION; Schema: public; Owner: omeadgjlprtllh
--

CREATE FUNCTION public.create_account(_username character, _password character, _email character, _phone character) RETURNS SETOF public.accounts
    LANGUAGE plpgsql
    AS $$
BEGIN
	-- 	Check if username has been used yet
	IF EXISTS (SELECT * FROM accounts WHERE username=_username) THEN
 		RAISE unique_violation USING HINT = 'Username ' || _username || ' has been used';
	END IF;
	
	-- 	Check if email has been used yet
	IF EXISTS (SELECT * FROM accounts WHERE email=_email) THEN
		RAISE unique_violation USING HINT = 'Email ' || _email || ' has been used';
	END IF;
	
	-- 	Check if phone has been used yet
	IF EXISTS (SELECT * FROM accounts WHERE phone=_phone) THEN
		RAISE unique_violation USING HINT = 'Phone number ' || _phone || ' has been used';
	END IF;
	
	RETURN QUERY
	INSERT INTO accounts(username, password, email, phone)
	VALUES (_username, _password, _email, _phone)
	RETURNING *;
END;
$$;


ALTER FUNCTION public.create_account(_username character, _password character, _email character, _phone character) OWNER TO omeadgjlprtllh;

--
-- Name: topup(integer, integer); Type: FUNCTION; Schema: public; Owner: omeadgjlprtllh
--

CREATE FUNCTION public.topup(wallet_id integer, amount integer) RETURNS TABLE(new_balance integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
	IF NOT EXISTS (SELECT * FROM wallets WHERE balance + amount >= 0 AND id = wallet_id) THEN
		RAISE EXCEPTION 'Cannot withdraw more than your current balance';
	END IF;
	
	INSERT INTO wallet_transactions(amount, wallet_from, wallet_to)
	VALUES (amount, wallet_id, wallet_id);

	RETURN QUERY
	UPDATE wallets
	SET balance = balance + amount
	WHERE id=wallet_id
	RETURNING balance;
END;
$$;


ALTER FUNCTION public.topup(wallet_id integer, amount integer) OWNER TO omeadgjlprtllh;

--
-- Name: transfer_money(character, character, integer); Type: FUNCTION; Schema: public; Owner: omeadgjlprtllh
--

CREATE FUNCTION public.transfer_money(username1 character, username2 character, amount integer) RETURNS TABLE(new_balance integer)
    LANGUAGE plpgsql
    AS $$
DECLARE
	wallet1 int;
	wallet2 int;
BEGIN
-- 	Fetch wallet ID of the two users
	wallet1 := NULL;
	wallet2 := NULL;
	
	SELECT wallet_id INTO wallet1
	FROM accounts
	WHERE accounts.username = username1;
	
	SELECT wallet_id INTO wallet2
	FROM accounts
	WHERE accounts.username = username2;
	
-- 	If at least one of wallet1 and wallet2 is NULL
	IF (wallet1 IS NULL) OR (wallet2 IS NULL) THEN
		RAISE EXCEPTION 'One of the two has not activate their wallet';
	END IF;
	
-- 	Check current balance of sender
	IF NOT EXISTS (SELECT * FROM wallets WHERE id=wallet1 AND balance >= amount) THEN
		RAISE EXCEPTION 'Buyer does not have enough money in their wallet';
	END IF;
	
	UPDATE wallets
	SET balance = balance + amount
	WHERE id=wallet2;
	
	RETURN QUERY
	UPDATE wallets
	SET balance = balance - amount
	WHERE id=wallet1
	RETURNING balance;
END;
$$;


ALTER FUNCTION public.transfer_money(username1 character, username2 character, amount integer) OWNER TO omeadgjlprtllh;

--
-- Name: transfer_money(character, character, integer, text); Type: FUNCTION; Schema: public; Owner: omeadgjlprtllh
--

CREATE FUNCTION public.transfer_money(username1 character, username2 character, amount integer, content text) RETURNS TABLE(new_balance integer)
    LANGUAGE plpgsql
    AS $$
DECLARE
	wallet1 int;
	wallet2 int;
BEGIN
-- 	Fetch wallet ID of the two users
	wallet1 := NULL;
	wallet2 := NULL;
	
	SELECT wallet_id INTO wallet1
	FROM accounts
	WHERE accounts.username = username1;
	
	SELECT wallet_id INTO wallet2
	FROM accounts
	WHERE accounts.username = username2;
	
-- 	If at least one of wallet1 and wallet2 is NULL
	IF (wallet1 IS NULL) OR (wallet2 IS NULL) THEN
		RAISE EXCEPTION 'One of the two has not activate their wallet';
	END IF;
	
-- 	Check current balance of sender
	IF NOT EXISTS (SELECT * FROM wallets WHERE id=wallet1 AND balance >= amount) THEN
		RAISE EXCEPTION 'Buyer does not have enough money in their wallet';
	END IF;
	
	INSERT INTO wallet_transactions(amount, wallet_from, wallet_to, content)
	VALUES (amount, wallet1, wallet2, content);
	
	UPDATE wallets
	SET balance = balance + amount
	WHERE id=wallet2;
	
	RETURN QUERY
	UPDATE wallets
	SET balance = balance - amount
	WHERE id=wallet1
	RETURNING balance;
END;
$$;


ALTER FUNCTION public.transfer_money(username1 character, username2 character, amount integer, content text) OWNER TO omeadgjlprtllh;

--
-- Name: job_price_tiers; Type: TABLE; Schema: public; Owner: omeadgjlprtllh
--

CREATE TABLE public.job_price_tiers (
    job_id integer NOT NULL,
    price integer NOT NULL,
    description text
);


ALTER TABLE public.job_price_tiers OWNER TO omeadgjlprtllh;

--
-- Name: job_types; Type: TABLE; Schema: public; Owner: omeadgjlprtllh
--

CREATE TABLE public.job_types (
    id integer NOT NULL,
    name character(100)
);


ALTER TABLE public.job_types OWNER TO omeadgjlprtllh;

--
-- Name: job_types_id_seq; Type: SEQUENCE; Schema: public; Owner: omeadgjlprtllh
--

CREATE SEQUENCE public.job_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.job_types_id_seq OWNER TO omeadgjlprtllh;

--
-- Name: job_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: omeadgjlprtllh
--

ALTER SEQUENCE public.job_types_id_seq OWNED BY public.job_types.id;


--
-- Name: jobs; Type: TABLE; Schema: public; Owner: omeadgjlprtllh
--

CREATE TABLE public.jobs (
    id integer NOT NULL,
    name character(100),
    description text,
    type_id integer,
    username character(16),
    cv_url character(200),
    status boolean
);


ALTER TABLE public.jobs OWNER TO omeadgjlprtllh;

--
-- Name: jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: omeadgjlprtllh
--

CREATE SEQUENCE public.jobs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.jobs_id_seq OWNER TO omeadgjlprtllh;

--
-- Name: jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: omeadgjlprtllh
--

ALTER SEQUENCE public.jobs_id_seq OWNED BY public.jobs.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: omeadgjlprtllh
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    username_from character(16),
    username_to character(16),
    created_at timestamp without time zone DEFAULT now(),
    content text
);


ALTER TABLE public.messages OWNER TO omeadgjlprtllh;

--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: omeadgjlprtllh
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.messages_id_seq OWNER TO omeadgjlprtllh;

--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: omeadgjlprtllh
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: refund_requests; Type: TABLE; Schema: public; Owner: omeadgjlprtllh
--

CREATE TABLE public.refund_requests (
    transaction_id integer NOT NULL,
    reason text,
    status boolean
);


ALTER TABLE public.refund_requests OWNER TO omeadgjlprtllh;

--
-- Name: transactions; Type: TABLE; Schema: public; Owner: omeadgjlprtllh
--

CREATE TABLE public.transactions (
    id integer NOT NULL,
    username character(16),
    job_id integer,
    price integer,
    created_at timestamp without time zone DEFAULT now(),
    status boolean,
    review text
);


ALTER TABLE public.transactions OWNER TO omeadgjlprtllh;

--
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: omeadgjlprtllh
--

CREATE SEQUENCE public.transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.transactions_id_seq OWNER TO omeadgjlprtllh;

--
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: omeadgjlprtllh
--

ALTER SEQUENCE public.transactions_id_seq OWNED BY public.transactions.id;


--
-- Name: wallet_transactions; Type: TABLE; Schema: public; Owner: omeadgjlprtllh
--

CREATE TABLE public.wallet_transactions (
    id integer NOT NULL,
    amount integer,
    created_at timestamp without time zone DEFAULT now(),
    wallet_from integer,
    wallet_to integer,
    content text
);


ALTER TABLE public.wallet_transactions OWNER TO omeadgjlprtllh;

--
-- Name: wallet_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: omeadgjlprtllh
--

CREATE SEQUENCE public.wallet_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.wallet_transactions_id_seq OWNER TO omeadgjlprtllh;

--
-- Name: wallet_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: omeadgjlprtllh
--

ALTER SEQUENCE public.wallet_transactions_id_seq OWNED BY public.wallet_transactions.id;


--
-- Name: wallets; Type: TABLE; Schema: public; Owner: omeadgjlprtllh
--

CREATE TABLE public.wallets (
    id integer NOT NULL,
    balance integer
);


ALTER TABLE public.wallets OWNER TO omeadgjlprtllh;

--
-- Name: wallets_id_seq; Type: SEQUENCE; Schema: public; Owner: omeadgjlprtllh
--

CREATE SEQUENCE public.wallets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.wallets_id_seq OWNER TO omeadgjlprtllh;

--
-- Name: wallets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: omeadgjlprtllh
--

ALTER SEQUENCE public.wallets_id_seq OWNED BY public.wallets.id;


--
-- Name: job_types id; Type: DEFAULT; Schema: public; Owner: omeadgjlprtllh
--

ALTER TABLE ONLY public.job_types ALTER COLUMN id SET DEFAULT nextval('public.job_types_id_seq'::regclass);


--
-- Name: jobs id; Type: DEFAULT; Schema: public; Owner: omeadgjlprtllh
--

ALTER TABLE ONLY public.jobs ALTER COLUMN id SET DEFAULT nextval('public.jobs_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: omeadgjlprtllh
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: transactions id; Type: DEFAULT; Schema: public; Owner: omeadgjlprtllh
--

ALTER TABLE ONLY public.transactions ALTER COLUMN id SET DEFAULT nextval('public.transactions_id_seq'::regclass);


--
-- Name: wallet_transactions id; Type: DEFAULT; Schema: public; Owner: omeadgjlprtllh
--

ALTER TABLE ONLY public.wallet_transactions ALTER COLUMN id SET DEFAULT nextval('public.wallet_transactions_id_seq'::regclass);


--
-- Name: wallets id; Type: DEFAULT; Schema: public; Owner: omeadgjlprtllh
--

ALTER TABLE ONLY public.wallets ALTER COLUMN id SET DEFAULT nextval('public.wallets_id_seq'::regclass);


--
-- Data for Name: accounts; Type: TABLE DATA; Schema: public; Owner: omeadgjlprtllh
--

COPY public.accounts (username, password, fullname, email, phone, bio, citizen_id, wallet_id, is_admin) FROM stdin;
system          	$2b$10$cpzOurZwp2Zs30o.CbqFGuKDY2X1Hlmupjn.7xFb40.7dqlWsI0hS	\N	system@gmail.com                                                                                    	0123456789	\N	\N	\N	t
\.


--
-- Data for Name: job_price_tiers; Type: TABLE DATA; Schema: public; Owner: omeadgjlprtllh
--

COPY public.job_price_tiers (job_id, price, description) FROM stdin;
\.


--
-- Data for Name: job_types; Type: TABLE DATA; Schema: public; Owner: omeadgjlprtllh
--

COPY public.job_types (id, name) FROM stdin;
1	Front-end Developer                                                                                 
2	Back-end Developer                                                                                  
3	Designer                                                                                            
\.


--
-- Data for Name: jobs; Type: TABLE DATA; Schema: public; Owner: omeadgjlprtllh
--

COPY public.jobs (id, name, description, type_id, username, cv_url, status) FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: omeadgjlprtllh
--

COPY public.messages (id, username_from, username_to, created_at, content) FROM stdin;
\.


--
-- Data for Name: refund_requests; Type: TABLE DATA; Schema: public; Owner: omeadgjlprtllh
--

COPY public.refund_requests (transaction_id, reason, status) FROM stdin;
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: omeadgjlprtllh
--

COPY public.transactions (id, username, job_id, price, created_at, status, review) FROM stdin;
\.


--
-- Data for Name: wallet_transactions; Type: TABLE DATA; Schema: public; Owner: omeadgjlprtllh
--

COPY public.wallet_transactions (id, amount, created_at, wallet_from, wallet_to, content) FROM stdin;
\.


--
-- Data for Name: wallets; Type: TABLE DATA; Schema: public; Owner: omeadgjlprtllh
--

COPY public.wallets (id, balance) FROM stdin;
\.


--
-- Name: job_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: omeadgjlprtllh
--

SELECT pg_catalog.setval('public.job_types_id_seq', 3, true);


--
-- Name: jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: omeadgjlprtllh
--

SELECT pg_catalog.setval('public.jobs_id_seq', 1, false);


--
-- Name: messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: omeadgjlprtllh
--

SELECT pg_catalog.setval('public.messages_id_seq', 1, false);


--
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: omeadgjlprtllh
--

SELECT pg_catalog.setval('public.transactions_id_seq', 1, false);


--
-- Name: wallet_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: omeadgjlprtllh
--

SELECT pg_catalog.setval('public.wallet_transactions_id_seq', 1, false);


--
-- Name: wallets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: omeadgjlprtllh
--

SELECT pg_catalog.setval('public.wallets_id_seq', 1, false);


--
-- Name: accounts accounts_citizen_id_key; Type: CONSTRAINT; Schema: public; Owner: omeadgjlprtllh
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_citizen_id_key UNIQUE (citizen_id);


--
-- Name: accounts accounts_email_key; Type: CONSTRAINT; Schema: public; Owner: omeadgjlprtllh
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_email_key UNIQUE (email);


--
-- Name: accounts accounts_phone_key; Type: CONSTRAINT; Schema: public; Owner: omeadgjlprtllh
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_phone_key UNIQUE (phone);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: omeadgjlprtllh
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (username);


--
-- Name: accounts accounts_wallet_id_key; Type: CONSTRAINT; Schema: public; Owner: omeadgjlprtllh
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_wallet_id_key UNIQUE (wallet_id);


--
-- Name: job_price_tiers job_price_tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: omeadgjlprtllh
--

ALTER TABLE ONLY public.job_price_tiers
    ADD CONSTRAINT job_price_tiers_pkey PRIMARY KEY (job_id, price);


--
-- Name: job_types job_types_pkey; Type: CONSTRAINT; Schema: public; Owner: omeadgjlprtllh
--

ALTER TABLE ONLY public.job_types
    ADD CONSTRAINT job_types_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: omeadgjlprtllh
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: omeadgjlprtllh
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: refund_requests refund_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: omeadgjlprtllh
--

ALTER TABLE ONLY public.refund_requests
    ADD CONSTRAINT refund_requests_pkey PRIMARY KEY (transaction_id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: omeadgjlprtllh
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: wallet_transactions wallet_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: omeadgjlprtllh
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id);


--
-- Name: wallets wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: omeadgjlprtllh
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);


--
-- Name: accounts accounts_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: omeadgjlprtllh
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id);


--
-- Name: job_price_tiers job_price_tiers_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: omeadgjlprtllh
--

ALTER TABLE ONLY public.job_price_tiers
    ADD CONSTRAINT job_price_tiers_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id);


--
-- Name: jobs jobs_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: omeadgjlprtllh
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_type_id_fkey FOREIGN KEY (type_id) REFERENCES public.job_types(id);


--
-- Name: jobs jobs_username_fkey; Type: FK CONSTRAINT; Schema: public; Owner: omeadgjlprtllh
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_username_fkey FOREIGN KEY (username) REFERENCES public.accounts(username);


--
-- Name: messages messages_username_from_fkey; Type: FK CONSTRAINT; Schema: public; Owner: omeadgjlprtllh
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_username_from_fkey FOREIGN KEY (username_from) REFERENCES public.accounts(username);


--
-- Name: messages messages_username_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: omeadgjlprtllh
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_username_to_fkey FOREIGN KEY (username_to) REFERENCES public.accounts(username);


--
-- Name: refund_requests refund_requests_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: omeadgjlprtllh
--

ALTER TABLE ONLY public.refund_requests
    ADD CONSTRAINT refund_requests_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id);


--
-- Name: transactions transactions_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: omeadgjlprtllh
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_job_id_fkey FOREIGN KEY (job_id, price) REFERENCES public.job_price_tiers(job_id, price);


--
-- Name: transactions transactions_username_fkey; Type: FK CONSTRAINT; Schema: public; Owner: omeadgjlprtllh
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_username_fkey FOREIGN KEY (username) REFERENCES public.accounts(username);


--
-- Name: wallet_transactions wallet_transactions_wallet_from_fkey; Type: FK CONSTRAINT; Schema: public; Owner: omeadgjlprtllh
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_wallet_from_fkey FOREIGN KEY (wallet_from) REFERENCES public.wallets(id);


--
-- Name: wallet_transactions wallet_transactions_wallet_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: omeadgjlprtllh
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_wallet_to_fkey FOREIGN KEY (wallet_to) REFERENCES public.wallets(id);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: omeadgjlprtllh
--

REVOKE ALL ON SCHEMA public FROM postgres;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO omeadgjlprtllh;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- Name: LANGUAGE plpgsql; Type: ACL; Schema: -; Owner: postgres
--

GRANT ALL ON LANGUAGE plpgsql TO omeadgjlprtllh;


--
-- PostgreSQL database dump complete
--

