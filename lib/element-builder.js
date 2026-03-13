/**
 *
 * Reldens - ElementBuilder
 *
 */

const { TileBoundsCalculator } = require('./tile-bounds-calculator');

class ElementBuilder
{
    getElementBounds(element)
    {
        let tiles = element.layers.reduce((acc, layer) => acc.concat(layer.tiles), []);
        return TileBoundsCalculator.fromTiles(tiles);
    }

    buildElementJSON(element, tilesetMeta)
    {
        let hasAnyTile = false;
        for(let layer of element.layers){
            if(layer.tiles && layer.tiles.length){
                hasAnyTile = true;
                break;
            }
        }
        if(!hasAnyTile){
            return null;
        }
        let { minRow, minCol, maxRow, maxCol } = this.getElementBounds(element);
        let width = maxCol - minCol + 1;
        let height = maxRow - minRow + 1;
        let layers = [];
        for(let layerIndex = 0; layerIndex < element.layers.length; layerIndex++){
            let layer = element.layers[layerIndex];
            let data = new Array(width * height).fill(0);
            for(let tile of layer.tiles){
                let r = tile[0];
                let c = tile[1];
                let localRow = r - minRow;
                let localCol = c - minCol;
                data[localRow * width + localCol] = 1 + r * tilesetMeta.tilesetColumns + c;
            }
            layers.push({
                data,
                height,
                id: layerIndex + 1,
                name: layer.type,
                opacity: 1,
                type: 'tilelayer',
                visible: true,
                width,
                x: 0,
                y: 0
            });
        }
        let tilesetEntry = {
            columns: tilesetMeta.tilesetColumns,
            firstgid: 1,
            image: tilesetMeta.filename,
            imageheight: tilesetMeta.imageHeight,
            imagewidth: tilesetMeta.imageWidth,
            margin: tilesetMeta.margin,
            name: tilesetMeta.filename.replace('.png', ''),
            spacing: tilesetMeta.spacing,
            tilecount: tilesetMeta.tileCount,
            tileheight: tilesetMeta.tileHeight,
            tilewidth: tilesetMeta.tileWidth
        };
        return {
            backgroundcolor: '#000000',
            compressionlevel: 0,
            height,
            infinite: false,
            layers,
            nextlayerid: layers.length + 1,
            nextobjectid: 1,
            orientation: 'orthogonal',
            renderorder: 'right-down',
            tileheight: tilesetMeta.tileHeight,
            tilesets: [tilesetEntry],
            tilewidth: tilesetMeta.tileWidth,
            type: 'map',
            width
        };
    }
}

module.exports.ElementBuilder = ElementBuilder;
