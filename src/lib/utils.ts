import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Utility to wrap promises with a timeout
export const withTimeout = <T,>(promise: PromiseLike<T>, ms: number = 8000): Promise<T> => {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout: O servidor demorou muito a responder')), ms))
  ]);
};
