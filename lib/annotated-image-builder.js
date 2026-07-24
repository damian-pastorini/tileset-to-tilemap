/**
 *
 * Reldens - AnnotatedImageBuilder
 *
 */

const sharp = require('sharp');
const { Logger, sc } = require('@reldens/utils');

class AnnotatedImageBuilder
{
    colorForIndex(index)
    {
        return 'hsl('+Math.round((index * 137.508) % 360)+',70%,55%)';
    }

    buildSvgOverlay(tileset, imageWidth, imageHeight)
    {
        let tileWidth = Number(tileset.tileWidth);
        let tileHeight = Number(tileset.tileHeight);
        let spacing = Number(sc.get(tileset, 'spacing', 0));
        let margin = Number(sc.get(tileset, 'margin', 0));
        let parts = [];
        for(let tile of sc.get(tileset, 'filteredTiles', [])){
            let x = margin + tile[1] * (tileWidth + spacing);
            let y = margin + tile[0] * (tileHeight + spacing);
            parts.push(
                '<rect x="'+x+'" y="'+y+'" width="'+tileWidth+'" height="'+tileHeight
                +'" fill="#888888" fill-opacity="0.15" stroke="#555555"'
                +' stroke-width="0.5" stroke-dasharray="2,3"/>'
            );
        }
        let elementIndex = 0;
        for(let element of sc.get(tileset, 'elements', [])){
            let colorIndex = sc.isNumber(element.colorIndex) ? element.colorIndex : elementIndex;
            let color = this.colorForIndex(colorIndex);
            for(let layer of sc.get(element, 'layers', [])){
                for(let tile of sc.get(layer, 'tiles', [])){
                    let x = margin + tile[1] * (tileWidth + spacing);
                    let y = margin + tile[0] * (tileHeight + spacing);
                    parts.push(
                        '<rect x="'+x+'" y="'+y+'" width="'+tileWidth+'" height="'+tileHeight
                        +'" fill="'+color+'" fill-opacity="0.4" stroke="'+color
                        +'" stroke-width="0.5" stroke-opacity="0.8"/>'
                    );
                }
            }
            elementIndex++;
        }
        let cols = Math.ceil((imageWidth - margin) / (tileWidth + spacing));
        let rows = Math.ceil((imageHeight - margin) / (tileHeight + spacing));
        for(let rowIndex = 0; rowIndex <= rows; rowIndex++){
            let y = margin + rowIndex * (tileHeight + spacing);
            parts.push(
                '<line x1="'+margin+'" y1="'+y+'" x2="'+imageWidth+'" y2="'+y
                +'" stroke="#ffffff" stroke-width="1" stroke-opacity="0.45"/>'
            );
        }
        for(let colIndex = 0; colIndex <= cols; colIndex++){
            let x = margin + colIndex * (tileWidth + spacing);
            parts.push(
                '<line x1="'+x+'" y1="'+margin+'" x2="'+x+'" y2="'+imageHeight
                +'" stroke="#ffffff" stroke-width="1" stroke-opacity="0.45"/>'
            );
        }
        return '<svg width="'+imageWidth+'" height="'+imageHeight+'" xmlns="http://www.w3.org/2000/svg">'
            +parts.join('')
            +'</svg>';
    }

    async buildAnnotatedImage(tileset, outputPath)
    {
        try {
            let metadata = await sharp(tileset.filePath).metadata();
            let svg = this.buildSvgOverlay(tileset, metadata.width, metadata.height);
            await sharp(tileset.filePath)
                .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
                .toFile(outputPath);
            return true;
        } catch(error) {
            Logger.error('AnnotatedImageBuilder: failed to build annotated image: '+error.message);
            return false;
        }
    }
}

module.exports.AnnotatedImageBuilder = AnnotatedImageBuilder;
