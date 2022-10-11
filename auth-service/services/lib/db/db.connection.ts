import { Config } from '@serverless-stack/node/config';
import { Kysely } from 'kysely';
import { PlanetScaleDialect } from 'kysely-planetscale';
import { RoleTable } from './interfaces/roles.table';
import { UserTable } from './interfaces/users.table';
import { UsersToRolesAssociationTable } from './interfaces/users_roles_associations.table';

export interface Database {
  users: UserTable;
  roles: RoleTable;
  users_roles_associations: UsersToRolesAssociationTable;
}

export const db = new Kysely<Database>({
  dialect: new PlanetScaleDialect({
    host: Config.DB_HOST,
    username: Config.DB_USERNAME,
    password: Config.DB_PASSWORD,
  }),
});
