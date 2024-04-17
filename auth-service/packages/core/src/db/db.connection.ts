import { Config } from 'sst/node/config';
import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';
import { AuthInfoTable } from './interfaces/auth_info.table';
import { SessionsTable } from './interfaces/users_clients_associations.table';
import { RoleTable } from './interfaces/roles.table';
import { UserTable } from './interfaces/users.table';
import { UsersToRolesAssociationTable } from './interfaces/users_roles_associations.table';
import { AuthClientsTable } from './interfaces/auth_clients.table';

export interface Database {
  'whiskey.auth_clients': AuthClientsTable;
  'whiskey.users': UserTable;
  'whiskey.roles': RoleTable;
  'whiskey.users_roles_associations': UsersToRolesAssociationTable;
  'whiskey.sessions': SessionsTable;
  'whiskey.auth_info': AuthInfoTable;
}

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      host: Config.DB_HOST,
      database: Config.DB_NAME,
      user: Config.DB_USERNAME,
      password: Config.DB_PASSWORD,
    }),
  }),
});
