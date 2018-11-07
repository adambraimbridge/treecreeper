# Biz Ops Rest API V2 Documentation

The following provides details of the available endpoints. You must use the correct prefix for the url.
When calling through API gateway use the folowing:

| environment | prefix value                 |
| ----------- | ---------------------------- |
| test        | https://api-t.ft.com/biz-ops |
| prod        | https://api.ft.com/biz-ops   |

Example:
https://api-t.ft.com/biz-ops/v2/node/Group/groupid?upsert=true&relationshipAction=merge

## Node - {prefix}/v2/node/:nodeType/:code

### Url parameters

_These are case-insensitive and will be converted internally to the casing used in the underlying database_

| parameter | description                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------- |
| type  | The type of record to act upon. A capitalised string using the characters a-z e.g. `System`, `Person` |
| code      | The code identifier of the record, e.g. the system code `dewey-runbooks`       |

### Payload structure

All requests that return or expect a body respond with/accept a JSON of properties as defined in the [schema for the type being acted upon](https://github.com/Financial-Times/biz-ops-schema/tree/master/schema/types). Properties are listed in the `properties` section of the yaml file for each type. A few points to bear in mind:
- The types listed against each property in the schema may not be primitives, but instead hints (aimed at consumers of the data) for what sort of data the field contains. To find the correct type of primitive to send, [look it up here](https://github.com/Financial-Times/biz-ops-schema/blob/master/lib/primitive-types-map.js)
- Many properties define relationships to other records, so changes you make to a single record will typically have an effect on the relationships of other records. The behaviour _is_ deterministic, but your API calls may nevertheless have effects you did not expect. Ask in the [#biz ops slack channel](https://biz-ops.in.ft.com/financialtimes.slack.com/messages/C9S0V2KPV) if you have any questions
- The payload structure is inspired by the [biz-ops graphql api](http://biz-ops.api.ft.com/graphiql). The principle differences are:
  - It only supports querying to a depth of "1.5" i.e. properties of the root node, and relationships to directly connected records
  - In graphql related nodes are returned as objects with a `code` property, whereas the rest api payload dispenses with the containing object i.e. `relatedThing: "my-code"` and `relatedThings: ["my-code"]`, not `relatedThing: {"code": "my-code"}` and `relatedThings: [{"my-code": "code"}]`
- You can tell which properties define relationships by checking to see if there is a `relationship` property defined on the property in the schema. This contains the name the relationship is stored as in the underlying neo4j database
- A relationship property may also define `hasMany: true`. If they do, then it should be passed an array of `code`s of related records. If `hasMany` is `false` or undefined, it will accept either a `code` as a string or an array of length 1 containing a single `code`.  
- Codes cannot be changed using the API. If a `code` in a payload does not match the one in the array, an error will be thrown
- Sending a `null` value for any property will delete the relationships or attributes stored against that property

#### Example payload

```json

{
  "code": "system1",
  "name": "My example system",
  "description": "A longer string. There are no hard limits on string lengths",
  "healthchecks": ["healthcheck-id-1", "healthcheck-id-2"],
  "deliveredBy": "my-delivery-team"
}
```


### Error structure
All errors are returned as json of the following structure:

```json
{
  "errors": [
    {
      "message": "First error message"
    },
    {
      "message": "Second error message"
    }
  ]
}

```

Errors are returned in an array to avoid breaking API changes in future, but at present all endpoints only return an errors array of length one.


### GET

_Note, it is not possible to omit `nodeType` and/or `code` to retrieve a list of nodes. `/api/graphql` is intended to be the primary read interface for anything other than single records._

| initial state | status | response type |
| ------------- | ------ | ------------- |
| absent        | 404    | none          |
| existing      | 200    | json          |

### POST

Used to create a new node, optionally with relationships to other nodes.

- The query string `upsert=true` allows the creation of any new nodes needed to create relationships

| body                   | query         | initial state                            | status | response type |
| ---------------------- | ------------- | ---------------------------------------- | ------ | ------------- |
| node only              | none          | absent                                   | 200    | json          |
| node only              | none          | existing                                 | 409    | none          |
| node and relationships | none          | absent primary node, related nodes exist | 200    | json          |
| node and relationships | none          | absent primary node and related nodes    | 400    | none          |
| node and relationships | `upsert=true` | absent primary node and related nodes    | 200    | json          |

### PUT

Not implemented. Use `PATCH`

### PATCH

Used to modify or create a node, optionally with relationships to other nodes.

- Passing in `null` as the value of any attribute of `node` will delete that attribute
- The query string `upsert=true` allows the creation of any new nodes needed to create relationships
- The query string `relationshipAction`, taking the values `merge` or `replace` specifies the behaviour when modifying relationships
  - `merge` - merges the supplied relationships with those that already exist, with the exception of properties which define n-to-one relationships, where the original value will be replaced
  - `replace` - for any relationship-defining property in the payload, replaces any existing relationships with those defined in the payload

| body                   | query                               | initial state                              | status | response type |
| ---------------------- | ----------------------------------- | ------------------------------------------ | ------ | ------------- |
| node only              | none                                | absent                                     | 201    | json          |
| node only              | none                                | existing                                   | 200    | json          |
| node and relationships | none                                | anything                                   | 400    | none          |
| node and relationships | `relationshipAction`                | existing primary node, related nodes exist | 200    | json          |
| node and relationships | `relationshipAction`                | existing primary node and related nodes    | 400    | none          |
| node and relationships | `relationshipAction`, `upsert=true` | existing primary node and related nodes    | 200    | json          |

### DELETE

Used to remove a node. _This method should be used sparingly as most types have some property which indicates whether the record is an active one or not_

| initial state                                  | status | response type |
| ---------------------------------------------- | ------ | ------------- |
| absent                                         | 404    | none          |
| existing, with relationships to other nodes    | 409    | none          |
| existing, with no relationships to other nodes | 204    | none          |