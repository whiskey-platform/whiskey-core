import { Generated } from 'kysely';

export interface UserTable {
  id: Generated<number>;
  username: string;
  first_name: string;
  last_name: string;
}
