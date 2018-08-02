# Business Operations API

Modelling our business' operations
![image](https://user-images.githubusercontent.com/447559/41767528-bf2e19d8-7601-11e8-864d-61e3701df193.png)



## Architecture

[Architectural Diagrams](https://github.com/Financial-Times/gdpr).

WIP

## Access

### API

The REST API endpoints for the biz-ops API are available behind [FT API Gateway](http://developer.ft.com/). See the [API documentation](https://github.com/Financial-Times/biz-ops-api/blob/master/ENDPOINTS.md) for details of available endpoints and methods.

The public API URLs are:

| Environment   | Url                                |
| ------------- | --------------------------------   |
| Production    | `https://api.ft.com/biz-ops/v1`   |
| Test          | `https://api-t.ft.com/biz-ops/v1` |

To get access you will need to acquire an API key.
To get one, either:

*   use the [API gateway slack bot](https://github.com/Financial-Times/apig-api-key-warden) for the relevant environment
*   fill in a request form to the [API gateway slack team](https://financialtimes.slack.com/messages/C06GDS7UJ).

The API key can then be passed on each request either as a query parameter, e.g.

```shell
curl https://api.ft.com/biz-ops/api/__gtg?apiKey=...
```

or as an `X-Api-Key` header, e.g.

```shell
curl -H "X-Api-Key: ..." https://api.ft.com/biz-ops/api/__gtg
```

You will also need to set a `client-id` header, with the system code of the system calling the api (or some other identifier if not a recognised system).

Passing a request id using the `x-request-id` header is also recommended for auditing purposes.

### GraphQL

The API exposes a [GraphQL](https://graphql.org/) API, which allows querying the underlying graph nodes and relationships in a single request. The read api is available by POSTing queries to the path `/biz-ops/graphql`. At present, there is no write api for graphql.

| Environment   | Url                                                   |
| ------------- | ----------------------------------------------------  |
| Production    | `https://api.ft.com/biz-ops/graphql`                 |
| Test          | `https://api-t.ft.com/biz-ops/graphql`         |

#### GraphiQL
To complement graphql, the api exposes the [graphiql](https://github.com/graphql/graphiql) IDE, which supports autocomplete and is the recommended way to explore the underlying data.

This should be accessed directly as it is a UI, not through the above API gateway endpoints. Access is authenticated via s3o.

| Environment   | Url                                                   |
| ------------- | ----------------------------------------------------  |
| Production    | `https://biz-ops.api.ft.com/graphiql`                 |
| Test          | `https://biz-ops-staging.api.ft.com/graphiql`         |

## Endpoints

[Endpoint](ENDPOINTS.md) Reference

## Cookbook

Sample [queries/output](COOKBOOK.md)

## Run

This app uses Node 8.

Install dependencies:

```shell
npm install
```

Start the [neo4j](https://neo4j.com/) community edition database. This requires the [APOC procedures](http://github.com/neo4j-contrib/neo4j-apoc-procedures) library to be added to a `plugins` directory:

```shell
./scripts/neo4j-plugins
docker-compose up
```

*Troubleshooting*
* You may need to install `wget` in order to run `./scripts/neo4j-plugins`. You can do this with `brew` by running `brew install wget`
* The `docker-compose up` command requires you to have an account with docker, (you should be able to do that [here](https://hub.docker.com/)) and download the the docker application (you should be able to do that [here](https://www.docker.com/get-docker))).

This can be done _without_ docker if desired, by instead installing a neo4j database instance to the `neo4j` directory, the directory structure and scripts to run are the same as the docker configuration.

Setup [vault CLI](https://github.com/Financial-Times/vault/wiki/Getting-Started#login-with-the-cli). You will also need to have permission to read the `internal-products` Vault secrets. Ask in the [`#internal-products`](https://financialtimes.slack.com/messages/C40J2GPB6/team/) slack channel and someone should be able to help you.

This allows you to populate environment variables, including secrets, from vault by running the following:

```shell
npm run vault:env
```

Populate the database:

```shell
npm run init-db
```

Run the server:

```shell
npm start
```

Which will run the app on port 8888. To visit the local version of the api replace `https://api-t.ft.com/biz-ops/...` with `http://local.in.ft.com:8888/...` and set the `API_KEY` from the app's environment variables as a header. Note: this is not the same as the `X-API-KEY` used to run api-t.ft.com so make sure you have the correct headers set for your environment.

Run tests locally:

```shell
npm run test-dev
```
