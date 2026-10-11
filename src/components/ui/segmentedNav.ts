/** Index to move to for an arrow, Home or End key, or null if the key is not for us. */
export function nextIndex(key: string, from: number, count: number): number | null {
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return (from + 1) % count;
    case "ArrowLeft":
    case "ArrowUp":
      return (from - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}
