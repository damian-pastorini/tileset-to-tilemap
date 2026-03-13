/**
 *
 * Reldens - Requirements
 *
 */

const { Logger, sc } = require('@reldens/utils');

class Requirements
{
    constructor()
    {
        this.ollamaTagsUrl = (process.env.OLLAMA_HOST || 'http://localhost:11434')+'/api/tags';
    }

    async resolveAiProviders()
    {
        let providers = [];
        let ollamaAvailable = await this.checkOllama();
        Logger.info('Requirements: Ollama '+(!ollamaAvailable ? 'not' : '') +' available at '+this.ollamaTagsUrl);
        if(ollamaAvailable){
            let availableModels = sc.get(process.env, 'OLLAMA_AVAILABLE_MODELS', '');
            if(availableModels){
                for(let model of availableModels.split(',')){
                    let trimmed = model.trim();
                    if(trimmed){
                        providers.push('ollama:'+trimmed);
                    }
                }
            }
            if(!providers.length){
                providers.push('ollama');
            }
        }
        Logger.info('Requirements: Claude API key '+(process.env.ANTHROPIC_API_KEY ? 'found' : 'not set'));
        if(process.env.ANTHROPIC_API_KEY){
            providers.push('claude');
        }
        Logger.info('Requirements: Gemini API key '+(process.env.GEMINI_API_KEY ? 'found' : 'not set'));
        if(process.env.GEMINI_API_KEY){
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
