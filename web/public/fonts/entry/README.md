# Entry typography

Fixed English lettering on the three entry pages uses the original SVG outlines in `../design-text`, preserving the design's glyphs instead of approximating them with substitute fonts. The supplied SVGs contain paths, not reusable font binaries, so they cannot render arbitrary input or translated text.

Quicksand remains the rounded font for editable input. Silkscreen and Cormorant Garamond Light provide fallbacks for dynamic pixel and serif text; SCR-N Five and 29LT Zarid Serif font files were not supplied. Chinese uses Microsoft YaHei for readable controls and SimSun/Songti for serif decoration.

These fonts are hosted locally and require no runtime font service. Their original SIL Open Font License files are included beside the binaries.

Sources: https://github.com/google/fonts/tree/main/ofl/silkscreen, https://github.com/google/fonts/tree/main/ofl/quicksand, https://github.com/google/fonts/tree/main/ofl/cormorantgaramond.
