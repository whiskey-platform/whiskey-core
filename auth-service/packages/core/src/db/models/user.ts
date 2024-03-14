import { getModelForClass, modelOptions, prop } from '@typegoose/typegoose';

@modelOptions({ schemaOptions: { _id: false } })
class AuthInfoClass {
  @prop()
  hash!: string;
  @prop()
  salt!: string;
}

class User {
  @prop()
  username!: string;
  @prop()
  firstName!: string;
  @prop()
  lastName!: string;
  @prop()
  authInfo!: AuthInfoClass;
  @prop()
  roles!: string[];
}
export const UserModel = getModelForClass(User);
