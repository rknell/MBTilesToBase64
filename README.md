Simple little app that converts the Blob field of an MBTiles file to a base64 string.

This is used because the cordova sqlite plugin does not support blobs. It also reduces the overhead on the mobile device having to convert each file to base64 before injecting it via a map viewer such as leaflet.

Installation:

```bash
npm install -g mbtilestobase64
```

Usage:

```bash
$ mbTilesToBase64 <filename>
```

**WARNING - This is destructive! make sure you have a backup of your MBTiles file first. Don't run the command twice - it will delete the tiles table the second time**
