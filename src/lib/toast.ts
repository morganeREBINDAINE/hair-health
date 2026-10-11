type Listener = (msg: string) => void;

let listener: Listener | null = null;

export const Toast = {
  error(msg: string) {
    listener?.(msg);
  },
  subscribe(fn: Listener) {
    listener = fn;
    return () => {
      if (listener === fn) listener = null;
    };
  },
};
