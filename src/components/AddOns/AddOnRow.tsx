import { FC, ReactNode } from 'react';

export interface AddOnRowProps {
  label: string;
  description: string;
  children: ReactNode;
}

export const AddOnRow: FC<AddOnRowProps> = ({ label, description, children }) => (
  <div className="flex flex-col">
    <h3 className="dial-small-semi-text text-primary">{label}</h3>
    <p className="dial-small-text mt-3 text-secondary">{description}</p>
    <div className="relative">{children}</div>
  </div>
);
