# Freelancer - Server

APIs for Freelancer app, with a frontend for admins.

# Team members

- 1712329: Lê Tuấn Đạt.
- 1712307: Lê Xuân Cường (team leader).
- 1712932: Nguyễn Hy Hoài Lâm.
- 1712902: Phạm Cao Vỉ.

# Documentation

The APIs are deployed to https://its-freelancer.herokuapp.com/.

## Accounts

- `POST /api/account/register`: register a new account. Body must contain 4 fields (username, password, email, phone). Phone must be exactly 10 characters long. Response will contain the information of the newly created user along with a USER TOKEN. This token must be passed along with every request as a header "Authorization" in the form "Bearer \<token>".

- `POST /api/account/login`: login. Body must contain 2 fields (username, password). Response will contain user's information along with a token like above.

- `GET /api/account`: get current user's information.

- `PATCH /api/account`: update current user's information. Body is a dict that dictates which fields will be updated and what their new values will be, i.e. { "bio": "Hello there", "citizen_id": "a.k.a. cmnd" }. List of fields that can be updated: `fullname, email, phone, bio, citizen_id`.

## Job Types

- `GET /api/job-type`: get all job types. Each of them will be in the form `{ id, name }`.

- `GET /api/job-type/:id`: get job type with a given ID.

- `POST /api/job-type`: create a new type. Only admins can access this route. Body must contain `name`, which is the name for the new type.

- (Deprecated) `DELETE /api/job-type/:id`: delete a job type with a given ID. Only admins can access this route.

- `PATCH /api/job-type/:id`: update name of a type. Only admins can access this route. Body must contain `name`, which is the new name of the type.

## Jobs

For all GET requests, result will contain a single job, or a list of jobs.

In whatever case, a job will be in the following form:

```
{
  "id": 2,
  "name": "React.js Developer",
  "description": "Develope front-end for webapps using React.js 123",
  "cv_url": "https://www.youtube.com/",  // URL to the CV
  "type": "Back-end Developer",
  "username": "system",
  "fullname": "Lam Nguyen",
  "price_list": [
    {
      "price": 1000,
      "description": "Junior"
    },
    {
      "price": 50000,
      "description": "Senior 123"
    }
  ]
}
```

- `GET /api/job?page=<page>&size=<size>`: get all APPROVED jobs. This API supports pagination (page starts from 1, defaults to 1; size defaults to 10).

- `GET /api/job/:id`: get job with a given ID. If said job isn't approved, the API resolves in a 404.

- `POST /api/job`: create a new job. Request body must contain `(name, description, cv_url, type_id, price_list: [{price, description}, {price, description}]`.

- `PATCH /api/job/:id`: update a job. Request body can contain a subset of `(name, description, cv_url, type_id, price_list: [{price, description}, {price, description}]`.

## Wallets

THIS IS JUST A DEMO. Consider this "wallet" thing a placeholder for an actual wallet service, where users have to activate their wallets, top up using their cards, etc.

Here, users can top up their wallets at will. Users MUST enter their password before every transaction, which means the request body MUST contain a field `password`.

- `GET /api/wallet`: get balance of current user.

- `POST /api/wallet/activate`: activate current user's wallet.

- `POST /api/wallet/topup`: top up current user's wallet. Request body must contain a field `amount`. This number must be a positive integer.

## Transactions

Do not confuse this with WalletTransaction. This is meant to describe transactions between users and jobs: a user buys a job.

All GET requests will return a single transaction, or a list of transactions, each of which is in the following form:

```
{
  "id": 11,
  "buyer": "lamnhh",
  "price": 1000,
  "price_description": "Junior",
  "created_at": "2019-12-26T01:07:15.877Z",
  "job_id": 2,
  "job_name": "React.js Developer",
  "job_description": "Develope front-end for webapps using React.js 123",
  "seller": {
    "username": "system",
    "fullname": "Lam Nguyen"
  },
  "review": "Great service"
}
```

# License

MIT License

Copyright (c) 2019 Lam Nguyen

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
