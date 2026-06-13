import type { IUserResponse } from 'shared';

export interface IMainState {
  user: IUserResponse | null;
  theme: 'light' | 'dark' | 'system';
}

export interface IMainContext {
  state: IMainState;
  setState: React.Dispatch<React.SetStateAction<IMainState>>;
}
