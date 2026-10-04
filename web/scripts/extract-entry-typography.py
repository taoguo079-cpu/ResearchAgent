"""Extract only original outlined labels; never a whole-page background."""

from copy import deepcopy
from hashlib import sha256
from pathlib import Path
import json
import re
from xml.etree import ElementTree as E

E.register_namespace("", "http://www.w3.org/2000/svg")
E.register_namespace("xlink", "http://www.w3.org/1999/xlink")
NS = "{http://www.w3.org/2000/svg}"
ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "web/public/design-text"
OUTPUT.mkdir(parents=True, exist_ok=True)

sources = {
    "home": ROOT / "例子/Research Agent · 简洁首页.svg",
    "menu": ROOT / "例子/2.svg",
    "question": ROOT / "例子/3.svg",
}
trees = {name: E.parse(file).getroot() for name, file in sources.items()}


def branch(root, indexes):
    """Keep ancestor transforms and clips while discarding unrelated siblings."""
    node = root[indexes[0]]
    if len(indexes) == 1:
        return deepcopy(node)
    wrapper = E.Element(node.tag, node.attrib)
    wrapper.append(branch(node, indexes[1:]))
    return wrapper


def children(root, parent_indexes, start):
    node = root
    for index in parent_indexes:
        node = node[index]
    return [branch(root, [*parent_indexes, index]) for index in range(start, len(node))]


home, menu, question = (trees[name] for name in sources)
labels = {
    "home-data": ("home", [branch(home, [5, 0, 1])]),
    "home-power": ("home", [branch(home, [5, 0, 0])]),
    "home-research": ("home", [branch(home, [i]) for i in range(6, 32)]),
    "home-agent": ("home", [branch(home, [73])]),
    "home-partner": ("home", [branch(home, [4, 0, 3])]),
    "home-next": ("home", children(home, [72, 0], 1)),
    "language-zh": ("home", [branch(home, [i]) for i in range(68, 72)]),
    "menu-new": ("menu", [branch(menu, [i]) for i in range(43, 57)]),
    "menu-history": ("menu", [branch(menu, [i]) for i in range(64, 71)]),
    "question-title": ("question", [branch(question, [i]) for i in range(3, 15)]),
    "question-prompt": ("question", [branch(question, [i]) for i in range(15, 47)]),
    "question-placeholder": ("question", [branch(question, [i]) for i in range(53, 86)]),
    "question-send": ("question", [branch(question, [52])]),
}
manifest = {"canvas": {"width": 1366, "height": 768}, "assets": {}}
for name, (page, nodes) in labels.items():
    root = trees[page]
    defs_by_id = {el.get("id"): el for el in root.find(NS + "defs") if el.get("id")}
    refs = set()

    def scan(node):
        for child in node.iter():
            for value in child.attrib.values():
                refs.update(re.findall(r"url\(#([^\)]+)\)", value))

    for node in nodes:
        scan(node)
    seen = set()
    while refs - seen:
        key = next(iter(refs - seen))
        seen.add(key)
        scan(defs_by_id[key])
    svg = E.Element(NS + "svg", {"width": "1366", "height": "768", "viewBox": "0 0 1024.5 576"})
    if seen:
        defs = E.SubElement(svg, NS + "defs")
        for key in sorted(seen):
            defs.append(deepcopy(defs_by_id[key]))
    for node in nodes:
        svg.append(node)
    E.ElementTree(svg).write(OUTPUT / f"{name}.svg", encoding="unicode")
    manifest["assets"][name] = {
        "src": f"/design-text/{name}.svg",
        "source": sources[page].relative_to(ROOT).as_posix(),
        "sourceSha256": sha256(sources[page].read_bytes()).hexdigest(),
    }
(OUTPUT / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"Extracted {len(labels)} isolated vector labels. Run crop-entry-typography.mjs next.")
