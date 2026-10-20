# Licensing scope

The root MIT license covers the locally authored application code and build tools. It does not relicense third-party models, fonts, animation libraries or study-source media.

- Four Sketchfab model sources: CC BY 4.0, with creators, URLs and modification notices in [ASSET-SOURCES.txt](docs/ASSET-SOURCES.txt).
- Instrument Serif and Manrope: SIL Open Font License. The complete notices accompany the fonts in `assets/fonts/`.
- Three.js and Splitting.js: MIT; notices in `vendor/`.
- Packaged seated, standing, turning and bowing motion: Mesh2Motion CC0-1.0; provenance in `assets/motion/`.
- The classroom presentation also incorporates a separately licensed Adobe Mixamo Gangnam Style performance. Its raw FBX and retargeted dance tracks are **not included in this public source tree** and are not MIT/CC0 assets. Adobe permits creative projects but restricts redistribution of raw character/animation files: [official FAQ](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html), [distribution explanation](https://community.adobe.com/questions-696/mixamo-faq-licensing-royalties-ownership-eula-and-tos-589400?lang=en).
- Rendered screenshots, GIFs and videos are project examples, not downloadable motion libraries. Their incorporated model and media credits remain applicable.

The public build uses the packaged CC0 standing/bow sequence. A project owner who has independently licensed the original motion can supply their local full motion JSON using `python build.py --motion-file /path/to/study-motion.json`. This option reads a local input; it does not download, license or publish it.
