import { Config } from '@serverless-stack/node/config';
import { Kysely } from 'kysely';
import { PlanetScaleDialect } from 'kysely-planetscale';
import { AuthInfoTable } from './interfaces/auth_info.table';
import { UsersToClientsAssociationsTable } from './interfaces/users_clients_associations.table';
import { RoleTable } from './interfaces/roles.table';
import { UserTable } from './interfaces/users.table';
import { UsersToRolesAssociationTable } from './interfaces/users_roles_associations.table';
import { AuthClientsTable } from './interfaces/auth_clients.table';

export interface Database {
  auth_clients: AuthClientsTable;
  users: UserTable;
  roles: RoleTable;
  users_roles_associations: UsersToRolesAssociationTable;
  users_clients_associations: UsersToClientsAssociationsTable;
  auth_info: AuthInfoTable;
}

export const db = new Kysely<Database>({
  dialect: new PlanetScaleDialect({
    host: Config.DB_HOST,
    username: Config.DB_USERNAME,
    password: Config.DB_PASSWORD,
  }),
});
