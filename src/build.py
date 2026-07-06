#!/usr/bin/env python3
"""build.py — Just2Train bundler.

Assemble css/ + views/ + js/ dans un index.html monofichier autonome.
Le shell (head, header, nav, balises script) est conservé depuis l'index.html
existant via des ancres uniques ; seules les 3 régions CSS / VIEWS / JS sont
régénérées depuis les sources.

Usage:  python build.py [--check]
  (defaut)  écrit Code/index.html
  --check   n'écrit rien, sort 0 si identique à l'index.html actuel, 1 sinon
"""
import re
import sys
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent          # Code/src (sources + shell.html)
INDEX = ROOT.parent / "index.html"                       # Code/index.html (runtime, à la racine)

CSS_ORDER  = ["base", "tracker", "musculaire", "programme", "wizard", "mobilite"]
VIEW_ORDER = ["tracker", "musculaire", "programme", "programmes", "doc", "nutrition", "mobilite"]
JS_ORDER   = ["db", "security", "data", "store", "progression", "tracker",
              "musculaire", "io", "exercises-db", "programs", "generator",
              "grossesse", "wizard", "nutrition-plan", "mobilite", "resources", "help", "app"]

# Règle d'override injectée en fin de <style> par l'ancien bundler (top-nav masquée).
TAIL_CSS = "\n.top-nav-btn:nth-child(3){display:none}\n"


def read(rel):
    return (ROOT / rel).read_text(encoding="utf-8")


def build_css():
    parts = [read(f"css/{n}.css") for n in CSS_ORDER]
    # <style> est suivi d'un newline ; les fichiers finissent par \n donc join('\n')
    # insère la ligne vide entre chaque bloc.
    return "\n" + "\n".join(parts) + TAIL_CSS


def build_views():
    # Vues concaténées telles quelles (pas de séparateur, fichiers sans newline final).
    return "".join(read(f"views/{n}.html") for n in VIEW_ORDER)


def strip_module(src):
    """Retire les instructions de module ES (import ... / export { ... }),
    y compris multi-lignes, et retire le prefixe `export ` des declarations."""
    out = []
    skipping = False  # au milieu d'un import/reexport multi-lignes
    for line in src.split("\n"):
        if skipping:
            if ";" in line:              # fin de l'instruction multi-lignes
                skipping = False
            continue
        stripped = line.lstrip()
        if stripped.startswith("import ") or stripped.startswith("export {") \
                or stripped.startswith("export{"):
            if ";" not in line:          # instruction etalee sur plusieurs lignes
                skipping = True
            continue                     # ligne (ou 1ere ligne) supprimee
        if line.startswith("export "):
            line = line[len("export "):]  # export function/const/... -> prefixe retire
        out.append(line)
    return "\n".join(out)


def build_js():
    chunks = []
    for name in JS_ORDER:
        banner = f"/* -- {name}.js -- */\n"
        chunks.append(banner + strip_module(read(f"js/{name}.js")))
    # Un blanc supplementaire entre chaque fichier (comme l'ancien bundler).
    return "\n\n".join(chunks)


SHELL = ROOT / "shell.html"


def assemble():
    # shell.html contient le head/header/nav/balises <script> (source éditable),
    # avec 3 placeholders remplis depuis les fichiers sources.
    shell = SHELL.read_text(encoding="utf-8")
    return (shell
            .replace("{{CSS}}", build_css())
            .replace("{{VIEWS}}", build_views())
            .replace("{{JS}}", build_js()))


def main():
    out = assemble()
    if "--check" in sys.argv:
        cur = INDEX.read_text(encoding="utf-8")
        if out == cur:
            print("OK: bundle identique aux sources")
            return 0
        print("DIFF: le bundle differe de l'index.html actuel")
        return 1
    dest = INDEX
    if "--out" in sys.argv:
        dest = pathlib.Path(sys.argv[sys.argv.index("--out") + 1])
    dest.write_text(out, encoding="utf-8", newline="")
    print(f"{dest.name} ecrit ({len(out)} octets)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
