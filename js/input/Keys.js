/* =====================================================================
 * Keys.js — Samsung TV key codes, semantic actions, and mappings
 * ---------------------------------------------------------------------
 * The Tizen remote fires standard keydown events with TV-specific keyCodes.
 * We translate those (and desktop-keyboard equivalents, for dev in Chrome)
 * into a small set of semantic ACTIONs the rest of the app reasons about.
 * ===================================================================== */

/** Raw TV remote key codes (as seen on `KeyboardEvent.keyCode`). */
export const KEY = Object.freeze({
    LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40,
    ENTER: 13,
    RETURN: 10009,       // Samsung "Back" / Return
    WEBOS_BACK: 461,     // LG webOS "Back"
    ESCAPE: 27,
    MEDIA_PLAY_PAUSE: 10252,
    MEDIA_PLAY: 415,
    MEDIA_PAUSE: 19,
    MEDIA_STOP: 413,
    MEDIA_FF: 417,
    MEDIA_RW: 412,
    MEDIA_TRACK_PREV: 10232,
    MEDIA_TRACK_NEXT: 10233,
    CH_UP: 427,
    CH_DOWN: 428,
    VOL_UP: 447,
    VOL_DOWN: 448,
    MUTE: 449,
    RED: 403, GREEN: 404, YELLOW: 405, BLUE: 406,
    INFO: 457,
    EXIT: 10182,
    D0: 48, D1: 49, D2: 50, D3: 51, D4: 52, D5: 53, D6: 54, D7: 55, D8: 56, D9: 57
});

/** Semantic actions the app responds to. */
export const ACTION = Object.freeze({
    UP: 'up', DOWN: 'down', LEFT: 'left', RIGHT: 'right',
    OK: 'ok', BACK: 'back',
    PLAY: 'play', PAUSE: 'pause', PLAY_PAUSE: 'playpause', STOP: 'stop',
    FF: 'ff', REW: 'rew',
    CH_UP: 'chup', CH_DOWN: 'chdown',
    VOL_UP: 'volup', VOL_DOWN: 'voldown', MUTE: 'mute',
    RED: 'red', GREEN: 'green', YELLOW: 'yellow', BLUE: 'blue',
    INFO: 'info', EXIT: 'exit',
    DIGIT: 'digit'
});

/** keyCode -> ACTION. */
const CODE_MAP = {
    [KEY.LEFT]: ACTION.LEFT, [KEY.UP]: ACTION.UP, [KEY.RIGHT]: ACTION.RIGHT, [KEY.DOWN]: ACTION.DOWN,
    [KEY.ENTER]: ACTION.OK,
    [KEY.RETURN]: ACTION.BACK, [KEY.WEBOS_BACK]: ACTION.BACK, [KEY.ESCAPE]: ACTION.BACK,
    [KEY.MEDIA_PLAY_PAUSE]: ACTION.PLAY_PAUSE,
    [KEY.MEDIA_PLAY]: ACTION.PLAY,
    [KEY.MEDIA_PAUSE]: ACTION.PAUSE,
    [KEY.MEDIA_STOP]: ACTION.STOP,
    [KEY.MEDIA_FF]: ACTION.FF, [KEY.MEDIA_RW]: ACTION.REW,
    [KEY.MEDIA_TRACK_NEXT]: ACTION.CH_UP, [KEY.MEDIA_TRACK_PREV]: ACTION.CH_DOWN,
    [KEY.CH_UP]: ACTION.CH_UP, [KEY.CH_DOWN]: ACTION.CH_DOWN,
    [KEY.VOL_UP]: ACTION.VOL_UP, [KEY.VOL_DOWN]: ACTION.VOL_DOWN, [KEY.MUTE]: ACTION.MUTE,
    [KEY.RED]: ACTION.RED, [KEY.GREEN]: ACTION.GREEN, [KEY.YELLOW]: ACTION.YELLOW, [KEY.BLUE]: ACTION.BLUE,
    [KEY.INFO]: ACTION.INFO, [KEY.EXIT]: ACTION.EXIT
};

/** Desktop-keyboard fallback (`KeyboardEvent.key`) so Chrome dev works. */
const DESKTOP_MAP = {
    ArrowLeft: ACTION.LEFT, ArrowUp: ACTION.UP, ArrowRight: ACTION.RIGHT, ArrowDown: ACTION.DOWN,
    Enter: ACTION.OK,
    Backspace: ACTION.BACK, Escape: ACTION.BACK,
    ' ': ACTION.PLAY_PAUSE,
    f: ACTION.FF, F: ACTION.FF, r: ACTION.REW, R: ACTION.REW,
    PageUp: ACTION.CH_UP, PageDown: ACTION.CH_DOWN,
    m: ACTION.MUTE, M: ACTION.MUTE,
    i: ACTION.INFO, I: ACTION.INFO
};

/**
 * Resolve a keydown event to a semantic action.
 * @param {KeyboardEvent} e
 * @returns {{action:string, digit?:number}|null}
 */
export function resolveAction(e) {
    const code = e.keyCode || e.which;
    // Digit keys (remote number pad or desktop).
    if (code >= KEY.D0 && code <= KEY.D9) return { action: ACTION.DIGIT, digit: code - KEY.D0 };
    if (/^[0-9]$/.test(e.key)) return { action: ACTION.DIGIT, digit: Number(e.key) };

    if (CODE_MAP[code] != null) return { action: CODE_MAP[code] };
    if (DESKTOP_MAP[e.key] != null) return { action: DESKTOP_MAP[e.key] };
    return null;
}

/**
 * Names to register with tizen.tvinputdevice so the app receives these keys.
 * (Arrows/Enter/Return arrive without registration.) Registration of an
 * unsupported key throws, so RemoteControl registers each in try/catch.
 */
export const REGISTER_KEYS = Object.freeze([
    'MediaPlayPause', 'MediaPlay', 'MediaPause', 'MediaStop',
    'MediaFastForward', 'MediaRewind', 'MediaTrackPrevious', 'MediaTrackNext',
    'ChannelUp', 'ChannelDown',
    'ColorF0Red', 'ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue',
    'Info',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'
    // Volume keys intentionally left to the TV's native OSD by default.
]);
