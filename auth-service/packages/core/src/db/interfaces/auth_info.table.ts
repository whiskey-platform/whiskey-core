export interface AuthInfoTable {
  user_id: number;
  salt: string;
  verifier: string;
  server_ephemeral: string | null;
  client_ephemeral: string | null;
}
