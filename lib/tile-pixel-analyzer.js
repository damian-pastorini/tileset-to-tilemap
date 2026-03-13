/**
 *
 * Reldens - TilePixelAnalyzer
 *
 */

const { Helpers } = require('./utils/helpers');

class TilePixelAnalyzer
{
    parseHexColor(hex)
    {
        let clean = hex.replace('#', '');
        if(6 === clean.length){
            return {
                r: Number('0x'+clean.slice(0, 2)),
                g: Number('0x'+clean.slice(2, 4)),
                b: Number('0x'+clean.slice(4, 6))
            };
        }
        if(3 === clean.length){
            return {
                r: Number('0x'+clean[0]+clean[0]),
                g: Number('0x'+clean[1]+clean[1]),
                b: Number('0x'+clean[2]+clean[2])
            };
        }
        return null;
    }

    colorDistance(r1, g1, b1, r2, g2, b2)
    {
        return Math.sqrt((r1-r2)*(r1-r2) + (g1-g2)*(g1-g2) + (b1-b2)*(b1-b2));
    }

    computeTileVariance(data, imageWidth, channels, tileX, tileY, tileWidth, tileHeight)
    {
        let sum = 0;
        let sumSq = 0;
        let count = 0;
        for(let py = tileY; py < tileY + tileHeight; py++){
            for(let px = tileX; px < tileX + tileWidth; px++){
                let idx = (py * imageWidth + px) * channels;
                if(4 === channels && data[idx + 3] < 10){
                    continue;
                }
                let brightness = (data[idx] + data[idx+1] + data[idx+2]) / 3;
                sum += brightness;
                sumSq += brightness * brightness;
                count++;
            }
        }
        if(!count){
            return 0;
        }
        let mean = sum / count;
        return (sumSq / count) - (mean * mean);
    }

    isTileEmpty(
        data,
        imageWidth,
        channels,
        tileX,
        tileY,
        tileWidth,
        tileHeight,
        bgColor,
        alphaThreshold,
        colorThreshold,
        minFillPct
    ){
        let nonEmptyCount = 0;
        let totalPixels = tileWidth * tileHeight;
        for(let py = tileY; py < tileY + tileHeight; py++){
            for(let px = tileX; px < tileX + tileWidth; px++){
                let idx = (py * imageWidth + px) * channels;
                if(4 === channels && data[idx + 3] <= alphaThreshold){
                    continue;
                }
                if(bgColor){
                    let dist = this.colorDistance(
                        data[idx],
                        data[idx+1],
                        data[idx+2],
                        bgColor.r,
                        bgColor.g,
                        bgColor.b
                    );
                    if(dist <= colorThreshold){
                        continue;
                    }
                }
                nonEmptyCount++;
            }
        }
        return nonEmptyCount < Math.ceil(totalPixels * minFillPct / 100);
    }

    computeEdgeMeanColor(
        data,
        imageWidth,
        channels,
        tileX,
        tileY,
        tileWidth,
        tileHeight,
        edge,
        bgColor,
        alphaThreshold,
        colorThreshold
    ){
        let rSum = 0;
        let gSum = 0;
        let bSum = 0;
        let count = 0;
        let isHoriz = ('right' === edge || 'left' === edge);
        let fixedPx = 'right' === edge ? tileX + tileWidth - 1 : tileX;
        let fixedPy = 'bottom' === edge ? tileY + tileHeight - 1 : tileY;
        let limit = isHoriz ? tileHeight : tileWidth;
        for(let i = 0; i < limit; i++){
            let px = isHoriz ? fixedPx : tileX + i;
            let py = isHoriz ? tileY + i : fixedPy;
            let idx = (py * imageWidth + px) * channels;
            if(4 === channels && data[idx + 3] < alphaThreshold){
                continue;
            }
            if(bgColor){
                let dist = this.colorDistance(
                    data[idx], data[idx+1], data[idx+2],
                    bgColor.r, bgColor.g, bgColor.b
                );
                if(dist <= colorThreshold){
                    continue;
                }
            }
            rSum += data[idx];
            gSum += data[idx+1];
            bSum += data[idx+2];
            count++;
        }
        if(!count){
            return null;
        }
        return {r: rSum/count, g: gSum/count, b: bSum/count};
    }

    areBordersConnectable(
        data,
        imageWidth,
        channels,
        tileX1,
        tileY1,
        tileX2,
        tileY2,
        tileWidth,
        tileHeight,
        dr,
        dc,
        bgColor,
        alphaThreshold,
        colorThreshold,
        borderThreshold
    ){
        let isHoriz = (0 !== dc);
        let edge1 = isHoriz ? (0 < dc ? 'right' : 'left') : (0 < dr ? 'bottom' : 'top');
        let edge2 = isHoriz ? (0 < dc ? 'left' : 'right') : (0 < dr ? 'top' : 'bottom');
        let mean1 = this.computeEdgeMeanColor(
            data,
            imageWidth,
            channels,
            tileX1,
            tileY1,
            tileWidth,
            tileHeight,
            edge1,
            bgColor,
            alphaThreshold,
            colorThreshold
        );
        let mean2 = this.computeEdgeMeanColor(
            data,
            imageWidth,
            channels,
            tileX2,
            tileY2,
            tileWidth,
            tileHeight,
            edge2,
            bgColor,
            alphaThreshold,
            colorThreshold
        );
        if(!mean1 || !mean2){
            return false;
        }
        return this.colorDistance(
            mean1.r,
            mean1.g,
            mean1.b,
            mean2.r,
            mean2.g,
            mean2.b
        ) <= borderThreshold;
    }

    buildMaskData(
        data,
        imageWidth,
        imageHeight,
        channels,
        alphaThreshold,
        bgColor,
        colorThreshold
    ){
        let maskData = new Uint8Array(imageWidth * imageHeight);
        for(let y = 0; y < imageHeight; y++){
            for(let x = 0; x < imageWidth; x++){
                let idx = (y * imageWidth + x) * channels;
                if(data[idx+3] <= alphaThreshold){
                    continue;
                }
                if(bgColor){
                    let dist = this.colorDistance(
                        data[idx],
                        data[idx+1],
                        data[idx+2],
                        bgColor.r,
                        bgColor.g,
                        bgColor.b
                    );
                    if(dist <= colorThreshold){
                        continue;
                    }
                }
                maskData[y * imageWidth + x] = 1;
            }
        }
        return maskData;
    }

    isElementGroup(
        tiles,
        data,
        imageWidth,
        channels,
        tileWidth,
        tileHeight,
        margin,
        spacing,
        bgColor,
        alphaThreshold,
        colorThreshold,
        elementBorderThreshold
    ){
        let tileSet = new Set(tiles.map(t => Helpers.tileKey(t)));
        for(let tile of tiles){
            let tr = tile[0];
            let tc = tile[1];
            for(let n of [[tr, tc+1], [tr+1, tc]]){
                if(!tileSet.has(Helpers.tileKey(n))){
                    continue;
                }
                let tileX1 = margin + tc * (tileWidth + spacing);
                let tileY1 = margin + tr * (tileHeight + spacing);
                let tileX2 = margin + n[1] * (tileWidth + spacing);
                let tileY2 = margin + n[0] * (tileHeight + spacing);
                let isInner = this.areBordersConnectable(
                    data,
                    imageWidth,
                    channels,
                    tileX1,
                    tileY1,
                    tileX2,
                    tileY2,
                    tileWidth,
                    tileHeight,
                    n[0]-tr,
                    n[1]-tc,
                    bgColor,
                    alphaThreshold,
                    colorThreshold,
                    elementBorderThreshold
                );
                if(!isInner){
                    return false;
                }
            }
        }
        return true;
    }
}

module.exports.TilePixelAnalyzer = TilePixelAnalyzer;
