import { getModelForClass, prop } from '@typegoose/typegoose';

class AuthClient {
  @prop()
  _id!: string;
  @prop()
  secret!: string;
  @prop()
  name!: string;
}
export const AuthClientModel = getModelForClass(AuthClient);
