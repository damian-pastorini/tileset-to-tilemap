/**
 *
 * Reldens - TilesetResizer
 *
 */

const sharp = require('sharp');
const { Logger } = require('@reldens/utils');

class TilesetResizer
{
    async resize(inputPath, originalTileWidth, originalTileHeight, targetSize, outputPath)
    {
        try {
            let factor = targetSize / originalTileWidth;
            let meta = await sharp(inputPath).metadata();
            let newWidth = Math.round(meta.width * factor);
            let newHeight = Math.round(meta.height * factor);
            await sharp(inputPath)
                .resize({
                    width: newWidth,
                    height: newHeight,
                    kernel: sharp.kernel.nearest,
                    fit: sharp.fit.fill
                })
                .toFile(outputPath);
            return {
                imageWidth: newWidth,
                imageHeight: newHeight,
                tileWidth: targetSize,
                tileHeight: Math.round(originalTileHeight * factor)
            };
        } catch(error) {
            Logger.error('TilesetResizer: failed to resize image: '+error.message);
            return false;
        }
    }
}

module.exports.TilesetResizer = TilesetResizer;
