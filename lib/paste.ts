import { File, Paths } from "expo-file-system";

/* Loaded on use, not on import.
 *
 *  expo-clipboard is a NATIVE module and arrived after the app binaries people
 *  are carrying were built. A top-level import of a module the binary does not
 *  contain can take the whole screen down at require time; reaching for it
 *  inside a try means an older build simply never offers the button. */
type ClipboardModule = typeof import("expo-clipboard");
let clipboard: ClipboardModule | null | undefined;

function load(): ClipboardModule | null {
  if (clipboard !== undefined) return clipboard;
  try {
    clipboard = require("expo-clipboard") as ClipboardModule;
  } catch {
    clipboard = null;
  }
  return clipboard;
}

/* Pasting a picture.
 *
 *  A screenshot is the most common image anybody has to hand — a listing they
 *  were sent, a card someone posted, the thing that went wrong. Until now the
 *  only way in was the camera or the photo library, so every one of those had
 *  to be saved to the roll first and found again afterwards.
 *
 *  The clipboard hands us base64, and everything downstream — the scan upload,
 *  the ticket attachments, the listing photos — passes a URI to FormData, which
 *  on a phone resolves file:// and nothing else. A data: URI would upload
 *  rubbish rather than fail loudly, so the bytes are written to a real cache
 *  file and the caller gets back exactly the kind of URI the image picker
 *  gives it. Nothing above this line needs to know where the picture came from.
 */

/** Is there a picture on the clipboard right now?
 *
 *  Asks whether one EXISTS rather than reading it, which on iOS is the
 *  difference between a silent check and the system paste banner. Never
 *  throws: a clipboard we cannot read is the same as an empty one. */
export async function clipboardHasImage(): Promise<boolean> {
  const mod = load();
  if (!mod) return false;
  try {
    return await mod.hasImageAsync();
  } catch {
    return false;
  }
}

/** The picture on the clipboard, written to a file.
 *
 *  Returns a file:// URI, or null when there is nothing to paste. PNG because
 *  a screenshot is already PNG and re-encoding it to JPEG would put
 *  compression artefacts into the one image a scan has to read text off. */
export async function pasteImage(): Promise<string | null> {
  const mod = load();
  if (!mod) return null;
  let image: { data: string } | null = null;
  try {
    image = await mod.getImageAsync({ format: "png" });
  } catch {
    return null;
  }
  if (!image?.data) return null;

  // The SDK hands back a full data: URI. Only the payload goes in the file.
  const payload = image.data.replace(/^data:image\/\w+;base64,/, "");
  if (!payload) return null;

  try {
    // Named by the clock so two pastes in one session cannot collide, and in
    // the cache directory because the system is welcome to reclaim it — the
    // upload has happened long before that matters.
    const file = new File(Paths.cache, `pasted-${Date.now()}.png`);
    file.create({ overwrite: true });
    file.write(payload, { encoding: "base64" });
    return file.uri;
  } catch {
    return null;
  }
}
