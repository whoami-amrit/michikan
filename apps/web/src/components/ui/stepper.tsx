interface IStep {
  index: number;
  IconComponent: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  state: 'active' | 'completed' | 'inactive' | 'error';
  onClick?: () => void;
}

const getStepConnectorBackgroundColor = (state: IStep['state']) => {
  if (state === 'error') {
    return 'before:border-destructive';
  }
  if (state === 'completed' || state === 'active') {
    return 'before:border-primary';
  }
  return 'before:border-secondary';
};

const getStepIconForegroundColor = (state: IStep['state']) => {
  if (state === 'inactive') {
    return 'text-muted-foreground';
  }
  return 'text-primary-foreground';
};

const getStepIconBackgroundColor = (state: IStep['state']) => {
  if (state === 'error') {
    return 'bg-destructive';
  }
  if (state === 'active' || state === 'completed') {
    return 'bg-primary';
  }
  return '';
};

function Step({ index, IconComponent, state, onClick }: IStep) {
  const connectorClasses = `before:content-[''] before:w-12.5 before:h-px before:border-b ${getStepConnectorBackgroundColor(state)} before:border-2 before:inline-block before:mr-4 before:rounded-full`;

  return (
    <li
      role="button"
      onClick={onClick}
      className={`flex items-center ${index > 0 ? connectorClasses : ''}`}
    >
      <span
        className={`flex items-center justify-center size-6 ${getStepIconBackgroundColor(state)} rounded-full`}
      >
        <IconComponent className={`size-4 ${getStepIconForegroundColor(state)}`} />
      </span>
    </li>
  );
}

function Stepper({ children }: { children: React.ReactElement<IStep>[] }) {
  return <ol className="flex items-center space-x-4 mt-2">{children}</ol>;
}

export { Step, Stepper };
