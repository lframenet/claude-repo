# Scribe v1.0.0 binaries

Prebuilt macOS app bundles, split into <=95 MB parts (git push limit is 100 MB/file).
Reassemble on your Mac with:

    cat Scribe-macOS-arm64.zip.part-* > Scribe-macOS-arm64.zip   # Apple Silicon
    cat Scribe-macOS-x64.zip.part-*   > Scribe-macOS-x64.zip       # Intel

SHA-256 of the reassembled zips:
- arm64: e93685cecff575dd3bce222498ed3d1e58ee94123d6707800c93194564501931
- x64:   2fcd848600ed993b546136c4d43f0e02f2f1c08cc439ef53e70b412089fd9b28

Then unzip and drag Scribe.app to /Applications. Unsigned: right-click -> Open on first launch.
