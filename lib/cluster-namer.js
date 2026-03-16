/**
 *
 * Reldens - ClusterNamer
 *
 */

const { ClusterNamerPrompts } = require('./cluster-namer-prompts');
const { AiProviderCaller } = require('./ai-provider-caller');
const { Helpers } = require('./utils/helpers');
const { Logger, sc } = require('@reldens/utils');

class ClusterNamer
{
    constructor(options)
    {
        this.provider = new AiProviderCaller(options);
        this.prompts = new ClusterNamerPrompts();
    }

    isValidElementName(line)
    {
        return /^[a-z]+(?:-[a-z]+)*-\d{3}$/.test(line);
    }

    parseTilePair(pair)
    {
        pair = pair.trim();
        if(!pair){
            return null;
        }
        let coords = pair.split(',');
        if(2 !== coords.length){
            return null;
        }
        let rowStr = coords[0].includes('=') ? coords[0].split('=').pop() : coords[0];
        let colStr = coords[1].includes('=') ? coords[1].split('=').pop() : coords[1];
        let row = Number(rowStr.trim());
        let col = Number(colStr.trim());
        if(!Number.isFinite(row) || !Number.isFinite(col)){
            return null;
        }
        return [row, col];
    }

    parseLayerTiles(linePart)
    {
        let tiles = [];
        for(let pair of linePart.trim().split(' ')){
            let parsed = this.parseTilePair(pair);
            if(parsed){
                tiles.push(parsed);
            }
        }
        return tiles;
    }

    parseLayerLines(lines)
    {
        let layerMap = {
            O: 'over-player',
            C: 'collisions',
            B: 'below-player',
            X: 'collisions-over-player',
            L: 'collisions'
        };
        let layers = [];
        for(let line of lines){
            if(1 !== line.indexOf(':')){
                continue;
            }
            let code = line.charAt(0).toUpperCase();
            if(!sc.hasOwn(layerMap, code)){
                continue;
            }
            let tiles = this.parseLayerTiles(line.slice(2));
            if(tiles.length){
                layers.push({type: layerMap[code], tiles});
            }
        }
        return layers;
    }

    buildCleanLayerTiles(layerTiles, assignedKeys, validKeys)
    {
        let cleanTiles = [];
        for(let tile of layerTiles){
            let key = Helpers.tileKey(tile);
            if(validKeys && !validKeys.has(key)){
                continue;
            }
            if(assignedKeys.has(key)){
                continue;
            }
            assignedKeys.add(key);
            cleanTiles.push(tile);
        }
        return cleanTiles;
    }

    deduplicateLayers(parsedLayers, fallbackTiles)
    {
        let assignedKeys = new Set();
        let validKeys = fallbackTiles ? new Set(fallbackTiles.map(t => Helpers.tileKey(t))) : null;
        let layers = [];
        for(let layer of parsedLayers){
            let cleanTiles = this.buildCleanLayerTiles(layer.tiles, assignedKeys, validKeys);
            if(cleanTiles.length){
                layers.push({type: layer.type, tiles: cleanTiles});
            }
        }
        if(fallbackTiles){
            let unassigned = fallbackTiles.filter(t => !assignedKeys.has(Helpers.tileKey(t)));
            if(unassigned.length){
                layers.push({type: 'collisions', tiles: unassigned});
            }
        }
        return layers;
    }

    processContentLines(lines, onElementName, onLayerLine)
    {
        for(let line of lines){
            if(1 === line.indexOf(':')){
                onLayerLine(line);
                continue;
            }
            if(this.isValidElementName(line)){
                onElementName(line);
            }
        }
    }

    parseMultiElementResponse(rawText)
    {
        let result = [];
        let current = null;
        let lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length && !l.startsWith('```'));
        this.processContentLines(
            lines,
            (name) => {
                current = {name, layers: []};
                result.push(current);
            },
            (line) => {
                if(!current){
                    return;
                }
                let layer = this.parseLayerLines([line]).shift();
                if(layer){
                    current.layers.push(layer);
                }
            }
        );
        return result.filter(el => el.layers.length);
    }

    parseNameOnly(rawText)
    {
        let lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length);
        for(let line of lines){
            if('skip' === line.toLowerCase()){
                return null;
            }
            if(this.isValidElementName(line)){
                return line;
            }
        }
        return null;
    }

    parseLayerAssign(rawText, relativeTiles)
    {
        let lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length && !l.startsWith('```'));
        let layers = this.deduplicateLayers(this.parseLayerLines(lines), relativeTiles);
        return layers.length ? layers : null;
    }

    async nameElement(provider, buffer, relativeTiles, cropRows, cropCols, onToken)
    {
        Logger.info('ClusterNamer: name '+provider+' tiles='+relativeTiles.length+' grid='+cropCols+'x'+cropRows);
        let name = await this.nameOnly(provider, buffer, onToken);
        if(!name){
            return null;
        }
        let layers = await this.assignLayers(
            provider,
            buffer,
            relativeTiles,
            cropRows,
            cropCols,
            onToken
        );
        return {name, layers: layers || [{type: 'collisions', tiles: relativeTiles}]};
    }

    async detectElements(provider, buffer, cropCols, cropRows, onToken)
    {
        let rawText = await this.provider.call(
            provider,
            buffer,
            this.prompts.buildElementsDetectionPrompt(cropCols, cropRows),
            this.provider.getMaxTokens(provider, true),
            onToken
        );
        Logger.info('ClusterNamer '+provider+' detectElements raw: '+rawText);
        return this.parseMultiElementResponse(rawText);
    }

    async verifyElement(provider, buffer, result, relativeTiles, cropRows, cropCols, onToken)
    {
        let typeToCode = {'over-player': 'O', 'collisions': 'C', 'below-player': 'B', 'collisions-over-player': 'X'};
        let rawLayers = result.layers.map(l => ({code: sc.get(typeToCode, l.type, 'C'), tiles: l.tiles}));
        let rawText = await this.provider.call(
            provider,
            buffer,
            this.prompts.buildLayersVerificationPrompt(rawLayers, relativeTiles, cropRows, cropCols),
            this.provider.getMaxTokens(provider, false),
            onToken
        );
        Logger.info('ClusterNamer '+provider+' verifyElement raw: '+rawText);
        let layers = this.parseLayerAssign(rawText, relativeTiles);
        if(!layers){
            return result;
        }
        return {name: result.name, layers};
    }

    async nameOnly(provider, buffer, onToken)
    {
        Logger.info('ClusterNamer: nameOnly via '+provider);
        let rawText = null;
        try {
            rawText = await this.provider.call(
                provider,
                buffer,
                this.prompts.buildNamePrompt(),
                this.provider.getMaxTokens(provider, false),
                onToken
            );
        } catch(error) {
            Logger.error('ClusterNamer: '+provider+' naming failed: '+error.message);
            return null;
        }
        Logger.info('ClusterNamer '+provider+' nameOnly raw: '+rawText);
        return this.parseNameOnly(rawText);
    }

    async assignLayers(provider, buffer, relativeTiles, cropRows, cropCols, onToken)
    {
        Logger.info(
            'ClusterNamer: assignLayers '+provider+' tiles='+relativeTiles.length+' grid='+cropCols+'x'+cropRows
        );
        let maxTokens = Math.max(this.provider.getMaxTokens(provider, false), relativeTiles.length * 12);
        let rawText = await this.provider.call(
            provider,
            buffer,
            this.prompts.buildLayersDetectionPrompt(relativeTiles, cropRows, cropCols),
            maxTokens,
            onToken
        );
        Logger.info('ClusterNamer '+provider+' assignLayers raw: '+rawText);
        return this.parseLayerAssign(rawText, relativeTiles);
    }
}

module.exports.ClusterNamer = ClusterNamer;
