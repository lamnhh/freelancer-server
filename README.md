# Freelancer - Server

APIs for Freelancer app, with a frontend for admins.

# Table of Contents

- [Team members](#team-members)
- [Documentation](#documentation)
  - [Accounts](#accounts)
  - [Job Types](#job-types)
  - [Jobs](#jobs)
  - [Wallets](#wallets)
  - [Transactions](#transactions)
  - [Refund Requests](#refund-requests)
  - [Notifications](#notifications)
  - [Chat](#chat)
- [License](#license)

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

- `GET /api/account/:username`: get public information of user `username`, including `username, fullname`.

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

- `GET /api/job?page=<page>&size=<size>&lower=<lower>&upper=<upper>&username=<username>`: get all APPROVED jobs. This API supports pagination (page starts from 1, defaults to 1; size defaults to 10). This API also supports filtering by price range: from `lower` to `upper`, by uploader `username`. For example, this API will fetch all jobs uploaded by `seller`, with price between 1 and 1000: `GET /api/job?lower=1&upper=1000&username=seller`.

- `GET /api/job?search=<keyword>`: search for all jobs whose name or description contains `keyword`. This API also supports pagination and filters by the one above.

- `GET /api/job/:id`: get job with a given ID. If said job isn't approved, the API resolves in a 404.

- `POST /api/job`: create a new job. Request body must contain `(name, description, cv_url, type_id, price_list: [{price, description}, {price, description}]`.

- `PATCH /api/job/:id`: update a job. Request body can contain a subset of `(name, description, cv_url, type_id, price_list: [{price, description}, {price, description}]`.

## Wallets

THIS IS JUST A DEMO. Consider this "wallet" thing a placeholder for an actual wallet service, where users have to activate their wallets, top up using their cards, etc.

Here, users can top up their wallets at will.

- `GET /api/wallet`: get balance of current user.

- `GET /api/wallet/history`: get all past transactions made by current user.

- (Deprecated) `POST /api/wallet/activate`: activate current user's wallet.

- `POST /api/wallet`: top up current user's wallet. Request body must contain `password` and `amount`. A positive `amount` represents "topping-up", while a negative one represents "withdrawing".

## Transactions

Do not confuse this with WalletTransaction. This is meant to describe transactions between users and jobs: a user buys a job.

All GET requests will return a single transaction, or a list of transactions, each of which is in the following form:

```
{
  "id": 14,
  "buyer": "lamnhh",
  "price": 1000,
  "price_description": "Junior",
  "created_at": "2019-12-26T01:58:26.492Z",
  "job_id": 2,
  "job_name": "React.js Developer",
  "job_description": "Develop front-end for webapps using React.js 123",
  "seller": {
    "username": "system",
    "fullname": "Lam Nguyen"
  },
  "review": "Great",
  "is_finished": true,
  "refund": {
    "created_at": "2019-12-27T11:26:59.094884",
    "reason": "test",
    "status": null
  }
}
```

`refund` describes refund request of this transaction: `refund = null` means there is no refund requests at the moment, otherwise, `refund` is an object as in the example above, where `refund.status` describes whether this request was approved/rejected by the admins.

- `GET /api/transaction`: get all transactions the current user has made.

- `GET /api/transaction/:id`: get a single transaction.

- `POST /api/transaction`: create a new transaction. Request body: `{ jobId, price }`.

- `POST /api/transaction/:id/finish`: mark a transaction as finished. This API requires user to send `password` in request body.

- `POST /api/transaction/:id/review`: add review to a transaction. Request body: `{ review }`.

## Refund Requests

- `POST /api/refund/:id`: create a refund request for transaction `id`. Request body must contain a string `reason`.

- `POST /api/refund/:id/approve`: approve/reject the refund request on transaction `id`. Used by admins only. Request body must contain a boolean `status`.

## Notifications

- `GET /api/notification`: get all notifications of the current user.

## Chat

Real-time chat is done using [Socket.IO](https://socket.io/). Client for Java can be found [here](https://github.com/socketio/socket.io-client-java).

You can interact with the server using:

- `connection`: obviously. Remember to send along user token. For example: `io.connect("localhost:3000?token=<user token>)`.

- `chat-with(receiver)`: request for current user to chat with `receiver`. The server will an event `message` that contains chat history between the two users.

- `send(receiver, content)`: send a message `content` to `receiver`.

- `leave(receiver)`: stop chatting with `receiver`.

You need to implement this listener:

- `message(receiver, messageList)`: user `receiver` sent you `messageList`, which is a list of message in the form `{ id, username_from, username_to, content, created_at }`. You can use `receiver` to determine where to display the messages.

A client example (with Javascript, on web) can be found in `/public/chat-test.html`.

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
