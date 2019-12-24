DROP TABLE IF EXISTS refund_requests CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS job_price_tiers CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS job_types CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS wallet_transactions CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;

CREATE TABLE accounts (
	username 	character(16),
	password 	character(60),
	fullname 	character(100),
	email		character(100) unique,
	phone		character(10) unique,
	bio			text,
	citizen_id 	character(10) unique,
	wallet_id	int unique,
	is_admin	boolean default false,
	primary key (username)
);

CREATE TABLE job_types (
	id			serial,
	name		character(100),
	primary key (id)
);

CREATE TABLE jobs (
	id			serial,
	name		character(100),
	description	text,
	type_id		int,
	username	character(16),
	cv_url		character(200),
	status		boolean,
	primary key (id)
);

CREATE TABLE job_price_tiers (
	job_id		int,
	price		int,
	description	text,
	primary key (job_id, price)
);

CREATE TABLE transactions (
	id			serial,
	username	character(16),
	job_id		int,
	price		int,
	created_at	timestamp default NOW(),
	status		boolean,
	review		text,
	primary key (id)
);

CREATE TABLE refund_requests (
	transaction_id	int,
	reason			text,
	status			boolean,
	primary key (transaction_id)
);

CREATE TABLE messages (
	id				serial,
	username_from	character(16),
	username_to		character(16),
	created_at		timestamp default NOW(),
	content			text,
	primary key (id)
);

CREATE TABLE wallets (
	id			serial,
	balance		int,
	primary key (id)
);

CREATE TABLE wallet_transactions (
	id			serial,
	amount		int,
	created_at	timestamp default NOW(),
	wallet_from	int,
	wallet_to	int,
	content		text,
	primary key (id)
);

ALTER TABLE accounts
	ADD FOREIGN KEY (wallet_id) REFERENCES wallets(id);

ALTER TABLE jobs
	ADD FOREIGN KEY (type_id) REFERENCES job_types(id),
	ADD FOREIGN KEY (username) REFERENCES accounts(username);

ALTER TABLE job_price_tiers
	ADD FOREIGN KEY (job_id) REFERENCES jobs(id);

ALTER TABLE transactions
	ADD FOREIGN KEY (username) REFERENCES accounts(username),
	ADD FOREIGN KEY (job_id, price) REFERENCES job_price_tiers(job_id, price);

ALTER TABLE refund_requests
	ADD FOREIGN KEY (transaction_id) REFERENCES transactions(id);

ALTER TABLE messages
	ADD FOREIGN KEY (username_from) REFERENCES accounts(username),
	ADD FOREIGN KEY (username_to) REFERENCES accounts(username);

ALTER TABLE wallet_transactions
	ADD FOREIGN KEY (wallet_from) REFERENCES wallets(id),
	ADD FOREIGN KEY (wallet_to) REFERENCES wallets(id);
	
CREATE OR REPLACE FUNCTION create_account(
	_username character(16), 
	_password character(60),
	_email character(100),
	_phone character(10)
)
RETURNS SETOF accounts AS
$$
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
$$ LANGUAGE plpgsql;