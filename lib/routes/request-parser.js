/**
 *
 * Reldens - RequestParser
 *
 */

const { sc } = require('@reldens/utils');

class RequestParser
{
    parseTilesetParams(body)
    {
        return {
            sessionId: sc.get(body, 'sessionId', ''),
            imageId: sc.get(body, 'imageId', ''),
            provider: sc.get(body, 'provider', ''),
            tileWidth: Number(sc.get(body, 'tileWidth', '32')),
            tileHeight: Number(sc.get(body, 'tileHeight', '32')),
            spacing: Number(sc.get(body, 'spacing', '0')),
            margin: Number(sc.get(body, 'margin', '0')),
            bgColor: sc.get(body, 'bgColor', null),
            resizeValue: Number(sc.get(body, 'resizeValue', 0))
        };
    }

    validateAiParams(params, res)
    {
        if(!params.sessionId || !params.imageId || !params.provider){
            res.json({error: 'Missing required parameters'});
            return false;
        }
        return true;
    }
}

module.exports.RequestParser = RequestParser;
