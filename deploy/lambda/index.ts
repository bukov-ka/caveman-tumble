﻿import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as AWS from 'aws-sdk';
const dynamo = new AWS.DynamoDB.DocumentClient();

interface Item {
  id: string;
  content: string;
  password: string;
  contenttype: string;
}

exports.handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const responseHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST',
  };

  const tableName = process.env.TABLE_NAME;
  const id = event.pathParameters?.id;

  if (!id) {
    return {
      statusCode: 400,
      headers: responseHeaders,
      body: 'Missing id in path parameters',
    };
  }

  switch (event.httpMethod) {
    case 'GET':
      const data = await dynamo.get({
        TableName: tableName!,
        Key: { id },
        ProjectionExpression: 'id, content, contenttype'
      }).promise();

      return {
        statusCode: 200,
        headers: responseHeaders,
        body: JSON.stringify(data.Item),
      };

    case 'POST':
      const item: Item = JSON.parse(event.body!);
      if (!item.password) {
        return {
          statusCode: 400,
          headers: responseHeaders,
          body: 'Missing "password" in request body',
        };
      }

      const existingItem = await dynamo.get({
        TableName: tableName!,
        Key: { id },
      }).promise();

      if (existingItem.Item && existingItem.Item.password !== item.password) {
        return {
          statusCode: 403,
          headers: responseHeaders,
          body: 'Incorrect password',
        };
      }

      await dynamo.put({
        TableName: tableName!,
        Item: item,
      }).promise();

      return {
        statusCode: 200,
        headers: responseHeaders,
        body: 'Item created/updated',
      };

    default:
      return {
        statusCode: 400,
        headers: responseHeaders,
        body: 'Invalid request method',
      };
  }
};
