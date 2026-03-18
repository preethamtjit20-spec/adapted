"""Braille translation using liblouis CLI (lou_translate)."""

import logging
import shutil
import subprocess

logger = logging.getLogger(__name__)

_lou_translate = shutil.which("lou_translate")


def translate_to_braille(text: str, table: str = "en-ueb-g2.ctb") -> str:
    """Translate text to Unicode Braille using liblouis lou_translate CLI.

    Args:
        text: Input text to translate
        table: Braille table name (default: English UEB Grade 2)

    Returns:
        Unicode Braille string
    """
    if not text or not text.strip():
        return ""

    if _lou_translate:
        try:
            proc = subprocess.run(
                [_lou_translate, table],
                input=text,
                capture_output=True,
                text=True,
                timeout=5,
            )
            if proc.returncode == 0 and proc.stdout.strip():
                ascii_braille = proc.stdout.strip()
                return _ascii_to_unicode_braille(ascii_braille)
        except Exception as e:
            logger.warning("lou_translate failed: %s, using fallback", e)

    return _fallback_braille(text)


# North American ASCII Braille -> Unicode Braille (U+2800 block)
# This maps the ASCII output of liblouis to proper Unicode Braille patterns
_ASCII_BRAILLE_MAP = {
    " ": "⠀",  # space
    "a": "⠁", "b": "⠃", "c": "⠉", "d": "⠙", "e": "⠑", "f": "⠋", "g": "⠛",
    "h": "⠓", "i": "⠊", "j": "⠚", "k": "⠅", "l": "⠇", "m": "⠍", "n": "⠝",
    "o": "⠕", "p": "⠏", "q": "⠟", "r": "⠗", "s": "⠎", "t": "⠞", "u": "⠥",
    "v": "⠧", "w": "⠺", "x": "⠭", "y": "⠽", "z": "⠵",
    # Uppercase indicator
    ",": "⠂",  # capital letter indicator in UEB
    ";": "⠆",  # capital word indicator
    # Numbers
    "#": "⠼",  # number indicator
    "1": "⠁", "2": "⠃", "3": "⠉", "4": "⠙", "5": "⠑",
    "6": "⠋", "7": "⠛", "8": "⠓", "9": "⠊", "0": "⠚",
    # Punctuation
    ".": "⠲", "!": "⠖", "?": "⠦", "'": "⠄", "-": "⠤",
    ":": "⠒", "(": "⠐⠣"[0], ")": "⠐⠜"[0], "/": "⠸",
    "&": "⠯", "=": "⠶", "+": "⠬", "*": "⠔",
    "@": "⠈", "^": "⠘", "_": "⠨", '"': "⠘",
    "<": "⠣", ">": "⠜", "[": "⠨", "]": "⠴",
    "\\": "⠸", "$": "⠫", "%": "⠩",
}


def _ascii_to_unicode_braille(text: str) -> str:
    """Convert liblouis ASCII braille output to Unicode Braille patterns."""
    result = []
    for ch in text:
        if ch in _ASCII_BRAILLE_MAP:
            result.append(_ASCII_BRAILLE_MAP[ch])
        elif ch.lower() in _ASCII_BRAILLE_MAP:
            result.append(_ASCII_BRAILLE_MAP[ch.lower()])
        elif ord(ch) >= 0x2800 and ord(ch) <= 0x28FF:
            result.append(ch)
        else:
            result.append("⠀")  # empty braille cell
    return "".join(result)


def _fallback_braille(text: str) -> str:
    """Simple Grade 1 Braille fallback if liblouis is unavailable."""
    char_map = {
        "a": "⠁", "b": "⠃", "c": "⠉", "d": "⠙", "e": "⠑", "f": "⠋", "g": "⠛",
        "h": "⠓", "i": "⠊", "j": "⠚", "k": "⠅", "l": "⠇", "m": "⠍", "n": "⠝",
        "o": "⠕", "p": "⠏", "q": "⠟", "r": "⠗", "s": "⠎", "t": "⠞", "u": "⠥",
        "v": "⠧", "w": "⠺", "x": "⠭", "y": "⠽", "z": "⠵", " ": "⠀",
        ".": "⠲", ",": "⠂", "!": "⠖", "?": "⠦", "'": "⠄", "-": "⠤",
    }
    return "".join(char_map.get(c.lower(), "⠀") for c in text)
