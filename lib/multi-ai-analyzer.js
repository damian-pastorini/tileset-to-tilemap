/**
 *
 * Reldens - MultiAiAnalyzer
 *
 */

const { ClusterNamer } = require('./cluster-namer');
const { PROVIDER_ORDER } = require('./utils/constants');
const { Logger, sc } = require('@reldens/utils');

class MultiAiAnalyzer
{
    extractBaseName(name)
    {
        let match = name.match(/^([a-z]+(?:-[a-z]+)*)-\d{3}$/);
        if(match){
            return match[1];
        }
        return name.replace(/-\d{3}$/, '');
    }

    deduplicateNames(elements)
    {
        let nameCounts = {};
        for(let el of elements){
            let base = this.extractBaseName(el.name);
            nameCounts[base] = sc.get(nameCounts, base, 0) + 1;
        }
        let seen = {};
        let renamedCount = 0;
        for(let el of elements){
            let base = this.extractBaseName(el.name);
            if(1 === nameCounts[base]){
                continue;
            }
            seen[base] = sc.get(seen, base, 0) + 1;
            let numStr = (''+seen[base]).padStart(3, '0');
            let newName = base+'-'+numStr;
            if(el.name !== newName){
                Logger.info('MultiAiAnalyzer deduplicateNames: "'+el.name+'" => "'+newName+'"');
                renamedCount++;
            }
            el.name = newName;
        }
        if(renamedCount){
            Logger.info('MultiAiAnalyzer deduplicateNames: '+renamedCount+' element(s) renamed');
        }
        return elements;
    }

    async verifyResult(namer, cropBuffer, result, relativeTiles, cropRows, cropCols, providers, elementIndex, onToken)
    {
        let verifyOrder = providers.filter(p => p.startsWith('ollama'))
            .concat(['claude', 'gemini'].filter(p => providers.includes(p)));
        for(let provider of verifyOrder){
            Logger.info('MultiAiAnalyzer: '+elementIndex+' - trying '+provider);
            try {
                let verified = await namer.verifyElement(
                    provider,
                    cropBuffer,
                    result,
                    relativeTiles,
                    cropRows,
                    cropCols,
                    onToken
                );
                if(!verified){
                    Logger.info('MultiAiAnalyzer: '+elementIndex+' - '+provider+' verify returned null');
                    continue;
                }
                if(sc.get(verified, 'skip', false)){
                    Logger.info('MultiAiAnalyzer: '+elementIndex+' - '+provider+' verify says skip');
                    return {skip: true};
                }
                Logger.info('MultiAiAnalyzer: '+elementIndex+' - '+provider+' verify accepted "'+verified.name+'"');
                return verified;
            } catch(error) {
                Logger.error('MultiAiAnalyzer: '+elementIndex+' - '+provider+' verify failed: '+error.message);
            }
        }
        Logger.info('MultiAiAnalyzer: '+elementIndex+' - all failed, keeping naming result');
        return result;
    }

    async nameElement(cropBuffer, relativeTiles, cropRows, cropCols, providers, elementIndex, onToken, validatePass)
    {
        let namer = new ClusterNamer();
        let namingOrder = providers.filter(p => p.startsWith('ollama'))
            .concat(['claude', 'gemini'].filter(p => providers.includes(p)));
        let result = null;
        for(let provider of namingOrder){
            Logger.info('MultiAiAnalyzer: '+elementIndex+' - trying naming '+provider);
            try {
                result = await namer.nameElement(provider, cropBuffer, relativeTiles, cropRows, cropCols, onToken);
                if(!result){
                    Logger.info('MultiAiAnalyzer: '+elementIndex+' - '+provider+' returned null');
                    continue;
                }
                if(sc.get(result, 'skip', false)){
                    Logger.info('MultiAiAnalyzer: '+elementIndex+' - '+provider+' says skip');
                    return {skip: true};
                }
                Logger.info('MultiAiAnalyzer: '+elementIndex+' - '+provider+' returned "'+result.name+'"');
                break;
            } catch(error) {
                Logger.error('MultiAiAnalyzer: '+elementIndex+' '+provider+' naming failed: '+error.message);
            }
        }
        if(!result){
            return null;
        }
        if(sc.get(result, 'skip', false)){
            return {skip: true};
        }
        if(!validatePass){
            return result;
        }
        return this.verifyResult(
            namer,
            cropBuffer,
            result,
            relativeTiles,
            cropRows,
            cropCols,
            providers,
            elementIndex,
            onToken
        );
    }
}

module.exports.MultiAiAnalyzer = MultiAiAnalyzer;
