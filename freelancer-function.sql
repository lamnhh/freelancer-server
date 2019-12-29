CREATE OR REPLACE FUNCTION create_account(
	_username character(16), 
	_password character(60),
	_email character(100),
	_phone character(10)
)
RETURNS SETOF accounts AS
$$
DECLARE
	wallet_id int;
BEGIN
	-- 	Check if username has been used yet
	IF EXISTS (SELECT * FROM accounts WHERE username = _username) THEN
 		RAISE unique_violation USING HINT = 'Username ' || _username || ' has been used';
	END IF;
	
	-- 	Check if email has been used yet
	IF EXISTS (SELECT * FROM accounts WHERE email = _email) THEN
		RAISE unique_violation USING HINT = 'Email ' || _email || ' has been used';
	END IF;
	
	-- 	Check if phone has been used yet
	IF EXISTS (SELECT * FROM accounts WHERE phone = _phone) THEN
		RAISE unique_violation USING HINT = 'Phone number ' || _phone || ' has been used';
	END IF;

	INSERT INTO wallets(balance) VALUES (0) RETURNING id into wallet_id;
	
	RETURN QUERY
	INSERT INTO
		accounts(username, password, email, phone, wallet_id)
	VALUES
		(_username, _password, _email, _phone, wallet_id)
	RETURNING *;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION transfer_money(username1 character(16), username2 character(16), amount int, content text)
RETURNS TABLE (new_balance int)
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
		RAISE EXCEPTION USING HINT = 'One of the two has not activate their wallet';
	END IF;
	
-- 	Check current balance of sender
	IF NOT EXISTS (SELECT * FROM wallets WHERE id = wallet1 AND balance >= amount) THEN
		RAISE EXCEPTION USING HINT = 'Buyer does not have enough money in their wallet';
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
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_balance(_username character(16), amount int)
RETURNS TABLE (new_balance int)
AS $$
DECLARE
	wallet_id int;
	current_balance int;
BEGIN
-- Fetch wallet_id and current balance
	SELECT
		id, balance INTO wallet_id, current_balance
	FROM
		accounts
		JOIN wallets ON (accounts.wallet_id = wallets.id)
	WHERE
		username=_username;

	IF amount = 0 THEN
		RAISE EXCEPTION USING HINT = 'Amount must be a non-zero integer';
	END IF;

-- Prevent withdrawing that makes balance go below 0
	IF current_balance + amount < 0 THEN
		RAISE EXCEPTION USING HINT = 'Cannot withdraw more than your current balance';
	END IF;
	
-- Create an entry in wallet_transactions
	INSERT INTO
		wallet_transactions(amount, wallet_from, wallet_to)
	VALUES
		(amount, wallet_id, wallet_id);

-- Actually update balance
	RETURN QUERY
	UPDATE wallets SET balance = balance + amount WHERE id = wallet_id
	RETURNING balance;
END;
$$ LANGUAGE plpgsql;