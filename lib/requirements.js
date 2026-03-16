/**
 *
 * Reldens - Requirements
 *
 */

const { Logger, sc } = require('@reldens/utils');

class Requirements
{
    constructor(options)
    {
        this.ollamaTagsUrl = sc.get(options, 'ollamaHost', 'http://localhost:11434')+'/api/tags';
        this.ollamaAvailableModels = sc.get(options, 'ollamaAvailableModels', '');
        this.anthropicApiKey = sc.get(options, 'anthropicApiKey', null);
        this.geminiApiKey = sc.get(options, 'geminiApiKey', null);
    }

    resolveOllamaModels(providers)
    {
        if(!this.ollamaAvailableModels){
            providers.push('ollama');
            return;
        }
        for(let model of this.ollamaAvailableModels.split(',')){
            let trimmed = model.trim();
            if(trimmed){
                providers.push('ollama:'+trimmed);
            }
        }
        if(!providers.length){
            providers.push('ollama');
        }
    }

    async resolveAiProviders()
    {
        let providers = [];
        let ollamaAvailable = await this.checkOllama();
        Logger.info('Requirements: Ollama '+(!ollamaAvailable ? 'not' : '') +' available at '+this.ollamaTagsUrl);
        if(ollamaAvailable){
            this.resolveOllamaModels(providers);
        }
        Logger.info('Requirements: Claude API key '+(this.anthropicApiKey ? 'found' : 'not set'));
        if(this.anthropicApiKey){
            providers.push('claude');
        }
        Logger.info('Requirements: Gemini API key '+(this.geminiApiKey ? 'found' : 'not set'));
        if(this.geminiApiKey){
            providers.push('gemini');
        }
        if(!providers.length){
            Logger.info('Requirements: No AI providers found - running in manual mode');
        }
        return providers;
    }

    async checkOllama()
    {
        try {
            let response = await fetch(this.ollamaTagsUrl);
            return response.ok;
        } catch(error) {
            Logger.info('Requirements: Ollama check failed: '+error.message);
            return false;
        }
    }
}

module.exports.Requirements = Requirements;
