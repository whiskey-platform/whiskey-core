import { Handler } from 'aws-lambda';
import {
  AuthClientModel,
  connectToDB,
  SessionsModel,
  UserModel,
  wrapped,
} from '@auth-service/core';
import { RowDataPacket, createConnection } from 'mysql2/promise';
import { Config } from 'sst/node/config';

const migrate: Handler = async event => {
  await connectToDB(); // mongo
  console.log('Connected to MongoDB');
  const mysqlConnection = await createConnection(
    `mysql://${Config.DB_USERNAME}:${Config.DB_PASSWORD}@aws.connect.psdb.cloud/whiskey?ssl={"rejectUnauthorized":true}`
  );
  console.log('Connected to PlanetScale');

  const [sql_users, _unused_s_u] = await mysqlConnection.query<RowDataPacket[]>(
    'SELECT * FROM users'
  );
  console.log('Fetched users from PlanetScale');
  const [sql_authClients, _unused_s_a] = await mysqlConnection.query<RowDataPacket[]>(
    'SELECT * FROM auth_clients'
  );
  console.log('Fetched auth clients from PlanetScale');
  const [sql_sessions, _unused_s_s] = await mysqlConnection.query<RowDataPacket[]>(
    `SELECT * FROM sessions`
  );
  console.log('Fetched auth sessions from PlanetScale');

  sql_authClients.forEach(async client => {
    const { id, name, secret } = client;
    await AuthClientModel.create({
      _id: id,
      name,
      secret,
    });
  });
  console.log('Migrated auth clients to MongoDB');

  sql_users.forEach(async user => {
    const { id, username, first_name, last_name } = user;
    await UserModel.create({
      username,
      firstName: first_name,
      lastName: last_name,
      roles: (
        await mysqlConnection.query<RowDataPacket[]>(
          `
        SELECT roles.name as role_name
        FROM users_roles_associations
          INNER JOIN users
            ON users_roles_associations.user_id = users.id
          INNER JOIN roles
            ON users_roles_associations.role_id = roles.id
        WHERE user_id = ?;`,
          [id]
        )
      )[0].map(role => role.role_name),
      authInfo: (
        await mysqlConnection.query<RowDataPacket[]>(
          `
        SELECT hash, salt
        FROM whiskey.auth_info
        WHERE user_id = ?;`,
          [id]
        )
      )[0][0],
    });
  });
  console.log('Migrated users to MongoDB');

  sql_sessions.forEach(async session => {
    const { user_id, client_id, refresh_token } = session;
    await SessionsModel.create({
      userId: user_id,
      clientId: client_id,
      refreshToken: refresh_token,
    });
  });
  console.log('Migrated sessions to MongoDB');
};

export const handler = wrapped(migrate);
