"""Package the approved Source Han Sans CN faces as self-hosted WOFF2.

Requires fonttools[woff] and brotli. Source OTF files and LICENSE.txt must
come from adobe-fonts/source-han-sans, release/SubsetOTF/CN. Renaming the
web derivative respects the upstream OFL reserved name "Source".
"""

import argparse
import shutil
from pathlib import Path

from fontTools.ttLib import TTFont


def package_face(source_dir: Path, output_dir: Path, style: str) -> None:
    source = source_dir / f"SourceHanSansCN-{style}.otf"
    destination = output_dir / f"ResearchAgentHan-{style}.woff2"
    with TTFont(source) as font:
        original_cmap = font.getBestCmap()
        family = "Research Agent Han"
        full_name = f"{family} {style}"
        postscript = f"ResearchAgentHan-{style}"
        names = {
            1: family,
            2: style,
            3: f"ResearchAgentHan-{style}; Source Han Sans 2.005 web conversion",
            4: full_name,
            6: postscript,
            16: family,
            17: style,
            18: full_name,
        }
        for record in font["name"].names:
            if record.nameID in names:
                record.string = names[record.nameID].encode(record.getEncoding())
        cff = font["CFF "].cff
        cff.fontNames = [postscript]
        cff.topDictIndex[0].FamilyName = family
        cff.topDictIndex[0].FullName = full_name
        font.flavor = "woff2"
        font.save(destination)
    with TTFont(destination) as packaged:
        if packaged.getBestCmap() != original_cmap:
            raise ValueError(f"Character coverage changed during conversion: {style}")
        if packaged["OS/2"].usWeightClass != (400 if style == "Regular" else 700):
            raise ValueError(f"Unexpected weight: {style}")
    print(f"{destination.name}: {destination.stat().st_size:,} bytes")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", required=True, type=Path)
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "public/fonts/source-han-sans",
    )
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for style in ("Regular", "Bold"):
        package_face(args.source_dir, args.output_dir, style)
    license_path = args.source_dir / "LICENSE.txt"
    if not license_path.exists():
        license_path = args.source_dir / "SourceHanSans-LICENSE.txt"
    shutil.copyfile(license_path, args.output_dir / "LICENSE.txt")


if __name__ == "__main__":
    main()
