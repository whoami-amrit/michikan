import { type ClassValue, clsx } from 'clsx';
import ky from 'ky';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const api = ky.create({
  prefix: 'api/v1',
});
