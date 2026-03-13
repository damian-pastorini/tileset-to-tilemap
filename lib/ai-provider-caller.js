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
    getMaxTokens(provider, isDetection)
    {
        if(provider.startsWith('ollama')){
            return 0;
        }
        let prefix = provider.toUpperCase();
        let envKey = prefix+(isDetection ? '_MAX_TOKENS_DETECTION' : '_MAX_TOKENS');
        return Number(sc.get(process.env, envKey, isDetection ? '4096' : '512'));
    }

    async call(provider, buffer, prompt, maxTokens, onToken)
    {
        if(provider.startsWith('ollama')){
            let model = provider.startsWith('ollama:') ? provider.slice(7) : sc.get(process.env, 'OLLAMA_MODEL', '');
            return this.streamOllama(prompt, buffer, onToken, maxTokens, model);
        }
        if('claude' === provider){
            let client = new Anthropic();
            let imageSource = {
                type: 'base64',
                media_type: 'image/png',
                data: buffer.toString('base64')
            };
            let response = await client.messages.create({
                model: process.env.CLAUDE_MODEL,
                max_tokens: maxTokens,
                messages: [{
                    role: 'user',
                    content: [
                        { type: 'image', source: imageSource },
                        { type: 'text', text: prompt }
                    ]
                }]
            });
            return response.content[0].text;
        }
        if('gemini' === provider){
            let ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            let response = await ai.models.generateContent({
                model: process.env.GEMINI_MODEL,
                contents: [{
                    parts: [
                        { inlineData: { mimeType: 'image/png', data: buffer.toString('base64') } },
                        { text: prompt }
                    ]
                }],
                config: { maxOutputTokens: maxTokens }
            });
            return response.text;
        }
        return null;
    }

    async streamOllama(prompt, cropBuffer, onToken, maxTokens, model)
    {
        let modelKey = model.replace(/[.:\-]/g, '_');
        let numCtx = Number(sc.get(
            process.env,
            'OLLAMA_NUM_CTX_'+modelKey,
            sc.get(process.env, 'OLLAMA_NUM_CTX', '4096')
        ));
        let numPredict = Math.max(
            Number(sc.get(
                process.env,
                'OLLAMA_NUM_PREDICT_'+modelKey,
                sc.get(process.env, 'OLLAMA_NUM_PREDICT', '512')
            )),
            maxTokens || 0
        );
        let body = sc.toJsonString({
            model,
            stream: true,
            options: {
                num_ctx: numCtx,
                num_predict: numPredict
            },
            messages: [{
                role: 'user',
                content: prompt,
                images: [cropBuffer.toString('base64')]
            }]
        });
        let response = await fetch(process.env.OLLAMA_HOST+'/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body
        });
        let fullContent = '';
        let tokenCount = 0;
        let reader = response.body.getReader();
        let decoder = new TextDecoder();
        let buffer = '';
        for(let chunk = await reader.read(); !chunk.done; chunk = await reader.read()){
            buffer += decoder.decode(chunk.value, { stream: true });
            let parts = buffer.split('\n');
            buffer = parts.pop();
            for(let line of parts){
                line = line.trim();
                if(!line){
                    continue;
                }
                let data = sc.parseJson(line, null);
                if(!data){
                    continue;
                }
                if(data.message && data.message.content){
                    fullContent += data.message.content;
                    tokenCount++;
                    if(onToken){
                        onToken(tokenCount);
                    }
                }
            }
        }
        return fullContent;
    }
}

module.exports.AiProviderCaller = AiProviderCaller;
