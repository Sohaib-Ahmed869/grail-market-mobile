import { useCallback, useEffect, useState } from "react";
import { AppState, Linking } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";

// Where the person holding the phone is, for "2 km away".
//
// Selling here is local — the meet-up is the transaction — so distance is the
// fact a buyer decides on. The point is rounded to about a kilometre here,
// again on the server, and never stored; the label is the phone's own reverse
// geocode, so no map service sees it.
//
// expo-location is a native module. A development build made before it was
// added has no such module, and importing it there throws — so it is required
// lazily, and a build without it reads as "unavailable": the home screen still
// works, it just cannot say how far anything is.

export type Place = { lat: number; lon: number; label: string | null };
export type PlaceState =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "undetermined" }
  | { status: "denied"; canAskAgain: boolean }
  | { status: "ready"; place: Place };

type LocationModule = typeof import("expo-location");

let mod: LocationModule | null | undefined;
function location(): LocationModule | null {
  if (mod !== undefined) return mod;
  // Ask for the native half BEFORE touching the JS package. A try/catch round
  // require() is not enough: in development the module's own load failure is
  // reported to LogBox as an uncaught error while it is still loading, so the
  // catch below runs after a red screen has already covered the app.
  if (!requireOptionalNativeModule("ExpoLocation")) {
    mod = null;
    return mod;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require("expo-location") as LocationModule;
  } catch {
    mod = null;
  }
  return mod;
}

/** Remembered for the session, so moving between tabs does not ask the GPS
 *  again every time Home comes back into view. */
let known: Place | null = null;
const TEN_MINUTES = 10 * 60 * 1000;

const round = (n: number) => Math.round(n * 100) / 100;

async function locate(L: LocationModule): Promise<Place | null> {
  try {
    // A fix from the last ten minutes is as good as a new one for "how many
    // km", and it is instant; a fresh one can take seconds indoors.
    const pos =
      (await L.getLastKnownPositionAsync({ maxAge: TEN_MINUTES })) ??
      (await L.getCurrentPositionAsync({ accuracy: L.Accuracy.Balanced }));
    if (!pos) return null;
    const lat = round(pos.coords.latitude), lon = round(pos.coords.longitude);
    let label: string | null = null;
    try {
      const [a] = await L.reverseGeocodeAsync({ latitude: lat, longitude: lon });
      // Suburb before city: "Surry Hills" says more than "Sydney" does to
      // somebody deciding whether to drive.
      label = a?.district ?? a?.city ?? a?.subregion ?? null;
    } catch {
      /* the distance still works without a name */
    }
    known = { lat, lon, label };
    return known;
  } catch {
    return null;
  }
}

/** The viewer's place, and a way to ask for it.
 *
 *  Never prompts on its own. The permission dialog appears when somebody taps
 *  the location chip or "Use my location", because a dialog on first open,
 *  before the screen has said why, is the one most people refuse. */
export function useViewerPlace(): { state: PlaceState; ask: () => void; refresh: () => void } {
  const [state, setState] = useState<PlaceState>(() =>
    known ? { status: "ready", place: known } : { status: "loading" });

  const check = useCallback(async () => {
    const L = location();
    if (!L) { setState({ status: "unavailable" }); return; }
    try {
      const p = await L.getForegroundPermissionsAsync();
      if (p.granted) {
        if (known) { setState({ status: "ready", place: known }); return; }
        const place = await locate(L);
        setState(place ? { status: "ready", place } : { status: "unavailable" });
      } else if (p.status === "undetermined") {
        setState({ status: "undetermined" });
      } else {
        setState({ status: "denied", canAskAgain: p.canAskAgain });
      }
    } catch {
      setState({ status: "unavailable" });
    }
  }, []);

  useEffect(() => {
    void check();
    // Somebody sent to Settings to switch location on comes back to the app,
    // not to a button — so look again when it becomes active.
    const sub = AppState.addEventListener("change", (s) => { if (s === "active") void check(); });
    return () => sub.remove();
  }, [check]);

  const ask = useCallback(async () => {
    const L = location();
    if (!L) return;
    if (state.status === "denied" && !state.canAskAgain) {
      // iOS shows its dialog once. After a refusal the only way back is
      // Settings, and a button that does nothing is worse than one that goes
      // there.
      void Linking.openSettings();
      return;
    }
    setState({ status: "loading" });
    try {
      const p = await L.requestForegroundPermissionsAsync();
      if (!p.granted) { setState({ status: "denied", canAskAgain: p.canAskAgain }); return; }
      const place = await locate(L);
      setState(place ? { status: "ready", place } : { status: "unavailable" });
    } catch {
      setState({ status: "unavailable" });
    }
  }, [state]);

  const refresh = useCallback(() => { known = null; void check(); }, [check]);

  return { state, ask: () => { void ask(); }, refresh };
}
