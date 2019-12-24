DROP TABLE IF EXISTS refund_requests;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS job_price_tiers;
DROP TABLE IF EXISTS jobs;
DROP TABLE IF EXISTS job_types;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS wallet_transactions;
DROP TABLE IF EXISTS wallets;

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