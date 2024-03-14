import { getModelForClass, prop } from '@typegoose/typegoose';

class Session {
  @prop()
  clientId!: string;
  @prop()
  userId!: string;
  @prop()
  refreshToken!: string;
}
export const SessionsModel = getModelForClass(Session);
