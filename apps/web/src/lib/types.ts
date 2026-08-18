export interface IMainState {
  theme: 'light' | 'dark';
}

export interface IMainContext {
  state: IMainState;
  setState: React.Dispatch<React.SetStateAction<IMainState>>;
}

export interface ICrumb {
  label: string;
  isLoading?: boolean;
  pathname: string;
}
