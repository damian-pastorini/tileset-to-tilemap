/**
 *
 * Reldens - AiProviderCaller
 *
 */

const Anthropic = require('@anthropic-ai/sdk');
const { GoogleGenAI } = require('@google/genai');
const { sc } = require('@reldens/utils');

class AiProviderCaller
{
    constructor(options)
    {
        this.claudeModel = sc.get(options, 'claudeModel', 'claude-sonnet-4-6');
        this.claudeMaxTokens = Number(sc.get(options, 'claudeMaxTokens', 512));
        this.claudeMaxTokensDetection = Number(sc.get(options, 'claudeMaxTokensDetection', 4096));
        this.geminiApiKey = sc.get(options, 'geminiApiKey', null);
        this.geminiModel = sc.get(options, 'geminiModel', 'gemini-2.0-flash-preview-image-generation');
        this.geminiMaxTokens = Number(sc.get(options, 'geminiMaxTokens', 512));
        this.geminiMaxTokensDetection = Number(sc.get(options, 'geminiMaxTokensDetection', 4096));
        this.ollamaHost = sc.get(options, 'ollamaHost', 'http://localhost:11434');
        this.ollamaModel = sc.get(options, 'ollamaModel', '');
        this.ollamaNumCtx = Number(sc.get(options, 'ollamaNumCtx', 4096));
        this.ollamaNumPredict = Number(sc.get(options, 'ollamaNumPredict', 512));
    }

    getMaxTokens(provider, isDetection)
    {
        if(provider.startsWith('ollama')){
            return 0;
        }
        if('claude' === provider){
            return isDetection ? this.claudeMaxTokensDetection : this.claudeMaxTokens;
        }
        if('gemini' === provider){
            return isDetection ? this.geminiMaxTokensDetection : this.geminiMaxTokens;
        }
        return isDetection ? 4096 : 512;
    }

    buildClaudeMessages(buffer, prompt)
    {
        let imageSource = {type: 'base64', media_type: 'image/png', data: buffer.toString('base64')};
        let content = [{ type: 'image', source: imageSource }, { type: 'text', text: prompt }];
        return [{ role: 'user', content }];
    }

    async callClaude(buffer, prompt, maxTokens)
    {
        let client = new Anthropic();
        let messages = this.buildClaudeMessages(buffer, prompt);
        let response = await client.messages.create({model: this.claudeModel, max_tokens: maxTokens, messages});
        return response.content[0].text;
    }

    buildGeminiContents(buffer, prompt)
    {
        let imageData = {inlineData: {mimeType: 'image/png', data: buffer.toString('base64')}};
        let parts = [imageData, {text: prompt}];
        return [{ parts }];
    }

    async callGemini(buffer, prompt, maxTokens)
    {
        let ai = new GoogleGenAI({ apiKey: this.geminiApiKey });
        let contents = this.buildGeminiContents(buffer, prompt);
        let response = await ai.models.generateContent({
            model: this.geminiModel,
            contents,
            config: { maxOutputTokens: maxTokens }
        });
        return response.text;
    }

    async call(provider, buffer, prompt, maxTokens, onToken)
    {
        if(provider.startsWith('ollama')){
            let model = provider.startsWith('ollama:') ? provider.slice(7) : this.ollamaModel;
            return this.streamOllama(prompt, buffer, onToken, maxTokens, model);
        }
        if('claude' === provider){
            return this.callClaude(buffer, prompt, maxTokens);
        }
        if('gemini' === provider){
            return this.callGemini(buffer, prompt, maxTokens);
        }
        return null;
    }

    handleOllamaMessage(data, onToken, state)
    {
        if(!data.message || !data.message.content){
            return;
        }
        state.fullContent += data.message.content;
        state.tokenCount++;
        if(onToken){
            onToken(state.tokenCount);
        }
    }

    processOllamaLines(parts, onToken, state)
    {
        for(let line of parts){
            line = line.trim();
            if(!line){
                continue;
            }
            let data = sc.parseJson(line, null);
            if(!data){
                continue;
            }
            this.handleOllamaMessage(data, onToken, state);
        }
    }

    async streamOllama(prompt, cropBuffer, onToken, maxTokens, model)
    {
        let numCtx = this.ollamaNumCtx;
        let numPredict = Math.max(this.ollamaNumPredict, maxTokens || 0);
        let body = sc.toJsonString({
            model,
            stream: true,
            options: { num_ctx: numCtx, num_predict: numPredict },
            messages: [{ role: 'user', content: prompt, images: [cropBuffer.toString('base64')] }]
        });
        let response = await fetch(this.ollamaHost+'/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body
        });
        let state = { fullContent: '', tokenCount: 0 };
        let reader = response.body.getReader();
        let decoder = new TextDecoder();
        let buffer = '';
        for(let chunk = await reader.read(); !chunk.done; chunk = await reader.read()){
            buffer += decoder.decode(chunk.value, { stream: true });
            let parts = buffer.split('\n');
            buffer = parts.pop();
            this.processOllamaLines(parts, onToken, state);
        }
        return state.fullContent;
    }
}

module.exports.AiProviderCaller = AiProviderCaller;
