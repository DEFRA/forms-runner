import { initialiseSession } from "../../plugins/initialiseSession/initialiseSession";

export function configureInitialiseSessionPlugin(options: {
  safelist: string[];
}) {
  return {
    plugin: initialiseSession,
    options,
  };
}
