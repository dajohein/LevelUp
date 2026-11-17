/**
 * Reloads the page. A separate module so tests can observe reloads: `window.location.reload`
 * cannot be replaced or spied on in jsdom.
 */
export const reloadPage = (): void => {
  window.location.reload();
};
