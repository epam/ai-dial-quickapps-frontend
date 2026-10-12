import { act } from 'react';
import { expect } from 'vitest';

/** Clicks the element inside `act`; fails the test if it wasn't found. */
export const click = (element?: Element | null) => {
  expect(element).toBeTruthy();
  act(() => (element as HTMLElement).click());
};

/**
 * Finds a button by its accessible name: its `aria-label`, or its text when
 * it has none. Searches the whole document by default, so portaled popups
 * are found too.
 */
export const getButton = (name: string, scope: ParentNode = document.body) =>
  [...scope.querySelectorAll<HTMLButtonElement>('button')].find(
    (button) => (button.getAttribute('aria-label') ?? button.textContent) === name,
  );

/**
 * Sets an input's value the way the browser does on typing, so React's
 * `onChange` fires.
 */
export const typeInto = (input: HTMLInputElement | HTMLTextAreaElement | null, text: string) => {
  expect(input).toBeTruthy();
  const prototype = Object.getPrototypeOf(input) as HTMLInputElement | HTMLTextAreaElement;
  const setValue = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  act(() => {
    setValue?.call(input, text);
    input?.dispatchEvent(new Event('input', { bubbles: true }));
  });
};
