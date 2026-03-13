/**
 *
 * Reldens - TilesetImageMerger
 *
 */

const sharp = require('sharp');
const { Logger } = require('@reldens/utils');

class TilesetImageMerger
{
    static async normalizeTilesetBuffer(filePath, cols, rows, tileWidth, tileHeight, margin, spacing)
    {
        let destWidth = cols * tileWidth;
        let destHeight = rows * tileHeight;
        if(0 === spacing && 0 === margin){
            let meta = await sharp(filePath).metadata();
            if(meta.width === destWidth && meta.height === destHeight){
                let buffer = await sharp(filePath).ensureAlpha().png().toBuffer();
                return {buffer, width: destWidth, height: destHeight};
            }
            let buffer = await sharp(filePath)
                .ensureAlpha()
                .resize(destWidth, destHeight, {fit: 'fill', kernel: sharp.kernel.nearest})
                .png()
                .toBuffer();
            return {buffer, width: destWidth, height: destHeight};
        }
        let meta = await sharp(filePath).metadata();
        let rawBuffer = await sharp(filePath).ensureAlpha().raw().toBuffer();
        let srcWidth = meta.width;
        let destBuffer = Buffer.alloc(destWidth * destHeight * 4, 0);
        for(let row = 0; row < rows; row++){
            for(let col = 0; col < cols; col++){
                let srcX = margin + col * (tileWidth + spacing);
                let srcY = margin + row * (tileHeight + spacing);
                let dstX = col * tileWidth;
                let dstY = row * tileHeight;
                for(let py = 0; py < tileHeight; py++){
                    let srcOffset = ((srcY + py) * srcWidth + srcX) * 4;
                    let dstOffset = ((dstY + py) * destWidth + dstX) * 4;
                    rawBuffer.copy(destBuffer, dstOffset, srcOffset, srcOffset + tileWidth * 4);
                }
            }
        }
        let buffer = await sharp(destBuffer, {raw: {width: destWidth, height: destHeight, channels: 4}})
            .png()
            .toBuffer();
        return {buffer, width: destWidth, height: destHeight};
    }

    static packTilesets(tilesets)
    {
        let totalTiles = 0;
        for(let ts of tilesets){
            totalTiles += ts.tilesetColumns * ts.tileRows;
        }
        let approxSide = Math.ceil(Math.sqrt(totalTiles));
        let placements = [];
        let currentCol = 0;
        let currentRow = 0;
        let rowMaxHeight = 0;
        for(let ts of tilesets){
            if(currentCol > 0 && currentCol + ts.tilesetColumns > approxSide){
                currentRow += rowMaxHeight;
                currentCol = 0;
                rowMaxHeight = 0;
            }
            placements.push({tileset: ts, colOffset: currentCol, rowOffset: currentRow});
            currentCol += ts.tilesetColumns;
            if(ts.tileRows > rowMaxHeight){
                rowMaxHeight = ts.tileRows;
            }
        }
        let mergedColumns = 0;
        let mergedRows = 0;
        for(let p of placements){
            let rightEdge = p.colOffset + p.tileset.tilesetColumns;
            let bottomEdge = p.rowOffset + p.tileset.tileRows;
            if(rightEdge > mergedColumns){
                mergedColumns = rightEdge;
            }
            if(bottomEdge > mergedRows){
                mergedRows = bottomEdge;
            }
        }
        return {placements, mergedColumns, mergedRows};
    }

    static async buildMergedImage(normalizedImages, outputPath)
    {
        let canvasWidth = 0;
        let canvasHeight = 0;
        let composites = [];
        for(let img of normalizedImages){
            let right = img.left + img.width;
            let bottom = img.top + img.height;
            if(right > canvasWidth){
                canvasWidth = right;
            }
            if(bottom > canvasHeight){
                canvasHeight = bottom;
            }
            composites.push({input: img.buffer, left: img.left, top: img.top});
        }
        Logger.info('TilesetImageMerger: merged canvas '+canvasWidth+'x'+canvasHeight+' px, '+composites.length+' tilesets');
        await sharp({
            create: {width: canvasWidth, height: canvasHeight, channels: 4, background: {r: 0, g: 0, b: 0, alpha: 0}}
        }).composite(composites).png().toFile(outputPath);
        return {imageWidth: canvasWidth, imageHeight: canvasHeight};
    }
}

module.exports.TilesetImageMerger = TilesetImageMerger;
