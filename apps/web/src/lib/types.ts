export interface IMainState {
  theme: 'light' | 'dark' | 'system';
}

export interface IMainContext {
  state: IMainState;
  setState: React.Dispatch<React.SetStateAction<IMainState>>;
}

export interface ICrumb {
  name: string;
  path: string;
}
