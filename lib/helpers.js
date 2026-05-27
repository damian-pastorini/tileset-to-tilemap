/**
 *
 * Reldens - Helpers
 *
 */

class Helpers
{
    static padNum(n)
    {
        return (''+n).padStart(3, '0');
    }

    static tileKey(tile)
    {
        return tile[0]+','+tile[1];
    }

    static elementName(n)
    {
        return 'element-'+Helpers.padNum(n);
    }

    static sanitizeSessionId(raw)
    {
        return raw.replace(/[^a-zA-Z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
    }

    static calcTileColumns(imageWidth, margin, spacing, tileWidth)
    {
        return Math.floor((imageWidth - 2 * margin + spacing) / (tileWidth + spacing));
    }

    static calcTileRows(imageHeight, margin, spacing, tileHeight)
    {
        return Math.floor((imageHeight - 2 * margin + spacing) / (tileHeight + spacing));
    }

    static resolveEntryTilesetIndex(entry, tilesets)
    {
        if(!entry){
            return -1;
        }
        if(undefined !== entry.tilesetKey && tilesets){
            return Helpers.findTilesetByKey(tilesets, entry.tilesetKey);
        }
        if(undefined !== entry.tilesetIndex){
            return entry.tilesetIndex;
        }
        return -1;
    }

    static findTilesetByKey(tilesets, tilesetKey)
    {
        for(let ti = 0; ti < tilesets.length; ti++){
            let tileset = tilesets[ti];
            if(tileset.filename === tilesetKey){
                return ti;
            }
            if(tileset.originalFilename === tilesetKey){
                return ti;
            }
        }
        return -1;
    }
}

module.exports.Helpers = Helpers;
