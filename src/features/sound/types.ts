/** What kind of key press made the sound. "error" is a wrong key; the others are correct input. */
export type KeySoundKind = "key" | "space" | "backspace" | "error";

/** Called synchronously after each handled key press. Must be cheap and must never throw. */
export type KeySoundHandler = (kind: KeySoundKind) => void;
