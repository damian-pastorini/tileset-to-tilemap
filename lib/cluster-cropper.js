/**
 *
 * Reldens - ClusterCropper
 *
 */

const { TilePixelAnalyzer } = require('./tile-pixel-analyzer');
const { Helpers } = require('./utils/helpers');
const sharp = require('sharp');
const { Logger, sc } = require('@reldens/utils');

class ClusterCropper
{
    constructor(options)
    {
        this.pixelAnalyzer = new TilePixelAnalyzer();
        this.colorThreshold = Number(sc.get(options, 'colorThreshold', 30));
    }

    buildRelativeTileMap(cluster)
    {
        let tileSet = new Set();
        for(let tile of cluster.tiles){
            tileSet.add(Helpers.tileKey(tile));
        }
        return tileSet;
    }

    maskTileArea(cropBuffer, cropWidth, tileX, tileY, tileWidth, tileHeight, bgColor, isClusterTile)
    {
        let channels = 4;
        for(let py = tileY; py < tileY + tileHeight; py++){
            for(let px = tileX; px < tileX + tileWidth; px++){
                let idx = (py * cropWidth + px) * channels;
                if(!bgColor && !isClusterTile){
                    cropBuffer[idx + 3] = 0;
                }
                if(!bgColor){
                    continue;
                }
                let dist = this.pixelAnalyzer.colorDistance(
                    cropBuffer[idx], cropBuffer[idx+1], cropBuffer[idx+2],
                    bgColor.r, bgColor.g, bgColor.b
                );
                if(dist <= this.colorThreshold){
                    cropBuffer[idx + 3] = 0;
                }
            }
        }
    }

    async crop(imageBuffer, cluster, tileWidth, tileHeight, margin, spacing, bgColorHex)
    {
        let bgColor = bgColorHex ? this.pixelAnalyzer.parseHexColor(bgColorHex) : null;
        let cropRows = cluster.maxRow - cluster.minRow + 1;
        let cropCols = cluster.maxCol - cluster.minCol + 1;
        let cropX = margin + cluster.minCol * (tileWidth + spacing);
        let cropY = margin + cluster.minRow * (tileHeight + spacing);
        let cropWidth = cropCols * tileWidth + (cropCols - 1) * spacing;
        let cropHeight = cropRows * tileHeight + (cropRows - 1) * spacing;
        let meta = await sharp(imageBuffer).metadata();
        cropX = Math.max(0, Math.min(cropX, meta.width - 1));
        cropY = Math.max(0, Math.min(cropY, meta.height - 1));
        cropWidth = Math.min(cropWidth, meta.width - cropX);
        cropHeight = Math.min(cropHeight, meta.height - cropY);
        Logger.info('ClusterCropper: tiles='+cluster.tiles.length
            +' grid='+cropCols+'x'+cropRows
            +' px='+cropWidth+'x'+cropHeight
            +' crop at x='+cropX+' y='+cropY
            +' bgColor='+(bgColorHex || 'none')
        );
        let cropBuffer = await sharp(imageBuffer)
            .extract({ left: cropX, top: cropY, width: cropWidth, height: cropHeight })
            .ensureAlpha()
            .raw()
            .toBuffer();
        let tileSet = this.buildRelativeTileMap(cluster);
        for(let relRow = 0; relRow < cropRows; relRow++){
            for(let relCol = 0; relCol < cropCols; relCol++){
                let isClusterTile = tileSet.has(Helpers.tileKey([cluster.minRow+relRow, cluster.minCol+relCol]));
                let tileX = relCol * (tileWidth + spacing);
                let tileY = relRow * (tileHeight + spacing);
                this.maskTileArea(
                    cropBuffer,
                    cropWidth,
                    tileX,
                    tileY,
                    tileWidth,
                    tileHeight,
                    bgColor,
                    isClusterTile
                );
            }
        }
        let resultBuffer = await sharp(cropBuffer, {raw: { width: cropWidth, height: cropHeight, channels: 4 }})
            .png()
            .toBuffer();
        let relativeTiles = cluster.tiles.map(tile => [tile[0]-cluster.minRow, tile[1]-cluster.minCol]);
        Logger.info('ClusterCropper: cropped relativeTiles='+relativeTiles.length+' buffer='+resultBuffer.length+'b');
        return {buffer: resultBuffer, relativeTiles, cropRows, cropCols};
    }
}

module.exports.ClusterCropper = ClusterCropper;
