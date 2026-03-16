/**
 *
 * Reldens - TileGridBuilder
 *
 */

class TileGridBuilder
{
    constructor(pixelAnalyzer)
    {
        this.pixelAnalyzer = pixelAnalyzer;
    }

    build(
        data,
        info,
        bgColor,
        alphaThreshold,
        colorThreshold,
        minFillPct,
        varianceThreshold,
        tilesetColumns,
        tileRows,
        tileWidth,
        tileHeight,
        margin,
        spacing
    ) {
        let tileGrid = [];
        let filteredTiles = [];
        let nonEmptyRaw = 0;
        let nonEmptyCount = 0;
        let varianceMin = Infinity;
        let varianceMax = 0;
        let varianceSum = 0;
        let channels = info.channels;
        let imageWidth = info.width;
        for(let r = 0; r < tileRows; r++){
            tileGrid[r] = [];
            for(let c = 0; c < tilesetColumns; c++){
                let tileX = margin + c * (tileWidth + spacing);
                let tileY = margin + r * (tileHeight + spacing);
                let isEmpty = this.pixelAnalyzer.isTileEmpty(
                    data, imageWidth, channels,
                    tileX, tileY, tileWidth, tileHeight,
                    bgColor, alphaThreshold, colorThreshold, minFillPct
                );
                if(isEmpty){
                    tileGrid[r][c] = false;
                    continue;
                }
                nonEmptyRaw++;
                let variance = this.pixelAnalyzer.computeTileVariance(
                    data, imageWidth, channels, tileX, tileY, tileWidth, tileHeight
                );
                if(variance < varianceMin){
                    varianceMin = variance;
                }
                if(variance > varianceMax){
                    varianceMax = variance;
                }
                varianceSum += variance;
                tileGrid[r][c] = varianceThreshold <= 0 || variance >= varianceThreshold;
                if(!tileGrid[r][c]){
                    filteredTiles.push([r, c]);
                    continue;
                }
                nonEmptyCount++;
            }
        }
        return {tileGrid, filteredTiles, nonEmptyRaw, nonEmptyCount, varianceMin, varianceMax, varianceSum};
    }
}

module.exports.TileGridBuilder = TileGridBuilder;
